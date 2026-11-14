import {
  ACHIEVEMENTS,
  AR_CARD_JPG_PATH,
  AR_CARD_MIND_PATH,
  AR_CARD_PDF_PATH,
  AR_CARD_PNG_PATH,
  BACKGROUND_TRACKS,
  COSMETICS,
  CREATURES,
  DANCE_TRACKS,
  PLAYER_AVATARS,
  PLAYER_TITLES,
} from '../constants';
import type { ARTrackerStatus, MindARTracker } from '../ar/MindARTracker';
import type { SoundManager } from '../audio/SoundManager';
import {
  calculateLevelFromXp,
  canClaimDailyReward,
  getIslandZoneLabel,
  ISLAND_TREES,
  riverCenterXAt,
  worldToMinimapPoint,
} from '../game/rules';
import {
  getTranslation,
  LANGUAGE_OPTIONS,
} from '../i18n/translations';
import { storageManager } from '../storage/StorageManager';
import type {
  AppLanguage,
  AppMode,
  BackgroundTrackId,
  CosmeticId,
  DanceTrackId,
  GraphicsQuality,
  PetActionType,
  PlayerAvatarId,
  SelfieFrameId,
  SelfiePoseId,
} from '../types';
import type { InteractiveZone } from '../world/FantasyIsland';
import type { IslandWorldEngine } from '../world/IslandWorldEngine';

export class GameUI {
  private root: HTMLElement;
  private world: IslandWorldEngine;
  private arTracker: MindARTracker;
  private sound: SoundManager;

  private mode: AppMode = 'title';
  private previousPlayMode: 'title' | 'playing' = 'title';
  private selectedEncyclopediaId: 'ember' | 'aqua' | 'moss' | 'volt' = 'ember';
  private dockCollapsed = false;
  private dockExtrasOpen = false;
  private confirmResetOpen = false;
  private authTab: 'login' | 'register' = 'register';
  private selectedRegisterAvatar: PlayerAvatarId = 'fire_keeper';
  private selectedRegisterTitle: string = PLAYER_TITLES[0];
  private draftRegUsername = '';
  private draftRegEmail = '';
  private draftRegPassword = '';
  private draftRegPetName = '';
  private draftPetName = '';
  private draftLoginId = '';
  private draftLoginPass = '';
  private authFeedback: { type: 'success' | 'error'; message: string } | null =
    null;
  private pendingPlayModeAfterAuth: 'playing' | 'ar' | null = null;
  private selfiePose: SelfiePoseId = 'wave';
  private selfieFrame: SelfieFrameId = 'gold';
  private lastSelfieDataUrl = '';
  private selfieJustSnapped = false;
  private feedbackBannerText =
    'Welcome to Solara Island! Click EMBER or use the care dock below.';
  private speechBubbleText = "You're awesome! ❤️";
  private speechBubbleVisible = false;
  private feedbackTimer: number | null = null;
  private speechTimer: number | null = null;
  private activeZone: InteractiveZone | null = null;
  private arStatus: ARTrackerStatus;

