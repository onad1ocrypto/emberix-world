export type AppMode =
  | 'title'
  | 'playing'
  | 'selfie'
  | 'ar'
  | 'card'
  | 'collection'
  | 'encyclopedia'
  | 'settings'
  | 'account';

export type AppLanguage = 'en' | 'id' | 'zh';

export type SelfiePoseId = 'wave' | 'dance' | 'jump' | 'surprise' | 'sleep';

export type SelfieFrameId = 'gold' | 'fire' | 'crystal' | 'emerald';

export type DanceTrackId =
  | 'dino_bounce'
  | 'dragon_disco'
  | 'cancan_polka'
  | 'electro_fiesta';

export type BackgroundTrackId =
  | 'solara_serenade'
  | 'starlight_gymnopedie'
  | 'moonlit_romance';

export type PlayerAvatarId =
  | 'fire_keeper'
  | 'crystal_mage'
  | 'forest_ranger'
  | 'sky_knight'
  | 'dragon_princess'
  | 'star_explorer';

export interface DanceTrackDefinition {
  id: DanceTrackId;
  title: string;
  genre: string;
  bpm: number;
  licenseTag: string;
  accentColor: string;
}

export interface BackgroundTrackDefinition {
  id: BackgroundTrackId;
  title: string;
  genre: string;
  bpm: number;
  licenseTag: string;
  accentColor: string;
}

export interface PlayerAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarId: PlayerAvatarId;
  titleBadge: string;
  createdAt: number;
  lastLoginAt: number;
  saveData: SaveData;
}

export type EmberAnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'happy'
  | 'eating'
  | 'sleeping'
  | 'dancing'
  | 'surprised';

export type PetActionType =
  | 'pet'
  | 'feed'
  | 'play'
  | 'sleep'
  | 'wake'
  | 'dance'
  | 'surprise';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type CosmeticId = 'none' | 'crown' | 'scarf' | 'collar' | 'flame_aura';

export interface PetStats {
  hunger: number; // 0 - 100
  happiness: number; // 0 - 100
  energy: number; // 0 - 100
  friendship: number; // 0 - 100
  isSleeping: boolean;
}

export interface AchievementState {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
  xpReward: number;
}

export interface ProgressionState {
  petName: string;
  playerXp: number;
  playerLevel: number;
  creatureXp: number;
  creatureLevel: number;
  friendshipLevel: number;
  totalInteractions: number;
  feedCount: number;
  petCount: number;
  playCount: number;
  danceCount: number;
  arScanCount: number;
  selfieCount?: number;
  lastSavedAt: number;
  lastDailyClaimDate: string; // YYYY-MM-DD
  unlockedCosmetics: CosmeticId[];
  equippedCosmetic: CosmeticId;
  unlockedAchievements: string[];
}

export interface GameSettings {
  language: AppLanguage;
  musicVolume: number; // 0 - 100
  sfxVolume: number; // 0 - 100
  muted: boolean;
  graphicsQuality: GraphicsQuality;
  cameraSensitivity: number; // 0.3 - 2.0
  selectedDanceTrack: DanceTrackId;
  selectedBgmTrack?: BackgroundTrackId;
}

export interface SaveData {
  version: number;
  stats: PetStats;
  progression: ProgressionState;
  settings: GameSettings;
}

export interface CreatureDefinition {
  id: 'ember' | 'aqua' | 'moss' | 'volt';
  name: string;
  title: string;
  element: 'Fire' | 'Water' | 'Nature' | 'Electric';
  rarity: 'Mythic Starter' | 'Legendary' | 'Epic' | 'Rare';
  unlocked: boolean;
  playable: boolean;
  artworkPath: string;
  primaryColor: string;
  secondaryColor: string;
  personality: string;
  habitat: string;
  specialAbilities: string[];
  description: string;
  baseLevel: number;
}

export interface CosmeticDefinition {
  id: CosmeticId;
  name: string;
  description: string;
  requiredCreatureLevel: number;
  accentColor: string;
}

export interface MindTargetFeature {
  x: number;
  y: number;
  score: number;
  maxima: number;
  descriptor: number[];
}

export interface MindTargetHeader {
  format: string;
  version: number;
  targetId: string;
  sourceImage: string;
  width: number;
  height: number;
  physicalSizeCm: number;
  colorSignature: {
    meanR: number;
    meanG: number;
    meanB: number;
  };
  grid16: number[];
  pyramidLevels: {
    width: number;
    height: number;
    byteOffset: number;
    byteLength: number;
  }[];
  trackingFeatures: {
    scale256: MindTargetFeature[];
    scale128: MindTargetFeature[];
  };
  compiledAt: string;
}
