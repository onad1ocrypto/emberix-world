import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BACKGROUND_TRACKS,
  DANCE_TRACKS,
  DEFAULT_PROGRESSION,
  DEFAULT_STATS,
  PLAYER_AVATARS,
} from '../constants';
import { getTranslation, LANGUAGE_OPTIONS } from '../i18n/translations';
import { StorageManager } from '../storage/StorageManager';
import {
  applyHungerTimerTick,
  applyTimeDecay,
  calculateFriendshipLevel,
  calculateLevelFromXp,
  canClaimDailyReward,
  claimDailyReward,
  clampToIslandBounds,
  getHungerStateLevel,
  getIslandZoneLabel,
  groundHeightAt,
  HUNGER_CRITICAL_THRESHOLD,
  HUNGER_LOW_THRESHOLD,
  ISLAND_ROCKS,
  ISLAND_TREES,
  isPetHungry,
  isPointInRiverWater,
  isPositionInBounds,
  parseMindTarget,
  performPetAction,
  resolveIslandMovement,
  riverCenterXAt,
  terrainHeightAt,
  WATER_SURFACE_Y,
  worldToMinimapPoint,
} from './rules';

test('pet interactions update stats, XP, levels, and achievements accurately', () => {
  const initialStats = { ...DEFAULT_STATS, hunger: 60, happiness: 65, friendship: 60 };
  const initialProg = { ...DEFAULT_PROGRESSION, petCount: 0, feedCount: 2 };

  // Pet interaction
  const petRes = performPetAction('pet', initialStats, initialProg);
  assert.equal(petRes.stats.friendship, 70);
  assert.equal(petRes.stats.happiness, 73);
  assert.equal(petRes.animation, 'happy');
  assert.ok(petRes.newlyUnlockedAchievements.includes('first_bond'));

  // 3rd feed interaction unlocks gourmet_keeper achievement
  const feedRes = performPetAction('feed', petRes.stats, petRes.progression);
  assert.equal(feedRes.stats.hunger, 86);
  assert.equal(feedRes.animation, 'eating');
  assert.ok(feedRes.newlyUnlockedAchievements.includes('gourmet_keeper'));
});

test('sleep and wake interactions toggle sleeping state and restore energy', () => {
  const tiredStats = { ...DEFAULT_STATS, energy: 30, isSleeping: false };
  const sleepRes = performPetAction('sleep', tiredStats, DEFAULT_PROGRESSION);
  assert.equal(sleepRes.stats.isSleeping, true);
  assert.equal(sleepRes.stats.energy, 58);
  assert.equal(sleepRes.animation, 'sleeping');

  const wakeRes = performPetAction('wake', sleepRes.stats, sleepRes.progression);
  assert.equal(wakeRes.stats.isSleeping, false);
  assert.equal(wakeRes.animation, 'surprised');
});

test('time decay reduces active stats and restores energy while sleeping', () => {
  const activeStats = {
    hunger: 80,
    happiness: 80,
    energy: 80,
    friendship: 70,
    isSleeping: false,
  };
  const decayed = applyTimeDecay(activeStats, 600); // 10 minutes
  assert.ok(decayed.hunger < 80);
  assert.ok(decayed.happiness < 80);
  assert.ok(decayed.energy < 80);

  const sleepingStats = { ...activeStats, energy: 50, isSleeping: true };
  const rested = applyTimeDecay(sleepingStats, 600);
  assert.ok(rested.energy > 50);
});

test('XP and friendship level calculations scale monotonically', () => {
  const lvl1 = calculateLevelFromXp(50);
  assert.equal(lvl1.level, 1);

  const lvl2 = calculateLevelFromXp(150);
  assert.equal(lvl2.level, 2);

  const lvl4 = calculateLevelFromXp(750);
  assert.ok(lvl4.level >= 3);

  assert.equal(calculateFriendshipLevel(0), 1);
  assert.equal(calculateFriendshipLevel(55), 6);
  assert.equal(calculateFriendshipLevel(100), 10);
});

test('daily reward can be claimed once per date', () => {
  const dateStr = '2026-11-12';
  assert.equal(canClaimDailyReward('', dateStr), true);

  const firstClaim = claimDailyReward(DEFAULT_STATS, DEFAULT_PROGRESSION, dateStr);
  assert.equal(firstClaim.claimed, true);
  assert.equal(firstClaim.progression.lastDailyClaimDate, dateStr);

  const secondClaim = claimDailyReward(firstClaim.stats, firstClaim.progression, dateStr);
  assert.equal(secondClaim.claimed, false);
});

