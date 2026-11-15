import type {
  AchievementState,
  BackgroundTrackDefinition,
  CosmeticDefinition,
  CreatureDefinition,
  DanceTrackDefinition,
  GameSettings,
  KeeperQuestDefinition,
  PetStats,
  PlayerAvatarId,
  ProgressionState,
} from './types';

export const STORAGE_KEY = 'xr_creature_world_save_v1';
export const ACCOUNTS_STORAGE_KEY = 'xr_creature_world_accounts_v1';
export const ACTIVE_ACCOUNT_ID_KEY = 'xr_creature_world_active_user_v1';

export const BACKGROUND_TRACKS: BackgroundTrackDefinition[] = [
  {
    id: 'solara_serenade',
    title: 'Solara Sunset Serenade',
    genre: 'Soft Romantic Harp, Celesta & Warm Strings',
    bpm: 68,
    licenseTag: 'CC0 1.0 Public Domain / Original Royalty-Free',
    accentColor: '#F472B6',
  },
  {
    id: 'starlight_gymnopedie',
    title: 'Starlight Sanctuary (Gymnopédie No. 1)',
    genre: 'Erik Satie 1888 Romantic Piano & Harp Lullaby',
    bpm: 66,
    licenseTag: 'Public Domain (PD 1888)',
    accentColor: '#38BDF8',
  },
  {
    id: 'moonlit_romance',
    title: 'Moonlit Blossom Nocturne',
    genre: 'Gentle Romantic Music Box & Warm Flute',
    bpm: 72,
    licenseTag: 'CC0 1.0 Public Domain / Original Royalty-Free',
    accentColor: '#C084FC',
  },
];

export const DANCE_TRACKS: DanceTrackDefinition[] = [
  {
    id: 'dino_bounce',
    title: 'Dino Bounce Party',
    genre: 'Tropical Island Groove',
    bpm: 128,
    licenseTag: 'CC0 / Original Royalty-Free',
    accentColor: '#22C55E',
  },
  {
    id: 'dragon_disco',
    title: 'Dragon Disco Fever',
    genre: 'Funky Synth-Pop Boogie',
    bpm: 124,
    licenseTag: 'CC0 / Original Royalty-Free',
    accentColor: '#A855F7',
  },
  {
    id: 'cancan_polka',
    title: 'Can-Can Dino Polka',
    genre: 'Offenbach 1858 Galop Remix',
    bpm: 142,
    licenseTag: 'Public Domain (PD)',
    accentColor: '#F59E0B',
  },
  {
    id: 'electro_fiesta',
    title: 'Ember Electro Fiesta',
    genre: 'Upbeat Latin Chiptune',
    bpm: 132,
    licenseTag: 'CC0 / Original Royalty-Free',
    accentColor: '#F43F5E',
  },
];

export const PLAYER_AVATARS: {
  id: PlayerAvatarId;
  label: string;
  bgTop: string;
  bgBottom: string;
  hairColor: string;
  accentColor: string;
}[] = [
  {
    id: 'fire_keeper',
    label: 'Fire Keeper',
    bgTop: '#FB923C',
    bgBottom: '#C2410C',
    hairColor: '#78350F',
    accentColor: '#FDE047',
  },
  {
    id: 'crystal_mage',
    label: 'Crystal Mage',
    bgTop: '#38BDF8',
    bgBottom: '#1D4ED8',
    hairColor: '#312E81',
    accentColor: '#67E8F9',
  },
  {
    id: 'forest_ranger',
    label: 'Forest Ranger',
    bgTop: '#4ADE80',
    bgBottom: '#15803D',
    hairColor: '#451A03',
    accentColor: '#BEF264',
  },
  {
    id: 'sky_knight',
    label: 'Sky Knight',
    bgTop: '#818CF8',
    bgBottom: '#4338CA',
    hairColor: '#1E293B',
    accentColor: '#FBBF24',
  },
  {
    id: 'dragon_princess',
    label: 'Dragon Noble',
    bgTop: '#F472B6',
    bgBottom: '#BE185D',
    hairColor: '#881337',
    accentColor: '#FDE047',
  },
  {
    id: 'star_explorer',
    label: 'Star Explorer',
    bgTop: '#C084FC',
    bgBottom: '#6B21A8',
    hairColor: '#0F172A',
    accentColor: '#FDE047',
  },
];

