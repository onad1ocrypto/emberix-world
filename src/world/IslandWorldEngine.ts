import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EmberModel } from '../creatures/EmberModel';
import {
  groundHeightAt,
  resolveIslandMovement,
  riverCenterXAt,
} from '../game/rules';
import type {
  AppMode,
  CosmeticId,
  EmberAnimationState,
  GraphicsQuality,
  PetActionType,
  SelfieFrameId,
  SelfiePoseId,
} from '../types';
import { FantasyIsland, type InteractiveZone } from './FantasyIsland';
import { PlayerController } from './PlayerController';

/**
 * Detects software WebGL rasterizers (SwiftShader, llvmpipe, softpipe) from the
 * WebGL renderer string so frame pacing and shadow cost adapt automatically.
 */
export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

export class IslandWorldEngine {
  private container: HTMLElement;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public island: FantasyIsland;
  public readonly ember: EmberModel;
  public readonly player: PlayerController;

  private keyLight!: THREE.DirectionalLight;
  private sanctuaryGlowLight!: THREE.PointLight;
  private currentQuality: GraphicsQuality;
  private mode: AppMode = 'title';
  private paused = false;
  private frameId = 0;
  private lastTime = 0;
  private titleOrbitAngle = 0;
  public closeUpMode = false;
  public selfiePose: SelfiePoseId = 'wave';

  // Companion follow state for EMBER
  public readonly emberPosition = new THREE.Vector3(0, groundHeightAt(0, 0), 0);
  private emberFacingYaw = 0.36;
  private isSleeping = false;

  // Saved pre-selfie positions so returning to 'playing' restores smooth exploration
  private savedPlayerPos = new THREE.Vector3(-1.65, groundHeightAt(-1.65, 2.85), 2.85);
  private hasSavedSelfiePos = false;