test('island heightmap and boundary clamping behave deterministically', () => {
  const sanctuaryHeight = groundHeightAt(0, 0);
  assert.ok(sanctuaryHeight > 1.2 && sanctuaryHeight < 2.0);
  assert.ok(
    Math.abs(sanctuaryHeight - (terrainHeightAt(0, 0) + 0.05)) < 0.001,
    'Sanctuary circle groundHeightAt must sit flush on top of the 0.05m moss pad',
  );

  // Under the bridge at (-6.2, 0), terrain riverbed is carved below WATER_SURFACE_Y
  // while walkable groundHeightAt is elevated on the wooden bridge arch!
  const riverbedUnderBridge = terrainHeightAt(-6.2, 0);
  assert.ok(
    riverbedUnderBridge < WATER_SURFACE_Y - 0.3,
    `Expected riverbed (${riverbedUnderBridge}) to be carved below water (${WATER_SURFACE_Y})`,
  );

  const bridgeDeckHeight = groundHeightAt(-6.2, 0);
  assert.ok(
    bridgeDeckHeight > WATER_SURFACE_Y + 1.0,
    `Expected bridge deck (${bridgeDeckHeight}) to arch well above water (${WATER_SURFACE_Y})`,
  );

  assert.equal(isPositionInBounds(10, 10), true);
  assert.equal(isPositionInBounds(50, 50), false);

  const clamped = clampToIslandBounds(60, 0, 38);
  assert.ok(Math.abs(clamped.x - 38) < 0.001);
  assert.equal(clamped.z, 0);
});

test('collision resolution prevents entering the river and prevents clipping through bridge pillars', () => {
  // 1. Attempting to walk from East riverbank into the river at z = 6.0 (away from bridge)
  const riverXAt6 = riverCenterXAt(6.0);
  const eastBankStartX = riverXAt6 + 3.2;
  const intoRiverAttempt = resolveIslandMovement(
    eastBankStartX,
    6.0,
    riverXAt6,
    6.0,
  );
  assert.equal(intoRiverAttempt.blockedByRiver, true);
  assert.equal(
    isPointInRiverWater(intoRiverAttempt.x, intoRiverAttempt.z),
    false,
    'Character must be blocked from entering the river water',
  );

  // 2. Walking across the wooden bridge walkway at z = 0 is allowed above the river
  const bridgeCross = resolveIslandMovement(-3.0, 0, -6.2, 0);
  assert.equal(bridgeCross.blockedByRiver, false);
  assert.equal(bridgeCross.x, -6.2);
  assert.equal(bridgeCross.z, 0);

  // 3. Attempting to walk sideways off the bridge through the bridge posts/railing (z = 1.68)
  const intoBridgeRailing = resolveIslandMovement(-6.2, 0.2, -6.2, 1.85);
  assert.equal(intoBridgeRailing.blockedByBridgePillar, true);
  assert.ok(
    intoBridgeRailing.z <= 1.33,
    `Character on bridge must not pass through railing/posts (got z=${intoBridgeRailing.z})`,
  );

  // 4. Attempting to walk directly into a stone bridge corner pillar at (-2.6, 1.72)
  const intoCornerPillar = resolveIslandMovement(-1.8, 1.72, -2.55, 1.72);
  assert.equal(intoCornerPillar.blockedByBridgePillar, true);
  const distToPillar = Math.hypot(
    intoCornerPillar.x - -2.6,
    intoCornerPillar.z - 1.72,
  );
  assert.ok(
    distToPillar >= 0.55,
    `Character must not clip into bridge corner pillar (dist=${distToPillar})`,
  );
});

