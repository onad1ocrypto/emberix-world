import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DANCE_TRACKS,
  DEFAULT_PROGRESSION,
  DEFAULT_STATS,
  PLAYER_AVATARS,
} from '../constants';
import { getTranslation, LANGUAGE_OPTIONS } from '../i18n/translations';
import { StorageManager } from '../storage/StorageManager';
import {
  applyTimeDecay,
  calculateFriendshipLevel,
  calculateLevelFromXp,
  canClaimDailyReward,
  claimDailyReward,
  clampToIslandBounds,
  getIslandZoneLabel,
  groundHeightAt,
  ISLAND_ROCKS,
  ISLAND_TREES,
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

test('copyright-free dance tracks and player registration/login system work accurately', () => {
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
  assert.equal(mgr.getCurrentUser(), null);

  // Register new player account
  const regRes = mgr.registerAccount({
    username: 'DinoTamer',
    email: 'dino@solara.id',
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
    email: 'other@solara.id',
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
    email: 'fire@solara.id',
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