  constructor(
    root: HTMLElement,
    world: IslandWorldEngine,
    arTracker: MindARTracker,
    sound: SoundManager,
  ) {
    this.root = root;
    this.world = world;
    this.arTracker = arTracker;
    this.sound = sound;
    this.arStatus = arTracker.getStatus();
    this.draftPetName = storageManager.getPetName();

    const initLang = storageManager.getState().settings.language;
    this.feedbackBannerText = getTranslation(initLang).hud.welcomeToast;

    this.bindGlobalShortcuts();

    // Subscribe to state updates
    storageManager.subscribe((state) => {
      this.world.setCosmetic(state.progression.equippedCosmetic);
      this.world.setFriendship(state.stats.friendship);
      this.world.setSleepingState(state.stats.isSleeping);
      this.sound.updateSettings(state.settings);
      this.world.player.cameraSensitivity = state.settings.cameraSensitivity;
      if (this.mode === 'playing') {
        this.updatePlayingHudValues();
      } else if (this.mode === 'ar') {
        this.updateARHudValues();
      } else if (this.mode === 'title') {
        this.render();
      }
    });

    // Check URL query param `?autostart=1`
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      this.setMode('playing');
    } else {
      this.setMode('title');
    }
  }

  public onARStatusUpdated(status: ARTrackerStatus): void {
    this.arStatus = status;
    if (this.mode === 'ar') {
      this.updateARStatusDOM();
    }
  }

  public onNearbyZoneChanged(zone: InteractiveZone | null): void {
    this.activeZone = zone;
    if (this.mode === 'playing') {
      const zoneContainer = this.root.querySelector('#zone-prompt-slot');
      if (zoneContainer) {
        zoneContainer.innerHTML = zone ? this.renderZonePromptHTML(zone) : '';
        this.bindZonePromptButton();
      }
    }
  }

  private bindGlobalShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (this.mode === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'button' && activeTag !== 'input') {
          e.preventDefault();
          this.start3DWorld();
        }
      } else if (this.mode === 'playing') {
        if (e.code === 'KeyH') {
          this.dockCollapsed = !this.dockCollapsed;
          this.render();
        } else if (e.code === 'KeyC') {
          this.world.toggleCloseUpCareMode();
          this.render();
        } else if (e.code === 'KeyF') {
          this.openSelfieStudio();
        } else if (e.code === 'KeyM') {
          const s = storageManager.getState().settings;
          storageManager.updateSettings({ muted: !s.muted });
        } else if (e.code === 'Escape' || e.code === 'KeyP') {
          this.previousPlayMode = 'playing';
          this.setMode('settings');
        }
      } else if (
        (this.mode === 'card' ||
          this.mode === 'collection' ||
          this.mode === 'encyclopedia' ||
          this.mode === 'settings' ||
          this.mode === 'account' ||
          this.mode === 'selfie') &&
        e.code === 'Escape'
      ) {
        this.setMode(this.mode === 'selfie' ? 'playing' : this.previousPlayMode);
      }
    });
  }

  public setMode(nextMode: AppMode): void {
    if (this.mode === 'ar' && nextMode !== 'ar') {
      this.arTracker.stop();
    }

    if (
      (this.mode === 'title' || this.mode === 'playing') &&
      nextMode !== 'title' &&
      nextMode !== 'playing'
    ) {
      this.previousPlayMode = this.mode;
    }

    this.mode = nextMode;
    this.confirmResetOpen = false;
    this.draftPetName = storageManager.getPetName();

    if (nextMode === 'title') {
      document.body.dataset.state = 'title';
    } else if (
      nextMode === 'playing' ||
      nextMode === 'ar' ||
      nextMode === 'selfie'
    ) {
      document.body.dataset.state = 'playing';
    } else {
      document.body.dataset.state = 'paused';
    }
    document.body.dataset.screen = nextMode;

    this.world.setMode(nextMode);
    if (nextMode === 'playing') {
      this.sound.startAmbience();
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
      ) {
        document.activeElement.blur();
      }
    } else if (nextMode === 'selfie') {
      this.world.setSelfiePose(this.selfiePose);
    }

    this.render();

    if (nextMode === 'playing') {
      this.world.updateLiveMinimap();
    }

    if (nextMode === 'selfie') {
      // Render initial live preview onto the portrait canvas
      window.setTimeout(() => {
        if (this.mode === 'selfie') {
          this.renderSelfiePreviewCanvas(false);
        }
      }, 60);
    }

    if (nextMode === 'ar') {
      const mount = this.root.querySelector<HTMLElement>('#ar-viewport-mount');
      if (mount) {
        const s = storageManager.getState();
        void this.arTracker.start(
          mount,
          s.progression.equippedCosmetic,
          s.stats.friendship,
        );
      }
    }
  }

  public start3DWorld(): void {
    this.sound.playClick();
    this.setMode('playing');
  }

  public startARWorld(): void {
    this.sound.playClick();
    this.setMode('ar');
  }

  public openSelfieStudio(): void {
    this.sound.playHappyChirp();
    this.selfieJustSnapped = false;
    this.setMode('selfie');
  }

  public handlePetAction(action: PetActionType): void {
    const prevState = storageManager.getState();
    const petName = storageManager.getPetName();
    const actualAction: PetActionType =
      action === 'sleep' && prevState.stats.isSleeping ? 'wake' : action;

    const result = storageManager.dispatchPetAction(actualAction);
    const activeTrack =
      DANCE_TRACKS.find(
        (t) => t.id === prevState.settings.selectedDanceTrack,
      ) || DANCE_TRACKS[0];

    // Trigger appropriate sound
    if (result.leveledUpCreature || result.leveledUpPlayer) {
      this.sound.playLevelUp();
    } else if (actualAction === 'feed') {
      this.sound.playEating();
    } else if (actualAction === 'sleep') {
      this.sound.playSleepChime();
    } else if (actualAction === 'dance') {
      this.sound.playDanceRhythm(activeTrack.id, 5.5);
    } else if (actualAction === 'play') {
      this.sound.playJump();
    } else {
      this.sound.playHappyChirp();
    }

    // Trigger 3D animation in active world (5.5s for dance so EMBER dances to the full song)
    const animDuration =
      actualAction === 'sleep' ? 0 : actualAction === 'dance' ? 5.5 : 2.4;
    if (this.mode === 'ar') {
      this.arTracker.triggerARAnimation(result.animation, animDuration || 2.4);
    } else {
      this.world.triggerEmberAnimation(result.animation, animDuration);
    }

    // Show expressive speech bubble over pet
    const bubbleMap: Record<PetActionType, string> = {
      pet: "You're awesome! ❤️",
      feed: 'Yum! Sunberries! 🍎',
      play: 'Woohoo! High jump! ⭐',
      sleep: 'Sweet dragon dreams... 💤',
      wake: 'Good morning, Keeper! ☀️',
      dance: `Dancing to ${activeTrack.title}! 🎵🦖`,
      surprise: 'Whoa! Sparkle puff! ✨',
    };
    this.showSpeechBubble(bubbleMap[actualAction] || "You're awesome! ❤️");

    let msg =
      actualAction === 'dance'
        ? `🎵 ${petName} dances to "${activeTrack.title}" (${activeTrack.bpm} BPM)! +12 Happy, +8 Bond`
        : result.feedbackText.replace(/\bEMBER\b/g, petName);
    if (result.leveledUpCreature) {
      msg += ` · ${petName} reached Lv.${result.progression.creatureLevel}!`;
    }
    if (result.newlyUnlockedAchievements.length > 0) {
      const ach = ACHIEVEMENTS.find(
        (a) => a.id === result.newlyUnlockedAchievements[0],
      );
      if (ach) {
        msg += ` · Achievement Unlocked: ${ach.title}!`;
      }
    }
    this.showFeedback(msg);
  }

  private showSpeechBubble(text: string): void {
    this.speechBubbleText = text;
    this.speechBubbleVisible = true;
    const bubbleEl = this.root.querySelector<HTMLElement>('#ember-speech-bubble');
    const bubbleTextEl = this.root.querySelector<HTMLElement>(
      '#ember-speech-text',
    );
    if (bubbleEl && bubbleTextEl) {
      bubbleTextEl.textContent = text;
      bubbleEl.classList.add('bubble-visible');
    }
    if (this.speechTimer !== null) {
      window.clearTimeout(this.speechTimer);
    }
    this.speechTimer = window.setTimeout(() => {
      this.speechBubbleVisible = false;
      const el = this.root.querySelector<HTMLElement>('#ember-speech-bubble');
      el?.classList.remove('bubble-visible');
      this.speechTimer = null;
    }, 3200);
  }

  public showFeedback(text: string): void {
    this.feedbackBannerText = text;
    const bannerEl = this.root.querySelector<HTMLElement>('#pet-feedback-toast');
    if (bannerEl) {
      bannerEl.textContent = text;
      bannerEl.classList.remove('toast-pop');
      void bannerEl.offsetWidth;
      bannerEl.classList.add('toast-pop');
    }
    if (this.feedbackTimer !== null) {
      window.clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = window.setTimeout(() => {
      this.feedbackTimer = null;
    }, 4500);
  }

  /**
   * Renders the High-Impact 3D-Extruded Winged Crystal Crest Logo with realistic
   * multi-layered depth, vibrant metallic & jewel gradients, and bold display typography.
   */
  private renderTitleEmblemSVG(compact = false): string {
    return `
      <svg viewBox="0 0 540 190" class="${compact ? 'ar-corner-emblem-svg' : 'title-emblem-svg'}" role="img" aria-label="Emberix World">
        <defs>
          <linearGradient id="wingOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFBEB" />
            <stop offset="22%" stop-color="#FDE047" />
            <stop offset="52%" stop-color="#FB923C" />
            <stop offset="78%" stop-color="#F43F5E" />
            <stop offset="100%" stop-color="#7E22CE" />
          </linearGradient>
          <linearGradient id="wingInnerGrad" x1="0%" y1="10%" x2="90%" y2="95%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="45%" stop-color="#F97316" />
            <stop offset="85%" stop-color="#E11D48" />
            <stop offset="100%" stop-color="#581C87" />
          </linearGradient>
          <linearGradient id="wingShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4C1D95" />
            <stop offset="100%" stop-color="#1E1B4B" />
          </linearGradient>
          <linearGradient id="crystalFacetMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="30%" stop-color="#67E8F9" />
            <stop offset="70%" stop-color="#0284C7" />
            <stop offset="100%" stop-color="#1E3A8A" />
          </linearGradient>
          <linearGradient id="crystalFacetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E0F2FE" />
            <stop offset="55%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#0369A1" />
          </linearGradient>
          <linearGradient id="crystalFacetRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#22D3EE" />
            <stop offset="60%" stop-color="#0284C7" />
            <stop offset="100%" stop-color="#172554" />
          </linearGradient>
          <linearGradient id="shieldRoyalBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#3B0764" />
            <stop offset="38%" stop-color="#1E1B4B" />
            <stop offset="100%" stop-color="#090D16" />
          </linearGradient>
          <linearGradient id="shieldGoldFrame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="35%" stop-color="#FACC15" />
            <stop offset="70%" stop-color="#EA580C" />
            <stop offset="100%" stop-color="#FEF08A" />
          </linearGradient>
          <linearGradient id="xrCyanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="38%" stop-color="#A5F3FC" />
            <stop offset="75%" stop-color="#06B6D4" />
            <stop offset="100%" stop-color="#0369A1" />
          </linearGradient>
          <linearGradient id="creatureFireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="18%" stop-color="#FEF08A" />
            <stop offset="52%" stop-color="#FACC15" />
            <stop offset="82%" stop-color="#F97316" />
            <stop offset="100%" stop-color="#DC2626" />
          </linearGradient>
          <linearGradient id="worldGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFFBEB" />
            <stop offset="28%" stop-color="#FDE047" />
            <stop offset="65%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#B45309" />
          </linearGradient>
          <linearGradient id="extrude3DDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#431407" />
            <stop offset="100%" stop-color="#0F172A" />
          </linearGradient>
          <filter id="logoDropShadow" x="-18%" y="-18%" width="136%" height="142%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#04020A" flood-opacity="0.9" />
          </filter>
          <filter id="crystalGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#logoDropShadow)">
          <ellipse cx="270" cy="96" rx="195" ry="62" fill="#F59E0B" fill-opacity="0.16" />
          <ellipse cx="270" cy="40" rx="56" ry="28" fill="#38BDF8" fill-opacity="0.28" />

          <path d="M162,84 C102,54 54,28 18,12 C28,46 54,70 92,84 C52,82 26,72 10,58 C26,92 64,110 116,112 C78,120 52,118 36,110 C60,134 102,140 156,130 C130,144 108,148 92,146 C118,158 152,156 176,142 Z" fill="url(#wingShadowGrad)" transform="translate(0, 6)" />
          <path d="M162,84 C102,54 54,28 18,12 C28,46 54,70 92,84 C52,82 26,72 10,58 C26,92 64,110 116,112 C78,120 52,118 36,110 C60,134 102,140 156,130 C130,144 108,148 92,146 C118,158 152,156 176,142 Z" fill="url(#wingOuterGrad)" stroke="#FEF08A" stroke-width="2" />
          <path d="M166,90 C118,66 78,46 46,32 C56,56 76,74 106,86 C74,86 52,78 38,68 C52,92 82,106 126,108 C98,116 78,114 64,108 C84,126 118,130 162,122 Z" fill="url(#wingInnerGrad)" opacity="0.88" />

          <path d="M378,84 C438,54 486,28 522,12 C512,46 486,70 448,84 C488,82 514,72 530,58 C514,92 476,110 424,112 C462,120 488,118 504,110 C480,134 438,140 384,130 C410,144 432,148 448,146 C422,158 388,156 364,142 Z" fill="url(#wingShadowGrad)" transform="translate(0, 6)" />
          <path d="M378,84 C438,54 486,28 522,12 C512,46 486,70 448,84 C488,82 514,72 530,58 C514,92 476,110 424,112 C462,120 488,118 504,110 C480,134 438,140 384,130 C410,144 432,148 448,146 C422,158 388,156 364,142 Z" fill="url(#wingOuterGrad)" stroke="#FEF08A" stroke-width="2" />
          <path d="M374,90 C422,66 462,46 494,32 C484,56 464,74 434,86 C466,86 488,78 502,68 C488,92 458,106 414,108 C442,116 462,114 476,108 C456,126 422,130 378,122 Z" fill="url(#wingInnerGrad)" opacity="0.88" />

          <polygon points="270,26 392,54 368,148 270,176 172,148 148,54" fill="#090514" transform="translate(0, 7)" />
          <polygon points="270,26 392,54 368,148 270,176 172,148 148,54" fill="url(#shieldRoyalBg)" stroke="url(#shieldGoldFrame)" stroke-width="5.5" stroke-linejoin="round" />
          <polygon points="270,34 382,59 360,142 270,167 180,142 158,59" fill="none" stroke="#FDE047" stroke-opacity="0.45" stroke-width="1.8" />

          <circle cx="160" cy="60" r="3.5" fill="#FEF08A" stroke="#9A3412" stroke-width="1.2" />
          <circle cx="380" cy="60" r="3.5" fill="#FEF08A" stroke="#9A3412" stroke-width="1.2" />
          <circle cx="180" cy="142" r="3.5" fill="#FEF08A" stroke="#9A3412" stroke-width="1.2" />
          <circle cx="360" cy="142" r="3.5" fill="#FEF08A" stroke="#9A3412" stroke-width="1.2" />

          <g filter="url(#crystalGlow)">
            <polygon points="270,2 300,28 270,60 240,28" fill="url(#crystalFacetMain)" stroke="#E0F2FE" stroke-width="2.2" />
            <polygon points="270,2 270,60 240,28" fill="url(#crystalFacetLeft)" />
            <polygon points="270,2 300,28 270,60" fill="url(#crystalFacetRight)" />
            <polygon points="270,8 286,28 270,50 254,28" fill="#FFFFFF" fill-opacity="0.55" />
          </g>

          <g fill="#FEF9C3">
            <polygon points="126,30 130,38 138,42 130,46 126,54 122,46 114,42 122,38" />
            <polygon points="414,30 418,38 426,42 418,46 414,54 410,46 402,42 410,38" />
            <circle cx="222" cy="18" r="2.8" fill="#67E8F9" />
            <circle cx="318" cy="18" r="2.8" fill="#67E8F9" />
          </g>

          <g font-family="'Lilita One', 'Fredoka', 'Cinzel', sans-serif" font-size="50" font-weight="900" text-anchor="middle" letter-spacing="2.5">
            <text x="270" y="106" fill="#090514" stroke="#090514" stroke-width="12" stroke-linejoin="round" paint-order="stroke">EMBERIX</text>
            <text x="270" y="103" fill="url(#extrude3DDark)" stroke="#431407" stroke-width="10" stroke-linejoin="round" paint-order="stroke">EMBERIX</text>
            <text x="270" y="99" fill="url(#creatureFireGrad)" stroke="#1E1B4B" stroke-width="7.5" stroke-linejoin="round" paint-order="stroke">EMBERIX</text>
            <text x="270" y="98" fill="none" stroke="#FFFBEB" stroke-width="1.2" stroke-opacity="0.7">EMBERIX</text>
          </g>

          <g font-family="'Lilita One', 'Fredoka', 'Cinzel', sans-serif" font-size="48" font-weight="900" text-anchor="middle" letter-spacing="4">
            <text x="270" y="151" fill="#090514" stroke="#090514" stroke-width="12" stroke-linejoin="round" paint-order="stroke">WORLD</text>
            <text x="270" y="148" fill="#78350F" stroke="#451A03" stroke-width="10" stroke-linejoin="round" paint-order="stroke">WORLD</text>
            <text x="270" y="144" fill="url(#worldGoldGrad)" stroke="#1E1B4B" stroke-width="7.5" stroke-linejoin="round" paint-order="stroke">WORLD</text>
            <text x="270" y="143" fill="none" stroke="#FEF9C3" stroke-width="1.2" stroke-opacity="0.75">WORLD</text>
          </g>
        </g>
      </svg>
    `;
  }

  private renderExplorerAvatarSVG(avatarId: PlayerAvatarId = 'fire_keeper'): string {
    const avatarMeta =
      PLAYER_AVATARS.find((a) => a.id === avatarId) || PLAYER_AVATARS[0];

    return `
      <svg viewBox="0 0 64 64" class="avatar-badge-svg" aria-hidden="true">
        <defs>
          <linearGradient id="avatarBg-${avatarMeta.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${avatarMeta.bgTop}" />
            <stop offset="100%" stop-color="${avatarMeta.bgBottom}" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="url(#avatarBg-${avatarMeta.id})" stroke="#FBBF24" stroke-width="3.5" />
        <circle cx="32" cy="36" r="15" fill="#FDE68A" />
        <path d="M16,32 C16,17 48,17 48,32 C42,23 22,23 16,32 Z" fill="${avatarMeta.hairColor}" />
        <polygon points="32,14 37,22 27,22" fill="${avatarMeta.accentColor}" stroke="#9A3412" stroke-width="1.2" />
        <circle cx="26" cy="35" r="2.7" fill="#1E1B4B" />
        <circle cx="38" cy="35" r="2.7" fill="#1E1B4B" />
        <circle cx="25" cy="34" r="1" fill="#FFFFFF" />
        <circle cx="37" cy="34" r="1" fill="#FFFFFF" />
        <ellipse cx="22" cy="39" rx="2.6" ry="1.4" fill="#FB7185" fill-opacity="0.55" />
        <ellipse cx="42" cy="39" rx="2.6" ry="1.4" fill="#FB7185" fill-opacity="0.55" />
        <path d="M28,42 Q32,46 36,42" stroke="#9A3412" stroke-width="2.2" fill="none" stroke-linecap="round" />
      </svg>
    `;
  }

  private renderEmberAvatarSVG(): string {
    return `
      <svg viewBox="0 0 64 64" class="avatar-badge-svg" aria-hidden="true">
        <defs>
          <linearGradient id="emberBadgeBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#1E3A8A" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="url(#emberBadgeBg)" stroke="#FBBF24" stroke-width="3.5" />
        <path d="M18,22 Q12,10 22,14 Z" fill="#4E2A1E" />
        <path d="M46,22 Q52,10 42,14 Z" fill="#4E2A1E" />
        <ellipse cx="32" cy="35" rx="16" ry="14" fill="#FF6422" />
        <ellipse cx="32" cy="40" rx="11" ry="8" fill="#FFD54F" />
        <circle cx="25" cy="32" r="4.2" fill="#1E1B4B" />
        <circle cx="39" cy="32" r="4.2" fill="#1E1B4B" />
        <circle cx="24" cy="30.5" r="1.5" fill="#FFFFFF" />
        <circle cx="38" cy="30.5" r="1.5" fill="#FFFFFF" />
        <path d="M27,41 Q32,46 37,41 Z" fill="#E11D48" />
      </svg>
    `;
  }

  private renderMainMenuHTML(): string {
    const { stats, progression, settings } = storageManager.getState();
    const t = getTranslation(settings.language);
    const petName = storageManager.getPetName();
    const currentUser = storageManager.getCurrentUser();
    const playerLvlInfo = calculateLevelFromXp(progression.playerXp);
    const creatureLvlInfo = calculateLevelFromXp(progression.creatureXp);
    const todayIso = new Date().toISOString().slice(0, 10);
    const dailyAvailable = canClaimDailyReward(
      progression.lastDailyClaimDate,
      todayIso,
    );
    const activeTrack =
      DANCE_TRACKS.find((tr) => tr.id === settings.selectedDanceTrack) ||
      DANCE_TRACKS[0];

    return `
      <main class="screen-overlay title-screen-layout" aria-label="Main Menu">
        <!-- Top-Left Keeper Level & Account Badge -->
        <header class="title-top-left-badge" id="btn-badge-account" role="button" tabindex="0" title="${t.menu.registerLogin}">
          ${this.renderExplorerAvatarSVG(currentUser?.avatarId || 'fire_keeper')}
          <div class="keeper-badge-info">
            <div class="keeper-badge-row">
              <span class="keeper-lvl-title">${currentUser ? currentUser.username : t.menu.guestKeeper} · Lv.${playerLvlInfo.level}</span>
              <span class="keeper-bond-chip" id="title-pet-name-chip">${petName} Lv.${creatureLvlInfo.level}</span>
            </div>
            <div class="xp-bar-track" role="progressbar" aria-valuenow="${playerLvlInfo.progressPercent}" aria-valuemin="0" aria-valuemax="100">
              <div class="xp-bar-fill" style="width: ${playerLvlInfo.progressPercent}%"></div>
              <span class="xp-bar-overlay-text tabular-nums">${playerLvlInfo.currentLevelXp} / ${playerLvlInfo.nextLevelXp} XP</span>
            </div>
          </div>
          <span class="badge-auth-pill">${currentUser ? t.menu.accountBadge : t.menu.registerLogin}</span>
        </header>

        <!-- Top-Right Glossy Account, Trophy & Daily Gift Buttons -->
        <div class="title-top-right-badges">
          <button
            type="button"
            class="btn-round-badge badge-account"
            id="btn-top-account"
            title="${currentUser ? `${t.menu.playerPrefix}: ${currentUser.username} (${currentUser.titleBadge})` : t.menu.registerLogin}"
            aria-label="Player Account & Login"
          >
            <svg viewBox="0 0 24 24" class="badge-icon-svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#38BDF8"/></svg>
          </button>

          <button
            type="button"
            class="btn-round-badge badge-trophy"
            id="btn-trophy-achievements"
            title="Keeper Achievements (${progression.unlockedAchievements.length}/${ACHIEVEMENTS.length})"
            aria-label="Achievements"
          >
            <svg viewBox="0 0 24 24" class="badge-icon-svg"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" fill="#FDE047"/></svg>
          </button>

          <button
            type="button"
            class="btn-round-badge badge-gift ${dailyAvailable ? 'gift-pulse' : ''}"
            id="btn-claim-daily"
            title="${dailyAvailable ? t.menu.dailyAvailable : t.menu.dailyClaimed}"
            aria-label="${dailyAvailable ? t.menu.dailyAvailable : t.menu.dailyClaimed}"
          >
            <svg viewBox="0 0 24 24" class="badge-icon-svg"><path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" fill="#F472B6"/></svg>
            ${dailyAvailable ? '<span class="badge-dot">!</span>' : ''}
          </button>
        </div>

        <!-- Center Winged Emblem & Glossy 3D Game Menu Stack -->
        <section class="title-center-column">
          ${this.renderTitleEmblemSVG(false)}

          <div class="menu-button-stack">
            <button type="button" class="btn-game-glossy btn-glossy-green" id="btn-play-3d" data-start="true">
              <span class="btn-circle-icon">
                <svg viewBox="0 0 24 24" class="btn-icon"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
              </span>
              <span class="btn-glossy-label">${t.menu.play3dWorld}</span>
            </button>

            <button type="button" class="btn-game-glossy btn-glossy-purple" id="btn-enter-ar">
              <span class="btn-circle-icon">
                <svg viewBox="0 0 24 24" class="btn-icon"><path d="M12 10.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm8-2.8h-2.6l-1.4-2H8L6.6 8H4c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2zm-8 11c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="currentColor"/></svg>
              </span>
              <span class="btn-glossy-label">${t.menu.enterArWorld}</span>
            </button>

            <button type="button" class="btn-game-glossy btn-glossy-blue" id="btn-collection">
              <span class="btn-circle-icon">
                <svg viewBox="0 0 24 24" class="btn-icon"><circle cx="4.5" cy="9.5" r="2.5" fill="currentColor"/><circle cx="9" cy="5.5" r="2.5" fill="currentColor"/><circle cx="15" cy="5.5" r="2.5" fill="currentColor"/><circle cx="19.5" cy="9.5" r="2.5" fill="currentColor"/><path d="M17.34 14.86c-.87-1.02-1.6-1.89-2.48-2.91-.46-.54-1.05-1.08-1.75-1.32-.11-.04-.22-.07-.33-.09-.25-.04-.52-.04-.78-.04s-.53 0-.79.05c-.11.02-.22.05-.33.09-.7.24-1.28.78-1.75 1.32-.87 1.02-1.6 1.89-2.48 2.91-1.31 1.31-2.92 2.76-2.62 4.79.29 1.02 1.02 2.03 2.33 2.32.73.15 3.06-.44 5.54-.44h.18c2.48 0 4.81.58 5.54.44 1.31-.29 2.04-1.31 2.33-2.32.31-2.04-1.3-3.49-2.61-4.8z" fill="currentColor"/></svg>
              </span>
              <span class="btn-glossy-label">${t.menu.creatureCollection}</span>
            </button>

            <button type="button" class="btn-game-glossy btn-glossy-orange" id="btn-encyclopedia">
              <span class="btn-circle-icon">
                <svg viewBox="0 0 24 24" class="btn-icon"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" fill="currentColor"/></svg>
              </span>
              <span class="btn-glossy-label">${t.menu.creatureEncyclopedia}</span>
            </button>

            <div class="menu-sub-pair">
              <button type="button" class="btn-game-glossy btn-glossy-gold btn-sub-half" id="btn-my-ar-card">
                <span class="btn-circle-icon">
                  <svg viewBox="0 0 24 24" class="btn-icon"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 4a3 3 0 110 6 3 3 0 010-6zm6 12H6v-1.4c0-2 4-3.1 6-3.1s6 1.1 6 3.1V19z" fill="currentColor"/></svg>
                </span>
                <span class="btn-glossy-label">${t.menu.myArCard}</span>
              </button>

              <button type="button" class="btn-game-glossy btn-glossy-slate btn-sub-half" id="btn-settings">
                <span class="btn-circle-icon">
                  <svg viewBox="0 0 24 24" class="btn-icon"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/></svg>
                </span>
                <span class="btn-glossy-label">${t.menu.settings}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Left Foreground Pet Perch Quick Actions + Dance Music Picker -->
        <aside class="title-showcase-callout">
          <div class="showcase-tag">
            <strong>${petName}</strong> · Lv.${creatureLvlInfo.level} · ${t.menu.mood} ${stats.happiness}%
          </div>
          <div class="showcase-quick-actions">
            <button type="button" class="btn-mini-glass" id="btn-preview-wave" aria-label="Make ${petName} Wave">${t.menu.wave}</button>
            <button type="button" class="btn-mini-glass" id="btn-preview-dance" aria-label="Make ${petName} Dance">${t.menu.dance}</button>
            <button type="button" class="btn-mini-glass btn-mini-music" id="btn-cycle-dance-track" title="Switch Dance Track">
              🎶 ${activeTrack.title} ▾
            </button>
          </div>
        </aside>

        <div class="bottom-control-hint">
          ${t.menu.controlsHint}
        </div>
      </main>
    `;
  }

  private renderZonePromptHTML(zone: InteractiveZone): string {
    return `
      <div class="zone-prompt-card">
        <span class="zone-title">${zone.label}</span>
        <button type="button" class="btn-zone-action" data-zone-id="${zone.id}">
          ${zone.actionHint}
        </button>
      </div>
    `;
  }

  /**
   * Renders the Real-Time Topographic Fantasy Island Minimap Radar.
   * Accurately maps the 3D river curve, bridge, sanctuary, keeper cottage, castle,
   * crystal spires, trees, camera FOV cone, companion pet dot, breadcrumb trail,
   * and directional player marker from live 3D world coordinates.
   */
  private renderMinimapSVG(): string {
    const playerPos = this.world.player.position;
    const emberPos = this.world.emberPosition;
    const pPt = worldToMinimapPoint(playerPos.x, playerPos.z);
    const ePt = worldToMinimapPoint(emberPos.x, emberPos.z);
    const facingDeg = Number(
      (-this.world.player.facingYaw * (180 / Math.PI)).toFixed(1),
    );
    const camFovDeg = Number(
      (-this.world.player.cameraYaw * (180 / Math.PI)).toFixed(1),
    );

    // Build accurate river polyline from riverCenterXAt(z)
    const riverPts: string[] = [];
    for (let z = -21; z <= 27; z += 1.5) {
      const pt = worldToMinimapPoint(riverCenterXAt(z), z);
      riverPts.push(`${pt.x},${pt.y}`);
    }
    const riverPolyline = riverPts.join(' ');

    // Exact 3D landmark positions mapped to radar SVG coordinates
    const lagoonPt = worldToMinimapPoint(-6.2, -18.0);
    const castlePt = worldToMinimapPoint(-1.0, -22.2);
    const cottagePt = worldToMinimapPoint(4.95, -7.6);
    const orchardPt = worldToMinimapPoint(7.5, -4.5);
    const sanctuaryPt = worldToMinimapPoint(0, 0);
    const nest1Pt = worldToMinimapPoint(3.35, 0.45);
    const nest2Pt = worldToMinimapPoint(5.6, 5.8);
    const crystal1Pt = worldToMinimapPoint(-2.4, -3.2);
    const crystal2Pt = worldToMinimapPoint(-13.5, 3.5);
    const crystal3Pt = worldToMinimapPoint(12.2, -1.8);
    const westGardenPt = worldToMinimapPoint(-11.2, -1.5);
    const bridgeWest = worldToMinimapPoint(-9.8, 0);
    const bridgeEast = worldToMinimapPoint(-2.6, 0);
    const bridgeW = Math.max(8, Number((bridgeEast.x - bridgeWest.x).toFixed(2)));

    // Plot real island trees inside radar radius
    const treeCircles = ISLAND_TREES.filter(
      (t) => Math.hypot(t.x, t.z) <= 23.5,
    )
      .slice(0, 28)
      .map((t) => {
        const tp = worldToMinimapPoint(t.x, t.z);
        return `<circle cx="${tp.x}" cy="${tp.y}" r="1.55" fill="#15803D" opacity="0.78" />`;
      })
      .join('');

    const zoom = this.world.minimapZoom;
    const worldTransform =
      zoom > 1
        ? `translate(50, 50) scale(${zoom}) translate(${-pPt.x}, ${-pPt.y})`
        : 'translate(0, 0) scale(1)';

    return `
      <svg viewBox="0 0 100 100" class="minimap-radar-svg" aria-label="Solara Island Live Radar Map">
        <defs>
          <clipPath id="minimapClip">
            <circle cx="50" cy="50" r="44.2" />
          </clipPath>
          <radialGradient id="mapIslandGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#1E5631" />
            <stop offset="68%" stop-color="#166534" />
            <stop offset="84%" stop-color="#4ADE80" />
            <stop offset="91%" stop-color="#FDE047" />
            <stop offset="100%" stop-color="#0284C7" />
          </radialGradient>
          <linearGradient id="fovConeGrad" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.48" />
            <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Radar Outer Bezel & Ocean Base -->
        <circle cx="50" cy="50" r="46" fill="#082F49" stroke="#FBBF24" stroke-width="2.8" />

        <!-- Clipped World & Live Entity Layer -->
        <g clip-path="url(#minimapClip)">
          <g id="minimap-world-layer" transform="${worldTransform}">
            <!-- Island Coastline & Emerald Terrain -->
            <circle cx="50" cy="50" r="43.5" fill="url(#mapIslandGrad)" />

            <!-- Topographic Radar Grid Rings & Axes -->
            <circle cx="50" cy="50" r="16.2" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.6" stroke-dasharray="2 2" />
            <circle cx="50" cy="50" r="32.4" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.6" stroke-dasharray="2 2" />
            <line x1="50" y1="6" x2="50" y2="94" stroke="rgba(255,255,255,0.1)" stroke-width="0.5" />
            <line x1="6" y1="50" x2="94" y2="50" stroke="rgba(255,255,255,0.1)" stroke-width="0.5" />

            <!-- Northern Waterfall Plunge Pool & Winding River -->
            <ellipse cx="${lagoonPt.x}" cy="${lagoonPt.y}" rx="6.8" ry="4.8" fill="#0EA5E9" stroke="#7DD3FC" stroke-width="0.8" />
            <polyline points="${riverPolyline}" fill="none" stroke="#0284C7" stroke-width="7.4" stroke-linecap="round" stroke-linejoin="round" />
            <polyline points="${riverPolyline}" fill="none" stroke="#38BDF8" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" />

            <!-- Real Island Trees -->
            ${treeCircles}

            <!-- West Meadow Flower Garden -->
            <circle cx="${westGardenPt.x}" cy="${westGardenPt.y}" r="2.8" fill="#F472B6" opacity="0.75" />

            <!-- Wooden Bridge at z = 0 spanning the river -->
            <rect
              x="${bridgeWest.x}"
              y="${(bridgeWest.y - 2.6).toFixed(2)}"
              width="${bridgeW}"
              height="5.2"
              rx="1.4"
              fill="#B45309"
              stroke="#FDE047"
              stroke-width="1"
            />

            <!-- Central Sunstone Sanctuary Spawn Pad (0, 0) -->
            <circle cx="${sanctuaryPt.x}" cy="${sanctuaryPt.y}" r="4.2" fill="rgba(251, 191, 36, 0.25)" stroke="#FBBF24" stroke-width="1.1" />
            <circle cx="${sanctuaryPt.x}" cy="${sanctuaryPt.y}" r="1.4" fill="#FDE047" />

            <!-- Cozy Dragon Sleep Beds -->
            <circle cx="${nest1Pt.x}" cy="${nest1Pt.y}" r="2.0" fill="#FB7185" stroke="#FFF1F2" stroke-width="0.7" />
            <circle cx="${nest2Pt.x}" cy="${nest2Pt.y}" r="1.9" fill="#FB7185" stroke="#FFF1F2" stroke-width="0.7" />

            <!-- Sunberry Orchard Bush -->
            <circle cx="${orchardPt.x}" cy="${orchardPt.y}" r="2.3" fill="#22C55E" stroke="#EF4444" stroke-width="0.9" />

            <!-- Mana Crystal Spires -->
            <polygon points="${crystal1Pt.x},${crystal1Pt.y - 2.2} ${crystal1Pt.x + 1.8},${crystal1Pt.y} ${crystal1Pt.x},${crystal1Pt.y + 2.2} ${crystal1Pt.x - 1.8},${crystal1Pt.y}" fill="#38BDF8" stroke="#E0F2FE" stroke-width="0.5" />
            <polygon points="${crystal2Pt.x},${crystal2Pt.y - 2.0} ${crystal2Pt.x + 1.6},${crystal2Pt.y} ${crystal2Pt.x},${crystal2Pt.y + 2.0} ${crystal2Pt.x - 1.6},${crystal2Pt.y}" fill="#38BDF8" stroke="#E0F2FE" stroke-width="0.5" />
            <polygon points="${crystal3Pt.x},${crystal3Pt.y - 2.0} ${crystal3Pt.x + 1.6},${crystal3Pt.y} ${crystal3Pt.x},${crystal3Pt.y + 2.0} ${crystal3Pt.x - 1.6},${crystal3Pt.y}" fill="#38BDF8" stroke="#E0F2FE" stroke-width="0.5" />

            <!-- Pet Sanctuary House (Keeper Cottage) -->
            <g transform="translate(${cottagePt.x}, ${cottagePt.y})">
              <rect x="-3.4" y="-1.2" width="6.8" height="4.4" rx="0.8" fill="#FEF3C7" stroke="#78350F" stroke-width="0.6" />
              <polygon points="0,-4.5 4.4,-1.0 -4.4,-1.0" fill="#E11D48" stroke="#FFE4E6" stroke-width="0.6" />
              <text x="0" y="6.2" text-anchor="middle" fill="#FEF08A" font-size="3.1" font-weight="900" font-family="sans-serif" stroke="#0F172A" stroke-width="0.35" paint-order="stroke">HOME</text>
            </g>

            <!-- Northern Solara Fantasy Castle -->
            <g transform="translate(${castlePt.x}, ${castlePt.y})">
              <rect x="-4.5" y="-2.2" width="9.0" height="4.8" rx="0.8" fill="#C084FC" stroke="#FDE047" stroke-width="0.7" />
              <polygon points="0,-5.4 3.5,-2.2 -3.5,-2.2" fill="#9333EA" stroke="#FDE047" stroke-width="0.6" />
              <text x="0" y="5.8" text-anchor="middle" fill="#F3E8FF" font-size="3.1" font-weight="900" font-family="sans-serif" stroke="#0F172A" stroke-width="0.35" paint-order="stroke">CASTLE</text>
            </g>

            <!-- Bridge & Nest Micro-Labels -->
            <text x="${(bridgeWest.x + bridgeW / 2).toFixed(1)}" y="${(bridgeWest.y - 3.6).toFixed(1)}" text-anchor="middle" fill="#FDE047" font-size="2.9" font-weight="900" font-family="sans-serif" stroke="#0F172A" stroke-width="0.35" paint-order="stroke">BRIDGE</text>
            <text x="${nest1Pt.x}" y="${(nest1Pt.y + 4.8).toFixed(1)}" text-anchor="middle" fill="#FECDD3" font-size="2.8" font-weight="900" font-family="sans-serif" stroke="#0F172A" stroke-width="0.35" paint-order="stroke">NEST</text>

            <!-- Real-Time Player Footstep Breadcrumb Trail -->
            <polyline
              id="minimap-player-trail"
              points="${pPt.x},${pPt.y}"
              fill="none"
              stroke="#FDE047"
              stroke-width="1.3"
              stroke-dasharray="1.8 1.4"
              stroke-linecap="round"
              opacity="0.82"
            />

            <!-- Real-Time Camera Viewing Cone (FOV) -->
            <g id="minimap-cam-fov" transform="translate(${pPt.x}, ${pPt.y}) rotate(${camFovDeg})">
              <path d="M 0,0 L -9.5,-19 A 21,21 0 0,1 9.5,-19 Z" fill="url(#fovConeGrad)" />
            </g>

            <!-- Real-Time Companion Pet Marker (EMBER) -->
            <circle
              id="minimap-ember-halo"
              cx="${ePt.x}"
              cy="${ePt.y}"
              r="4.8"
              fill="rgba(255, 87, 34, 0.32)"
            />
            <circle
              id="minimap-ember-dot"
              cx="${ePt.x}"
              cy="${ePt.y}"
              r="2.9"
              fill="#FF5722"
              stroke="#FFFFFF"
              stroke-width="1.1"
              data-world-x="${emberPos.x.toFixed(2)}"
              data-world-z="${emberPos.z.toFixed(2)}"
            />

            <!-- Real-Time Player Position & Facing Direction Arrow -->
            <g
              id="minimap-player-marker"
              transform="translate(${pPt.x}, ${pPt.y}) rotate(${facingDeg})"
              data-world-x="${playerPos.x.toFixed(2)}"
              data-world-z="${playerPos.z.toFixed(2)}"
              data-map-x="${pPt.x}"
              data-map-y="${pPt.y}"
              data-facing-deg="${facingDeg}"
            >
              <circle cx="0" cy="0" r="5.4" fill="rgba(56, 189, 248, 0.28)" />
              <polygon
                id="minimap-player-dot"
                points="0,4.8 -3.6,-3.8 0,-1.8 3.6,-3.8"
                fill="#38BDF8"
                stroke="#FFFFFF"
                stroke-width="1.2"
                stroke-linejoin="round"
              />
              <circle cx="0" cy="0.4" r="1.2" fill="#FDE047" />
            </g>
          </g>
        </g>

        <!-- Compass Cardinal Labels on Bezel -->
        <text x="50" y="9.5" text-anchor="middle" fill="#FDE047" font-size="6.8" font-weight="900" font-family="sans-serif">N</text>
        <text x="91.5" y="52.2" text-anchor="middle" fill="#E2E8F0" font-size="5.8" font-weight="800" font-family="sans-serif">E</text>
        <text x="50" y="94.5" text-anchor="middle" fill="#E2E8F0" font-size="5.8" font-weight="800" font-family="sans-serif">S</text>
        <text x="8.5" y="52.2" text-anchor="middle" fill="#E2E8F0" font-size="5.8" font-weight="800" font-family="sans-serif">W</text>
      </svg>
    `;
  }

  private renderPlayingHUDHTML(): string {
    const { stats, progression, settings } = storageManager.getState();
    const t = getTranslation(settings.language);
    const petName = storageManager.getPetName();
    const creatureLvl = calculateLevelFromXp(progression.creatureXp);

    return `
      <main class="hud-layer" aria-label="3D World HUD">
        <!-- Top-Left Status Cluster -->
        <section class="hud-top-left" aria-label="Creature Status">
          <div class="hud-creature-badge">
            ${this.renderEmberAvatarSVG()}
            <div class="hud-creature-meta">
              <div class="hud-name-line">
                <h2 class="hud-creature-name">${petName} <span class="hud-lvl-text tabular-nums">Lv.${creatureLvl.level}</span></h2>
                <span class="hud-state-label" id="hud-sleep-badge">${stats.isSleeping ? t.hud.sleeping : t.hud.active}</span>
              </div>
              <p class="hud-sub-meta">
                <span>${t.hud.bond} Lv.${progression.friendshipLevel}</span>
                <span aria-hidden="true">·</span>
                <button type="button" class="btn-camera-focus-chip" id="hud-btn-camera-mode">
                  ${this.world.closeUpMode ? t.hud.islandView : t.hud.careCloseUp}
                </button>
              </p>
            </div>
          </div>

          <!-- Glossy Color-Coded Pill Status Bars -->
          <div class="glossy-bars-stack">
            <div class="glossy-stat-pill">
              <span class="stat-pill-icon icon-heart" title="Hunger Satisfaction">❤️</span>
              <div class="stat-track">
                <div class="stat-fill fill-hunger" id="bar-hunger" style="width: ${stats.hunger}%"></div>
                <span class="stat-overlay-val tabular-nums" id="val-hunger">${stats.hunger}/100</span>
              </div>
            </div>

            <div class="glossy-stat-pill">
              <span class="stat-pill-icon icon-energy" title="Energy">⚡</span>
              <div class="stat-track">
                <div class="stat-fill fill-energy" id="bar-energy" style="width: ${stats.energy}%"></div>
                <span class="stat-overlay-val tabular-nums" id="val-energy">${stats.energy}/100</span>
              </div>
            </div>

            <div class="glossy-stat-pill">
              <span class="stat-pill-icon icon-happy" title="Happiness">😊</span>
              <div class="stat-track">
                <div class="stat-fill fill-happiness" id="bar-happiness" style="width: ${stats.happiness}%"></div>
                <span class="stat-overlay-val tabular-nums" id="val-happiness">${stats.happiness}/100</span>
              </div>
            </div>

            <div class="glossy-stat-pill">
              <span class="stat-pill-icon icon-bond" title="Friendship Bond">⭐</span>
              <div class="stat-track">
                <div class="stat-fill fill-friendship" id="bar-friendship" style="width: ${stats.friendship}%"></div>
                <span class="stat-overlay-val tabular-nums" id="val-friendship">${t.hud.bond} ${stats.friendship}%</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Top-Right Minimap Radar + Navigation Cluster -->
        <nav class="hud-top-right" aria-label="World Navigation">
          <div class="hud-nav-pills">
            <button type="button" class="btn-hud-nav btn-hud-selfie" id="hud-btn-selfie" aria-label="Selfie Portrait Studio">
              <span>${t.hud.selfieBtn}</span>
            </button>
            <button type="button" class="btn-hud-nav btn-hud-ar" id="hud-btn-ar" aria-label="Enter AR World">
              <span>${t.hud.arWorld}</span>
            </button>
            <button type="button" class="btn-hud-nav" id="hud-btn-card" aria-label="My AR Card">
              <span>${t.hud.arCard}</span>
            </button>
            <button type="button" class="btn-hud-nav" id="hud-btn-collection" aria-label="Creature Collection">
              <span>${t.hud.collection}</span>
            </button>
            <button type="button" class="btn-hud-nav" id="hud-btn-encyclopedia" aria-label="Creature Encyclopedia">
              <span>${t.hud.lore}</span>
            </button>
            <button type="button" class="btn-hud-nav" id="hud-btn-account" aria-label="Player Account & Profile">
              <span>👤 ${storageManager.getCurrentUser()?.username || t.hud.login}</span>
            </button>
            <button type="button" class="btn-hud-icon" id="hud-btn-mute" aria-label="${settings.muted ? 'Unmute Audio' : 'Mute Audio'}" tabindex="-1">
              <span>${settings.muted ? '🔇' : '🔊'}</span>
            </button>
            <button type="button" class="btn-hud-icon" id="hud-btn-settings" aria-label="Settings" tabindex="-1">
              <span>⚙️</span>
            </button>
            <button type="button" class="btn-hud-icon" id="hud-btn-menu" aria-label="Main Menu" tabindex="-1">
              <span>🏠</span>
            </button>
          </div>

          <div class="minimap-hud-cluster">
            <button
              type="button"
              class="minimap-container"
              id="btn-minimap-zoom"
              title="Click to toggle Radar Zoom (1x Island / 2x Follow)"
              aria-label="Solara Island Live Radar — Click to toggle zoom"
            >
              ${this.renderMinimapSVG()}
              <span class="minimap-zoom-chip" id="minimap-zoom-badge">${this.world.minimapZoom > 1 ? 'LIVE' : 'MAP'}</span>
            </button>
            <div class="minimap-live-readout" id="minimap-live-readout" aria-live="off">
              <span class="minimap-zone-name" id="minimap-zone-label">${getIslandZoneLabel(this.world.player.position.x, this.world.player.position.z)}</span>
              <span class="minimap-coords-text tabular-nums" id="minimap-coords-label">X: ${this.world.player.position.x.toFixed(1)} · Z: ${this.world.player.position.z.toFixed(1)}</span>
            </div>
          </div>
        </nav>

        <!-- Expressive Floating Speech Bubble over Pet -->
        <div id="ember-speech-bubble" class="ember-speech-bubble ${this.speechBubbleVisible ? 'bubble-visible' : ''}" role="status" aria-live="polite">
          <span id="ember-speech-text">${this.speechBubbleText}</span>
        </div>

        <!-- Proximity Landmark Action Slot -->
        <div id="zone-prompt-slot" class="zone-prompt-wrapper">
          ${this.activeZone ? this.renderZonePromptHTML(this.activeZone) : ''}
        </div>

        <!-- Mobile / Touch Virtual Joystick -->
        <div class="joystick-zone" id="joystick-zone" aria-label="Movement Joystick">
          <div class="joystick-base" id="joystick-base">
            <div class="joystick-stick" id="joystick-stick"></div>
          </div>
          <span class="joystick-caption">${t.hud.move}</span>
        </div>

        <!-- Jump Action Button -->
        <button type="button" class="btn-mobile-jump" id="btn-jump-action" aria-label="Jump">
          <span>${t.hud.jump}</span>
        </button>

        <!-- Unified Collapsible Bottom Pet Interaction Dock -->
        <section class="bottom-dock-wrapper ${this.dockCollapsed ? 'dock-collapsed' : ''} ${this.dockExtrasOpen ? 'dock-extras-open' : ''}" aria-label="Pet Interaction Controls">
          <div class="dock-top-bar">
            <div class="pet-feedback-toast" id="pet-feedback-toast">${this.feedbackBannerText}</div>
            <div class="dock-top-Controls-right">
              <button type="button" class="btn-dock-toggle btn-dock-extras-toggle" id="btn-toggle-dock-extras" aria-expanded="${this.dockExtrasOpen}">
                ${this.dockExtrasOpen ? `▾ ${t.hud.musicToggle}` : `🎵 ${t.hud.musicToggle}`}
              </button>
              <button type="button" class="btn-dock-toggle" id="btn-toggle-dock" aria-expanded="${!this.dockCollapsed}">
                ${this.dockCollapsed ? `▴ ${t.hud.menuToggle}` : `▾ ${t.hud.closeToggle}`}
              </button>
            </div>
          </div>

          <div class="bottom-dock-card ui-card">
            <div class="pet-actions-row pet-actions-row-7">
              <button type="button" class="btn-pet-action btn-care-pet" data-pet-action="pet" aria-label="Pet ${petName}">
                <span class="care-icon-badge badge-paw">🐾</span>
                <span>${t.hud.pet}</span>
              </button>

              <button type="button" class="btn-pet-action btn-care-feed" data-pet-action="feed" aria-label="Feed ${petName}">
                <span class="care-icon-badge badge-apple">🍎</span>
                <span>${t.hud.feed}</span>
              </button>

              <button type="button" class="btn-pet-action btn-care-play" data-pet-action="play" aria-label="Play with ${petName}">
                <span class="care-icon-badge badge-play">🎮</span>
                <span>${t.hud.play}</span>
              </button>

              <button type="button" class="btn-pet-action btn-care-sleep" data-pet-action="sleep" id="btn-sleep-toggle" aria-label="${stats.isSleeping ? `Wake ${petName}` : `Put ${petName} to Sleep`}">
                <span class="care-icon-badge badge-sleep">🛌</span>
                <span id="label-sleep-toggle">${stats.isSleeping ? t.hud.wake : t.hud.sleep}</span>
              </button>

              <button type="button" class="btn-pet-action btn-care-dance" data-pet-action="dance" aria-label="Watch ${petName} Dance">
                <span class="care-icon-badge badge-dance">🎵</span>
                <span>${t.hud.dance}</span>
              </button>

              <button type="button" class="btn-pet-action btn-care-surprise" data-pet-action="surprise" aria-label="Surprise ${petName}">
                <span class="care-icon-badge badge-star">✨</span>
                <span>${t.hud.surprise}</span>
              </button>

              <button type="button" class="btn-pet-action btn-care-selfie" id="btn-care-selfie" aria-label="Selfie Portrait with ${petName}">
                <span class="care-icon-badge badge-selfie">📸</span>
                <span>${t.hud.selfieBtn.replace('📸 ', '')}</span>
              </button>
            </div>

            <!-- Quick Cosmetic & Copyright-Free Dance Music Bar -->
            <div class="dock-strips-stack">
              <div class="cosmetic-strip" role="group" aria-label="Select Dragon Gear">
                <span class="cosmetic-strip-label">${t.hud.dragonGear}</span>
                ${COSMETICS.map((c) => {
                  const active = progression.equippedCosmetic === c.id;
                  const gearIcons: Record<CosmeticId, string> = {
                    none: '🐉',
                    crown: '👑',
                    collar: '💎',
                    scarf: '🧣',
                    flame_aura: '✨',
                  };
                  return `
                    <button
                      type="button"
                      class="btn-cosmetic-chip ${active ? 'chip-active' : ''}"
                      data-cosmetic-id="${c.id}"
                      title="${c.description}"
                    >
                      ${gearIcons[c.id]} ${c.name}
                    </button>
                  `;
                }).join('')}
              </div>

              <div class="dance-track-strip" role="group" aria-label="Select Copyright-Free Dance Music">
                <span class="cosmetic-strip-label">${t.hud.danceMusic}</span>
                ${DANCE_TRACKS.map((track) => {
                  const isActive = settings.selectedDanceTrack === track.id;
                  return `
                    <button
                      type="button"
                      class="btn-dance-chip ${isActive ? 'dance-chip-active' : ''}"
                      data-dance-track="${track.id}"
                      title="${track.genre} · ${track.licenseTag} (${track.bpm} BPM)"
                    >
                      <span>${isActive ? '🔊' : '🎵'} ${track.title}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  /**
   * Renders the In-Game Selfie Portrait Studio where the player and their pet pose together
   * and generate a complete souvenir portrait card containing Username, Player Level & XP,
   * Custom Pet Name, Pet Level & XP, Friendship Bond %, Care Vitals, and Equipped Gear.
   */
  private renderSelfieStudioHTML(): string {
    const { stats, progression, settings } = storageManager.getState();
    const t = getTranslation(settings.language);
    const currentUser = storageManager.getCurrentUser();
    const username = currentUser ? currentUser.username : t.menu.guestKeeper;
    const titleBadge = currentUser
      ? currentUser.titleBadge
      : t.account.unregisteredExplorer;
    const petName = storageManager.getPetName();
    const playerLvl = calculateLevelFromXp(progression.playerXp);
    const petLvl = calculateLevelFromXp(progression.creatureXp);
    const cosmeticObj =
      COSMETICS.find((c) => c.id === progression.equippedCosmetic) ||
      COSMETICS[0];

    const poses: { id: SelfiePoseId; label: string }[] = [
      { id: 'wave', label: t.selfie.poseWave },
      { id: 'dance', label: t.selfie.poseDance },
      { id: 'jump', label: t.selfie.poseJump },
      { id: 'surprise', label: t.selfie.poseSurprise },
      { id: 'sleep', label: t.selfie.poseSleep },
    ];

    const frames: { id: SelfieFrameId; label: string }[] = [
      { id: 'gold', label: t.selfie.frameGold },
      { id: 'fire', label: t.selfie.frameFire },
      { id: 'crystal', label: t.selfie.frameCrystal },
      { id: 'emerald', label: t.selfie.frameEmerald },
    ];

    return `
      <main class="selfie-screen-layout" aria-label="${t.selfie.title}">
        <!-- Top Header Bar -->
        <header class="selfie-top-bar ui-card">
          <div class="selfie-header-text">
            <h2 class="selfie-studio-title">📸 ${t.selfie.title}</h2>
            <p class="selfie-studio-subtitle">${t.selfie.subtitle}</p>
          </div>
          <div class="selfie-header-actions">
            <span class="selfie-counter-pill tabular-nums" id="selfie-meta-count">
              📷 ${t.selfie.metaSelfieCount}: ${progression.selfieCount || 0}
            </span>
            <button type="button" class="btn-close-modal" id="btn-exit-selfie">
              <span>← ${t.selfie.backToGame}</span>
            </button>
          </div>
        </header>

        <!-- Right / Bottom Studio Controls & Portrait Result Card -->
        <aside class="selfie-studio-panel ui-card">
          <!-- Pose & Frame Controls -->
          <div class="selfie-controls-section">
            <div class="selfie-control-block">
              <span class="selfie-control-label">${t.selfie.poseLabel}:</span>
              <div class="selfie-chip-row" role="group" aria-label="${t.selfie.poseLabel}">
                ${poses
                  .map(
                    (p) => `
                  <button
                    type="button"
                    class="btn-selfie-chip ${this.selfiePose === p.id ? 'selfie-chip-active' : ''}"
                    data-selfie-pose="${p.id}"
                  >
                    <span>${p.label}</span>
                  </button>
                `,
                  )
                  .join('')}
              </div>
            </div>

            <div class="selfie-control-block">
              <span class="selfie-control-label">${t.selfie.frameLabel}:</span>
              <div class="selfie-chip-row" role="group" aria-label="${t.selfie.frameLabel}">
                ${frames
                  .map(
                    (f) => `
                  <button
                    type="button"
                    class="btn-selfie-chip ${this.selfieFrame === f.id ? 'selfie-chip-active' : ''}"
                    data-selfie-frame="${f.id}"
                  >
                    <span>${f.label}</span>
                  </button>
                `,
                  )
                  .join('')}
              </div>
            </div>

            <div class="selfie-cta-row">
              <button type="button" class="btn-primary-cta btn-snap-selfie" id="btn-snap-selfie">
                <span>${t.selfie.snapBtn}</span>
              </button>
              <button type="button" class="btn-secondary-gold" id="btn-download-selfie">
                <span>${t.selfie.downloadBtn}</span>
              </button>
            </div>

            ${
              this.selfieJustSnapped
                ? `<div class="selfie-reward-banner" id="selfie-reward-toast" role="status">${t.selfie.snapSuccessToast}</div>`
                : ''
            }
          </div>

          <!-- Resulting Selfie Portrait Card (Canvas + Complete Player & Pet Metadata) -->
          <div class="selfie-result-card frame-theme-${this.selfieFrame}" id="selfie-portrait-card">
            <div class="selfie-card-header">
              <span class="selfie-card-heading">${t.selfie.previewCardTitle}</span>
              <span class="selfie-card-gear-tag">👑 ${t.selfie.metaGear}: ${cosmeticObj.name}</span>
            </div>

            <div class="selfie-canvas-wrapper">
              <canvas
                id="selfie-preview-canvas"
                width="960"
                height="600"
                class="selfie-preview-canvas"
                aria-label="Selfie Portrait Snapshot with ${petName}"
              ></canvas>
            </div>

            <!-- Complete Player & Pet Stats Footer inside Portrait Card -->
            <div class="selfie-meta-summary" id="selfie-meta-card">
              <div class="selfie-meta-col">
                <span class="selfie-meta-kicker">👤 ${t.selfie.metaKeeper}</span>
                <strong class="selfie-meta-main" id="selfie-meta-username">${username}</strong>
                <span class="selfie-meta-sub" id="selfie-meta-title">🏅 ${titleBadge}</span>
                <div class="selfie-xp-pill tabular-nums" id="selfie-meta-player-xp">
                  ${t.selfie.metaPlayerLevel} Lv.${playerLvl.level} · ${playerLvl.currentLevelXp}/${playerLvl.nextLevelXp} XP (${progression.playerXp} XP)
                </div>
              </div>

              <div class="selfie-meta-col">
                <span class="selfie-meta-kicker">🐉 ${t.selfie.metaPet}</span>
                <strong class="selfie-meta-main" id="selfie-meta-pet-name">${petName}</strong>
                <span class="selfie-meta-sub" id="selfie-meta-bond">⭐ ${t.selfie.metaBond}: ${stats.friendship}% (Lv.${progression.friendshipLevel})</span>
                <div class="selfie-xp-pill tabular-nums" id="selfie-meta-pet-xp">
                  ${t.selfie.metaPetLevel} Lv.${petLvl.level} · ${petLvl.currentLevelXp}/${petLvl.nextLevelXp} XP (${progression.creatureXp} XP)
                </div>
              </div>

              <div class="selfie-meta-vitals tabular-nums">
                <span title="Hunger">❤️ ${stats.hunger}%</span>
                <span title="Energy">⚡ ${stats.energy}%</span>
                <span title="Happiness">😊 ${stats.happiness}%</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    `;
  }

  private renderSelfiePreviewCanvas(awardXp: boolean): void {
    if (awardXp) {
      storageManager.recordSelfieCapture();
      this.selfieJustSnapped = true;
      this.sound.playLevelUp();
      this.render();
    }

    const canvas = this.root.querySelector<HTMLCanvasElement>(
      '#selfie-preview-canvas',
    );
    if (!canvas) return;

    const { stats, progression, settings } = storageManager.getState();
    const t = getTranslation(settings.language);
    const currentUser = storageManager.getCurrentUser();
    const username = currentUser ? currentUser.username : t.menu.guestKeeper;
    const titleBadge = currentUser
      ? currentUser.titleBadge
      : t.account.unregisteredExplorer;
    const petName = storageManager.getPetName();
    const playerLvl = calculateLevelFromXp(progression.playerXp);
    const petLvl = calculateLevelFromXp(progression.creatureXp);
    const cosmeticObj =
      COSMETICS.find((c) => c.id === progression.equippedCosmetic) ||
      COSMETICS[0];

    this.lastSelfieDataUrl = this.world.renderSelfieSnapshotToCanvas(canvas, {
      username,
      titleBadge,
      playerLevel: playerLvl.level,
      playerXp: progression.playerXp,
      currentLevelXp: playerLvl.currentLevelXp,
      nextLevelXp: playerLvl.nextLevelXp,
      petName,
      creatureLevel: petLvl.level,
      creatureXp: progression.creatureXp,
      friendship: stats.friendship,
      friendshipLevel: progression.friendshipLevel,
      hunger: stats.hunger,
      energy: stats.energy,
      happiness: stats.happiness,
      cosmeticName: cosmeticObj.name,
      frameId: this.selfieFrame,
      poseLabel: this.selfiePose.toUpperCase(),
    });
  }

  /**
   * Renders the AR World Screen matching Reference Panel 4.
   */
  private renderARWorldHTML(): string {
    const { stats, progression } = storageManager.getState();
    const petName = storageManager.getPetName();
    const s = this.arStatus;

    return `
      <main class="ar-screen-layout" aria-label="AR World">
        <div id="ar-viewport-mount" class="ar-viewport-mount"></div>

        <header class="ar-top-bar">
          <div class="ar-mode-pill-group">
            <div class="ar-mode-badge">
              <svg viewBox="0 0 24 24" class="ar-cam-svg"><path d="M12 10.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm8-2.8h-2.6l-1.4-2H8L6.6 8H4c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2zm-8 11c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="currentColor"/></svg>
              <span>AR Mode</span>
            </div>
            <div class="ar-status-meta-pill">
              <span id="ar-tracking-state">
                ${
                  s.markerTracked
                    ? `Card Anchored (${Math.round(s.trackingConfidence * 100)}% lock)`
                    : s.cameraState === 'streaming'
                      ? `Scanning for ${petName} Card...`
                      : `Preview Active`
                }
              </span>
              <span class="ar-meta-sep">·</span>
              <span id="ar-stats-summary">${petName} Lv.${progression.creatureLevel} · Happy ${stats.happiness}% · Bond ${stats.friendship}%</span>
            </div>
          </div>

          <div class="ar-top-actions">
            <button type="button" class="btn-secondary-gold btn-sm" id="ar-btn-simulate-toggle">
              <span id="ar-simulate-label">${s.simulatedCardActive ? 'Hide Preview Card' : 'Preview Marker Anchor'}</span>
            </button>
            <button type="button" class="btn-surface btn-sm" id="ar-btn-open-card">
              <span>🃏 Get AR Card</span>
            </button>
            <button type="button" class="btn-surface btn-sm" id="ar-btn-restart-cam">
              <span>📷 Start Camera</span>
            </button>
          </div>
        </header>

        <p class="sr-only" id="ar-target-info">${s.mindTargetInfo}</p>

        <div id="ar-error-banner" class="ar-error-banner ${s.errorMessage ? '' : 'hidden'}">
          <p id="ar-error-text">${s.errorMessage || ''}</p>
        </div>

        <div id="ar-scan-reticle" class="ar-scan-reticle ${s.markerTracked ? 'reticle-locked' : ''}">
          <div class="reticle-corner tl"></div>
          <div class="reticle-corner tr"></div>
          <div class="reticle-corner bl"></div>
          <div class="reticle-corner br"></div>
          <p class="reticle-prompt" id="ar-reticle-prompt">
            ${
              s.markerTracked
                ? `✨ ${petName} Summoned on AR Card — Tap buttons on the right to interact!`
                : `Point camera at your printed ${petName} AR Card (or click Preview Marker Anchor)`
            }
          </p>
        </div>

        <aside class="ar-right-action-column" aria-label="AR Pet Controls">
          <button type="button" class="btn-ar-round" data-ar-action="feed" aria-label="Feed ${petName}">
            <span class="ar-round-emoji">🍎</span>
            <span class="ar-round-label">Feed</span>
          </button>

          <button type="button" class="btn-ar-round" data-ar-action="play" aria-label="Play with ${petName}">
            <span class="ar-round-emoji">🎮</span>
            <span class="ar-round-label">Play</span>
          </button>

          <button type="button" class="btn-ar-round" data-ar-action="pet" aria-label="Pet ${petName}">
            <span class="ar-round-emoji">🐾</span>
            <span class="ar-round-label">Pet</span>
          </button>

          <button type="button" class="btn-ar-round" data-ar-action="dance" aria-label="Watch ${petName} Dance">
            <span class="ar-round-emoji">🎵</span>
            <span class="ar-round-label">Dance</span>
          </button>

          <button type="button" class="btn-ar-round" data-ar-action="sleep" aria-label="Sleep or Wake ${petName}">
            <span class="ar-round-emoji">🛌</span>
            <span class="ar-round-label" id="ar-sleep-label">${stats.isSleeping ? 'Wake' : 'Sleep'}</span>
          </button>
        </aside>

        <button type="button" class="btn-ar-back-circle" id="ar-btn-exit" aria-label="Stop Camera and Return">
          <svg viewBox="0 0 24 24" class="back-arrow-svg"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
        </button>

        <div class="ar-bottom-right-logo" aria-hidden="true">
          ${this.renderTitleEmblemSVG(true)}
        </div>
      </main>
    `;
  }

  private renderARCardModalHTML(): string {
    const petName = storageManager.getPetName();
    return `
      <main class="modal-backdrop" aria-label="My AR Card">
        <div class="modal-card modal-wide ui-card modal-scroll">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">MY AR CARD — ${petName} MARKER</h2>
              <p class="modal-subtitle">
                Official high-contrast image target compiled to <code>${AR_CARD_MIND_PATH}</code>
              </p>
            </div>
            <button type="button" class="btn-close-modal" id="btn-close-modal" aria-label="Back">
              <span>Back</span>
            </button>
          </div>

          <div class="ar-card-showcase-grid">
            <div class="collectible-card-frame" id="printable-card-area">
              <div class="collectible-card-header">
                <span>#001 · ${petName}</span>
                <span>FIRE DRAGON · STARTER</span>
              </div>
              <div class="collectible-image-box">
                <img
                  src="${AR_CARD_PNG_PATH}"
                  alt="${petName} Official AR Marker Card"
                  referrerpolicy="no-referrer"
                  class="collectible-marker-img"
                  onerror="this.src='${AR_CARD_JPG_PATH}'"
                />
              </div>
              <div class="collectible-card-footer">
                <span>EMBERIX WORLD · OFFICIAL MINDAR TARGET</span>
                <span>15 CM × 15 CM</span>
              </div>
            </div>

            <div class="ar-card-instructions-col">
              <div class="download-actions-box">
                <h3 class="section-heading">1. Download &amp; Print Your Card</h3>
                <p class="body-copy">
                  This exact high-resolution card image is compiled into the application's MindAR tracking file (<code>ember-card.mind</code>).
                </p>
                <div class="download-btn-row">
                  <a
                    href="${AR_CARD_PNG_PATH}"
                    download="ember-ar-card.png"
                    class="btn-primary-cta link-btn"
                    id="btn-download-png"
                  >
                    <span>Download PNG Card</span>
                  </a>
                  <a
                    href="${AR_CARD_PDF_PATH}"
                    download="ember-ar-card-printable.pdf"
                    class="btn-secondary-gold link-btn"
                    id="btn-download-pdf"
                  >
                    <span>Download Printable A4 PDF</span>
                  </a>
                  <button type="button" class="btn-surface" id="btn-print-card">
                    <span>Print Directly</span>
                  </button>
                </div>
              </div>

              <div class="instructions-list-box">
                <h3 class="section-heading">2. Recommended Print Settings</h3>
                <ul class="clean-list">
                  <li><strong>Print Size:</strong> Approximately 15 cm × 15 cm (6 in × 6 in) on standard A4 or Letter paper.</li>
                  <li><strong>Paper Type:</strong> Matte paper is strongly preferred to avoid harsh ceiling light glare.</li>
                  <li><strong>Placement:</strong> Lay the card flat on a well-lit table or desk surface.</li>
                </ul>
              </div>

              <div class="instructions-list-box">
                <h3 class="section-heading">3. How to Summon ${petName} in AR World</h3>
                <ol class="clean-list numbered-list">
                  <li>Click <strong>Enter AR World</strong> below and allow camera access.</li>
                  <li>Point your phone's rear camera at the printed ${petName} card.</li>
                  <li>Hold steady for 1 second — 3D ${petName} will anchor directly onto the physical card!</li>
                </ol>
                <button type="button" class="btn-accent-ar full-width-btn" id="card-btn-go-ar">
                  <span>Launch AR World Scanner Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;
  }

  private renderCollectionModalHTML(): string {
    const { progression } = storageManager.getState();
    const petName = storageManager.getPetName();

    return `
      <main class="modal-backdrop" aria-label="Creature Collection">
        <div class="modal-card modal-wide ui-card modal-scroll">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">CREATURE COLLECTION</h2>
              <p class="modal-subtitle">
                1 Unlocked Companion (${petName}) · 3 Elemental Guardians Coming Soon
              </p>
            </div>
            <button type="button" class="btn-close-modal" id="btn-close-modal" aria-label="Back">
              <span>Back</span>
            </button>
          </div>

          <div class="creature-collection-grid">
            ${CREATURES.map((c) => {
              const isEmber = c.id === 'ember';
              const displayName = isEmber ? petName : c.name;
              return `
                <article class="creature-card ${c.unlocked ? 'card-unlocked' : 'card-locked'}">
                  <div class="creature-art-wrapper" style="background: radial-gradient(circle at 50% 40%, ${c.primaryColor}44, #0f172a);">
                    <img
                      src="${c.artworkPath}"
                      alt="${displayName} — ${c.element} Creature"
                      referrerpolicy="no-referrer"
                      class="creature-art-img"
                      onerror="this.style.display='none'"
                    />
                    <div class="creature-status-tag">
                      ${c.unlocked ? `Unlocked · Lv.${progression.creatureLevel}` : 'Locked · Coming Soon'}
                    </div>
                  </div>

                  <div class="creature-card-body">
                    <div class="creature-meta-line">
                      <span>${c.element} Element</span>
                      <span aria-hidden="true">·</span>
                      <span>${c.rarity}</span>
                    </div>
                    <h3 class="creature-card-title">${displayName} — ${c.title}</h3>
                    <p class="creature-card-desc">${c.description}</p>

                    ${
                      isEmber
                        ? `
                      <div class="collection-action-row">
                        <button type="button" class="btn-primary-cta btn-sm" id="col-btn-play-ember">
                          <span>Play with ${displayName}</span>
                        </button>
                        <button type="button" class="btn-surface btn-sm" data-open-lore="${c.id}">
                          <span>View Lore</span>
                        </button>
                      </div>
                    `
                        : `
                      <div class="collection-action-row">
                        <button type="button" class="btn-surface btn-sm" disabled>
                          <span>Coming in Future Expansion</span>
                        </button>
                        <button type="button" class="btn-surface btn-sm" data-open-lore="${c.id}">
                          <span>Preview Lore</span>
                        </button>
                      </div>
                    `
                    }
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </div>
      </main>
    `;
  }

  private renderEncyclopediaModalHTML(): string {
    const { progression } = storageManager.getState();
    const petName = storageManager.getPetName();
    const activeCreature =
      CREATURES.find((c) => c.id === this.selectedEncyclopediaId) || CREATURES[0];
    const activeName =
      activeCreature.id === 'ember' ? petName : activeCreature.name;

    return `
      <main class="modal-backdrop" aria-label="Creature Encyclopedia">
        <div class="modal-card modal-wide ui-card modal-scroll">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">SOLARA CREATURE ENCYCLOPEDIA</h2>
              <p class="modal-subtitle">
                Field Guide to Elemental Companions, Habitats &amp; Abilities
              </p>
            </div>
            <button type="button" class="btn-close-modal" id="btn-close-modal" aria-label="Back">
              <span>Back</span>
            </button>
          </div>

          <div class="encyclopedia-tabs" role="tablist">
            ${CREATURES.map((c) => {
              const tabName = c.id === 'ember' ? petName : c.name;
              return `
                <button
                  type="button"
                  role="tab"
                  aria-selected="${c.id === activeCreature.id}"
                  class="btn-enc-tab ${c.id === activeCreature.id ? 'tab-active' : ''}"
                  data-enc-id="${c.id}"
                >
                  <span>${tabName} (${c.element})</span>
                </button>
              `;
            }).join('')}
          </div>

          <div class="encyclopedia-detail-grid">
            <div class="enc-visual-col">
              <div class="enc-portrait-frame">
                <img
                  src="${activeCreature.artworkPath}"
                  alt="${activeName}"
                  referrerpolicy="no-referrer"
                  class="enc-portrait-img"
                />
              </div>
              <div class="enc-quick-facts">
                <div class="fact-row">
                  <span>Status</span>
                  <strong>${activeCreature.unlocked ? 'Unlocked & Playable' : 'Coming Soon (Locked)'}</strong>
                </div>
                <div class="fact-row">
                  <span>Current Level</span>
                  <strong class="tabular-nums">${activeCreature.unlocked ? `Lv.${progression.creatureLevel}` : 'Unawakened'}</strong>
                </div>
                <div class="fact-row">
                  <span>Element</span>
                  <strong>${activeCreature.element}</strong>
                </div>
                <div class="fact-row">
                  <span>Rarity</span>
                  <strong>${activeCreature.rarity}</strong>
                </div>
              </div>
            </div>

            <div class="enc-lore-col">
              <p class="enc-kicker">${activeCreature.element} Elemental · ${activeCreature.rarity}</p>
              <h3 class="enc-creature-heading">${activeName} — ${activeCreature.title}</h3>
              <p class="body-copy">${activeCreature.description}</p>

              <div class="enc-info-block">
                <h4 class="enc-sub-heading">Personality</h4>
                <p class="body-copy">${activeCreature.personality}</p>
              </div>

              <div class="enc-info-block">
                <h4 class="enc-sub-heading">Natural Habitat</h4>
                <p class="body-copy">${activeCreature.habitat}</p>
              </div>

              <div class="enc-info-block">
                <h4 class="enc-sub-heading">Special Abilities</h4>
                <ul class="clean-list">
                  ${activeCreature.specialAbilities
                    .map((ab) => `<li>${ab}</li>`)
                    .join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;
  }

  private renderSettingsModalHTML(): string {
    const { settings, progression } = storageManager.getState();
    const t = getTranslation(settings.language);

    return `
      <main class="modal-backdrop" aria-label="Settings">
        <div class="modal-card ui-card modal-scroll">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">${t.settings.title}</h2>
              <p class="modal-subtitle">
                ${t.settings.subtitle}
              </p>
            </div>
            <button type="button" class="btn-close-modal" id="btn-close-modal" aria-label="${t.settings.back}">
              <span>${t.settings.back}</span>
            </button>
          </div>

          <div class="settings-sections-stack">
            <!-- 1. Language Selector (English Primary, Indonesian, Chinese) -->
            <section class="settings-group" aria-label="${t.settings.langHeading}">
              <h3 class="section-heading">🌐 ${t.settings.langHeading}</h3>
              <p class="body-copy">${t.settings.langLabel}</p>
              <div class="language-segmented-group" role="group" aria-label="Game Language">
                ${LANGUAGE_OPTIONS.map((opt) => {
                  const isActive = settings.language === opt.id;
                  return `
                    <button
                      type="button"
                      class="btn-lang-seg ${isActive ? 'seg-active' : ''}"
                      data-lang="${opt.id}"
                      id="btn-lang-${opt.id}"
                      aria-pressed="${isActive}"
                    >
                      <span class="lang-flag">${opt.flag}</span>
                      <div class="lang-text-col">
                        <strong>${opt.nativeName}</strong>
                        <small>${opt.label}</small>
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            </section>

            <!-- 2. Audio & Volume -->
            <section class="settings-group">
              <h3 class="section-heading">${t.settings.audioHeading}</h3>

              <div class="setting-control-row">
                <label for="input-music-vol">${t.settings.musicVol} (<span id="lbl-music-vol" class="tabular-nums">${settings.musicVolume}%</span>)</label>
                <input
                  id="input-music-vol"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value="${settings.musicVolume}"
                  class="range-slider"
                />
              </div>

              <div class="setting-control-row">
                <label for="input-sfx-vol">${t.settings.sfxVol} (<span id="lbl-sfx-vol" class="tabular-nums">${settings.sfxVolume}%</span>)</label>
                <input
                  id="input-sfx-vol"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value="${settings.sfxVolume}"
                  class="range-slider"
                />
              </div>

              <div class="setting-control-row row-inline">
                <span>${t.settings.muteAll}</span>
                <button type="button" class="btn-surface btn-sm" id="btn-toggle-mute">
                  <span>${settings.muted ? t.settings.mutedBtn : t.settings.activeBtn}</span>
                </button>
              </div>

              <div class="setting-control-row">
                <span>${t.settings.bgmTrackLabel}</span>
                <div class="dance-settings-grid">
                  ${BACKGROUND_TRACKS.map((bgm) => {
                    const currentBgm =
                      settings.selectedBgmTrack || 'solara_serenade';
                    const active = currentBgm === bgm.id;
                    return `
                      <button
                        type="button"
                        class="btn-dance-setting ${active ? 'seg-active' : ''}"
                        data-setting-bgm="${bgm.id}"
                      >
                        <strong>🌸 ${bgm.title} (${bgm.bpm} BPM)</strong>
                        <small>${bgm.genre} · ${bgm.licenseTag}</small>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <div class="setting-control-row">
                <span>${t.settings.danceTrackLabel}</span>
                <div class="dance-settings-grid">
                  ${DANCE_TRACKS.map((tr) => {
                    const active = settings.selectedDanceTrack === tr.id;
                    return `
                      <button
                        type="button"
                        class="btn-dance-setting ${active ? 'seg-active' : ''}"
                        data-setting-dance="${tr.id}"
                      >
                        <strong>🎵 ${tr.title} (${tr.bpm} BPM)</strong>
                        <small>${tr.genre} · ${tr.licenseTag}</small>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            </section>

            <!-- 3. Graphics & Camera -->
            <section class="settings-group">
              <h3 class="section-heading">${t.settings.graphicsHeading}</h3>

              <div class="setting-control-row">
                <span>${t.settings.graphicsQuality}</span>
                <div class="quality-segmented-group" role="group" aria-label="Graphics Quality">
                  ${(['low', 'medium', 'high'] as GraphicsQuality[])
                    .map(
                      (q) => `
                    <button
                      type="button"
                      class="btn-quality-seg ${settings.graphicsQuality === q ? 'seg-active' : ''}"
                      data-quality="${q}"
                    >
                      <span>${q.charAt(0).toUpperCase() + q.slice(1)}</span>
                    </button>
                  `,
                    )
                    .join('')}
                </div>
              </div>

              <div class="setting-control-row">
                <label for="input-cam-sens">${t.settings.camSens} (<span id="lbl-cam-sens" class="tabular-nums">${settings.cameraSensitivity.toFixed(1)}x</span>)</label>
                <input
                  id="input-cam-sens"
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.1"
                  value="${settings.cameraSensitivity}"
                  class="range-slider"
                />
              </div>
            </section>

            <!-- 4. Keeper Achievements -->
            <section class="settings-group">
              <h3 class="section-heading">${t.settings.achievementsHeading} (${progression.unlockedAchievements.length} / ${ACHIEVEMENTS.length})</h3>
              <div class="achievements-grid">
                ${ACHIEVEMENTS.map((ach) => {
                  const unlocked = progression.unlockedAchievements.includes(
                    ach.id,
                  );
                  return `
                    <div class="achievement-tile ${unlocked ? 'ach-unlocked' : 'ach-locked'}">
                      <div class="ach-header">
                        <strong>${ach.title}</strong>
                        <span class="tabular-nums">+${ach.xpReward} XP</span>
                      </div>
                      <p>${ach.description}</p>
                      <span class="ach-status">${unlocked ? t.settings.completed : t.settings.inProgress}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </section>

            <!-- 5. Progress & LocalStorage -->
            <section class="settings-group">
              <h3 class="section-heading">${t.settings.progressHeading}</h3>
              <div class="reset-row">
                ${
                  !this.confirmResetOpen
                    ? `
                  <button type="button" class="btn-danger-outline" id="btn-ask-reset">
                    <span>${t.settings.resetBtn}</span>
                  </button>
                  <button type="button" class="btn-surface" id="btn-return-title">
                    <span>${t.settings.backMainMenu}</span>
                  </button>
                `
                    : `
                  <p class="confirm-warning">${t.settings.confirmResetPrompt}</p>
                  <div class="confirm-btn-pair">
                    <button type="button" class="btn-danger-solid" id="btn-confirm-reset">
                      <span>${t.settings.confirmResetBtn}</span>
                    </button>
                    <button type="button" class="btn-surface" id="btn-cancel-reset">
                      <span>${t.settings.cancelBtn}</span>
                    </button>
                  </div>
                `
                }
              </div>
            </section>
          </div>
        </div>
      </main>
    `;
  }

  private renderAccountModalHTML(): string {
    const currentUser = storageManager.getCurrentUser();
    const accounts = storageManager.getRegisteredAccounts();
    const { progression, stats, settings } = storageManager.getState();
    const t = getTranslation(settings.language);
    const petName = storageManager.getPetName();
    const playerLvl = calculateLevelFromXp(progression.playerXp);
    const creatureLvl = calculateLevelFromXp(progression.creatureXp);
    const cosmeticObj =
      COSMETICS.find((c) => c.id === progression.equippedCosmetic) ||
      COSMETICS[0];

    return `
      <main class="modal-backdrop" aria-label="Player Profile and Account">
        <div class="modal-card modal-wide ui-card modal-scroll">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">${t.account.title}</h2>
              <p class="modal-subtitle">
                ${t.account.subtitle}
              </p>
            </div>
            <button type="button" class="btn-close-modal" id="btn-close-modal" aria-label="${t.settings.back}">
              <span>${t.settings.back}</span>
            </button>
          </div>

          ${
            this.authFeedback
              ? `
            <div class="auth-feedback-banner ${this.authFeedback.type === 'success' ? 'auth-feedback-success' : 'auth-feedback-error'}" id="account-feedback-banner" role="alert">
              <span>${this.authFeedback.type === 'success' ? '✨' : '⚠️'} ${this.authFeedback.message}</span>
            </div>
          `
              : ''
          }

          ${
            currentUser
              ? `
            <!-- ==========================================================
                 LOGGED-IN PROFILE DASHBOARD (No Register / Login Form!)
                 ========================================================== -->
            <div class="account-modal-grid">
              <!-- Left Column: Active Keeper Passport Card + Saved Accounts -->
              <div class="account-left-col">
                <div class="keeper-id-card">
                  <div class="keeper-id-header">
                    <span>${t.account.passportTitle}</span>
                    <span class="keeper-status-pill status-logged-in">${t.account.loggedIn}</span>
                  </div>
                  <div class="keeper-id-body">
                    ${this.renderExplorerAvatarSVG(currentUser.avatarId)}
                    <div class="keeper-id-details">
                      <h3 class="keeper-id-name">${currentUser.username}</h3>
                      <p class="keeper-id-title-badge">🏅 ${currentUser.titleBadge}</p>
                      <p class="keeper-id-email">${currentUser.email} · 🐉 ${petName}</p>
                    </div>
                  </div>
                  <div class="keeper-id-stats-row">
                    <div class="keeper-stat-box">
                      <span>Player Lv.</span>
                      <strong class="tabular-nums">Lv.${playerLvl.level} (${progression.playerXp} XP)</strong>
                    </div>
                    <div class="keeper-stat-box">
                      <span id="passport-pet-name-label">${petName} Lv.</span>
                      <strong class="tabular-nums">Lv.${creatureLvl.level} (${progression.creatureXp} XP)</strong>
                    </div>
                    <div class="keeper-stat-box">
                      <span>Friendship</span>
                      <strong class="tabular-nums">${stats.friendship}% (Lv.${progression.friendshipLevel})</strong>
                    </div>
                    <div class="keeper-stat-box">
                      <span>Achievements</span>
                      <strong class="tabular-nums">${progression.unlockedAchievements.length}/${ACHIEVEMENTS.length}</strong>
                    </div>
                  </div>

                  <div class="profile-autosave-banner">
                    <span>${t.account.profileSavedBadge}</span>
                  </div>

                  <div class="keeper-id-actions">
                    <button type="button" class="btn-primary-cta btn-sm" id="btn-account-play-now">
                      <span>🎮 ${t.account.continueAs} ${currentUser.username}</span>
                    </button>
                    <button type="button" class="btn-secondary-gold btn-sm" id="btn-account-ar-now">
                      <span>📷 ${t.account.enterArAs}</span>
                    </button>
                    <button type="button" class="btn-danger-outline btn-sm" id="btn-logout-account">
                      <span>${t.account.logoutBtn}</span>
                    </button>
                  </div>
                </div>

                <div class="saved-accounts-box">
                  <h3 class="section-heading">${t.account.savedAccountsHeading} (${accounts.length})</h3>
                  <div class="saved-accounts-list">
                    ${accounts
                      .map((acc) => {
                        const isCurrent = currentUser.id === acc.id;
                        return `
                          <div class="saved-account-item ${isCurrent ? 'account-item-active' : ''}">
                            <div class="saved-account-meta">
                              <strong>${acc.username} · 🐉 ${acc.saveData.progression.petName || 'EMBER'}</strong>
                              <small>${acc.titleBadge} · ${acc.email} · ${acc.saveData.progression.playerXp} XP</small>
                            </div>
                            ${
                              isCurrent
                                ? `<span class="active-acc-tag">Active</span>`
                                : `<button type="button" class="btn-surface btn-sm" data-quick-switch-id="${acc.id}">Switch</button>`
                            }
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                </div>
              </div>

              <!-- Right Column: Custom Pet Name Editor + Keeper Avatar & Title Customization -->
              <div class="account-right-col">
                <form id="form-pet-name" class="pet-name-editor-box" novalidate>
                  <div class="pet-name-editor-header">
                    <span class="pet-name-icon">🐉</span>
                    <div>
                      <h3 class="section-heading">${t.account.petNameSectionTitle}</h3>
                      <p class="body-copy">${t.account.petNameSectionDesc}</p>
                    </div>
                  </div>
                  <div class="pet-name-input-row">
                    <input
                      id="input-pet-name"
                      type="text"
                      class="auth-input"
                      maxlength="20"
                      placeholder="${t.account.petNamePlaceholder}"
                      value="${this.draftPetName || petName}"
                      aria-label="${t.account.petNameInputLabel}"
                      required
                    />
                    <button type="submit" class="btn-secondary-gold btn-sm" id="btn-save-pet-name">
                      <span>${t.account.petNameSaveBtn}</span>
                    </button>
                  </div>
                  <div class="pet-profile-mini-summary">
                    <span>🔥 <strong>${petName}</strong> · Lv.${creatureLvl.level} (${creatureLvl.currentLevelXp}/${creatureLvl.nextLevelXp} XP)</span>
                    <span>👑 ${cosmeticObj.name}</span>
                    <span>📸 Selfies: ${progression.selfieCount || 0}</span>
                  </div>
                </form>

                <div class="keeper-customize-box">
                  <h3 class="section-heading">🛡️ ${t.account.profileCustomizeHeading}</h3>
                  <p class="body-copy">${t.account.profileCustomizeDesc}</p>

                  <div class="auth-field">
                    <label>${t.account.avatarLabel}</label>
                    <div class="avatar-picker-grid">
                      ${PLAYER_AVATARS.map(
                        (av) => `
                        <button
                          type="button"
                          class="btn-avatar-choice ${currentUser.avatarId === av.id ? 'avatar-choice-active' : ''}"
                          data-pick-avatar="${av.id}"
                        >
                          ${this.renderExplorerAvatarSVG(av.id)}
                          <span>${av.label}</span>
                        </button>
                      `,
                      ).join('')}
                    </div>
                  </div>

                  <div class="auth-field">
                    <label for="reg-title-select">${t.account.titleLabel}</label>
                    <select id="reg-title-select" class="auth-input">
                      ${PLAYER_TITLES.map(
                        (title) => `
                        <option value="${title}" ${currentUser.titleBadge === title ? 'selected' : ''}>
                          🏅 ${title}
                        </option>
                      `,
                      ).join('')}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          `
              : `
            <!-- ==========================================================
                 GUEST KEEPER MODE VIEW (Passport + Pet Name + Optional Register/Login)
                 ========================================================== -->
            <div class="account-modal-grid">
              <!-- Left Column: Guest Keeper Passport + Custom Pet Name Editor + Saved Accounts -->
              <div class="account-left-col">
                <div class="keeper-id-card">
                  <div class="keeper-id-header">
                    <span>${t.account.passportTitle}</span>
                    <span class="keeper-status-pill">${t.account.guestMode}</span>
                  </div>
                  <div class="keeper-id-body">
                    ${this.renderExplorerAvatarSVG(this.selectedRegisterAvatar)}
                    <div class="keeper-id-details">
                      <h3 class="keeper-id-name">${this.draftRegUsername || t.menu.guestKeeper}</h3>
                      <p class="keeper-id-title-badge">🏅 ${this.selectedRegisterTitle || t.account.unregisteredExplorer}</p>
                      <p class="keeper-id-email">🐉 Companion: ${this.draftRegPetName || petName}</p>
                    </div>
                  </div>
                  <div class="keeper-id-stats-row">
                    <div class="keeper-stat-box">
                      <span>Player Lv.</span>
                      <strong class="tabular-nums">Lv.${playerLvl.level} (${progression.playerXp} XP)</strong>
                    </div>
                    <div class="keeper-stat-box">
                      <span id="passport-pet-name-label">${petName} Lv.</span>
                      <strong class="tabular-nums">Lv.${creatureLvl.level} (${progression.creatureXp} XP)</strong>
                    </div>
                    <div class="keeper-stat-box">
                      <span>Friendship</span>
                      <strong class="tabular-nums">${stats.friendship}%</strong>
                    </div>
                    <div class="keeper-stat-box">
                      <span>Achievements</span>
                      <strong class="tabular-nums">${progression.unlockedAchievements.length}/${ACHIEVEMENTS.length}</strong>
                    </div>
                  </div>
                  <div class="keeper-id-actions">
                    <button type="button" class="btn-primary-cta btn-sm" id="btn-account-play-now">
                      <span>🎮 ${t.account.continueAs} ${t.menu.guestKeeper}</span>
                    </button>
                  </div>
                </div>

                <!-- Custom Pet Name Editor Box (Accessible in Guest Mode too!) -->
                <form id="form-pet-name" class="pet-name-editor-box" novalidate>
                  <div class="pet-name-editor-header">
                    <span class="pet-name-icon">🐉</span>
                    <div>
                      <h3 class="section-heading">${t.account.petNameSectionTitle}</h3>
                      <p class="body-copy">${t.account.petNameSectionDesc}</p>
                    </div>
                  </div>
                  <div class="pet-name-input-row">
                    <input
                      id="input-pet-name"
                      type="text"
                      class="auth-input"
                      maxlength="20"
                      placeholder="${t.account.petNamePlaceholder}"
                      value="${this.draftPetName || petName}"
                      aria-label="${t.account.petNameInputLabel}"
                      required
                    />
                    <button type="submit" class="btn-secondary-gold btn-sm" id="btn-save-pet-name">
                      <span>${t.account.petNameSaveBtn}</span>
                    </button>
                  </div>
                </form>

                <div class="saved-accounts-box">
                  <h3 class="section-heading">${t.account.savedAccountsHeading} (${accounts.length})</h3>
                  ${
                    accounts.length === 0
                      ? `<p class="body-copy">Playing in Guest Mode. Register a Keeper account on the right anytime to bind your progress and claim a <strong>+50 XP Bonus</strong>!</p>`
                      : `
                    <div class="saved-accounts-list">
                      ${accounts
                        .map((acc) => {
                          return `
                            <div class="saved-account-item">
                              <div class="saved-account-meta">
                                <strong>${acc.username} · 🐉 ${acc.saveData.progression.petName || 'EMBER'}</strong>
                                <small>${acc.titleBadge} · ${acc.email} · ${acc.saveData.progression.playerXp} XP</small>
                              </div>
                              <button type="button" class="btn-primary-cta btn-sm" data-quick-switch-id="${acc.id}">Login</button>
                            </div>
                          `;
                        })
                        .join('')}
                    </div>
                  `
                  }
                </div>
              </div>

              <!-- Right Column: Registration & Login Forms -->
              <div class="account-right-col">
                <div class="auth-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected="${this.authTab === 'register'}"
                    class="btn-auth-tab ${this.authTab === 'register' ? 'auth-tab-active' : ''}"
                    id="tab-btn-register"
                  >
                    <span>${t.account.tabRegister}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected="${this.authTab === 'login'}"
                    class="btn-auth-tab ${this.authTab === 'login' ? 'auth-tab-active' : ''}"
                    id="tab-btn-login"
                  >
                    <span>${t.account.tabLogin}</span>
                  </button>
                </div>

                ${
                  this.authTab === 'register'
                    ? `
                  <form id="form-register-account" class="auth-form" novalidate>
                    <div class="auth-field">
                      <label for="reg-username">${t.account.usernameLabel}</label>
                      <input
                        id="reg-username"
                        type="text"
                        class="auth-input"
                        placeholder="e.g. DragonMaster99"
                        maxlength="24"
                        value="${this.draftRegUsername}"
                        required
                      />
                    </div>

                    <div class="auth-field">
                      <label for="reg-pet-name">${t.account.petNameInputLabel}</label>
                      <input
                        id="reg-pet-name"
                        type="text"
                        class="auth-input"
                        placeholder="${t.account.petNamePlaceholder}"
                        maxlength="20"
                        value="${this.draftRegPetName || petName}"
                      />
                    </div>

                    <div class="auth-field">
                      <label for="reg-email">${t.account.emailLabel}</label>
                      <input
                        id="reg-email"
                        type="email"
                        class="auth-input"
                        placeholder="e.g. keeper@solara.id"
                        value="${this.draftRegEmail}"
                        required
                      />
                    </div>

                    <div class="auth-field">
                      <label for="reg-password">${t.account.passwordLabel}</label>
                      <input
                        id="reg-password"
                        type="password"
                        class="auth-input"
                        placeholder="Enter password or PIN"
                        value="${this.draftRegPassword}"
                        required
                      />
                    </div>

                    <div class="auth-field">
                      <label>${t.account.avatarLabel}</label>
                      <div class="avatar-picker-grid">
                        ${PLAYER_AVATARS.map(
                          (av) => `
                          <button
                            type="button"
                            class="btn-avatar-choice ${this.selectedRegisterAvatar === av.id ? 'avatar-choice-active' : ''}"
                            data-pick-avatar="${av.id}"
                          >
                            ${this.renderExplorerAvatarSVG(av.id)}
                            <span>${av.label}</span>
                          </button>
                        `,
                        ).join('')}
                      </div>
                    </div>

                    <div class="auth-field">
                      <label for="reg-title-select">${t.account.titleLabel}</label>
                      <select id="reg-title-select" class="auth-input">
                        ${PLAYER_TITLES.map(
                          (title) => `
                          <option value="${title}" ${this.selectedRegisterTitle === title ? 'selected' : ''}>
                            🏅 ${title}
                          </option>
                        `,
                        ).join('')}
                      </select>
                    </div>

                    <button type="submit" class="btn-primary-cta full-width-btn" id="btn-submit-register">
                      <span>${t.account.registerSubmitBtn}</span>
                    </button>
                  </form>
                `
                    : `
                  <form id="form-login-account" class="auth-form" novalidate>
                    <div class="auth-field">
                      <label for="login-identifier">${t.account.usernameLabel} / Email</label>
                      <input
                        id="login-identifier"
                        type="text"
                        class="auth-input"
                        placeholder="Username or Email"
                        value="${this.draftLoginId}"
                        required
                      />
                    </div>

                    <div class="auth-field">
                      <label for="login-password">${t.account.passwordLabel}</label>
                      <input
                        id="login-password"
                        type="password"
                        class="auth-input"
                        placeholder="Password"
                        value="${this.draftLoginPass}"
                        required
                      />
                    </div>

                    <button type="submit" class="btn-primary-cta full-width-btn" id="btn-submit-login">
                      <span>${t.account.loginSubmitBtn}</span>
                    </button>
                  </form>
                `
                }
              </div>
            </div>
          `
          }
        </div>
      </main>
    `;
  }

  public render(): void {
    switch (this.mode) {
      case 'title':
        this.root.innerHTML = this.renderMainMenuHTML();
        this.bindMainMenuEvents();
        break;
      case 'playing':
        this.root.innerHTML = this.renderPlayingHUDHTML();
        this.bindPlayingHUDEvents();
        break;
      case 'selfie':
        this.root.innerHTML = this.renderSelfieStudioHTML();
        this.bindSelfieStudioEvents();
        break;
      case 'ar':
        this.root.innerHTML = this.renderARWorldHTML();
        this.bindARWorldEvents();
        break;
      case 'card':
        this.root.innerHTML = this.renderARCardModalHTML();
        this.bindCardModalEvents();
        break;
      case 'collection':
        this.root.innerHTML = this.renderCollectionModalHTML();
        this.bindCollectionModalEvents();
        break;
      case 'encyclopedia':
        this.root.innerHTML = this.renderEncyclopediaModalHTML();
        this.bindEncyclopediaModalEvents();
        break;
      case 'settings':
        this.root.innerHTML = this.renderSettingsModalHTML();
        this.bindSettingsModalEvents();
        break;
      case 'account':
        this.root.innerHTML = this.renderAccountModalHTML();
        this.bindAccountModalEvents();
        break;
    }
  }

  private updatePlayingHudValues(): void {
    const { stats, progression, settings } = storageManager.getState();
    const t = getTranslation(settings.language);
    const petName = storageManager.getPetName();
    const setBar = (id: string, val: number, prefix = '') => {
      const bar = this.root.querySelector<HTMLElement>(`#bar-${id}`);
      const lbl = this.root.querySelector<HTMLElement>(`#val-${id}`);
      if (bar) bar.style.width = `${val}%`;
      if (lbl) lbl.textContent = prefix ? `${prefix} ${val}%` : `${val}/100`;
    };
    setBar('hunger', stats.hunger);
    setBar('happiness', stats.happiness);
    setBar('energy', stats.energy);
    setBar('friendship', stats.friendship, t.hud.bond);

    const sleepBadge = this.root.querySelector<HTMLElement>('#hud-sleep-badge');
    if (sleepBadge) {
      sleepBadge.textContent = stats.isSleeping ? t.hud.sleeping : t.hud.active;
    }
    const sleepLabel =
      this.root.querySelector<HTMLElement>('#label-sleep-toggle');
    if (sleepLabel) {
      sleepLabel.textContent = stats.isSleeping ? t.hud.wake : t.hud.sleep;
    }

    const creatureName =
      this.root.querySelector<HTMLElement>('.hud-creature-name');
    if (creatureName) {
      const cLvl = calculateLevelFromXp(progression.creatureXp);
      creatureName.innerHTML = `${petName} <span class="hud-lvl-text tabular-nums">Lv.${cLvl.level}</span>`;
    }
  }

  private updateARHudValues(): void {
    const { stats, progression } = storageManager.getState();
    const petName = storageManager.getPetName();
    const summaryEl =
      this.root.querySelector<HTMLElement>('#ar-stats-summary');
    if (summaryEl) {
      summaryEl.textContent = `${petName} Lv.${progression.creatureLevel} · Happy ${stats.happiness}% · Bond ${stats.friendship}%`;
    }
    const sleepEl = this.root.querySelector<HTMLElement>('#ar-sleep-label');
    if (sleepEl) {
      sleepEl.textContent = stats.isSleeping ? 'Wake' : 'Sleep';
    }
  }

  private updateARStatusDOM(): void {
    const s = this.arStatus;
    const petName = storageManager.getPetName();
    const infoEl = this.root.querySelector<HTMLElement>('#ar-target-info');
    if (infoEl) infoEl.textContent = s.mindTargetInfo;

    const stateEl = this.root.querySelector<HTMLElement>('#ar-tracking-state');
    if (stateEl) {
      stateEl.textContent = s.markerTracked
        ? `Card Anchored (${Math.round(s.trackingConfidence * 100)}% lock)`
        : s.cameraState === 'streaming'
          ? `Scanning for ${petName} Card...`
          : `Preview Active`;
    }

    const reticle = this.root.querySelector<HTMLElement>('#ar-scan-reticle');
    if (reticle) {
      reticle.classList.toggle('reticle-locked', s.markerTracked);
    }

    const promptEl = this.root.querySelector<HTMLElement>('#ar-reticle-prompt');
    if (promptEl) {
      promptEl.textContent = s.markerTracked
        ? `✨ ${petName} Summoned on AR Card — Tap buttons on the right to interact!`
        : `Point camera at your printed ${petName} AR Card (or click Preview Marker Anchor)`;
    }

    const errBanner = this.root.querySelector<HTMLElement>('#ar-error-banner');
    const errText = this.root.querySelector<HTMLElement>('#ar-error-text');
    if (errBanner && errText) {
      if (s.errorMessage) {
        errBanner.classList.remove('hidden');
        errText.textContent = s.errorMessage;
      } else {
        errBanner.classList.add('hidden');
      }
    }

    const simLabel = this.root.querySelector<HTMLElement>('#ar-simulate-label');
    if (simLabel) {
      simLabel.textContent = s.simulatedCardActive
        ? 'Hide Preview Card'
        : 'Preview Marker Anchor';
    }
  }

  private bindMainMenuEvents(): void {
    this.root
      .querySelector('#btn-play-3d')
      ?.addEventListener('click', () => this.start3DWorld());
    this.root.querySelector('#btn-enter-ar')?.addEventListener('click', () => {
      this.startARWorld();
    });
    this.root
      .querySelector('#btn-my-ar-card')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('card');
      });
    this.root
      .querySelector('#btn-collection')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('collection');
      });
    this.root
      .querySelector('#btn-encyclopedia')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('encyclopedia');
      });
    this.root.querySelector('#btn-settings')?.addEventListener('click', () => {
      this.sound.playClick();
      this.setMode('settings');
    });
    this.root
      .querySelector('#btn-trophy-achievements')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('settings');
      });

    const openAccountModal = () => {
      this.sound.playClick();
      this.pendingPlayModeAfterAuth = null;
      this.authFeedback = null;
      this.draftPetName = storageManager.getPetName();
      this.setMode('account');
    };
    this.root
      .querySelector('#btn-top-account')
      ?.addEventListener('click', openAccountModal);
    this.root
      .querySelector('#btn-badge-account')
      ?.addEventListener('click', openAccountModal);

    this.root
      .querySelector('#btn-claim-daily')
      ?.addEventListener('click', () => {
        const res = storageManager.claimDaily();
        if (res.claimed) {
          this.sound.playLevelUp();
          this.world.triggerEmberAnimation('happy', 2.2);
        } else {
          this.sound.playClick();
        }
        this.render();
      });

    this.root
      .querySelector('#btn-preview-wave')
      ?.addEventListener('click', () => {
        this.sound.playHappyChirp();
        this.world.triggerEmberAnimation('happy', 2.0);
      });
    this.root
      .querySelector('#btn-preview-dance')
      ?.addEventListener('click', () => {
        const trackId = storageManager.getState().settings.selectedDanceTrack;
        this.sound.playDanceRhythm(trackId, 5.5);
        this.world.triggerEmberAnimation('dancing', 5.5);
      });
    this.root
      .querySelector('#btn-cycle-dance-track')
      ?.addEventListener('click', () => {
        const currentId = storageManager.getState().settings.selectedDanceTrack;
        const idx = DANCE_TRACKS.findIndex((t) => t.id === currentId);
        const nextTrack = DANCE_TRACKS[(idx + 1) % DANCE_TRACKS.length];
        storageManager.updateSettings({ selectedDanceTrack: nextTrack.id });
        this.sound.playDanceRhythm(nextTrack.id, 5.5);
        this.world.triggerEmberAnimation('dancing', 5.5);
        this.render();
      });
  }

  private bindZonePromptButton(): void {
    const btn = this.root.querySelector<HTMLButtonElement>('.btn-zone-action');
    btn?.addEventListener('click', () => {
      const zoneId = btn.dataset.zoneId;
      if (zoneId) {
        this.world.triggerZoneInteraction(zoneId);
      }
    });
  }

  private bindPlayingHUDEvents(): void {
    this.root
      .querySelector('#hud-btn-selfie')
      ?.addEventListener('click', () => {
        this.openSelfieStudio();
      });
    this.root
      .querySelector('#btn-care-selfie')
      ?.addEventListener('click', () => {
        this.openSelfieStudio();
      });
    this.root.querySelector('#hud-btn-ar')?.addEventListener('click', () => {
      this.sound.playClick();
      this.setMode('ar');
    });
    this.root.querySelector('#hud-btn-card')?.addEventListener('click', () => {
      this.sound.playClick();
      this.setMode('card');
    });
    this.root
      .querySelector('#hud-btn-collection')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('collection');
      });
    this.root
      .querySelector('#hud-btn-encyclopedia')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('encyclopedia');
      });
    this.root
      .querySelector('#hud-btn-account')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.authFeedback = null;
        this.draftPetName = storageManager.getPetName();
        this.setMode('account');
      });
    this.root
      .querySelector('#hud-btn-camera-mode')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.world.toggleCloseUpCareMode();
        this.render();
      });
    this.root
      .querySelector('#btn-minimap-zoom')
      ?.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement).blur();
        this.sound.playClick();
        this.world.toggleMinimapZoom();
      });
    this.root
      .querySelector('#hud-btn-settings')
      ?.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement).blur();
        this.sound.playClick();
        this.setMode('settings');
      });
    this.root.querySelector('#hud-btn-menu')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      this.sound.playClick();
      this.setMode('title');
    });
    this.root.querySelector('#hud-btn-mute')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      const s = storageManager.getState().settings;
      storageManager.updateSettings({ muted: !s.muted });
      this.render();
    });

    this.root
      .querySelector('#btn-toggle-dock')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.dockCollapsed = !this.dockCollapsed;
        this.render();
      });

    this.root
      .querySelector('#btn-toggle-dock-extras')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.dockExtrasOpen = !this.dockExtrasOpen;
        if (this.dockExtrasOpen && this.dockCollapsed) {
          this.dockCollapsed = false;
        }
        this.render();
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-pet-action]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.petAction as PetActionType;
          if (action) this.handlePetAction(action);
        });
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-cosmetic-id]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.cosmeticId as CosmeticId;
          if (id && storageManager.equipCosmetic(id)) {
            const cosmetic = COSMETICS.find((c) => c.id === id);
            this.world.setCosmetic(id);
            this.sound.playHappyChirp();
            this.world.triggerEmberAnimation('happy', 1.8);
            this.render();
            if (cosmetic) {
              this.showSpeechBubble(`✨ Wearing ${cosmetic.name}!`);
              this.showFeedback(
                `✨ Dragon Gear: ${cosmetic.name} — ${cosmetic.description}`,
              );
            }
          }
        });
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-dance-track]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const trackId = btn.dataset.danceTrack as DanceTrackId;
          if (trackId) {
            storageManager.updateSettings({ selectedDanceTrack: trackId });
            this.render();
            this.handlePetAction('dance');
          }
        });
      });

    this.bindZonePromptButton();
    this.bindVirtualJoystick();

    this.root
      .querySelector('#btn-jump-action')
      ?.addEventListener('click', () => {
        this.world.player.triggerJump();
      });
  }

  private bindSelfieStudioEvents(): void {
    this.root
      .querySelector('#btn-exit-selfie')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('playing');
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-selfie-pose]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const pose = btn.dataset.selfiePose as SelfiePoseId;
          if (pose) {
            this.selfiePose = pose;
            this.sound.playHappyChirp();
            this.world.setSelfiePose(pose);
            this.render();
            window.setTimeout(() => this.renderSelfiePreviewCanvas(false), 60);
          }
        });
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-selfie-frame]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const frame = btn.dataset.selfieFrame as SelfieFrameId;
          if (frame) {
            this.selfieFrame = frame;
            this.sound.playClick();
            this.render();
            window.setTimeout(() => this.renderSelfiePreviewCanvas(false), 40);
          }
        });
      });

    this.root
      .querySelector('#btn-snap-selfie')
      ?.addEventListener('click', () => {
        this.renderSelfiePreviewCanvas(true);
      });

    this.root
      .querySelector('#btn-download-selfie')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        if (!this.lastSelfieDataUrl) {
          this.renderSelfiePreviewCanvas(false);
        }
        if (this.lastSelfieDataUrl) {
          const petSlug = storageManager
            .getPetName()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
          const a = document.createElement('a');
          a.href = this.lastSelfieDataUrl;
          a.download = `solara-selfie-${petSlug || 'ember'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      });
  }

  private bindVirtualJoystick(): void {
    const base = this.root.querySelector<HTMLElement>('#joystick-base');
    const stick = this.root.querySelector<HTMLElement>('#joystick-stick');
    if (!base || !stick) return;

    let dragging = false;
    const maxRadius = 38;

    const updateStick = (clientX: number, clientY: number) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      this.world.player.setJoystickVector(dx / maxRadius, dy / maxRadius);
    };

    const resetStick = () => {
      dragging = false;
      stick.style.transform = 'translate(0px, 0px)';
      this.world.player.setJoystickVector(0, 0);
    };

    base.addEventListener('pointerdown', (e) => {
      dragging = true;
      base.setPointerCapture(e.pointerId);
      updateStick(e.clientX, e.clientY);
    });
    base.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      updateStick(e.clientX, e.clientY);
    });
    base.addEventListener('pointerup', resetStick);
    base.addEventListener('pointercancel', resetStick);
  }

  private bindARWorldEvents(): void {
    this.root.querySelector('#ar-btn-exit')?.addEventListener('click', () => {
      this.sound.playClick();
      this.setMode(this.previousPlayMode);
    });
    this.root
      .querySelector('#ar-btn-open-card')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('card');
      });
    this.root
      .querySelector('#ar-btn-restart-cam')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        const mount =
          this.root.querySelector<HTMLElement>('#ar-viewport-mount');
        if (mount) {
          const s = storageManager.getState();
          void this.arTracker.start(
            mount,
            s.progression.equippedCosmetic,
            s.stats.friendship,
          );
        }
      });
    this.root
      .querySelector('#ar-btn-simulate-toggle')
      ?.addEventListener('click', () => {
        this.sound.playHappyChirp();
        this.arTracker.setSimulatedCardAnchor(
          !this.arStatus.simulatedCardActive,
        );
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-ar-action]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.arAction as PetActionType;
          if (action) {
            this.handlePetAction(action);
            this.updateARHudValues();
          }
        });
      });
  }

  private bindCardModalEvents(): void {
    this.root
      .querySelector('#btn-close-modal')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode(this.previousPlayMode);
      });
    this.root
      .querySelector('#btn-print-card')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        window.print();
      });
    this.root
      .querySelector('#card-btn-go-ar')
      ?.addEventListener('click', () => {
        this.startARWorld();
      });
  }

  private bindCollectionModalEvents(): void {
    this.root
      .querySelector('#btn-close-modal')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode(this.previousPlayMode);
      });
    this.root
      .querySelector('#col-btn-play-ember')
      ?.addEventListener('click', () => {
        this.start3DWorld();
      });
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-open-lore]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.openLore as
            | 'ember'
            | 'aqua'
            | 'moss'
            | 'volt';
          if (id) {
            this.sound.playClick();
            this.selectedEncyclopediaId = id;
            this.setMode('encyclopedia');
          }
        });
      });
  }

  private bindEncyclopediaModalEvents(): void {
    this.root
      .querySelector('#btn-close-modal')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode(this.previousPlayMode);
      });
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-enc-id]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.encId as 'ember' | 'aqua' | 'moss' | 'volt';
          if (id) {
            this.sound.playClick();
            this.selectedEncyclopediaId = id;
            this.render();
          }
        });
      });
  }

  private bindSettingsModalEvents(): void {
    this.root
      .querySelector('#btn-close-modal')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode(this.previousPlayMode);
      });

    // Language Switcher Buttons (en, id, zh)
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-lang]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const lang = btn.dataset.lang as AppLanguage;
          if (lang === 'en' || lang === 'id' || lang === 'zh') {
            this.sound.playClick();
            storageManager.updateSettings({ language: lang });
            this.feedbackBannerText = getTranslation(lang).hud.welcomeToast;
            this.render();
          }
        });
      });

    const musicSlider =
      this.root.querySelector<HTMLInputElement>('#input-music-vol');
    musicSlider?.addEventListener('input', () => {
      const val = Number(musicSlider.value);
      const lbl = this.root.querySelector('#lbl-music-vol');
      if (lbl) lbl.textContent = `${val}%`;
      storageManager.updateSettings({ musicVolume: val });
    });

    const sfxSlider =
      this.root.querySelector<HTMLInputElement>('#input-sfx-vol');
    sfxSlider?.addEventListener('input', () => {
      const val = Number(sfxSlider.value);
      const lbl = this.root.querySelector('#lbl-sfx-vol');
      if (lbl) lbl.textContent = `${val}%`;
      storageManager.updateSettings({ sfxVolume: val });
    });

    this.root
      .querySelector('#btn-toggle-mute')
      ?.addEventListener('click', () => {
        const s = storageManager.getState().settings;
        storageManager.updateSettings({ muted: !s.muted });
        this.render();
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-setting-bgm]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const bgmId = btn.dataset.settingBgm as BackgroundTrackId;
          if (bgmId) {
            storageManager.updateSettings({ selectedBgmTrack: bgmId });
            this.sound.setBackgroundTrack(bgmId);
            this.render();
          }
        });
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-setting-dance]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const trackId = btn.dataset.settingDance as DanceTrackId;
          if (trackId) {
            storageManager.updateSettings({ selectedDanceTrack: trackId });
            this.sound.playDanceRhythm(trackId, 3.2);
            this.render();
          }
        });
      });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-quality]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const q = btn.dataset.quality as GraphicsQuality;
          if (q) {
            this.sound.playClick();
            storageManager.updateSettings({ graphicsQuality: q });
            this.world.applyQualitySettings(q);
            this.render();
          }
        });
      });

    const sensSlider =
      this.root.querySelector<HTMLInputElement>('#input-cam-sens');
    sensSlider?.addEventListener('input', () => {
      const val = Number(sensSlider.value);
      const lbl = this.root.querySelector('#lbl-cam-sens');
      if (lbl) lbl.textContent = `${val.toFixed(1)}x`;
      storageManager.updateSettings({ cameraSensitivity: val });
    });

    this.root.querySelector('#btn-ask-reset')?.addEventListener('click', () => {
      this.sound.playClick();
      this.confirmResetOpen = true;
      this.render();
    });

    this.root
      .querySelector('#btn-cancel-reset')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.confirmResetOpen = false;
        this.render();
      });

    this.root
      .querySelector('#btn-confirm-reset')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        storageManager.resetProgress();
        this.confirmResetOpen = false;
        this.render();
      });

    this.root
      .querySelector('#btn-return-title')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode('title');
      });
  }

  private bindAccountModalEvents(): void {
    const lang = storageManager.getState().settings.language;
    const t = getTranslation(lang);

    this.root
      .querySelector('#btn-close-modal')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.setMode(this.previousPlayMode);
      });

    // Dedicated Custom Pet Name Form in Profile Menu
    const petNameInput =
      this.root.querySelector<HTMLInputElement>('#input-pet-name');
    petNameInput?.addEventListener('input', () => {
      this.draftPetName = petNameInput.value;
    });

    const petNameForm =
      this.root.querySelector<HTMLFormElement>('#form-pet-name');
    petNameForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawName = petNameInput?.value || this.draftPetName || '';
      const res = storageManager.setPetName(rawName);
      if (res.ok && res.petName) {
        this.sound.playHappyChirp();
        this.draftPetName = res.petName;
        this.authFeedback = {
          type: 'success',
          message: `${t.account.petNameSavedMsg}: "${res.petName}"!`,
        };
      } else {
        this.sound.playClick();
        this.authFeedback = {
          type: 'error',
          message: res.error || 'Invalid pet name.',
        };
      }
      this.render();
    });

    this.root
      .querySelector('#tab-btn-register')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        this.authTab = 'register';
        this.authFeedback = null;
        this.render();
      });

    this.root.querySelector('#tab-btn-login')?.addEventListener('click', () => {
      this.sound.playClick();
      this.authTab = 'login';
      this.authFeedback = null;
      this.render();
    });

    const regUsernameInput =
      this.root.querySelector<HTMLInputElement>('#reg-username');
    regUsernameInput?.addEventListener('input', () => {
      this.draftRegUsername = regUsernameInput.value;
    });
    const regPetNameInput =
      this.root.querySelector<HTMLInputElement>('#reg-pet-name');
    regPetNameInput?.addEventListener('input', () => {
      this.draftRegPetName = regPetNameInput.value;
    });
    const regEmailInput =
      this.root.querySelector<HTMLInputElement>('#reg-email');
    regEmailInput?.addEventListener('input', () => {
      this.draftRegEmail = regEmailInput.value;
    });
    const regPassInput =
      this.root.querySelector<HTMLInputElement>('#reg-password');
    regPassInput?.addEventListener('input', () => {
      this.draftRegPassword = regPassInput.value;
    });
    const loginIdInput =
      this.root.querySelector<HTMLInputElement>('#login-identifier');
    loginIdInput?.addEventListener('input', () => {
      this.draftLoginId = loginIdInput.value;
    });
    const loginPassInput =
      this.root.querySelector<HTMLInputElement>('#login-password');
    loginPassInput?.addEventListener('input', () => {
      this.draftLoginPass = loginPassInput.value;
    });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-pick-avatar]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const av = btn.dataset.pickAvatar as PlayerAvatarId;
          if (av) {
            this.sound.playClick();
            this.selectedRegisterAvatar = av;
            if (storageManager.getCurrentUser()) {
              storageManager.updatePlayerProfile({ avatarId: av });
            }
            this.render();
          }
        });
      });

    const titleSelect =
      this.root.querySelector<HTMLSelectElement>('#reg-title-select');
    titleSelect?.addEventListener('change', () => {
      this.selectedRegisterTitle = titleSelect.value;
      if (storageManager.getCurrentUser()) {
        this.sound.playClick();
        storageManager.updatePlayerProfile({
          titleBadge: this.selectedRegisterTitle,
        });
        this.render();
      }
    });

    const regForm = this.root.querySelector<HTMLFormElement>(
      '#form-register-account',
    );
    regForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username =
        regUsernameInput?.value || this.draftRegUsername || '';
      const petNameVal =
        regPetNameInput?.value ||
        this.draftRegPetName ||
        storageManager.getPetName();
      const email = regEmailInput?.value || this.draftRegEmail || '';
      const password = regPassInput?.value || this.draftRegPassword || '';
      const titleBadge =
        titleSelect?.value || this.selectedRegisterTitle;

      const res = storageManager.registerAccount({
        username,
        email,
        password,
        avatarId: this.selectedRegisterAvatar,
        titleBadge,
        petName: petNameVal,
      });

      if (res.ok && res.account) {
        this.sound.playLevelUp();
        this.draftRegUsername = '';
        this.draftRegEmail = '';
        this.draftRegPassword = '';
        this.draftRegPetName = '';
        this.draftPetName = storageManager.getPetName();
        this.authFeedback = {
          type: 'success',
          message: `Welcome, ${res.account.username} & ${storageManager.getPetName()}! (+50 XP Bonus — All XP is now saved automatically)`,
        };
        if (this.pendingPlayModeAfterAuth) {
          const nextTarget = this.pendingPlayModeAfterAuth;
          this.pendingPlayModeAfterAuth = null;
          this.setMode(nextTarget);
          return;
        }
      } else {
        this.sound.playClick();
        this.authFeedback = {
          type: 'error',
          message: res.error || 'Registration failed.',
        };
      }
      this.render();
    });

    const loginForm = this.root.querySelector<HTMLFormElement>(
      '#form-login-account',
    );
    loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier =
        loginIdInput?.value || this.draftLoginId || '';
      const password =
        loginPassInput?.value || this.draftLoginPass || '';

      const res = storageManager.loginAccount(identifier, password);
      if (res.ok && res.account) {
        this.sound.playLevelUp();
        this.draftLoginId = '';
        this.draftLoginPass = '';
        this.draftPetName = storageManager.getPetName();
        this.authFeedback = {
          type: 'success',
          message: `Logged in as ${res.account.username} (${res.account.titleBadge})!`,
        };
        if (this.pendingPlayModeAfterAuth) {
          const nextTarget = this.pendingPlayModeAfterAuth;
          this.pendingPlayModeAfterAuth = null;
          this.setMode(nextTarget);
          return;
        }
      } else {
        this.sound.playClick();
        this.authFeedback = {
          type: 'error',
          message: res.error || 'Login failed.',
        };
      }
      this.render();
    });

    this.root
      .querySelectorAll<HTMLButtonElement>('[data-quick-switch-id]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.quickSwitchId;
          if (id) {
            const switched = storageManager.quickSwitchAccount(id);
            if (switched) {
              const curr = storageManager.getCurrentUser();
              this.draftPetName = storageManager.getPetName();
              this.sound.playLevelUp();
              this.authFeedback = {
                type: 'success',
                message: `Logged in as ${curr?.username || 'Keeper'}!`,
              };
              if (this.pendingPlayModeAfterAuth) {
                const nextTarget = this.pendingPlayModeAfterAuth;
                this.pendingPlayModeAfterAuth = null;
                this.setMode(nextTarget);
                return;
              }
              this.render();
            }
          }
        });
      });

    this.root
      .querySelector('#btn-logout-account')
      ?.addEventListener('click', () => {
        this.sound.playClick();
        storageManager.logoutAccount();
        this.authFeedback = {
          type: 'success',
          message: t.account.mustRegisterBeforePlay,
        };
        this.render();
      });

    this.root
      .querySelector('#btn-account-play-now')
      ?.addEventListener('click', () => {
        this.start3DWorld();
      });

    this.root
      .querySelector('#btn-account-ar-now')
      ?.addEventListener('click', () => {
        this.startARWorld();
      });
  }
}
