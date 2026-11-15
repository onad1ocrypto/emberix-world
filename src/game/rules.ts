import {
  ACHIEVEMENTS,
  COSMETICS,
  ISLAND_PLAYABLE_RADIUS,
} from '../constants';
import type {
  CosmeticId,
  EmberAnimationState,
  MindTargetHeader,
  PetActionType,
  PetStats,
  ProgressionState,
} from '../types';

export function clampStat(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(val)));
}

export function xpRequiredForLevel(level: number): number {
  return Math.max(100, Math.round(100 * Math.pow(level, 1.25)));
}

export function calculateLevelFromXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  let req = xpRequiredForLevel(level);
  while (remaining >= req && level < 50) {
    remaining -= req;
    level++;
    req = xpRequiredForLevel(level);
  }
  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: req,
    progressPercent: Math.min(100, Math.round((remaining / req) * 100)),
  };
}

export function calculateFriendshipLevel(friendshipStat: number): number {
  const clamped = clampStat(friendshipStat);
  return Math.max(1, Math.min(10, Math.floor(clamped / 10) + 1));
}

export function applyTimeDecay(
  stats: PetStats,
  elapsedSeconds: number,
): PetStats {
  if (elapsedSeconds <= 0) return { ...stats };
  // Cap maximum offline decay to 4 hours so the pet is never completely drained
  const cappedSeconds = Math.min(elapsedSeconds, 4 * 3600);
  const minutes = cappedSeconds / 60;

  if (stats.isSleeping) {
    return {
      hunger: clampStat(stats.hunger - minutes * 0.35),
      happiness: clampStat(stats.happiness - minutes * 0.15),
      energy: clampStat(stats.energy + minutes * 2.4),
      friendship: clampStat(stats.friendship),
      isSleeping: stats.energy + minutes * 2.4 < 99,
    };
  }

  return {
    hunger: clampStat(stats.hunger - minutes * 0.6),
    happiness: clampStat(stats.happiness - minutes * 0.45),
    energy: clampStat(stats.energy - minutes * 0.5),
    friendship: clampStat(stats.friendship - minutes * 0.1),
    isSleeping: false,
  };
}

/**
 * Thresholds & interval for the periodic background hunger timer system.
 */
export const HUNGER_LOW_THRESHOLD = 30;
export const HUNGER_CRITICAL_THRESHOLD = 15;
export const HUNGER_TICK_INTERVAL_MS = 15000;

export type HungerStateLevel = 'satisfied' | 'hungry' | 'starving';

export interface HungerTickResult {
  stats: PetStats;
  previousHunger: number;
  currentHunger: number;
  hungerDelta: number;
  hungerState: HungerStateLevel;
  isHungry: boolean;
  crossedIntoHungry: boolean;
  crossedIntoStarving: boolean;
  shouldNotifyHungry: boolean;
}

export function getHungerStateLevel(hunger: number): HungerStateLevel {
  const clamped = clampStat(hunger);
  if (clamped <= HUNGER_CRITICAL_THRESHOLD) return 'starving';
  if (clamped <= HUNGER_LOW_THRESHOLD) return 'hungry';
  return 'satisfied';
}

export function isPetHungry(hunger: number): boolean {
  return clampStat(hunger) <= HUNGER_LOW_THRESHOLD;
}

/**
 * Periodically decreases the virtual pet's `hunger` stat on each background timer tick
 * (default 15 seconds per tick: -2 hunger when awake, -1 hunger when sleeping) and
 * evaluates whether a hungry state notification should be triggered.
 */
export function applyHungerTimerTick(
  stats: PetStats,
  elapsedSeconds = 15,
): HungerTickResult {
  const prevHunger = clampStat(stats.hunger);
  if (elapsedSeconds <= 0) {
    const state = getHungerStateLevel(prevHunger);
    return {
      stats: { ...stats, hunger: prevHunger },
      previousHunger: prevHunger,
      currentHunger: prevHunger,
      hungerDelta: 0,
      hungerState: state,
      isHungry: state !== 'satisfied',
      crossedIntoHungry: false,
      crossedIntoStarving: false,
      shouldNotifyHungry: false,
    };
  }

  const ticks = Math.max(1, Math.round(elapsedSeconds / 15));
  const hungerLossPerTick = stats.isSleeping ? 1 : 2;
  const nextHunger = clampStat(prevHunger - ticks * hungerLossPerTick);

  const nextHappiness = stats.isSleeping
    ? clampStat(stats.happiness)
    : clampStat(
        stats.happiness -
          ticks * (nextHunger <= HUNGER_LOW_THRESHOLD ? 2 : 1),
      );
  const nextEnergy = stats.isSleeping
    ? clampStat(stats.energy + ticks * 3)
    : clampStat(stats.energy - ticks * 1);
  const nextFriendship =
    nextHunger <= HUNGER_CRITICAL_THRESHOLD && !stats.isSleeping
      ? clampStat(stats.friendship - ticks * 1)
      : clampStat(stats.friendship);
  const stillSleeping = stats.isSleeping ? nextEnergy < 99 : false;

  const nextStats: PetStats = {
    hunger: nextHunger,
    happiness: nextHappiness,
    energy: nextEnergy,
    friendship: nextFriendship,
    isSleeping: stillSleeping,
  };

  const prevState = getHungerStateLevel(prevHunger);
  const nextState = getHungerStateLevel(nextHunger);
  const crossedIntoHungry =
    prevState === 'satisfied' &&
    (nextState === 'hungry' || nextState === 'starving');
  const crossedIntoStarving =
    prevState !== 'starving' && nextState === 'starving';
  const isHungry = nextState !== 'satisfied';
  const shouldNotifyHungry =
    crossedIntoHungry ||
    crossedIntoStarving ||
    (isHungry && nextHunger < prevHunger && nextHunger % 6 === 0);

  return {
    stats: nextStats,
    previousHunger: prevHunger,
    currentHunger: nextHunger,
    hungerDelta: nextHunger - prevHunger,
    hungerState: nextState,
    isHungry,
    crossedIntoHungry,
    crossedIntoStarving,
    shouldNotifyHungry,
  };
}