export const PLAYER_TITLES: string[] = [
  'Dragon Tamer',
  'Dino Bestie',
  'Solara Guardian',
  'AR Summoner',
];

export const ISLAND_RADIUS = 44;
export const ISLAND_PLAYABLE_RADIUS = 38;

export const AR_CARD_PNG_PATH = '/assets/ar/ember-ar-card.png';
export const AR_CARD_JPG_PATH = '/assets/ar/ember-ar-card.jpg';
export const AR_CARD_MIND_PATH = '/assets/ar/ember-card.mind';
export const AR_CARD_PDF_PATH = '/assets/ar/ember-ar-card-printable.pdf';

export const CREATURES: CreatureDefinition[] = [
  {
    id: 'ember',
    name: 'EMBER',
    title: 'Solaris Flame Whelp',
    element: 'Fire',
    rarity: 'Mythic Starter',
    unlocked: true,
    playable: true,
    artworkPath: '/assets/images/ember_ar_marker_art_1794495970735.jpg',
    primaryColor: '#FF6B2B',
    secondaryColor: '#FBBF24',
    personality: 'Playful, affectionate, curious, and fiercely loyal',
    habitat: 'Sunstone Sanctuary & Volcanic Meadow of Solara Island',
    specialAbilities: [
      'Hearthfire Spark — Breathes warm golden embers that light up crystals',
      'Solar Wing Flutter — Glides across streams and performs joyful mid-air flips',
      'Flame Tail Beacon — Tail flame glows brighter as Friendship increases',
    ],
    description:
      'Hatched from a sun-warmed obsidian geode atop Solara Island, EMBER is a baby fire dragon whose tail flame mirrors its emotions. When cared for with Fire Berries and playful games, EMBER radiates warm golden sparks that awaken ancient island runes.',
    baseLevel: 1,
  },
  {
    id: 'aqua',
    name: 'AQUA',
    title: 'Tidepearl Leviathan Whelp',
    element: 'Water',
    rarity: 'Legendary',
    unlocked: false,
    playable: false,
    artworkPath: '/assets/images/aqua_creature_art_1794495971641.jpg',
    primaryColor: '#0EA5E9',
    secondaryColor: '#38BDF8',
    personality: 'Serene, musical, and inquisitive',
    habitat: 'Sapphire Lagoon & Whispering Waterfall Caverns (Coming Soon)',
    specialAbilities: [
      'Prism Bubble Veil — Conjures floating iridescent water spheres',
      'Tidal Resonance — Harmonizes with island rivers to heal nearby flora',
      'Dewdrop Glide — Skims effortlessly over crystal water surfaces',
    ],
    description:
      'A gentle water spirit dragonling dwelling beneath the Sapphire Lagoon waterfalls. AQUA communicates through melodic chimes and shimmering bubble rings. Scheduled to awaken in a future island expansion.',
    baseLevel: 1,
  },
  {
    id: 'moss',
    name: 'MOSS',
    title: 'Sylvan Bloom Sprite',
    element: 'Nature',
    rarity: 'Epic',
    unlocked: false,
    playable: false,
    artworkPath: '/assets/images/moss_creature_art_1794495973388.jpg',
    primaryColor: '#10B981',
    secondaryColor: '#A3E635',
    personality: 'Gentle, sleepy, nurturing, and wise',
    habitat: 'Elderwood Mushroom Grove & Fern Hollow (Coming Soon)',
    specialAbilities: [
      'Canopy Sprout — Coaxes glowing wildflowers and mushrooms from the soil',
      'Spore Lullaby — Releases soothing golden pollen that restores energy',
      'Rootbound Aegis — Channels ancient forest roots for balance',
    ],
    description:
      'Covered in velvet emerald moss and crowned with blossoming wooden antlers, MOSS tends the bioluminescent mushroom rings of Solara Island. Coming soon in a future update.',
    baseLevel: 1,
  },
  {
    id: 'volt',
    name: 'VOLT',
    title: 'Stormcrest Sky Kitsune',
    element: 'Electric',
    rarity: 'Legendary',
    unlocked: false,
    playable: false,
    artworkPath: '/assets/images/volt_creature_art_1794495974744.jpg',
    primaryColor: '#F59E0B',
    secondaryColor: '#22D3EE',
    personality: 'Energetic, mischievous, and lightning-fast',
    habitat: 'Tempest Spire & Floating Quartz Peaks (Coming Soon)',
    specialAbilities: [
      'Arc Dash — Blinks between floating sky crystals in a flash of cyan static',
      'Thunder Tail Snap — Discharges rhythmic sparks during celebratory dances',
      'Static Levitation — Hovers above magnetic sanctuary runes',
    ],
    description:
      'Born where summer lightning strikes the floating quartz peaks, VOLT zips across the sky trails leaving ribbons of golden-cyan plasma. Coming soon in a future update.',
    baseLevel: 1,
  },
];