test('collision resolution prevents walking through Pet House, trees, rocks, and circular pedestals near the bridge', () => {
  // 1. Pet Sanctuary House at (4.95, -7.6) with radius 2.35m
  const intoHouse = resolveIslandMovement(2.0, -5.0, 4.95, -7.6);
  const distToHouse = Math.hypot(intoHouse.x - 4.95, intoHouse.z - -7.6);
  assert.ok(
    distToHouse >= 2.3,
    `Character must not walk through Pet House (dist=${distToHouse})`,
  );

  // 2. Circular Mana Crystal pedestal near bridge at (-2.4, -3.2) with radius 1.08m
  const intoBridgeCrystalCircle = resolveIslandMovement(-1.0, -3.2, -2.4, -3.2);
  const distToCrystalCircle = Math.hypot(
    intoBridgeCrystalCircle.x - -2.4,
    intoBridgeCrystalCircle.z - -3.2,
  );
  assert.ok(
    distToCrystalCircle >= 1.05,
    `Character must not clip into circular crystal pedestal near bridge (dist=${distToCrystalCircle})`,
  );

  // 3. Circular Enchanted Flower Garden bed near bridge at (-2.15, 2.85) with radius 1.55m
  const intoBridgeGardenCircle = resolveIslandMovement(-0.2, 2.85, -2.15, 2.85);
  const distToGardenCircle = Math.hypot(
    intoBridgeGardenCircle.x - -2.15,
    intoBridgeGardenCircle.z - 2.85,
  );
  assert.ok(
    distToGardenCircle >= 1.5,
    `Character must not clip into circular garden bed near bridge (dist=${distToGardenCircle})`,
  );

  // 4. First Tree in ISLAND_TREES
  const tree0 = ISLAND_TREES[0];
  const intoTree = resolveIslandMovement(tree0.x + 2.0, tree0.z, tree0.x, tree0.z);
  const distToTree = Math.hypot(intoTree.x - tree0.x, intoTree.z - tree0.z);
  assert.ok(
    distToTree >= tree0.colliderRadius - 0.01,
    `Character must not walk through tree trunk (dist=${distToTree})`,
  );

  // 5. First Rock in ISLAND_ROCKS
  const rock0 = ISLAND_ROCKS[0];
  const intoRock = resolveIslandMovement(rock0.x + 2.0, rock0.z, rock0.x, rock0.z);
  const distToRock = Math.hypot(intoRock.x - rock0.x, intoRock.z - rock0.z);
  assert.ok(
    distToRock >= rock0.colliderRadius - 0.01,
    `Character must not walk through rock boulder (dist=${distToRock})`,
  );
});

test('compiled MindAR ember-card.mind file exists and parses with valid features', () => {
  const mindPath = path.join(process.cwd(), 'public', 'assets', 'ar', 'ember-card.mind');
  assert.equal(fs.existsSync(mindPath), true, 'ember-card.mind must exist');

  const buf = fs.readFileSync(mindPath);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const parsed = parseMindTarget(arrayBuffer);

  assert.equal(parsed.valid, true);
  assert.ok(parsed.header);
  assert.equal(parsed.header.targetId, 'ember-fire-dragon-001');
  assert.equal(parsed.header.width, 1024);
  assert.equal(parsed.header.height, 1024);
  assert.ok(parsed.header.trackingFeatures.scale256.length >= 50);
  assert.ok(parsed.pyramidData && parsed.pyramidData.byteLength > 65536);
});

test('copyright-free romantic background music and dance tracks and player registration/login system work accurately', () => {
  assert.equal(BACKGROUND_TRACKS.length, 3);
  for (const bgm of BACKGROUND_TRACKS) {
    assert.ok(bgm.bpm >= 60 && bgm.bpm <= 80, 'Romantic BGM must have a soft gentle tempo');
    assert.ok(bgm.title.length > 3);
    assert.ok(
      bgm.licenseTag.includes('CC0') ||
        bgm.licenseTag.includes('Public Domain'),
      'Romantic BGM must be 100% copyright-free (CC0 / Public Domain)',
    );
  }

  assert.equal(DANCE_TRACKS.length, 4);
  for (const track of DANCE_TRACKS) {
    assert.ok(track.bpm >= 110 && track.bpm <= 160);
    assert.ok(track.title.length > 3);
    assert.ok(
      track.licenseTag.includes('CC0') ||
        track.licenseTag.includes('Public Domain'),
    );
  }
  assert.equal(PLAYER_AVATARS.length, 6);

  const mgr = new StorageManager();
  assert.equal(mgr.getState().settings.selectedBgmTrack, 'solara_serenade');
  mgr.updateSettings({ selectedBgmTrack: 'starlight_gymnopedie' });
  assert.equal(mgr.getState().settings.selectedBgmTrack, 'starlight_gymnopedie');
  assert.equal(mgr.getCurrentUser(), null);

  // Register new player account
  const regRes = mgr.registerAccount({
    username: 'DinoTamer',
    password: 'secret123',
    avatarId: 'crystal_mage',
    titleBadge: 'Dino Bestie',
  });
  assert.equal(regRes.ok, true);
  assert.equal(mgr.getCurrentUser()?.username, 'DinoTamer');
  assert.equal(
    mgr.getState().progression.playerXp,
    DEFAULT_PROGRESSION.playerXp + 50,
  ); // +50 XP welcome bonus

  // Duplicate registration must fail
  const dupRes = mgr.registerAccount({
    username: 'DinoTamer',
    password: 'secret123',
    avatarId: 'fire_keeper',
    titleBadge: 'Dragon Tamer',
  });
  assert.equal(dupRes.ok, false);

  // Logout and login back
  mgr.logoutAccount();
  assert.equal(mgr.getCurrentUser(), null);

  const badLogin = mgr.loginAccount('DinoTamer', 'wrongpass');
  assert.equal(badLogin.ok, false);

  const okLogin = mgr.loginAccount('dino@solara.id', 'secret123');
  assert.equal(okLogin.ok, true);
  assert.equal(mgr.getCurrentUser()?.username, 'DinoTamer');
});