export interface PetActionResult {
  stats: PetStats;
  progression: ProgressionState;
  animation: EmberAnimationState;
  feedbackText: string;
  leveledUpPlayer: boolean;
  leveledUpCreature: boolean;
  newlyUnlockedAchievements: string[];
  newlyUnlockedCosmetics: CosmeticId[];
}

export function performPetAction(
  action: PetActionType,
  currentStats: PetStats,
  currentProgression: ProgressionState,
): PetActionResult {
  const stats: PetStats = { ...currentStats };
  const prog: ProgressionState = {
    ...currentProgression,
    unlockedCosmetics: [...currentProgression.unlockedCosmetics],
    unlockedAchievements: [...currentProgression.unlockedAchievements],
  };

  let animation: EmberAnimationState = 'idle';
  let feedbackText = '';
  let playerXpGain = 0;
  let creatureXpGain = 0;

  if (action === 'wake') {
    stats.isSleeping = false;
    stats.energy = clampStat(Math.max(stats.energy, 45));
    animation = 'surprised';
    feedbackText = 'EMBER woke up refreshed and stretched its wings!';
    playerXpGain = 10;
    creatureXpGain = 12;
  } else if (action === 'sleep') {
    stats.isSleeping = true;
    stats.energy = clampStat(stats.energy + 28);
    stats.happiness = clampStat(stats.happiness + 4);
    animation = 'sleeping';
    feedbackText = 'EMBER curled up in a warm ember glow to rest (+28 Energy).';
    playerXpGain = 15;
    creatureXpGain = 18;
  } else {
    // Any active action wakes EMBER up gently
    stats.isSleeping = false;

    switch (action) {
      case 'pet':
        stats.friendship = clampStat(stats.friendship + 10);
        stats.happiness = clampStat(stats.happiness + 8);
        animation = 'happy';
        feedbackText = 'EMBER purred warmly and nuzzled your hand! (+10 Friendship)';
        playerXpGain = 22;
        creatureXpGain = 28;
        prog.petCount += 1;
        break;

      case 'feed':
        stats.hunger = clampStat(stats.hunger + 26);
        stats.happiness = clampStat(stats.happiness + 7);
        stats.energy = clampStat(stats.energy + 8);
        stats.friendship = clampStat(stats.friendship + 5);
        animation = 'eating';
        feedbackText = 'EMBER munched a Roasted Sunberry happily! (+26 Hunger)';
        playerXpGain = 28;
        creatureXpGain = 35;
        prog.feedCount += 1;
        break;

      case 'play':
        if (stats.energy < 12) {
          animation = 'sleeping';
          stats.isSleeping = true;
          feedbackText = 'EMBER is too sleepy to play and curled up for a nap!';
          playerXpGain = 8;
          creatureXpGain = 10;
        } else {
          stats.happiness = clampStat(stats.happiness + 22);
          stats.friendship = clampStat(stats.friendship + 9);
          stats.energy = clampStat(stats.energy - 10);
          stats.hunger = clampStat(stats.hunger - 6);
          animation = 'jump';
          feedbackText = 'EMBER leaped after the Fire Orb in excitement! (+22 Happiness)';
          playerXpGain = 32;
          creatureXpGain = 40;
          prog.playCount += 1;
        }
        break;

      case 'dance':
        stats.happiness = clampStat(stats.happiness + 18);
        stats.friendship = clampStat(stats.friendship + 8);
        stats.energy = clampStat(stats.energy - 6);
        animation = 'dancing';
        feedbackText = 'EMBER twirled and danced a joyful flame rhythm! (+18 Happiness)';
        playerXpGain = 26;
        creatureXpGain = 32;
        prog.danceCount += 1;
        break;

      case 'surprise':
        stats.happiness = clampStat(stats.happiness + 12);
        stats.friendship = clampStat(stats.friendship + 6);
        animation = 'surprised';
        feedbackText = 'EMBER gasped with sparkling eyes and puffed a tiny smoke ring!';
        playerXpGain = 20;
        creatureXpGain = 24;
        break;
    }
  }

  prog.totalInteractions += 1;
  prog.playerXp += playerXpGain;
  prog.creatureXp += creatureXpGain;

  const prevPlayerLevel = prog.playerLevel;
  const prevCreatureLevel = prog.creatureLevel;

  prog.playerLevel = calculateLevelFromXp(prog.playerXp).level;
  prog.creatureLevel = calculateLevelFromXp(prog.creatureXp).level;
  prog.friendshipLevel = calculateFriendshipLevel(stats.friendship);
  prog.lastSavedAt = Date.now();

  const newlyUnlockedCosmetics: CosmeticId[] = [];
  for (const cosmetic of COSMETICS) {
    if (
      prog.creatureLevel >= cosmetic.requiredCreatureLevel &&
      !prog.unlockedCosmetics.includes(cosmetic.id)
    ) {
      prog.unlockedCosmetics.push(cosmetic.id);
      newlyUnlockedCosmetics.push(cosmetic.id);
    }
  }

  const newlyUnlockedAchievements = evaluateAchievements(stats, prog);

  return {
    stats,
    progression: prog,
    animation,
    feedbackText,
    leveledUpPlayer: prog.playerLevel > prevPlayerLevel,
    leveledUpCreature: prog.creatureLevel > prevCreatureLevel,
    newlyUnlockedAchievements,
    newlyUnlockedCosmetics,
  };
}