  // Raycasting for clicking directly on 3D EMBER or Island Interactive Zones
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };

  private onPetInteract?: (action: PetActionType) => void;
  private onZoneProximityChange?: (zone: InteractiveZone | null) => void;
  private activeNearbyZone: InteractiveZone | null = null;

  // Scratch vectors to avoid per-frame allocations
  private readonly _toPlayer = new THREE.Vector3();
  private readonly _titleCamPos = new THREE.Vector3();
  private readonly _titleLookAt = new THREE.Vector3();
  private readonly _closeUpCamPos = new THREE.Vector3();
  private readonly _closeUpLookAt = new THREE.Vector3();
  private readonly _selfieCamPos = new THREE.Vector3();
  private readonly _selfieLookAt = new THREE.Vector3();

  constructor(
    container: HTMLElement,
    initialQuality: GraphicsQuality,
    callbacks?: {
      onJump?: () => void;
      onStep?: () => void;
      onPetInteract?: (action: PetActionType) => void;
      onZoneProximityChange?: (zone: InteractiveZone | null) => void;
    },
  ) {
    this.container = container;
    this.currentQuality = initialQuality;
    this.onPetInteract = callbacks?.onPetInteract;
    this.onZoneProximityChange = callbacks?.onZoneProximityChange;

    this.scene = new THREE.Scene();
    this.scene.background = this.createSkyGradientTexture();
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.0085);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 180);

    // Frame 0 Title Camera: EMBER perched heroically on the left-foreground mossy sanctuary
    // with the floating sky islands & northern cliff Fantasy Castle in the right background!
    const baseY = groundHeightAt(0, 0);
    this.camera.position.set(0.82, baseY + 0.86, 2.25);
    this.camera.lookAt(0.75, baseY + 0.62, -4.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && initialQuality !== 'low',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.applyQualitySettings(initialQuality);
    this.renderer.setSize(w, h);
    this.renderer.domElement.dataset.testid = 'island-webgl-canvas';
    this.renderer.domElement.className = 'island-webgl-canvas';
    container.appendChild(this.renderer.domElement);

    // Studio PBR environment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    this.setupLighting();

    this.island = new FantasyIsland(initialQuality);
    this.scene.add(this.island);

    this.ember = new EmberModel();
    this.ember.position.copy(this.emberPosition);
    this.ember.rotation.y = 0.36;
    this.scene.add(this.ember);

    this.player = new PlayerController({
      onJump: callbacks?.onJump,
      onStep: callbacks?.onStep,
    });
    this.scene.add(this.player.group);

    this.bindCanvasClickInteractions();
    this.bindResizeObserver();

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.island.update(0.016);
    this.ember.update(0.016);
    this.renderer.render(this.scene, this.camera);

    this.startLoop();
  }

  private createSkyGradientTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.0, '#1d4ed8');
      grad.addColorStop(0.38, '#38bdf8');
      grad.addColorStop(0.75, '#bae6fd');
      grad.addColorStop(1.0, '#fef3c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private setupLighting(): void {
    // Rich azure sky / sunlit emerald ground hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x4d7c0f, 1.45);
    this.scene.add(hemiLight);

    // Warm golden directional sun key light
    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 2.45);
    this.keyLight.position.set(14, 26, 18);
    this.keyLight.castShadow = !isSoftwareGl && this.currentQuality !== 'low';
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 75;
    const d = 26;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    // Warm golden rim light for dragon silhouette & wing translucency
    const rimLight = new THREE.DirectionalLight(0xfbbf24, 0.95);
    rimLight.position.set(-14, 10, -16);
    this.scene.add(rimLight);

    // Warm magical point light near EMBER's sanctuary
    this.sanctuaryGlowLight = new THREE.PointLight(0xffab00, 1.4, 8.5);
    this.sanctuaryGlowLight.position.set(0.4, 2.2, 1.2);
    this.scene.add(this.sanctuaryGlowLight);
  }

  public applyQualitySettings(quality: GraphicsQuality): void {
    this.currentQuality = quality;
    const maxPixelRatio = isSoftwareGl
      ? 1
      : quality === 'low'
        ? 1
        : quality === 'medium'
          ? Math.min(window.devicePixelRatio || 1, 1.5)
          : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(maxPixelRatio);
    this.renderer.shadowMap.enabled = !isSoftwareGl && quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (this.keyLight) {
      this.keyLight.castShadow = !isSoftwareGl && quality !== 'low';
    }
  }

  private bindCanvasClickInteractions(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('pointerup', (e) => {
      if (this.mode !== 'playing') return;
      const moveDist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y,
      );
      if (moveDist > 10) return; // Ignore camera drag gestures

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);

      // Check if user clicked on EMBER directly
      const emberHits = this.raycaster.intersectObject(this.ember, true);
      if (emberHits.length > 0) {
        this.onPetInteract?.('pet');
        return;
      }

      // Check if user clicked on an interactive island zone
      for (const zone of this.island.interactiveZones) {
        const hits = this.raycaster.intersectObject(zone.meshGroup, true);
        if (hits.length > 0) {
          this.triggerZoneInteraction(zone.id);
          return;
        }
      }
    });
  }

  public triggerZoneInteraction(zoneId: string): void {
    if (zoneId === 'sunberry_bush') {
      this.onPetInteract?.('feed');
    } else if (zoneId === 'dragon_nest') {
      this.onPetInteract?.('sleep');
    } else if (zoneId === 'mana_crystal') {
      this.onPetInteract?.('dance');
    }
  }

  private isMobileTitleViewport(): boolean {
    const w = this.container.clientWidth || window.innerWidth;
    return w <= 768 || this.camera.aspect < 0.98;
  }

  private applyTitleCameraFraming(immediate: boolean, dt = 0.016): void {
    const baseY = groundHeightAt(0, 0);
    this.emberPosition.set(0, baseY, 0);
    this.ember.position.copy(this.emberPosition);

    if (this.isMobileTitleViewport()) {
      // On mobile portrait screens, frame EMBER center-stage in the upper-middle 3D window
      // (between the top XR CREATURE WORLD emblem and the compact bottom menu dock)
      this.ember.rotation.y = 0.12 + Math.sin(this.titleOrbitAngle * 1.1) * 0.14;
      this._titleCamPos.set(
        Math.sin(this.titleOrbitAngle) * 0.06,
        baseY + 0.94 + Math.cos(this.titleOrbitAngle * 0.8) * 0.03,
        3.18,
      );
      this._titleLookAt.set(0.0, baseY + 0.06, -1.5);
    } else {
      // On wide desktop screens, frame EMBER on the left foreground perch alongside the menu
      this.ember.rotation.y = 0.36 + Math.sin(this.titleOrbitAngle * 1.1) * 0.14;
      this._titleCamPos.set(
        0.88 + Math.sin(this.titleOrbitAngle) * 0.1,
        baseY + 0.72 + Math.cos(this.titleOrbitAngle * 0.8) * 0.04,
        2.32,
      );
      this._titleLookAt.set(0.78, baseY + 0.66, -4.2);
    }

    if (immediate) {
      this.camera.position.copy(this._titleCamPos);
    } else {
      this.camera.position.lerp(this._titleCamPos, 1 - Math.exp(-6 * dt));
    }
    this.camera.lookAt(this._titleLookAt);
  }

  private applySelfieStageAndCamera(
    immediate: boolean,
    dt = 0.016,
    forSnapshot = false,
  ): void {
    // Stage Player and Pet side-by-side on the Sunstone Sanctuary overlooking the bridge, waterfall & castle
    const petX = 0.32;
    const petZ = 0.0;
    const petY = groundHeightAt(petX, petZ);
    this.emberPosition.set(petX, petY, petZ);
    this.ember.position.copy(this.emberPosition);
    this.ember.rotation.y = -0.18;

    const playerX = -0.36;
    const playerZ = 0.08;
    this.player.updateSelfiePose(this.selfiePose, dt, playerX, playerZ, 0.22);

    const isDesktop =
      !forSnapshot &&
      typeof window !== 'undefined' &&
      window.innerWidth > 768;
    const lookOffsetX = isDesktop ? 0.52 : -0.02;

    this._selfieCamPos.set(
      (isDesktop ? 0.18 : 0.0) + Math.sin(this.titleOrbitAngle * 0.6) * 0.05,
      petY + 0.78,
      2.46,
    );
    this._selfieLookAt.set(lookOffsetX, petY + 0.62, -1.2);

    if (immediate) {
      this.camera.position.copy(this._selfieCamPos);
    } else {
      this.camera.position.lerp(this._selfieCamPos, 1 - Math.exp(-8 * dt));
    }
    this.camera.lookAt(this._selfieLookAt);
  }

  public setSelfiePose(pose: SelfiePoseId): void {
    this.selfiePose = pose;
    const animMap: Record<SelfiePoseId, EmberAnimationState> = {
      wave: 'happy',
      dance: 'dancing',
      jump: 'jump',
      surprise: 'surprised',
      sleep: 'sleeping',
    };
    const targetAnim = animMap[pose] || 'happy';
    this.ember.playAnimation(targetAnim, 8.0);
    if (this.mode === 'selfie') {
      this.applySelfieStageAndCamera(true, 0.032);
      this.ember.update(0.032);
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Captures a high-resolution composite Selfie Portrait PNG containing the live 3D render
   * of the Keeper and their Pet alongside a stylized Solara Island frame displaying:
   * - Keeper Username, Avatar Title Badge, Player Level & XP
   * - Custom Pet Name, Pet Level & XP
   * - Friendship Bond %, Happiness, Hunger, Energy & Equipped Gear
   */
  public renderSelfieSnapshotToCanvas(
    targetCanvas: HTMLCanvasElement,
    meta: {
      username: string;
      titleBadge: string;
      playerLevel: number;
      playerXp: number;
      currentLevelXp: number;
      nextLevelXp: number;
      petName: string;
      creatureLevel: number;
      creatureXp: number;
      friendship: number;
      friendshipLevel: number;
      happiness: number;
      hunger: number;
      energy: number;
      cosmeticName: string;
      frameId: SelfieFrameId;
      poseLabel: string;
    },
  ): string {
    // Render centered snapshot frame first
    this.applySelfieStageAndCamera(true, 0.032, true);
    this.island.update(0.016);
    this.ember.update(0.016);
    this.renderer.render(this.scene, this.camera);

    const width = 960;
    const height = 640;
    targetCanvas.width = width;
    targetCanvas.height = height;
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return '';

    const frameThemes: Record<
      SelfieFrameId,
      { border: string; glow: string; badgeBg: string; accent: string }
    > = {
      gold: {
        border: '#fbbf24',
        glow: '#f59e0b',
        badgeBg: 'rgba(15, 23, 42, 0.90)',
        accent: '#fde047',
      },
      fire: {
        border: '#f97316',
        glow: '#ef4444',
        badgeBg: 'rgba(28, 12, 18, 0.90)',
        accent: '#fb923c',
      },
      crystal: {
        border: '#38bdf8',
        glow: '#0284c7',
        badgeBg: 'rgba(10, 22, 42, 0.90)',
        accent: '#67e8f9',
      },
      emerald: {
        border: '#4ade80',
        glow: '#16a34a',
        badgeBg: 'rgba(10, 28, 22, 0.90)',
        accent: '#86efac',
      },
    };
    const theme = frameThemes[meta.frameId] || frameThemes.gold;

    // 1. Draw the 3D WebGL viewport (cover crop centered)
    const srcCanvas = this.renderer.domElement;
    const sw = srcCanvas.width || width;
    const sh = srcCanvas.height || height;
    const targetAspect = width / height;
    const srcAspect = sw / sh;
    let sx = 0;
    let sy = 0;
    let sWidth = sw;
    let sHeight = sh;
    if (srcAspect > targetAspect) {
      sWidth = sh * targetAspect;
      sx = (sw - sWidth) / 2;
    } else {
      sHeight = sw / targetAspect;
      sy = (sh - sHeight) / 2;
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    try {
      ctx.drawImage(srcCanvas, sx, sy, sWidth, sHeight, 0, 0, width, height);
    } catch {
      // Fallback gradient if WebGL buffer draw fails
    }

    // 2. Subtle top & bottom cinematic gradient vignette for readable text
    const topGrad = ctx.createLinearGradient(0, 0, 0, 110);
    topGrad.addColorStop(0, 'rgba(9, 13, 26, 0.78)');
    topGrad.addColorStop(1, 'rgba(9, 13, 26, 0.0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, 110);

    const botGrad = ctx.createLinearGradient(0, height - 185, 0, height);
    botGrad.addColorStop(0, 'rgba(9, 13, 26, 0.0)');
    botGrad.addColorStop(0.35, 'rgba(9, 13, 26, 0.72)');
    botGrad.addColorStop(1, 'rgba(9, 13, 26, 0.95)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, height - 185, width, 185);

    // 3. Top Header Banner: EMBERIX WORLD · SELFIE PORTRAIT
    ctx.save();
    ctx.fillStyle = theme.badgeBg;
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(22, 18, 430, 52, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.font = '900 19px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillText('📸 EMBERIX WORLD · SELFIE', 42, 42);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    const dateStr = new Date().toISOString().slice(0, 10);
    ctx.fillText(`Solara Sanctuary · ${meta.poseLabel} · ${dateStr}`, 42, 60);
    ctx.restore();

    // Top-Right Bond & Gear Pill
    ctx.save();
    ctx.fillStyle = theme.badgeBg;
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(width - 310, 18, 288, 52, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `⭐ Bond Lv.${meta.friendshipLevel} (${meta.friendship}%)`,
      width - 290,
      41,
    );
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Gear: ${meta.cosmeticName}`, width - 290, 59);
    ctx.restore();

    // 4. Bottom Full-Width Keeper & Pet Stats Passport Dock
    const cardY = height - 134;
    ctx.save();
    ctx.fillStyle = theme.badgeBg;
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(22, cardY, width - 44, 112, 20);
    ctx.fill();
    ctx.stroke();

    // Left Column: Keeper Username, Title, Level & XP Bar
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('KEEPER PROFILE', 44, cardY + 26);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `${meta.username} · Lv.${meta.playerLevel}`,
      44,
      cardY + 52,
    );

    ctx.fillStyle = theme.accent;
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `🏅 ${meta.titleBadge} · Total ${meta.playerXp} XP`,
      44,
      cardY + 73,
    );

    // XP Bar
    const barX = 44;
    const barY = cardY + 83;
    const barW = 250;
    const barH = 14;
    ctx.fillStyle = 'rgba(9, 13, 26, 0.95)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 7);
    ctx.fill();

    const xpRatio = Math.min(
      1,
      Math.max(0.06, meta.currentLevelXp / Math.max(1, meta.nextLevelXp)),
    );
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, '#38bdf8');
    barGrad.addColorStop(1, '#a855f7');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * xpRatio, barH, 7);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 10px "JetBrains Mono", monospace';
    ctx.fillText(
      `${meta.currentLevelXp} / ${meta.nextLevelXp} XP`,
      barX + 75,
      barY + 11,
    );

    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(335, cardY + 16);
    ctx.lineTo(335, cardY + 96);
    ctx.stroke();

    // Middle Column: Companion Pet Custom Name, Level & XP
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('COMPANION PET (FIRE DRAGON)', 358, cardY + 26);

    ctx.fillStyle = theme.accent;
    ctx.font = '900 22px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `🐾 ${meta.petName} · Lv.${meta.creatureLevel}`,
      358,
      cardY + 52,
    );

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Pet XP: ${meta.creatureXp} XP`, 358, cardY + 73);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `❤️ Hunger ${meta.hunger}%  ·  ⚡ Energy ${meta.energy}%  ·  😊 Happy ${meta.happiness}%`,
      358,
      cardY + 94,
    );

    // Right Seal Stamp
    ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width - 82, cardY + 56, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.font = '900 12px "Fredoka", sans-serif';
    ctx.fillText('SOLARA', width - 82, cardY + 52);
    ctx.font = '800 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('VERIFIED', width - 82, cardY + 66);
    ctx.restore();

    // 5. Outer Decorative Portrait Frame Border
    ctx.save();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    ctx.restore();

    try {
      return targetCanvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  private bindResizeObserver(): void {
    const onResize = () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.mode === 'selfie') {
        this.applySelfieStageAndCamera(true);
      } else if (this.mode !== 'playing' && this.mode !== 'ar') {
        this.applyTitleCameraFraming(true);
      }
      if (!this.paused) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    window.addEventListener('resize', onResize);
  }

  public toggleCloseUpCareMode(force?: boolean): boolean {
    this.closeUpMode = force !== undefined ? force : !this.closeUpMode;
    this.player.group.visible =
      (this.mode === 'playing' && !this.closeUpMode) || this.mode === 'selfie';
    if (!this.paused) {
      if (this.closeUpMode) {
        const ex = this.emberPosition.x;
        const ey = this.emberPosition.y;
        const ez = this.emberPosition.z;
        this.ember.rotation.y = -0.08;
        this.camera.position.set(ex - 0.14, ey + 0.56, ez + 1.68);
        this.camera.lookAt(ex + 0.22, ey + 0.54, ez - 1.2);
      }
      this.renderer.render(this.scene, this.camera);
    }
    return this.closeUpMode;
  }

  public setMode(mode: AppMode): void {
    const prevMode = this.mode;
    this.mode = mode;
    if (mode !== 'playing') {
      this.closeUpMode = false;
    }

    if (mode === 'selfie' && prevMode !== 'selfie') {
      this.savedPlayerPos.copy(this.player.position);
      this.hasSavedSelfiePos = true;
    } else if (prevMode === 'selfie' && mode === 'playing' && this.hasSavedSelfiePos) {
      this.player.position.copy(this.savedPlayerPos);
      this.player.group.position.copy(this.savedPlayerPos);
    }

    this.player.controlsEnabled = mode === 'playing' && !this.closeUpMode;
    this.player.group.visible =
      (mode === 'playing' && !this.closeUpMode) || mode === 'selfie';
    // Pause 3D island rendering when in fullscreen camera AR mode to save GPU/CPU
    this.paused = mode === 'ar';

    if (mode === 'selfie') {
      this.setSelfiePose(this.selfiePose);
      this.applySelfieStageAndCamera(true);
    } else if (mode === 'playing' && prevMode !== 'playing') {
      // Snap third-person camera behind Explorer & EMBER looking toward bridge, waterfall & castle
      const targetX = this.player.position.x * 0.5;
      const targetY = this.player.position.y + 1.05;
      const targetZ = this.player.position.z * 0.5;
      const horizDist =
        this.player.cameraDistance * Math.cos(this.player.cameraPitch);
      const vertDist =
        this.player.cameraDistance * Math.sin(this.player.cameraPitch);
      this.camera.position.set(
        targetX + Math.sin(this.player.cameraYaw) * horizDist,
        targetY + vertDist,
        targetZ + Math.cos(this.player.cameraYaw) * horizDist,
      );
      this.camera.lookAt(targetX, targetY, targetZ);
    } else if (mode !== 'playing' && mode !== 'ar') {
      this.applyTitleCameraFraming(true);
    }

    if (!this.paused) {
      this.renderer.render(this.scene, this.camera);
      if (this.frameId === 0) {
        this.lastTime = performance.now();
        this.startLoop();
      }
    }
  }

  public setSleepingState(sleeping: boolean): void {
    this.isSleeping = sleeping;
    if (sleeping) {
      if (this.mode === 'playing' && !this.closeUpMode) {
        const dMain = Math.hypot(
          this.emberPosition.x - 3.35,
          this.emberPosition.z - 0.45,
        );
        const dMeadow = Math.hypot(
          this.emberPosition.x - 5.6,
          this.emberPosition.z - 5.8,
        );
        if (dMain <= 6.5 || dMeadow <= 6.5) {
          const bedX = dMain <= dMeadow ? 3.35 : 5.6;
          const bedZ = dMain <= dMeadow ? 0.45 : 5.8;
          this.emberPosition.set(bedX, groundHeightAt(bedX, bedZ), bedZ);
          this.ember.position.copy(this.emberPosition);
          this.emberFacingYaw = dMain <= dMeadow ? -0.42 : -0.75;
          this.ember.rotation.y = this.emberFacingYaw;
        }
      }
      this.ember.playAnimation('sleeping');
    } else if (this.ember.getAnimationState() === 'sleeping') {
      this.ember.playAnimation('idle');
    }
  }

  public setCosmetic(cosmeticId: CosmeticId): void {
    this.ember.setCosmetic(cosmeticId);
  }

  public setFriendship(friendship: number): void {
    this.ember.setFriendshipLevel(friendship);
  }

  public triggerEmberAnimation(
    anim: EmberAnimationState,
    durationSeconds = 2.2,
  ): void {
    this.ember.playAnimation(anim, durationSeconds);
    if (!this.paused) {
      this.ember.update(0.016);
      this.renderer.render(this.scene, this.camera);
    }
  }

  private updateCompanionAI(dt: number): void {
    if (this.mode === 'selfie') {
      // Handled by applySelfieStageAndCamera
      return;
    }

    if (this.mode !== 'playing') {
      // On title/menu screens, keep EMBER posed on the sanctuary perch
      const baseY = groundHeightAt(0, 0);
      this.emberPosition.set(0, baseY, 0);
      this.ember.position.copy(this.emberPosition);
      this.ember.rotation.y =
        (this.isMobileTitleViewport() ? 0.05 : 0.36) +
        Math.sin(this.titleOrbitAngle * 1.1) * 0.14;
      return;
    }

    if (this.closeUpMode) {
      // In close-up care view, orient EMBER warmly toward the camera
      const toCamX = this.camera.position.x - this.emberPosition.x;
      const toCamZ = this.camera.position.z - this.emberPosition.z;
      const targetYaw = Math.atan2(toCamX, toCamZ);
      this.ember.rotation.y = targetYaw;
      return;
    }

    if (this.isSleeping) {
      this.emberPosition.y = groundHeightAt(
        this.emberPosition.x,
        this.emberPosition.z,
      );
      this.ember.position.copy(this.emberPosition);
      return;
    }

    // Determine target position (if player is across the river, steer toward the wooden bridge first)
    const emberSide =
      this.emberPosition.x >= riverCenterXAt(this.emberPosition.z) ? 1 : -1;
    const playerSide =
      this.player.position.x >= riverCenterXAt(this.player.position.z) ? 1 : -1;
    const needsBridgeWaypoint =
      emberSide !== playerSide && Math.abs(this.emberPosition.z) > 1.05;

    const targetX = needsBridgeWaypoint
      ? emberSide > 0
        ? -2.2
        : -10.2
      : this.player.position.x;
    const targetZ = needsBridgeWaypoint ? 0 : this.player.position.z;

    this._toPlayer.set(
      targetX - this.emberPosition.x,
      0,
      targetZ - this.emberPosition.z,
    );
    const distToPlayer = Math.hypot(
      this.player.position.x - this.emberPosition.x,
      this.player.position.z - this.emberPosition.z,
    );
    const stepLen = this._toPlayer.length();

    if (stepLen > 0.05) {
      const targetYaw = Math.atan2(this._toPlayer.x, this._toPlayer.z);
      let diff = targetYaw - this.emberFacingYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.emberFacingYaw += diff * Math.min(1, dt * 8);
    }

    const currentAnim = this.ember.getAnimationState();
    const isPlayingOneShot =
      currentAnim === 'happy' ||
      currentAnim === 'eating' ||
      currentAnim === 'dancing' ||
      currentAnim === 'surprised' ||
      currentAnim === 'jump';

    // Follow player naturally when distance > 1.85m
    if (distToPlayer > 1.85 && stepLen > 0.05 && !isPlayingOneShot) {
      this._toPlayer.divideScalar(stepLen);
      const isRunning = distToPlayer > 4.8;
      const speed = isRunning ? 5.2 : 3.2;
      const nextX = this.emberPosition.x + this._toPlayer.x * speed * dt;
      const nextZ = this.emberPosition.z + this._toPlayer.z * speed * dt;
      const resolved = resolveIslandMovement(
        this.emberPosition.x,
        this.emberPosition.z,
        nextX,
        nextZ,
      );
      this.emberPosition.x = resolved.x;
      this.emberPosition.z = resolved.z;
      this.ember.playAnimation(isRunning ? 'walk' : 'walk');
      if (isRunning) this.ember.playAnimation('run');
    } else if (!isPlayingOneShot && currentAnim !== 'idle') {
      this.ember.playAnimation('idle');
    }

    this.emberPosition.y = groundHeightAt(
      this.emberPosition.x,
      this.emberPosition.z,
    );
    this.ember.position.copy(this.emberPosition);
    this.ember.rotation.y = this.emberFacingYaw;
  }

  private checkInteractiveZones(): void {
    if (this.mode !== 'playing') {
      if (this.activeNearbyZone !== null) {
        this.activeNearbyZone = null;
        this.onZoneProximityChange?.(null);
      }
      return;
    }

    let found: InteractiveZone | null = null;
    for (const zone of this.island.interactiveZones) {
      const d = Math.hypot(
        this.player.position.x - zone.position.x,
        this.player.position.z - zone.position.z,
      );
      if (d <= zone.radius) {
        found = zone;
        break;
      }
    }

    if (found?.id !== this.activeNearbyZone?.id) {
      this.activeNearbyZone = found;
      this.onZoneProximityChange?.(found);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext | null;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.paused) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    this.lastTime = performance.now();

    const tick = () => {
      if (this.paused) {
        this.frameId = 0;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      this.island.update(dt);
      this.updateCompanionAI(dt);
      this.ember.update(dt);

      if (this.mode === 'selfie') {
        this.titleOrbitAngle += dt * 0.35;
        this.applySelfieStageAndCamera(false, dt);
      } else if (this.mode === 'playing') {
        if (this.closeUpMode) {
          // Close-up Pet Care Camera (Reference Panel 3 framing)
          this.titleOrbitAngle += dt * 0.4;
          const ex = this.emberPosition.x;
          const ey = this.emberPosition.y;
          const ez = this.emberPosition.z;
          this._closeUpCamPos.set(
            ex - 0.14 + Math.sin(this.titleOrbitAngle) * 0.08,
            ey + 0.56,
            ez + 1.68,
          );
          this._closeUpLookAt.set(ex + 0.22, ey + 0.54, ez - 1.2);
          this.camera.position.lerp(
            this._closeUpCamPos,
            1 - Math.exp(-8 * dt),
          );
          this.camera.lookAt(this._closeUpLookAt);
        } else {
          this.player.update(dt, this.camera);
        }
        this.checkInteractiveZones();
      } else {
        this.titleOrbitAngle += dt * 0.35;
        this.applyTitleCameraFraming(false, dt);
      }

      this.renderer.render(this.scene, this.camera);

      if (isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.paused = true;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    }
    this.ember.dispose();
    this.renderer.dispose();
  }
}