test('multi-language settings (en, id, zh), custom pet naming in profile, and selfie portrait XP rewards work accurately', () => {
  // 1. Verify English (primary), Indonesian, and Chinese language packs
  assert.equal(LANGUAGE_OPTIONS.length, 3);
  assert.deepEqual(
    LANGUAGE_OPTIONS.map((o) => o.id),
    ['en', 'id', 'zh'],
  );

  const en = getTranslation('en');
  const id = getTranslation('id');
  const zh = getTranslation('zh');
  assert.equal(en.menu.play3dWorld, 'Play 3D World');
  assert.equal(id.menu.play3dWorld, 'Main Dunia 3D');
  assert.equal(zh.menu.play3dWorld, '畅玩 3D 世界');

  const mgr = new StorageManager();
  assert.equal(mgr.getState().settings.language, 'en');

  mgr.updateSettings({ language: 'id' });
  assert.equal(mgr.getState().settings.language, 'id');

  mgr.updateSettings({ language: 'zh' });
  assert.equal(mgr.getState().settings.language, 'zh');

  // 2. Verify custom pet naming in Guest Mode and Registered Account Mode
  assert.equal(mgr.getPetName(), 'EMBER');
  const badPetName = mgr.setPetName('   ');
  assert.equal(badPetName.ok, false);

  const okPetName = mgr.setPetName('PyroFlare');
  assert.equal(okPetName.ok, true);
  assert.equal(mgr.getPetName(), 'PyroFlare');

  const regWithPet = mgr.registerAccount({
    username: 'FireKeeper88',
    password: 'pass1234',
    avatarId: 'fire_keeper',
    titleBadge: 'Dragon Tamer',
    petName: 'Ignis',
  });
  assert.equal(regWithPet.ok, true);
  assert.equal(mgr.getPetName(), 'Ignis');

  mgr.setPetName('SolaraRex');
  assert.equal(mgr.getPetName(), 'SolaraRex');
  assert.equal(
    mgr.getRegisteredAccounts()[0].saveData.progression.petName,
    'SolaraRex',
  );

  // 3. Verify selfie portrait capture increments selfieCount and awards Player + Pet XP
  const beforePlayerXp = mgr.getState().progression.playerXp;
  const beforePetXp = mgr.getState().progression.creatureXp;
  const beforeSelfies = mgr.getState().progression.selfieCount || 0;

  mgr.recordSelfieCapture();
  const afterProg = mgr.getState().progression;
  assert.equal(afterProg.selfieCount, beforeSelfies + 1);
  assert.equal(afterProg.playerXp, beforePlayerXp + 15);
  assert.equal(afterProg.creatureXp, beforePetXp + 20);
});