export function evaluateAchievements(
  stats: PetStats,
  prog: ProgressionState,
): string[] {
  const newlyUnlocked: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !prog.unlockedAchievements.includes(id)) {
      prog.unlockedAchievements.push(id);
      newlyUnlocked.push(id);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        prog.playerXp += def.xpReward;
        prog.playerLevel = calculateLevelFromXp(prog.playerXp).level;
      }
    }
  };

  check('first_bond', prog.petCount >= 1);
  check('gourmet_keeper', prog.feedCount >= 3);
  check('dance_partner', prog.danceCount >= 1);
  check('level_3_dragon', prog.creatureLevel >= 3);
  check('ar_summoner', prog.arScanCount >= 1);
  check('best_friends', stats.friendship >= 90);

  return newlyUnlocked;
}

export function canClaimDailyReward(
  lastDailyClaimDate: string,
  todayIsoDate: string,
): boolean {
  return lastDailyClaimDate !== todayIsoDate;
}

export function claimDailyReward(
  stats: PetStats,
  prog: ProgressionState,
  todayIsoDate: string,
): {
  claimed: boolean;
  stats: PetStats;
  progression: ProgressionState;
  rewardSummary: string;
} {
  if (!canClaimDailyReward(prog.lastDailyClaimDate, todayIsoDate)) {
    return {
      claimed: false,
      stats,
      progression: prog,
      rewardSummary: 'Daily Sunstone Blessing already claimed today!',
    };
  }

  const nextStats: PetStats = {
    ...stats,
    hunger: clampStat(stats.hunger + 20),
    happiness: clampStat(stats.happiness + 20),
    energy: clampStat(stats.energy + 25),
    friendship: clampStat(stats.friendship + 12),
  };

  const nextProg: ProgressionState = {
    ...prog,
    playerXp: prog.playerXp + 75,
    creatureXp: prog.creatureXp + 90,
    lastDailyClaimDate: todayIsoDate,
  };
  nextProg.playerLevel = calculateLevelFromXp(nextProg.playerXp).level;
  nextProg.creatureLevel = calculateLevelFromXp(nextProg.creatureXp).level;
  nextProg.friendshipLevel = calculateFriendshipLevel(nextStats.friendship);

  return {
    claimed: true,
    stats: nextStats,
    progression: nextProg,
    rewardSummary:
      'Claimed Daily Sunstone Blessing: +75 Player XP, +90 Dragon XP, and full care boost!',
  };
}

/**
 * Water surface elevation for the flowing river and waterfall plunge pool.
 */
export const WATER_SURFACE_Y = 0.68;

/**
 * Wooden bridge bounds spanning across the river at z ≈ 0.
 */
export const BRIDGE_MIN_X = -9.8;
export const BRIDGE_MAX_X = -2.6;
export const BRIDGE_WALKWAY_HALF_Z = 1.32;
export const BRIDGE_RAILING_Z = 1.68;

/**
 * Bridge stone abutment pillars and wooden railing posts (tiang jembatan).
 */
