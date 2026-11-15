import type { AppLanguage } from '../types';

export interface LanguageOption {
  id: AppLanguage;
  flag: string;
  nativeName: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: 'en',
    flag: '🇬🇧',
    nativeName: 'English',
    label: 'Primary Language (Default)',
  },
  {
    id: 'id',
    flag: '🇮🇩',
    nativeName: 'Bahasa Indonesia',
    label: 'Indonesian',
  },
  {
    id: 'zh',
    flag: '🇨🇳',
    nativeName: '中文 (简体)',
    label: 'Chinese (Simplified)',
  },
];

export interface TranslationPack {
  menu: {
    guestKeeper: string;
    accountBadge: string;
    registerLogin: string;
    playerPrefix: string;
    play3dWorld: string;
    enterArWorld: string;
    creatureCollection: string;
    creatureEncyclopedia: string;
    myArCard: string;
    settings: string;
    mood: string;
    wave: string;
    dance: string;
    controlsHint: string;
    dailyClaimed: string;
    dailyAvailable: string;
  };
  hud: {
    sleeping: string;
    active: string;
    bond: string;
    islandView: string;
    careCloseUp: string;
    selfieBtn: string;
    arWorld: string;
    arCard: string;
    collection: string;
    lore: string;
    login: string;
    move: string;
    jump: string;
    musicToggle: string;
    menuToggle: string;
    closeToggle: string;
    pet: string;
    feed: string;
    play: string;
    sleep: string;
    wake: string;
    dance: string;
    surprise: string;
    dragonGear: string;
    danceMusic: string;
    welcomeToast: string;
    hungry: string;
    starving: string;
    hungryAlertTitle: string;
    starvingAlertTitle: string;
    hungryFeedNowBtn: string;
    hungrySpeechBubble: string;
    questsToggle: string;
    questsTitle: string;
    questsSubtitle: string;
    questClaimBtn: string;
    questClaimedBadge: string;
    questRewardToast: string;
    gearLockedToast: string;
    gearUnlockedToast: string;
  };
  selfie: {
    title: string;
    subtitle: string;
    poseLabel: string;
    poseWave: string;
    poseDance: string;
    poseJump: string;
    poseSurprise: string;
    poseSleep: string;
    frameLabel: string;
    frameGold: string;
    frameFire: string;
    frameCrystal: string;
    frameEmerald: string;
    snapBtn: string;
    downloadBtn: string;
    backToGame: string;
    previewCardTitle: string;
    metaKeeper: string;
    metaPlayerLevel: string;
    metaPet: string;
    metaPetLevel: string;
    metaBond: string;
    metaGear: string;
    metaSelfieCount: string;
    snapSuccessToast: string;
  };
  settings: {
    title: string;
    subtitle: string;
    back: string;
    langHeading: string;
    langLabel: string;
    audioHeading: string;
    musicVol: string;
    sfxVol: string;
    muteAll: string;
    mutedBtn: string;
    activeBtn: string;
    bgmTrackLabel: string;
    danceTrackLabel: string;
    graphicsHeading: string;
    graphicsQuality: string;
    camSens: string;
    achievementsHeading: string;
    completed: string;
    inProgress: string;
    progressHeading: string;
    resetBtn: string;
    backMainMenu: string;
    confirmResetPrompt: string;
    confirmResetBtn: string;
    cancelBtn: string;
  };
  account: {
    title: string;
    subtitle: string;
    passportTitle: string;
    loggedIn: string;
    guestMode: string;
    unregisteredExplorer: string;
    mustRegisterBeforePlay: string;
    profileSavedBadge: string;
    profileCustomizeHeading: string;
    profileCustomizeDesc: string;
    petNameSectionTitle: string;
    petNameSectionDesc: string;
    petNameInputLabel: string;
    petNamePlaceholder: string;
    petNameSaveBtn: string;
    petNameSavedMsg: string;
    continueAs: string;
    enterArAs: string;
    logoutBtn: string;
    savedAccountsHeading: string;
    tabRegister: string;
    tabLogin: string;
    usernameLabel: string;
    passwordLabel: string;
    avatarLabel: string;
    titleLabel: string;
    registerSubmitBtn: string;
    loginSubmitBtn: string;
  };
}