test('real-time radar minimap coordinate mapping and zone labels track player position accurately', () => {
  // Center of Sunstone Sanctuary (0, 0) maps to radar center (50, 50)
  const centerPt = worldToMinimapPoint(0, 0);
  assert.equal(centerPt.x, 50);
  assert.equal(centerPt.y, 50);
  assert.equal(centerPt.clamped, false);
  assert.equal(getIslandZoneLabel(0, 0), 'Sunstone Sanctuary');

  // Wooden Bridge at (-6.2, 0) maps west of center and identifies as Wooden Bridge
  const bridgePt = worldToMinimapPoint(-6.2, 0);
  assert.ok(bridgePt.x < 42, `Bridge x (${bridgePt.x}) must be west of center`);
  assert.equal(bridgePt.y, 50);
  assert.equal(getIslandZoneLabel(-6.2, 0), 'Wooden Bridge');

  // Pet Sanctuary House at (4.95, -7.6) maps northeast of center
  const housePt = worldToMinimapPoint(4.95, -7.6);
  assert.ok(housePt.x > 55 && housePt.y < 42);
  assert.equal(getIslandZoneLabel(4.95, -7.6), 'Pet Sanctuary House');

  // West Meadow beyond the river at (-12, 2)
  const westPt = worldToMinimapPoint(-12, 2);
  assert.ok(westPt.x < bridgePt.x);
  assert.equal(getIslandZoneLabel(-12, 2), 'West Meadow & Gardens');

  // Outer shoreline clamping preserves direction while staying inside radar ring (r <= 41.5)
  const outerPt = worldToMinimapPoint(36, 0);
  assert.equal(outerPt.clamped, true);
  assert.equal(outerPt.x, 91.5);
  assert.equal(outerPt.y, 50);
});

test('Dragon Gear cosmetics unlock gradually by EMBER level (Lv.1 to Lv.4) with anti-spam diminishing returns and staged Keeper Quests', () => {
  const mgr = new StorageManager();
  mgr.resetProgress();

  // New player starts cleanly at 0 XP (Lv.1)
  assert.equal(mgr.getState().progression.creatureXp, 0);
  assert.equal(mgr.getState().progression.playerXp, 0);

  // At Lv.1, only 'none' and 'crown' are unlocked
  assert.deepEqual(mgr.getState().progression.unlockedCosmetics, [
    'none',
    'crown',
  ]);
  assert.equal(mgr.equipCosmetic('crown'), true);
  assert.equal(mgr.equipCosmetic('collar'), false); // Requires Lv.2
  assert.equal(mgr.equipCosmetic('scarf'), false); // Requires Lv.3
  assert.equal(mgr.equipCosmetic('flame_aura'), false); // Requires Lv.4

  // Verify gradual XP: 1 Feed when hungry gives +10 Pet XP, but feeding again when already >= 92 hunger gives only +3 Pet XP
  mgr.setHungerLevel(70);
  const feed1 = mgr.dispatchPetAction('feed'); // 70 -> 96 hunger (+10 XP)
  assert.equal(feed1.progression.creatureXp, 10);
  const feed2WhenFull = mgr.dispatchPetAction('feed'); // 96 -> 100 hunger (+3 XP diminishing return)
  assert.equal(feed2WhenFull.progression.creatureXp, 13);
  assert.equal(mgr.getState().progression.creatureLevel, 1);

  // Complete quest_feed_sunberry (4 feeds) and quest_pet_bond (5 pets)
  mgr.setHungerLevel(60);
  mgr.dispatchPetAction('feed');
  mgr.setHungerLevel(60);
  mgr.dispatchPetAction('feed');
  for (let i = 0; i < 5; i++) {
    mgr.dispatchPetAction('pet');
  }

  // Claiming both starter quests brings EMBER across the 100 XP threshold to Lv.2
  const claim1 = mgr.claimQuest('quest_feed_sunberry');
  const claim2 = mgr.claimQuest('quest_pet_bond');
  assert.equal(claim1.claimed, true);
  assert.equal(claim2.claimed, true);
  assert.equal(mgr.getState().progression.creatureLevel, 2);
  assert.equal(
    mgr.getState().progression.unlockedCosmetics.includes('collar'),
    true,
  );
  assert.equal(mgr.equipCosmetic('collar'), true);
  // Still Lv.2 (has NOT jumped straight to Lv.3!)
  assert.equal(mgr.equipCosmetic('scarf'), false);

  // Complete play (4x), dance (3x), selfie (2x), and friendship (85%+) quests + daily blessing to gradually reach Lv.3 (338+ XP)
  for (let i = 0; i < 4; i++) {
    mgr.dispatchPetAction('play');
    mgr.dispatchPetAction('sleep');
  }
  for (let i = 0; i < 3; i++) {
    mgr.dispatchPetAction('dance');
  }
  mgr.recordSelfieCapture();
  mgr.recordSelfieCapture();
  mgr.claimDaily();
  mgr.claimQuest('quest_play_orb');
  mgr.claimQuest('quest_dance_party');
  mgr.claimQuest('quest_snap_selfie');
  mgr.claimQuest('quest_friendship_80');

  assert.ok(
    mgr.getState().progression.creatureLevel >= 3,
    `Expected EMBER Lv.3+, got Lv.${mgr.getState().progression.creatureLevel} (${mgr.getState().progression.creatureXp} XP)`,
  );
  assert.equal(
    mgr.getState().progression.unlockedCosmetics.includes('scarf'),
    true,
  );
  assert.equal(mgr.equipCosmetic('scarf'), true);
  assert.equal(mgr.getState().progression.equippedCosmetic, 'scarf');
});