export const BRIDGE_PILLAR_COLLIDERS: ReadonlyArray<{
  x: number;
  z: number;
  radius: number;
}> = [
  // 4 Stone corner abutment pillars at bridge entrances
  { x: -9.8, z: -1.72, radius: 0.56 },
  { x: -9.8, z: 1.72, radius: 0.56 },
  { x: -2.6, z: -1.72, radius: 0.56 },
  { x: -2.6, z: 1.72, radius: 0.56 },
  // Timber support & railing posts along both sides of the bridge
  { x: -8.6, z: -1.68, radius: 0.42 },
  { x: -8.6, z: 1.68, radius: 0.42 },
  { x: -7.4, z: -1.68, radius: 0.42 },
  { x: -7.4, z: 1.68, radius: 0.42 },
  { x: -6.2, z: -1.68, radius: 0.42 },
  { x: -6.2, z: 1.68, radius: 0.42 },
  { x: -5.0, z: -1.68, radius: 0.42 },
  { x: -5.0, z: 1.68, radius: 0.42 },
  { x: -3.8, z: -1.68, radius: 0.42 },
  { x: -3.8, z: 1.68, radius: 0.42 },
];

/**
 * Deterministic X centerline of the winding small river at any Z coordinate.
 * Passes directly underneath the center of the wooden bridge (x = -6.2) at z = 0.
 */
export function riverCenterXAt(z: number): number {
  return Math.sin(z * 0.15) * 2.2 - 6.2;
}

/**
 * Half-width of the water channel at a given Z coordinate (wider at the northern waterfall lagoon).
 */
export function riverWaterHalfWidthAt(z: number): number {
  if (z < -14.5) {
    // Smoothly widen into the waterfall plunge pool around z = -18
    const poolFactor = Math.max(0, 1 - Math.abs(z + 18.0) / 4.2);
    return 2.25 + poolFactor * 1.45;
  }
  return 2.25;
}

/**
 * Computes the wooden bridge deck arch elevation at (x, z).
 */
export function bridgeDeckHeightAt(x: number): number {
  const clampedX = Math.max(BRIDGE_MIN_X, Math.min(BRIDGE_MAX_X, x));
  const bridgeT = (clampedX - BRIDGE_MIN_X) / (BRIDGE_MAX_X - BRIDGE_MIN_X);
  return 1.06 + Math.sin(bridgeT * Math.PI) * 0.82;
}

/**
 * Natural terrain & riverbed heightmap (used by the 3D terrain mesh so the river channel
 * remains carved deep underneath the wooden bridge instead of blocking water flow).
 */
export function terrainHeightAt(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  if (dist > 45) return -2.2;

  // Smooth island dome falloff
  const normalizedDist = dist / 42;
  let baseHeight = Math.max(-1.8, (1 - Math.pow(normalizedDist, 2.3)) * 1.45);

  // Central Sunstone Sanctuary flat plateau around (0, 0) so the circular sanctuary pad never overhangs
  const centerDist = Math.hypot(x, z);
  if (centerDist <= 2.35) {
    baseHeight = 1.48;
  } else if (centerDist < 6.5) {
    const t = Math.max(0, 1 - (centerDist - 2.35) / (6.5 - 2.35));
    baseHeight = baseHeight * (1 - t * 0.65) + 1.48 * (t * 0.65);
  }

  // Gentle rolling hills outside center and away from the river
  const riverCenterX = riverCenterXAt(z);
  const distToRiver = Math.abs(x - riverCenterX);
  const hills =
    Math.sin(x * 0.18) * Math.cos(z * 0.18) * 0.22 +
    Math.cos((x + z) * 0.11) * 0.14;
  if (centerDist > 5.0 && distToRiver > 3.5) {
    baseHeight += hills * Math.min(1, (distToRiver - 3.5) / 2.0);
  }

  // Northern waterfall cliff terrace behind the plunge pool (around x: -6.5, z: -23.5)
  const cliffDist = Math.hypot(x + 6.5, z + 23.8);
  if (cliffDist < 8.8 && z < -18.2) {
    baseHeight += Math.pow(1 - cliffDist / 8.8, 1.55) * 3.8;
  }

  // Carve the small river channel and waterfall plunge pool deep below WATER_SURFACE_Y (0.68)
  // so water visibly flows from the waterfall, through the meadow, and underneath the bridge!
  const bankHalfWidth = riverWaterHalfWidthAt(z) + 0.95;
  if (distToRiver < bankHalfWidth && z >= -20.5 && z <= 32.0) {
    const normalizedRiverDist = distToRiver / bankHalfWidth;
    const smoothProfile = Math.cos(normalizedRiverDist * (Math.PI / 2));
    const carvedBedY = 0.14;
    baseHeight =
      baseHeight * (1 - smoothProfile * 0.92) +
      carvedBedY * (smoothProfile * 0.92);
  }

  return baseHeight;
}

/**
 * Deterministic walkable heightmap function for Solara Fantasy Island.
 * Used by props placement, player physics, and EMBER companion AI.
 * Includes the elevated wooden bridge deck over the river and flush sanctuary/nest pads.
 */