export const COSMETICS: CosmeticDefinition[] = [
  {
    id: 'none',
    name: 'Natural Scales',
    description: "EMBER's classic crimson-and-gold dragon scales.",
    requiredCreatureLevel: 1,
    accentColor: '#FF6B2B',
  },
  {
    id: 'crown',
    name: 'Sunstone Crown',
    description: 'A royal golden circlet set with a glowing ruby gem.',
    requiredCreatureLevel: 1,
    accentColor: '#FBBF24',
  },
  {
    id: 'collar',
    name: 'Runic Star Collar',
    description: 'An enchanted obsidian collar with floating mana crystals.',
    requiredCreatureLevel: 2,
    accentColor: '#38BDF8',
  },
  {
    id: 'scarf',
    name: 'Royal Scarf & Cape',
    description:
      'A cozy crimson-gold knitted neck scarf paired with a flowing royal dragon cape & sunstone brooch.',
    requiredCreatureLevel: 3,
    accentColor: '#F43F5E',
  },
  {
    id: 'flame_aura',
    name: 'Solar Halo Aura',
    description: 'Orbiting rings of celestial fire stars around EMBER.',
    requiredCreatureLevel: 4,
    accentColor: '#A855F7',
  },
];

export const KEEPER_QUESTS: KeeperQuestDefinition[] = [
  {
    id: 'quest_feed_sunberry',
    icon: '🍎',
    title: {
      en: 'Sunberry Feast',
      id: 'Sarapan Buah Sunberry',
      zh: '太阳果美味大餐',
    },
    description: {
      en: 'Feed EMBER 2 times with roasted Sunberries.',
      id: 'Beri makan EMBER 2 kali dengan buah Sunberry panggang.',
      zh: '给 EMBER 喂食 2 次烤太阳果。',
    },
    targetCount: 2,
    creatureXpReward: 55,
    playerXpReward: 45,
    unlockHint: 'Helps unlock Lv.2 Runic Star Collar 💎',
  },
  {
    id: 'quest_pet_bond',
    icon: '🐾',
    title: {
      en: 'Warm Dragon Affection',
      id: 'Kasih Sayang Sahabat Naga',
      zh: '温暖幼龙抚摸',
    },
    description: {
      en: 'Pet EMBER 3 times to strengthen your bond.',
      id: 'Elus (Pet) EMBER 3 kali untuk mempererat ikatan.',
      zh: '抚摸 EMBER 3 次以加深羁绊。',
    },
    targetCount: 3,
    creatureXpReward: 60,
    playerXpReward: 50,
    unlockHint: 'Helps unlock Lv.2 Runic Star Collar 💎',
  },
  {
    id: 'quest_play_orb',
    icon: '🎮',
    title: {
      en: 'Fire Orb Acrobatics',
      id: 'Latihan Lompat Bola Api',
      zh: '火球跳跃特训',
    },
    description: {
      en: 'Play with EMBER 2 times in the meadow.',
      id: 'Ajak EMBER bermain (Play) 2 kali di padang pulau.',
      zh: '与 EMBER 一起玩耍 2 次。',
    },
    targetCount: 2,
    creatureXpReward: 75,
    playerXpReward: 60,
    unlockHint: 'Helps unlock Lv.3 Royal Scarf & Cape 🧣',
  },
  {
    id: 'quest_dance_party',
    icon: '🎵',
    title: {
      en: 'Solara Dance Festival',
      id: 'Festival Dansa Solara',
      zh: '索拉岛热舞节',
    },
    description: {
      en: 'Dance with EMBER 1 time to any island rhythm.',
      id: 'Ajak EMBER menari (Dance) 1 kali dengan musik pulau.',
      zh: '伴随音乐与 EMBER 跳舞 1 次。',
    },
    targetCount: 1,
    creatureXpReward: 70,
    playerXpReward: 55,
    unlockHint: 'Helps unlock Lv.3 Royal Scarf & Cape 🧣',
  },
  {
    id: 'quest_snap_selfie',
    icon: '📸',
    title: {
      en: 'Keeper Souvenir Portrait',
      id: 'Kenangan Potret Selfie',
      zh: '驯龙师纪念自拍',
    },
    description: {
      en: 'Capture 1 Selfie Portrait with EMBER in the Selfie Studio.',
      id: 'Abadikan 1 foto bersama EMBER di Studio Selfie.',
      zh: '在自拍工作室与 EMBER 拍摄 1 张纪念自拍。',
    },
    targetCount: 1,
    creatureXpReward: 85,
    playerXpReward: 70,
    unlockHint: 'Helps unlock Lv.4 Solar Halo Aura ✨',
  },
  {
    id: 'quest_friendship_80',
    icon: '⭐',
    title: {
      en: 'Soulbound Dragon Bestie',
      id: 'Ikatan Persahabatan Sejati',
      zh: '灵魂契约挚友',
    },
    description: {
      en: 'Reach 80% Friendship Bond with EMBER.',
      id: 'Capai 80% Ikatan Persahabatan (Bond) bersama EMBER.',
      zh: '与 EMBER 的亲密羁绊达到 80%。',
    },
    targetCount: 80,
    creatureXpReward: 110,
    playerXpReward: 90,
    unlockHint: 'Helps unlock Lv.4 Solar Halo Aura ✨',
  },
];