export const TRANSLATIONS: Record<AppLanguage, TranslationPack> = {
  en: {
    menu: {
      guestKeeper: 'Guest Keeper',
      accountBadge: '✓ Profile',
      registerLogin: 'Profile',
      playerPrefix: 'Player',
      play3dWorld: 'Play 3D World',
      enterArWorld: 'Enter AR World',
      creatureCollection: 'Creature Collection',
      creatureEncyclopedia: 'Creature Encyclopedia',
      myArCard: 'My AR Card',
      settings: 'Settings',
      mood: 'Mood',
      wave: 'Wave 👋',
      dance: 'Dance 🎵',
      controlsHint:
        'WASD / Arrows Move · Mouse Drag Orbit Camera · Space Jump · Click Pet to Interact',
      dailyClaimed: 'Daily Reward Claimed',
      dailyAvailable: 'Claim Daily Sunstone Blessing (+75 XP)',
    },
    hud: {
      sleeping: 'Sleeping',
      active: 'Active',
      bond: 'Bond',
      islandView: '🌍 Island View',
      careCloseUp: '🔍 Care Close-Up',
      selfieBtn: '📸 Selfie',
      arWorld: '📷 AR World',
      arCard: '🃏 AR Card',
      collection: '🐾 Collection',
      lore: '📖 Lore',
      login: 'Profile',
      move: 'Move',
      jump: 'Jump',
      musicToggle: 'Music',
      menuToggle: 'Menu',
      closeToggle: 'Hide',
      pet: 'Pet',
      feed: 'Feed',
      play: 'Play',
      sleep: 'Sleep',
      wake: 'Wake',
      dance: 'Dance',
      surprise: 'Surprise',
      dragonGear: 'Dragon Gear:',
      danceMusic: '🎵 Dance Music:',
      welcomeToast:
        'Welcome to Solara Island! Click your pet or use the care dock below.',
      hungry: 'Hungry! 🍎',
      starving: 'Starving! 🍖',
      hungryAlertTitle: 'is getting hungry!',
      starvingAlertTitle: 'is starving and needs food now!',
      hungryFeedNowBtn: '🍎 Feed Now',
      hungrySpeechBubble: 'My tummy is rumbling... Feed me a Sunberry? 🍎🥺',
      questsToggle: 'Quests',
      questsTitle: 'KEEPER LEVEL-UP QUESTS & DRAGON GEAR',
      questsSubtitle:
        'Complete care & adventure missions to level up EMBER and unlock higher-tier Dragon Gear!',
      questClaimBtn: '🎁 Claim Reward',
      questClaimedBadge: '✓ Claimed',
      questRewardToast: 'Quest Completed! Awarded XP & Dragon Bond boost!',
      gearLockedToast:
        'Unlocks at Pet Level {level}! Complete Keeper Quests (📜 Quests) to level up.',
      gearUnlockedToast: '🎉 Level Up! New Dragon Gear unlocked:',
    },
    selfie: {
      title: 'SELFIE PORTRAIT STUDIO',
      subtitle:
        'Pose with your pet and snap a souvenir portrait complete with Username, Level, XP & Bond!',
      poseLabel: 'Keeper & Pet Pose',
      poseWave: '👋 Happy Wave',
      poseDance: '🎵 Party Dance',
      poseJump: '⭐ Heroic Jump',
      poseSurprise: '✨ Sparkle Surprise',
      poseSleep: '💤 Cozy Nap',
      frameLabel: 'Portrait Frame Theme',
      frameGold: '👑 Solara Gold',
      frameFire: '🔥 Dragon Flame',
      frameCrystal: '💎 Starlight Cyan',
      frameEmerald: '🌿 Royal Emerald',
      snapBtn: '📸 Snap Selfie Portrait (+15 XP)',
      downloadBtn: '💾 Download Selfie PNG',
      backToGame: 'Back to 3D World',
      previewCardTitle: 'SOLARA ISLAND SELFIE PORTRAIT',
      metaKeeper: 'Keeper Username',
      metaPlayerLevel: 'Player',
      metaPet: 'Companion Pet',
      metaPetLevel: 'Pet',
      metaBond: 'Friendship Bond',
      metaGear: 'Gear',
      metaSelfieCount: 'Selfies Snapped',
      snapSuccessToast:
        '📸 Selfie Portrait captured! (+15 Player XP, +20 Pet XP, +5 Bond)',
    },
    settings: {
      title: 'SETTINGS & ACHIEVEMENTS',
      subtitle:
        'Language Selection, Audio, Graphics Optimization & Save Data Management',
      back: 'Back',
      langHeading: 'Language / Bahasa / 语言',
      langLabel:
        'Select your preferred display language (English is the primary default language).',
      audioHeading: 'Audio & Volume',
      musicVol: 'Music & Ambience Volume',
      sfxVol: 'Sound Effects Volume',
      muteAll: 'Mute All Audio',
      mutedBtn: 'Muted (Click to Unmute)',
      activeBtn: 'Sound Active (Click to Mute)',
      bgmTrackLabel: 'Background Music — Soft & Romantic (100% Copyright-Free)',
      danceTrackLabel: 'Pet Dance Music (Royalty-Free / Public Domain)',
      graphicsHeading: 'Graphics & Camera (Android & Desktop)',
      graphicsQuality: 'Graphics Quality Preset',
      camSens: 'Camera Sensitivity',
      achievementsHeading: 'Keeper Achievements',
      completed: 'Completed',
      inProgress: 'In Progress',
      progressHeading: 'Player Progress & LocalStorage',
      resetBtn: 'Reset Player Progress',
      backMainMenu: 'Back to Main Menu',
      confirmResetPrompt:
        'Are you sure you want to reset all levels, stats, and achievements?',
      confirmResetBtn: 'Confirm Reset',
      cancelBtn: 'Cancel',
    },
    account: {
      title: 'KEEPER PROFILE & PET NAME',
      subtitle:
        'Manage your Keeper Passport, customize your Pet Name, and save account progress',
      passportTitle: 'SOLARA KEEPER PASSPORT',
      loggedIn: '✓ LOGGED IN',
      guestMode: 'GUEST MODE',
      unregisteredExplorer: 'Solara Explorer',
      mustRegisterBeforePlay:
        'Playing in Guest Mode! Register or log in anytime to permanently bind your XP & claim +50 XP Bonus.',
      profileSavedBadge:
        '✓ Account Active — All XP, Levels & Pet Progress Automatically Saved',
      profileCustomizeHeading: 'Customize Keeper Avatar & Title',
      profileCustomizeDesc:
        'Update your Keeper badge avatar and honor title displayed in the 3D World and Selfie Portraits.',
      petNameSectionTitle: 'Custom Pet Name',
      petNameSectionDesc:
        'Give your dragon companion a custom name displayed across the 3D World, AR Mode, and Selfie Portraits.',
      petNameInputLabel: 'Your Pet Name',
      petNamePlaceholder: 'Enter pet name (e.g. EMBER, Blaze, Ignis)',
      petNameSaveBtn: 'Save Pet Name',
      petNameSavedMsg: 'Pet name saved as',
      continueAs: 'Play 3D World as',
      enterArAs: 'Enter AR World',
      logoutBtn: 'Switch / Logout Account',
      savedAccountsHeading: 'Saved Accounts on This Device',
      tabRegister: '✨ Register Account',
      tabLogin: '🔑 Login Account',
      usernameLabel: 'Player Username',
      passwordLabel: 'Secret Password / PIN (Min. 4 chars)',
      avatarLabel: 'Choose Keeper Avatar',
      titleLabel: 'Choose Honor Title',
      registerSubmitBtn: 'Register & Claim +50 XP Bonus',
      loginSubmitBtn: '🔑 Login to Keeper Account',
    },
  },
  id: {
    menu: {
      guestKeeper: 'Keeper Tamu',
      accountBadge: '✓ Profil',
      registerLogin: 'Profil',
      playerPrefix: 'Player',
      play3dWorld: 'Main Dunia 3D',
      enterArWorld: 'Masuk Dunia AR',
      creatureCollection: 'Koleksi Makhluk',
      creatureEncyclopedia: 'Ensiklopedia Makhluk',
      myArCard: 'Kartu AR Saya',
      settings: 'Pengaturan',
      mood: 'Suasana',
      wave: 'Sapa 👋',
      dance: 'Menari 🎵',
      controlsHint:
        'WASD / Panah Bergerak · Geser Mouse Putar Kamera · Spasi Lompat · Klik Pet untuk Elus',
      dailyClaimed: 'Hadiah Harian Sudah Diklaim',
      dailyAvailable: 'Klaim Berkah Sunstone Harian (+75 XP)',
    },
    hud: {
      sleeping: 'Tidur',
      active: 'Aktif',
      bond: 'Ikatan',
      islandView: '🌍 Kamera Pulau',
      careCloseUp: '🔍 Kamera Dekat',
      selfieBtn: '📸 Selfie',
      arWorld: '📷 Dunia AR',
      arCard: '🃏 Kartu AR',
      collection: '🐾 Koleksi',
      lore: '📖 Lore',
      login: 'Profil',
      move: 'Gerak',
      jump: 'Lompat',
      musicToggle: 'Musik',
      menuToggle: 'Menu',
      closeToggle: 'Tutup',
      pet: 'Elus',
      feed: 'Makan',
      play: 'Main',
      sleep: 'Tidur',
      wake: 'Bangun',
      dance: 'Menari',
      surprise: 'Kejutan',
      dragonGear: 'Aksesori Pet:',
      danceMusic: '🎵 Musik Dance:',
      welcomeToast:
        'Selamat datang di Pulau Solara! Klik pet kamu atau gunakan menu perawatan di bawah.',
      hungry: 'Lapar! 🍎',
      starving: 'Sangat Lapar! 🍖',
      hungryAlertTitle: 'mulai lapar!',
      starvingAlertTitle: 'sangat lapar dan butuh makan sekarang!',
      hungryFeedNowBtn: '🍎 Beri Makan',
      hungrySpeechBubble: 'Perutku keroncongan... Mau buah Sunberry! 🍎🥺',
      questsToggle: 'Misi',
      questsTitle: 'MISI NAIK LEVEL & DRAGON GEAR',
      questsSubtitle:
        'Selesaikan misi perawatan & petualangan untuk menaikkan level EMBER dan membuka Dragon Gear!',
      questClaimBtn: '🎁 Klaim Hadiah',
      questClaimedBadge: '✓ Selesai',
      questRewardToast: 'Misi Selesai! XP & Ikatan Persahabatan bertambah!',
      gearLockedToast:
        'Terbuka di Pet Level {level}! Selesaikan Misi (📜 Misi) untuk menaikkan level.',
      gearUnlockedToast: '🎉 Naik Level! Dragon Gear baru terbuka:',
    },
    selfie: {
      title: 'STUDIO POTRET SELFIE PET',
      subtitle:
        'Berpose bersama pet kamu dan abadikan potret selfie lengkap dengan Username, Level, XP & Ikatan!',
      poseLabel: 'Pose Player & Pet',
      poseWave: '👋 Sapa Ceria',
      poseDance: '🎵 Tari Pesta',
      poseJump: '⭐ Lompat Heroik',
      poseSurprise: '✨ Kejutan Bintang',
      poseSleep: '💤 Tidur Manis',
      frameLabel: 'Bingkai Foto Potret',
      frameGold: '👑 Emas Solara',
      frameFire: '🔥 Api Naga',
      frameCrystal: '💎 Kristal Bintang',
      frameEmerald: '🌿 Zamrud Kerajaan',
      snapBtn: '📸 Ambil Potret Selfie (+15 XP)',
      downloadBtn: '💾 Unduh Foto Selfie PNG',
      backToGame: 'Kembali ke Dunia 3D',
      previewCardTitle: 'POTRET SELFIE PULAU SOLARA',
      metaKeeper: 'Username Player',
      metaPlayerLevel: 'Player',
      metaPet: 'Nama Pet',
      metaPetLevel: 'Pet',
      metaBond: 'Ikatan Persahabatan',
      metaGear: 'Aksesori',
      metaSelfieCount: 'Total Selfie',
      snapSuccessToast:
        '📸 Potret Selfie berhasil diabadikan! (+15 XP Player, +20 XP Pet, +5 Ikatan)',
    },
    settings: {
      title: 'PENGATURAN & PENCAPAIAN',
      subtitle:
        'Menu Bahasa, Audio, Optimasi Grafis & Manajemen Data Simpanan',
      back: 'Kembali',
      langHeading: 'Bahasa / Language / 语言',
      langLabel:
        'Pilih bahasa tampilan permainan (Inggris adalah bahasa utama bawaan).',
      audioHeading: 'Audio & Volume',
      musicVol: 'Volume Musik & Suasana',
      sfxVol: 'Volume Efek Suara (SFX)',
      muteAll: 'Bisukan Semua Suara',
      mutedBtn: 'Dibisukan (Klik untuk Aktifkan)',
      activeBtn: 'Suara Aktif (Klik untuk Bisukan)',
      bgmTrackLabel: 'Musik Background — Halus & Romantis (Bebas Copyright / CC0)',
      danceTrackLabel: 'Musik Dance Pet (Bebas Hak Cipta)',
      graphicsHeading: 'Grafis & Kamera (Android & Desktop)',
      graphicsQuality: 'Preset Kualitas Grafis',
      camSens: 'Sensitivitas Kamera',
      achievementsHeading: 'Pencapaian Keeper (Achievements)',
      completed: 'Selesai',
      inProgress: 'Belum Selesai',
      progressHeading: 'Progres Player & Penyimpanan',
      resetBtn: 'Reset Progres Permainan',
      backMainMenu: 'Kembali ke Menu Utama',
      confirmResetPrompt:
        'Apakah kamu yakin ingin mereset semua level, status pet, dan pencapaian?',
      confirmResetBtn: 'Ya, Reset Sekarang',
      cancelBtn: 'Batal',
    },
    account: {
      title: 'PROFIL PLAYER & NAMA PET',
      subtitle:
        'Kelola paspor Keeper, ubah Nama Pet kesayanganmu, dan simpan progres akun otomatis',
      passportTitle: 'PASPOR KEEPER SOLARA',
      loggedIn: '✓ SUDAH LOGIN',
      guestMode: 'MODE TAMU',
      unregisteredExplorer: 'Penjelajah Solara',
      mustRegisterBeforePlay:
        'Mode Tamu Aktif! Daftar akun atau Login kapan saja untuk menyimpan progres permanen & klaim Bonus +50 XP.',
      profileSavedBadge:
        '✓ Akun Aktif — Semua XP, Level & Progres Pet Tersimpan Otomatis',
      profileCustomizeHeading: 'Kustomisasi Avatar & Gelar Keeper',
      profileCustomizeDesc:
        'Ubah avatar profil dan gelar kehormatan yang ditampilkan di Dunia 3D dan Kartu Potret Selfie.',
      petNameSectionTitle: 'Nama Pet Kesayangan',
      petNameSectionDesc:
        'Berikan nama khusus untuk pet nagamu yang akan tampil di Dunia 3D, Mode AR, dan Hasil Potret Selfie.',
      petNameInputLabel: 'Nama Pet Kamu',
      petNamePlaceholder: 'Masukkan nama pet (contoh: EMBER, Bara, Draco)',
      petNameSaveBtn: 'Simpan Nama Pet',
      petNameSavedMsg: 'Nama pet berhasil disimpan menjadi',
      continueAs: 'Main Dunia 3D sebagai',
      enterArAs: 'Masuk Dunia AR',
      logoutBtn: 'Ganti Akun / Logout',
      savedAccountsHeading: 'Akun Tersimpan di Perangkat Ini',
      tabRegister: '✨ Daftar Akun Baru',
      tabLogin: '🔑 Masuk Akun (Login)',
      usernameLabel: 'Nama Player / Username',
      passwordLabel: 'Password / PIN Rahasia (Min. 4 karakter)',
      avatarLabel: 'Pilih Avatar Keeper',
      titleLabel: 'Pilih Gelar Kehormatan (Title)',
      registerSubmitBtn: 'Daftar & Klaim Bonus +50 XP',
      loginSubmitBtn: '🔑 Masuk ke Akun Keeper',
    },
  },
  zh: {
    menu: {
      guestKeeper: '游客驯龙师',
      accountBadge: '✓ 个人资料',
      registerLogin: '资料',
      playerPrefix: '玩家',
      play3dWorld: '畅玩 3D 世界',
      enterArWorld: '进入 AR 世界',
      creatureCollection: '奇幻生物图鉴',
      creatureEncyclopedia: '生物百科全书',
      myArCard: '我的 AR 召唤卡',
      settings: '游戏设置',
      mood: '心情',
      wave: '挥手 👋',
      dance: '跳舞 🎵',
      controlsHint:
        'WASD / 方向键移动 · 鼠标拖动旋转视角 · 空格跳跃 · 点击宠物互动',
      dailyClaimed: '今日奖励已领取',
      dailyAvailable: '领取每日太阳石祝福 (+75 XP)',
    },
    hud: {
      sleeping: '睡眠中',
      active: '活跃',
      bond: '羁绊',
      islandView: '🌍 岛屿视角',
      careCloseUp: '🔍 近景互动',
      selfieBtn: '📸 自拍',
      arWorld: '📷 AR 世界',
      arCard: '🃏 AR 卡牌',
      collection: '🐾 收藏',
      lore: '📖 百科',
      login: '资料',
      move: '移动',
      jump: '跳跃',
      musicToggle: '音乐',
      menuToggle: '菜单',
      closeToggle: '收起',
      pet: '抚摸',
      feed: '喂食',
      play: '玩耍',
      sleep: '睡觉',
      wake: '唤醒',
      dance: '跳舞',
      surprise: '惊喜',
      dragonGear: '宠物装扮:',
      danceMusic: '🎵 舞蹈音乐:',
      welcomeToast: '欢迎来到索拉岛！点击您的宠物或使用下方互动栏。',
      hungry: '饥饿! 🍎',
      starving: '极度饥饿! 🍖',
      hungryAlertTitle: '肚子饿了！',
      starvingAlertTitle: '非常饥饿，快喂食吧！',
      hungryFeedNowBtn: '🍎 立即喂食',
      hungrySpeechBubble: '肚子咕咕叫了…能喂我太阳果吗？🍎🥺',
      questsToggle: '任务',
      questsTitle: '升级任务与宠物装扮',
      questsSubtitle: '完成互动任务即可提升 EMBER 等级并解锁高级龙族装扮！',
      questClaimBtn: '🎁 领取奖励',
      questClaimedBadge: '✓ 已领取',
      questRewardToast: '任务完成！已获得 XP 与羁绊奖励！',
      gearLockedToast:
        '需宠物达到 Lv.{level} 解锁！完成升级任务 (📜 任务) 即可快速升级。',
      gearUnlockedToast: '🎉 升级啦！已解锁全新龙族装扮：',
    },
    selfie: {
      title: '宠物自拍合影工作室',
      subtitle:
        '与您的爱宠一起摆姿势并拍摄 3D 纪念自拍，完整展示玩家昵称、等级、XP 与羁绊！',
      poseLabel: '玩家与宠物姿势',
      poseWave: '👋 开心挥手',
      poseDance: '🎵 派对热舞',
      poseJump: '⭐ 帅气跳跃',
      poseSurprise: '✨ 星光惊喜',
      poseSleep: '💤 甜蜜小憩',
      frameLabel: '相框主题风格',
      frameGold: '👑 索拉金色',
      frameFire: '🔥 烈焰龙纹',
      frameCrystal: '💎 星光水晶',
      frameEmerald: '🌿 皇家翡翠',
      snapBtn: '📸 拍摄自拍合影 (+15 XP)',
      downloadBtn: '💾 下载自拍 PNG 照片',
      backToGame: '返回 3D 世界',
      previewCardTitle: '索拉岛宠物自拍纪念卡',
      metaKeeper: '玩家昵称',
      metaPlayerLevel: '玩家',
      metaPet: '宠物名字',
      metaPetLevel: '宠物',
      metaBond: '亲密羁绊',
      metaGear: '装扮',
      metaSelfieCount: '自拍次数',
      snapSuccessToast:
        '📸 自拍合影已保存！(+15 玩家 XP, +20 宠物 XP, +5 羁绊)',
    },
    settings: {
      title: '设置与成就',
      subtitle: '语言选择、音频控制、画质优化与本地存档管理',
      back: '返回',
      langHeading: '语言设置 / Language / Bahasa',
      langLabel: '选择游戏界面显示语言（英语为默认主语言）。',
      audioHeading: '音频与音量',
      musicVol: '背景音乐与环境音量',
      sfxVol: '音效音量 (SFX)',
      muteAll: '静音所有音频',
      mutedBtn: '已静音 (点击恢复声音)',
      activeBtn: '声音开启 (点击静音)',
      bgmTrackLabel: '背景音乐 — 温柔浪漫奇幻曲 (无版权 / CC0)',
      danceTrackLabel: '宠物舞蹈音乐 (无版权 / 公共领域)',
      graphicsHeading: '画质与视角设置 (移动端与桌面端)',
      graphicsQuality: '画质预设档位',
      camSens: '镜头灵敏度',
      achievementsHeading: '驯龙师成就',
      completed: '已完成',
      inProgress: '进行中',
      progressHeading: '游戏进度与本地存档',
      resetBtn: '重置玩家进度',
      backMainMenu: '返回主菜单',
      confirmResetPrompt: '确定要重置所有等级、宠物状态和成就吗？',
      confirmResetBtn: '确认重置',
      cancelBtn: '取消',
    },
    account: {
      title: '玩家资料与宠物命名',
      subtitle: '管理您的驯龙师通行证，修改专属宠物名字并自动保存账号进度',
      passportTitle: '索拉岛驯龙师通行证',
      loggedIn: '✓ 已登录',
      guestMode: '游客模式',
      unregisteredExplorer: '索拉探险家',
      mustRegisterBeforePlay:
        '当前为游客模式！随时注册或登录账号即可永久绑定进度并领取 +50 XP 奖励。',
      profileSavedBadge: '✓ 账号已激活 — 所有 XP、等级与宠物进度已自动保存',
      profileCustomizeHeading: '自定义玩家头像与称号',
      profileCustomizeDesc: '随时更换您的驯龙师头像与荣誉称号，将在 3D 世界和自拍卡中展示。',
      petNameSectionTitle: '自定义宠物名字',
      petNameSectionDesc:
        '为您的爱宠取一个专属名字，将在 3D 世界、AR 模式和自拍合影卡中全面展示。',
      petNameInputLabel: '您的宠物名字',
      petNamePlaceholder: '输入宠物名字 (例如: EMBER, 小火龙, 烈焰)',
      petNameSaveBtn: '保存宠物名字',
      petNameSavedMsg: '宠物名字已更新为',
      continueAs: '以该账号进入 3D 世界:',
      enterArAs: '进入 AR 世界',
      logoutBtn: '切换账号 / 退出登录',
      savedAccountsHeading: '此设备已保存的账号',
      tabRegister: '✨ 注册新账号',
      tabLogin: '🔑 账号登录',
      usernameLabel: '玩家昵称 / 用户名',
      passwordLabel: '安全密码 / PIN (至少 4 位)',
      avatarLabel: '选择玩家头像',
      titleLabel: '选择荣誉称号',
      registerSubmitBtn: '注册并领取 +50 XP 奖励',
      loginSubmitBtn: '🔑 登录驯龙师账号',
    },
  },
};

export function getTranslation(lang?: AppLanguage): TranslationPack {
  if (lang && lang in TRANSLATIONS) {
    return TRANSLATIONS[lang];
  }
  return TRANSLATIONS.en;
}