export function groundHeightAt(x: number, z: number): number {
  const baseTerrainY = terrainHeightAt(x, z);

  // Wooden bridge arch over the river at z ∈ [-1.72, 1.72], x ∈ [-9.8, -2.6]
  if (
    Math.abs(z) <= BRIDGE_RAILING_Z &&
    x >= BRIDGE_MIN_X - 0.25 &&
    x <= BRIDGE_MAX_X + 0.25
  ) {
    return Math.max(baseTerrainY, bridgeDeckHeightAt(x));
  }

  // Central Sanctuary Circle Pad at (0, 0) (radius 2.25m) — keep character feet on top of the moss pad
  const centerDist = Math.hypot(x, z);
  if (centerDist <= 2.3) {
    return Math.max(baseTerrainY, 1.48 + 0.05);
  }

  // Cozy Colorful Dino Beds at (3.35, 0.45) and (5.6, 5.8) (radius 1.25m) — keep character feet on top of the plush mattress
  const arenaBedDist = Math.hypot(x - 3.35, z - 0.45);
  if (arenaBedDist <= 1.25) {
    return Math.max(baseTerrainY, terrainHeightAt(3.35, 0.45) + 0.18);
  }
  const nestDist = Math.hypot(x - 5.6, z - 5.8);
  if (nestDist <= 1.25) {
    return Math.max(baseTerrainY, terrainHeightAt(5.6, 5.8) + 0.18);
  }

  return baseTerrainY;
}

export interface IslandTreePlacement {
  x: number;
  y: number;
  z: number;
  rotY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  colliderRadius: number;
  colorIndex: number;
}

export interface IslandRockPlacement {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  colliderRadius: number;
}

function buildDeterministicTrees(maxTrees = 62): ReadonlyArray<IslandTreePlacement> {
  const result: IslandTreePlacement[] = [];
  for (let i = 0; i < maxTrees * 2 && result.length < maxTrees; i++) {
    const angle = (i * 2.39996) % (Math.PI * 2);
    const radius = 10.5 + ((i * 1.73) % 24);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Keep river, bridge, cottage, sunberry bush, dino beds, and castle vista clear
    const riverCenterX = riverCenterXAt(z);
    if (Math.abs(x - riverCenterX) < riverWaterHalfWidthAt(z) + 2.2) continue;
    if (Math.hypot(x - 7.5, z + 4.5) < 3.5) continue;
    if (Math.hypot(x - 4.95, z + 7.6) < 4.5) continue;
    if (Math.hypot(x - 3.35, z - 0.45) < 3.2) continue;
    if (Math.hypot(x - 5.6, z - 5.8) < 3.2) continue;
    if (Math.hypot(x + 11.2, z + 1.5) < 4.2) continue;
    if (z < -10 && Math.abs(x + 1.5) < 8.5) continue;

    const y = terrainHeightAt(x, z);
    const s = 0.82 + ((i * 13) % 45) * 0.01;
    const sy = s * (0.92 + ((i * 7) % 30) * 0.01);
    result.push({
      x,
      y: y - 0.05,
      z,
      rotY: (i * 1.1) % 6.28,
      scaleX: s,
      scaleY: sy,
      scaleZ: s,
      colliderRadius: 0.58 * s,
      colorIndex: i,
    });
  }
  return result;
}

function buildDeterministicRocks(rockCount = 38): ReadonlyArray<IslandRockPlacement> {
  const result: IslandRockPlacement[] = [];
  for (let i = 0; i < rockCount * 2 && result.length < rockCount; i++) {
    const a = (i / rockCount) * Math.PI * 2 + 0.4;
    const r = 7.5 + ((i * 5.3) % 27);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x - riverCenterXAt(z)) < riverWaterHalfWidthAt(z) + 1.4) {
      continue;
    }
    // Keep away from bridge entrances, cottage, sunberry bush, dino beds, and west meadow flower garden
    if (Math.hypot(x - BRIDGE_MAX_X, z) < 2.8) continue;
    if (Math.hypot(x - BRIDGE_MIN_X, z) < 2.8) continue;
    if (Math.hypot(x - 4.95, z + 7.6) < 3.8) continue;
    if (Math.hypot(x - 7.5, z + 4.5) < 2.6) continue;
    if (Math.hypot(x - 3.35, z - 0.45) < 2.6) continue;
    if (Math.hypot(x - 5.6, z - 5.8) < 2.6) continue;
    if (Math.hypot(x + 11.2, z + 1.5) < 3.4) continue;

    const y = terrainHeightAt(x, z);
    const sx = 0.7 + (i % 4) * 0.3;
    const sy = 0.5 + (i % 3) * 0.25;
    const sz = 0.7 + (i % 5) * 0.25;
    result.push({
      x,
      y: y + 0.15,
      z,
      rotX: i * 0.5,
      rotY: i * 1.2,
      scaleX: sx,
      scaleY: sy,
      scaleZ: sz,
      colliderRadius: Math.max(sx, sz) * 0.58 + 0.22,
    });
  }
  return result;
}

export const ISLAND_TREES = buildDeterministicTrees(62);
export const ISLAND_ROCKS = buildDeterministicRocks(38);