test('background hunger timer periodically decreases hunger and triggers hungry state notifications at low levels', () => {
  // 1. Threshold classification
  assert.equal(getHungerStateLevel(80), 'satisfied');
  assert.equal(isPetHungry(80), false);
  assert.equal(getHungerStateLevel(HUNGER_LOW_THRESHOLD), 'hungry');
  assert.equal(isPetHungry(HUNGER_LOW_THRESHOLD), true);
  assert.equal(getHungerStateLevel(HUNGER_CRITICAL_THRESHOLD), 'starving');
  assert.equal(isPetHungry(HUNGER_CRITICAL_THRESHOLD), true);

  // 2. Single 15s tick decreases hunger deterministically (-2 awake, -1 sleeping)
  const startStats = {
    ...DEFAULT_STATS,
    hunger: 32,
    happiness: 80,
    energy: 80,
    isSleeping: false,
  };
  const tick1 = applyHungerTimerTick(startStats, 15);
  assert.equal(tick1.previousHunger, 32);
  assert.equal(tick1.currentHunger, 30);
  assert.equal(tick1.hungerDelta, -2);
  assert.equal(tick1.hungerState, 'hungry');
  assert.equal(tick1.isHungry, true);
  assert.equal(tick1.crossedIntoHungry, true);
  assert.equal(tick1.shouldNotifyHungry, true);

  // 3. Crossing into starving threshold (<= 15) triggers critical hungry alert
  const nearStarving = { ...tick1.stats, hunger: 16 };
  const tickStarve = applyHungerTimerTick(nearStarving, 15);
  assert.equal(tickStarve.currentHunger, 14);
  assert.equal(tickStarve.hungerState, 'starving');
  assert.equal(tickStarve.crossedIntoStarving, true);
  assert.equal(tickStarve.shouldNotifyHungry, true);

  // 3b. Periodic reminders must fire on odd hunger values too (hunger drops by 2,
  // so `hunger % 6 === 0` never matched an odd starting value)
  const oddHunger = { ...DEFAULT_STATS, hunger: 25, happiness: 80, energy: 80, isSleeping: false };
  const oddTick = applyHungerTimerTick(oddHunger, 15);
  assert.equal(oddTick.currentHunger, 23);
  assert.equal(oddTick.isHungry, true);
  assert.equal(oddTick.shouldNotifyHungry, true);

  // same band, so no reminder
  const sameBand = applyHungerTimerTick({ ...oddHunger, hunger: 27 }, 15);
  assert.equal(sameBand.currentHunger, 25);
  assert.equal(sameBand.shouldNotifyHungry, false);

  // 4. StorageManager.tickRealtimeDecay and subscribeHunger integration
  const mgr = new StorageManager();
  const receivedNotifications: number[] = [];
  const unsub = mgr.subscribeHunger((res) => {
    if (res.shouldNotifyHungry) {
      receivedNotifications.push(res.currentHunger);
    }
  });

  mgr.setHungerLevel(32);
  const decayRes = mgr.tickRealtimeDecay(15);
  assert.equal(decayRes.currentHunger, 30);
  assert.equal(decayRes.isHungry, true);
  assert.equal(mgr.getState().stats.hunger, 30);
  assert.ok(
    receivedNotifications.includes(30),
    'Listener must be notified when hunger crosses into <= 30 hungry threshold',
  );

  // Feeding the pet restores hunger above threshold and clears hungry state
  const feedRes = mgr.dispatchPetAction('feed');
  assert.ok(feedRes.stats.hunger > HUNGER_LOW_THRESHOLD);
  assert.equal(isPetHungry(mgr.getState().stats.hunger), false);

  unsub();
});