export const ACHIEVEMENTS: AchievementState[] = [
  {
    id: 'first_bond',
    title: 'First Spark',
    description: 'Pet EMBER for the first time to form a dragon bond.',
    unlocked: false,
    xpReward: 40,
  },
  {
    id: 'gourmet_keeper',
    title: 'Dragon Chef',
    description: 'Feed EMBER 3 times with roasted Fire Berries.',
    unlocked: false,
    xpReward: 60,
  },
  {
    id: 'dance_partner',
    title: 'Festival Rhythm',
    description: 'Watch EMBER perform a joyful dragon dance.',
    unlocked: false,
    xpReward: 50,
  },
  {
    id: 'level_3_dragon',
    title: 'Rising Flame',
    description: 'Raise EMBER to Creature Level 3.',
    unlocked: false,
    xpReward: 100,
  },
  {
    id: 'ar_summoner',
    title: 'Dimensional Summoner',
    description: 'Enter AR World and summon EMBER onto the AR marker card.',
    unlocked: false,
    xpReward: 120,
  },
  {
    id: 'best_friends',
    title: 'Soulbound Companion',
    description: 'Reach 90+ Friendship with EMBER.',
    unlocked: false,
    xpReward: 150,
  },
];

export const DEFAULT_STATS: PetStats = {
  hunger: 78,
  happiness: 84,
  energy: 88,
  friendship: 65,
  isSleeping: false,
};

export const DEFAULT_PROGRESSION: ProgressionState = {
  petName: 'EMBER',
  playerXp: 40,
  playerLevel: 1,
  creatureXp: 35,
  creatureLevel: 1,
  friendshipLevel: 2,
  totalInteractions: 0,
  feedCount: 0,
  petCount: 0,
  playCount: 0,
  danceCount: 0,
  arScanCount: 0,
  selfieCount: 0,
  claimedQuests: [],
  lastSavedAt: Date.now(),
  lastDailyClaimDate: '',
  unlockedCosmetics: ['none', 'crown'],
  equippedCosmetic: 'crown',
  unlockedAchievements: [],
};

export function getDefaultSettings(): GameSettings {
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return {
    language: 'en',
    musicVolume: 65,
    sfxVolume: 75,
    muted: false,
    graphicsQuality: isMobile ? 'medium' : 'high',
    cameraSensitivity: 1.0,
    selectedDanceTrack: 'dino_bounce',
    selectedBgmTrack: 'solara_serenade',
  };
}