/**
 * Solid circular colliders for all buildings, crystal pedestals, flower gardens,
 * giant mushroom clusters, and bushes on the island so neither the player nor EMBER
 * can walk through or sink half-body into them.
 */
export const ISLAND_SOLID_OBSTACLES: ReadonlyArray<{
  x: number;
  z: number;
  radius: number;
}> = [
  // 1. Dragon Pet Sanctuary House ("Rumah Pet" at x: 4.95, z: -7.6) + Side Turret + Porch
  { x: 4.95, z: -7.6, radius: 2.35 },
  { x: 3.45, z: -7.25, radius: 1.45 },
  { x: 5.55, z: -6.45, radius: 1.25 },

  // 2. Fantasy Castle ("Kastil Fantasi" at x: -1.0, z: -22.2)
  { x: -1.0, z: -22.2, radius: 4.4 },
  { x: -4.2, z: -22.2, radius: 2.2 },
  { x: 2.2, z: -22.2, radius: 2.2 },

  // 3. Sunberry Orchard Bush (at x: 7.5, z: -4.5) — solid core while 3.2m interactive zone stays reachable
  { x: 7.5, z: -4.5, radius: 1.32 },

  // 4. All 5 Magical Crystal Pedestals (including the one near the bridge at x: -2.4, z: -3.2!)
  { x: -13.5, z: 3.5, radius: 1.08 },
  { x: 4.5, z: -7.5, radius: 1.08 },
  { x: -2.4, z: -3.2, radius: 1.08 },
  { x: 4.8, z: 2.2, radius: 1.08 },
  { x: 12.2, z: -1.8, radius: 1.08 },

  // 5. All 3 Enchanted Flower Garden Circular Beds (relocated away from front of Pet House!)
  { x: -11.2, z: -1.5, radius: 1.82 },
  { x: -2.15, z: 2.85, radius: 1.55 },
  { x: 9.8, z: 3.8, radius: 1.45 },

  // 6. All Giant Spotted Mushroom Clusters
  { x: 1.6, z: -1.5, radius: 0.85 },
  { x: -2.0, z: -1.7, radius: 0.88 },
  { x: 3.55, z: -6.05, radius: 0.85 },
  { x: -4.5, z: 7.05, radius: 0.88 },
  { x: -11.8, z: -4.9, radius: 0.88 },
  { x: 9.7, z: 2.5, radius: 0.88 },
  { x: -2.5, z: -11.0, radius: 0.78 },
];

/**
 * Returns true if the (x, z) point lies inside the river or waterfall pool
 * and is NOT on the wooden bridge walkway.
 */
export function isPointInRiverWater(x: number, z: number): boolean {
  // On the wooden bridge walkway, the character is safely above the river
  if (
    x >= BRIDGE_MIN_X - 0.15 &&
    x <= BRIDGE_MAX_X + 0.15 &&
    Math.abs(z) <= BRIDGE_WALKWAY_HALF_Z
  ) {
    return false;
  }

  if (z < -20.5 || z > 31.0) return false;
  const center = riverCenterXAt(z);
  const safeHalfWidth = riverWaterHalfWidthAt(z) + 0.35;
  return Math.abs(x - center) < safeHalfWidth;
}

/**
 * Resolves player and companion movement against:
 * 1. Bridge pillars and side railings (tiang-tiang jembatan) so characters never clip through posts.
 * 2. Buildings (Pet House, Castle), Trees, Rocks, Crystal Pedestals, Flower Gardens, and Giant Mushrooms.
 * 3. The flowing river and waterfall plunge pool so characters cannot enter the water
 *    (must use the wooden bridge to cross).
 * 4. Island playable boundary radius.
 */