test('feed action triggers celebratory golden spark burst descriptors and slight jump animation arc', async () => {
  const {
    buildFeedGoldenSparkBurst,
    computeFeedJumpOffset,
    FEED_GOLDEN_SPARK_COUNT,
    FEED_JUMP_PEAK_OFFSET,
  } = await import('./rules');

  // 1. Golden spark burst produces a full 360-degree celebratory halo of golden sparks
  const sparks = buildFeedGoldenSparkBurst();
  assert.equal(sparks.length, FEED_GOLDEN_SPARK_COUNT);
  for (const s of sparks) {
    assert.ok(s.radialSpeed > 0.35 && s.radialSpeed < 1.2);
    assert.ok(s.upwardSpeed > 0.75 && s.upwardSpeed < 1.8);
    assert.ok(s.maxLife >= 0.85 && s.maxLife <= 1.45);
    assert.ok(
      [0xffd700, 0xffab00, 0xfde047, 0xfffbeb, 0xf59e0b].includes(s.colorHex),
      `Expected golden spark palette color, got ${s.colorHex.toString(16)}`,
    );
  }

  // 2. Slight celebratory jump animation curve rises cleanly above 0 and peaks at FEED_JUMP_PEAK_OFFSET
  assert.equal(computeFeedJumpOffset(0), 0);
  const peakHop = computeFeedJumpOffset(0.26);
  assert.ok(
    Math.abs(peakHop - FEED_JUMP_PEAK_OFFSET) < 0.005,
    `Expected primary hop peak near ${FEED_JUMP_PEAK_OFFSET}m, got ${peakHop}`,
  );
  const secondBounce = computeFeedJumpOffset(0.72);
  assert.ok(
    secondBounce > 0.07 && secondBounce < 0.095,
    `Expected secondary joyful bounce around 0.085m, got ${secondBounce}`,
  );
});

test('collision resolution prevents walking through the Fantasy Castle from any direction including river/waterfall side', async () => {
  const { isPointInsideCastle } = await import('./rules');

  // 1. Approaching straight into the front gatehouse (x = -1.0, z = -17.0 -> -21.0)
  const fromFront = resolveIslandMovement(-1.0, -17.0, -1.0, -21.0);
  assert.equal(
    isPointInsideCastle(fromFront.x, fromFront.z),
    false,
    `Character must not walk through front gatehouse of Castle (${JSON.stringify(fromFront)})`,
  );

  // 2. Approaching into front-left corner tower (x = -4.48, z = -18.0 -> -20.5)
  const fromFrontLeft = resolveIslandMovement(-4.48, -18.0, -4.48, -20.5);
  assert.equal(
    isPointInsideCastle(fromFrontLeft.x, fromFrontLeft.z),
    false,
    `Character must not walk through front-left Castle tower (${JSON.stringify(fromFrontLeft)})`,
  );

  // 3. Approaching into front-right corner tower (x = 2.48, z = -18.0 -> -20.5)
  const fromFrontRight = resolveIslandMovement(2.48, -18.0, 2.48, -20.5);
  assert.equal(
    isPointInsideCastle(fromFrontRight.x, fromFrontRight.z),
    false,
    `Character must not walk through front-right Castle tower (${JSON.stringify(fromFrontRight)})`,
  );

  // 4. Approaching from the East wall (x = 4.5 -> 0.0, z = -22.2)
  const fromEast = resolveIslandMovement(4.5, -22.2, 0.0, -22.2);
  assert.equal(
    isPointInsideCastle(fromEast.x, fromEast.z),
    false,
    `Character must not walk through East wall of Castle (${JSON.stringify(fromEast)})`,
  );

  // 5. Approaching near the West waterfall/river pinch zone (x = -4.0, z = -18.1 -> -21.5)
  const fromWestRiverPinch = resolveIslandMovement(-4.0, -18.1, -4.0, -21.5);
  assert.equal(
    isPointInsideCastle(fromWestRiverPinch.x, fromWestRiverPinch.z),
    false,
    `River/cliff push must never force character inside West wall of Castle (${JSON.stringify(fromWestRiverPinch)})`,
  );
});