export function resolveIslandMovement(
  prevX: number,
  prevZ: number,
  nextX: number,
  nextZ: number,
  maxRadius = ISLAND_PLAYABLE_RADIUS,
): {
  x: number;
  z: number;
  blockedByRiver: boolean;
  blockedByBridgePillar: boolean;
} {
  let x = nextX;
  let z = nextZ;
  let blockedByRiver = false;
  let blockedByBridgePillar = false;

  const wasOnBridgeSpanX =
    prevX >= BRIDGE_MIN_X - 0.15 && prevX <= BRIDGE_MAX_X + 0.15;
  const wasInsideWalkwayZ = Math.abs(prevZ) <= BRIDGE_WALKWAY_HALF_Z + 0.05;

  // 1. Bridge side railings & post barriers along x ∈ [BRIDGE_MIN_X, BRIDGE_MAX_X]
  if (x >= BRIDGE_MIN_X - 0.2 && x <= BRIDGE_MAX_X + 0.2) {
    if (wasInsideWalkwayZ) {
      // Character is on the bridge walkway: prevent walking sideways through the posts/railings into the river
      if (Math.abs(z) > BRIDGE_WALKWAY_HALF_Z) {
        z = Math.sign(z) * BRIDGE_WALKWAY_HALF_Z;
        blockedByBridgePillar = true;
      }
    } else if (wasOnBridgeSpanX && Math.abs(prevZ) >= BRIDGE_RAILING_Z) {
      // Character is outside the bridge beside the railing: prevent walking sideways into the bridge railing/under-bridge river
      const outerSafeZ = BRIDGE_RAILING_Z + 0.42;
      if (Math.abs(z) < outerSafeZ) {
        z = (prevZ >= 0 ? 1 : -1) * outerSafeZ;
        blockedByBridgePillar = true;
      }
    }
  }

  // Helper to push (x, z) outside a circular obstacle
  const resolveCircleCollider = (cx: number, cz: number, r: number): boolean => {
    const dx = x - cx;
    const dz = z - cz;
    const dist = Math.hypot(dx, dz);
    if (dist < r) {
      if (dist > 0.0001) {
        const pushScale = r / dist;
        x = cx + dx * pushScale;
        z = cz + dz * pushScale;
      } else {
        const pdx = prevX - cx;
        const pdz = prevZ - cz;
        const pDist = Math.hypot(pdx, pdz) || 1;
        x = cx + (pdx / pDist) * r;
        z = cz + (pdz / pDist) * r;
      }
      return true;
    }
    return false;
  };

  // 2. Individual circular colliders for all 14 bridge pillars & posts (tiang jembatan)
  for (const pillar of BRIDGE_PILLAR_COLLIDERS) {
    if (resolveCircleCollider(pillar.x, pillar.z, pillar.radius)) {
      blockedByBridgePillar = true;
    }
  }

  // 3. Solid Buildings, Crystal Pedestals, Flower Gardens, Mushrooms, Trees, and Rocks
  for (const obs of ISLAND_SOLID_OBSTACLES) {
    resolveCircleCollider(obs.x, obs.z, obs.radius);
  }
  for (const tree of ISLAND_TREES) {
    resolveCircleCollider(tree.x, tree.z, tree.colliderRadius);
  }
  for (const rock of ISLAND_ROCKS) {
    resolveCircleCollider(rock.x, rock.z, rock.colliderRadius);
  }

  // 4. River & Waterfall Plunge Pool collision (outside the wooden bridge walkway)
  const onBridgeWalkway =
    x >= BRIDGE_MIN_X - 0.15 &&
    x <= BRIDGE_MAX_X + 0.15 &&
    Math.abs(z) <= BRIDGE_WALKWAY_HALF_Z;

  if (!onBridgeWalkway && z >= -20.8 && z <= 31.0) {
    const riverCenter = riverCenterXAt(z);
    const safeBankDist = riverWaterHalfWidthAt(z) + 0.38;
    const distFromCenter = x - riverCenter;

    if (Math.abs(distFromCenter) < safeBankDist) {
      blockedByRiver = true;
      // Keep the character on the bank side they approached from
      const prevRiverCenter = riverCenterXAt(prevZ);
      const bankSign =
        Math.abs(prevX - prevRiverCenter) > 0.05
          ? Math.sign(prevX - prevRiverCenter)
          : distFromCenter >= 0
            ? 1
            : -1;
      x = riverCenter + bankSign * safeBankDist;
    }
  }

  // 5. Northern Waterfall Cliff boulders barrier (around x: -6.5, z: -22.5)
  resolveCircleCollider(-6.5, -22.5, 4.6);

  // 6. Re-verify bridge walkway Z clamp if river push nudged X back into bridge span
  if (
    wasInsideWalkwayZ &&
    x >= BRIDGE_MIN_X - 0.15 &&
    x <= BRIDGE_MAX_X + 0.15 &&
    Math.abs(z) > BRIDGE_WALKWAY_HALF_Z
  ) {
    z = Math.sign(z) * BRIDGE_WALKWAY_HALF_Z;
    blockedByBridgePillar = true;
  }

  // 7. Clamp to overall island playable boundary
  const clamped = clampToIslandBounds(x, z, maxRadius);
  return {
    x: clamped.x,
    z: clamped.z,
    blockedByRiver,
    blockedByBridgePillar,
  };
}

export function isPositionInBounds(
  x: number,
  z: number,
  maxRadius = ISLAND_PLAYABLE_RADIUS,
): boolean {
  return Math.hypot(x, z) <= maxRadius;
}

export function clampToIslandBounds(
  x: number,
  z: number,
  maxRadius = ISLAND_PLAYABLE_RADIUS,
): { x: number; z: number } {
  const dist = Math.hypot(x, z);
  if (dist <= maxRadius || dist === 0) return { x, z };
  const scale = maxRadius / dist;
  return { x: x * scale, z: z * scale };
}

export const MINIMAP_CENTER_X = 50;
export const MINIMAP_CENTER_Y = 50;
export const MINIMAP_SCALE = 1.62; // SVG units per meter (maps [-25m, +25m] across the 84-unit radar interior)
export const MINIMAP_MAX_SVG_RADIUS = 41.5;

/**
 * Converts 3D world (x, z) coordinates on Solara Island into 2D SVG radar coordinates (0..100).
 * Clamps smoothly inside the circular radar bezel while preserving exact directional angle.
 */
export function worldToMinimapPoint(
  worldX: number,
  worldZ: number,
  scale = MINIMAP_SCALE,
): { x: number; y: number; clamped: boolean } {
  const rawDx = worldX * scale;
  const rawDy = worldZ * scale;
  const dist = Math.hypot(rawDx, rawDy);
  if (dist <= MINIMAP_MAX_SVG_RADIUS || dist === 0) {
    return {
      x: Number((MINIMAP_CENTER_X + rawDx).toFixed(2)),
      y: Number((MINIMAP_CENTER_Y + rawDy).toFixed(2)),
      clamped: false,
    };
  }
  const ratio = MINIMAP_MAX_SVG_RADIUS / dist;
  return {
    x: Number((MINIMAP_CENTER_X + rawDx * ratio).toFixed(2)),
    y: Number((MINIMAP_CENTER_Y + rawDy * ratio).toFixed(2)),
    clamped: true,
  };
}

/**
 * Returns the named landmark or region on Solara Island for a given 3D world (x, z) position.
 */
export function getIslandZoneLabel(worldX: number, worldZ: number): string {
  if (
    Math.abs(worldZ) <= BRIDGE_RAILING_Z + 0.35 &&
    worldX >= BRIDGE_MIN_X - 0.45 &&
    worldX <= BRIDGE_MAX_X + 0.45
  ) {
    return 'Wooden Bridge';
  }
  if (Math.hypot(worldX, worldZ) <= 3.2) {
    return 'Sunstone Sanctuary';
  }
  if (
    Math.hypot(worldX - 3.35, worldZ - 0.45) <= 2.4 ||
    Math.hypot(worldX - 5.6, worldZ - 5.8) <= 2.4
  ) {
    return 'Warm Dragon Nest';
  }
  if (Math.hypot(worldX - 4.95, worldZ - -7.6) <= 4.2) {
    return 'Pet Sanctuary House';
  }
  if (Math.hypot(worldX - 7.5, worldZ - -4.5) <= 3.5) {
    return 'Sunberry Orchard';
  }
  if (Math.hypot(worldX - -2.4, worldZ - -3.2) <= 2.8) {
    return 'Mana Crystal Spire';
  }
  if (Math.hypot(worldX - -1.0, worldZ - -22.2) <= 7.2) {
    return 'Solara Fantasy Castle';
  }
  if (Math.hypot(worldX - -6.2, worldZ - -18.0) <= 5.5) {
    return 'Waterfall Lagoon';
  }
  if (worldX < riverCenterXAt(worldZ)) {
    return 'West Meadow & Gardens';
  }
  if (worldZ < -10) {
    return 'Northern Highlands';
  }
  if (worldZ > 12) {
    return 'Southern Shoreline';
  }
  return 'East Emerald Meadow';
}

/**
 * Parses and validates the compiled MindAR `.mind` binary target buffer.
 */
export function parseMindTarget(buffer: ArrayBuffer): {
  valid: boolean;
  header: MindTargetHeader | null;
  pyramidData: Uint8Array | null;
  error?: string;
} {
  if (!buffer || buffer.byteLength < 16) {
    return {
      valid: false,
      header: null,
      pyramidData: null,
      error: 'MindAR target buffer is too small or empty.',
    };
  }

  const bytes = new Uint8Array(buffer);
  const magic = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
    bytes[4],
    bytes[5],
    bytes[6],
    bytes[7],
  );

  if (magic !== 'MINDAR02') {
    return {
      valid: false,
      header: null,
      pyramidData: null,
      error: `Invalid MindAR magic header: expected MINDAR02, got ${magic}`,
    };
  }

  const view = new DataView(buffer);
  const jsonLength = view.getUint32(8, true);
  if (12 + jsonLength > buffer.byteLength) {
    return {
      valid: false,
      header: null,
      pyramidData: null,
      error: 'Corrupted MindAR target JSON header length.',
    };
  }

  try {
    const decoder = new TextDecoder('utf-8');
    const jsonStr = decoder.decode(bytes.subarray(12, 12 + jsonLength));
    const header = JSON.parse(jsonStr) as MindTargetHeader;
    const pyramidData = bytes.subarray(12 + jsonLength);
    if (
      !header.trackingFeatures ||
      !Array.isArray(header.trackingFeatures.scale256) ||
      header.trackingFeatures.scale256.length === 0
    ) {
      return {
        valid: false,
        header: null,
        pyramidData: null,
        error: 'MindAR target contains no tracking feature descriptors.',
      };
    }
    return { valid: true, header, pyramidData };
  } catch (err) {
    return {
      valid: false,
      header: null,
      pyramidData: null,
      error: err instanceof Error ? err.message : 'Failed to parse MindAR target.',
    };
  }
}
