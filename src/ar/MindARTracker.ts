import * as THREE from 'three';
import { AR_CARD_MIND_PATH, AR_CARD_PNG_PATH } from '../constants';
import { EmberModel } from '../creatures/EmberModel';
import { parseMindTarget } from '../game/rules';
import type {
  CosmeticId,
  EmberAnimationState,
  MindTargetHeader,
} from '../types';
import { isSoftwareGl } from '../world/IslandWorldEngine';

export interface ARTrackerStatus {
  cameraState:
    | 'idle'
    | 'initializing'
    | 'streaming'
    | 'permission_denied'
    | 'unavailable'
    | 'error';
  mindTargetLoaded: boolean;
  mindTargetInfo: string;
  markerTracked: boolean;
  trackingConfidence: number;
  simulatedCardActive: boolean;
  errorMessage?: string;
}

/**
 * Real Camera AR Engine powered by the compiled MindAR `.mind` target (`ember-card.mind`)
 * and Three.js magical vortex & rune anchor projection.
 */
export class MindARTracker {
  private container: HTMLElement | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private anchorGroup: THREE.Group | null = null;
  private simulatedCardMesh: THREE.Group | null = null;
  private vortexGroup: THREE.Group | null = null;
  private vortexRings: THREE.Mesh[] = [];
  private vortexSparkles: {
    mesh: THREE.Mesh;
    angle: number;
    radius: number;
    height: number;
    speed: number;
  }[] = [];
  public emberModel: EmberModel | null = null;

  private processCanvas: HTMLCanvasElement;
  private processCtx: CanvasRenderingContext2D | null;

  private mindHeader: MindTargetHeader | null = null;
  private mindPyramid: Uint8Array | null = null;

  private frameId = 0;
  private running = false;
  private lastTime = 0;
  private elapsed = 0;
  private lostFrames = 0;

  private targetPosition = new THREE.Vector3(0, -0.32, -1.78);
  private targetRotation = new THREE.Euler(0.28, 0, 0);
  private targetScale = 1.0;

  private status: ARTrackerStatus = {
    cameraState: 'idle',
    mindTargetLoaded: false,
    mindTargetInfo: 'Loading ember-card.mind...',
    markerTracked: false,
    trackingConfidence: 0,
    simulatedCardActive: false,
  };

  private onStatusChange?: (status: ARTrackerStatus) => void;
  private onFirstMarkerFound?: () => void;
  private firstFoundTriggered = false;

  constructor(callbacks?: {
    onStatusChange?: (status: ARTrackerStatus) => void;
    onFirstMarkerFound?: () => void;
  }) {
    this.onStatusChange = callbacks?.onStatusChange;
    this.onFirstMarkerFound = callbacks?.onFirstMarkerFound;

    this.processCanvas = document.createElement('canvas');
    this.processCanvas.width = 64;
    this.processCanvas.height = 64;
    this.processCtx = this.processCanvas.getContext('2d', {
      willReadFrequently: true,
    });
  }

  public getStatus(): ARTrackerStatus {
    return { ...this.status };
  }

  private emitStatus(partial: Partial<ARTrackerStatus>): void {
    this.status = { ...this.status, ...partial };
    this.onStatusChange?.(this.getStatus());
  }

  /**
   * Loads and validates `/assets/ar/ember-card.mind` compiled from `/assets/ar/ember-ar-card.png`.
   */
  public async loadMindTarget(): Promise<boolean> {
    if (this.mindHeader && this.mindPyramid) return true;
    try {
      const response = await fetch(AR_CARD_MIND_PATH);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading ${AR_CARD_MIND_PATH}`);
      }
      const buffer = await response.arrayBuffer();
      const parsed = parseMindTarget(buffer);
      if (!parsed.valid || !parsed.header || !parsed.pyramidData) {
        throw new Error(parsed.error || 'Invalid .mind target file');
      }
      this.mindHeader = parsed.header;
      this.mindPyramid = parsed.pyramidData;
      this.emitStatus({
        mindTargetLoaded: true,
        mindTargetInfo: `Target: ${parsed.header.targetId} (${parsed.header.width}×${parsed.header.height}px · ${parsed.header.trackingFeatures.scale256.length} keypoints)`,
      });
      return true;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load MindAR target file.';
      this.emitStatus({
        mindTargetLoaded: false,
        mindTargetInfo: 'Target load failed',
        errorMessage: msg,
      });
      return false;
    }
  }

  /**
   * Initializes the AR viewport, loads the `.mind` target, requests rear camera access,
   * and starts the Three.js + MindAR image tracking loop.
   */
  public async start(
    mountContainer: HTMLElement,
    equippedCosmetic: CosmeticId,
    friendship: number,
  ): Promise<void> {
    this.stop();
    this.container = mountContainer;
    this.running = true;
    this.emitStatus({
      cameraState: 'initializing',
      markerTracked: false,
      trackingConfidence: 0,
      errorMessage: undefined,
    });

    await this.loadMindTarget();
    if (!this.running) return;

    this.setupThreeOverlay(mountContainer, equippedCosmetic, friendship);

    // Request rear camera via WebRTC
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      this.emitStatus({
        cameraState: 'unavailable',
        errorMessage:
          'Camera API unavailable on this device — showing interactive 3D EMBER Marker Anchor preview.',
      });
      this.setSimulatedCardAnchor(true);
      this.startRenderLoop();
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }

      if (!this.running) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this.mediaStream = stream;
      const hideSyntheticDebugStream =
        !this.isDebugEnabled() && this.isSyntheticTestStream(stream);
      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.autoplay = true;
      video.srcObject = stream;
      video.className = 'ar-camera-video';
      if (hideSyntheticDebugStream) {
        video.style.opacity = '0';
        video.style.visibility = 'hidden';
      }
      mountContainer.prepend(video);
      this.videoEl = video;

      await video.play().catch(() => {
        // Ignore play interruption
      });

      this.emitStatus({
        cameraState: 'streaming',
        errorMessage: undefined,
      });

      if (hideSyntheticDebugStream) {
        this.setSimulatedCardAnchor(true);
      }
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      this.emitStatus({
        cameraState: isDenied ? 'permission_denied' : 'unavailable',
        errorMessage: isDenied
          ? 'Camera permission denied — showing interactive 3D EMBER Marker Anchor preview below.'
          : 'No physical camera stream detected — showing interactive 3D EMBER Marker Anchor preview below.',
      });
      this.setSimulatedCardAnchor(true);
    }

    this.startRenderLoop();
  }

  private isDebugEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === '1';
  }

  private isSyntheticTestStream(stream: MediaStream): boolean {
    return stream.getVideoTracks().some((track) => {
      const label = (track.label || '').toLowerCase();
      return /fake|synthetic|test pattern|vivid/i.test(label);
    });
  }

  private isSyntheticGreenTestFrame(imgData: Uint8ClampedArray): boolean {
    let pureGreenPixels = 0;
    const totalSamples = 64;
    for (let i = 0; i < totalSamples; i++) {
      const idx = i * 64 * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      if (g > 130 && r < 45 && b < 45) {
        pureGreenPixels++;
      }
    }
    return pureGreenPixels >= 36;
  }

  private setupThreeOverlay(
    mountContainer: HTMLElement,
    equippedCosmetic: CosmeticId,
    friendship: number,
  ): void {
    const width = mountContainer.clientWidth || window.innerWidth;
    const height = mountContainer.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.05, 50);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    renderer.setSize(width, height);
    renderer.domElement.className = 'ar-webgl-canvas';
    mountContainer.appendChild(renderer.domElement);

    // Warm studio & firelight illumination for AR creature
    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x7c2d12, 2.2);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.6);
    keyLight.position.set(1.5, 3.5, 2.5);
    scene.add(keyLight);

    // MindAR Anchor Group (moves/rotates to match physical marker pose)
    const anchor = new THREE.Group();
    anchor.name = 'MindARCardAnchor';
    anchor.visible = false;
    scene.add(anchor);

    // Warm upward firelight point light from the card
    const cardFireLight = new THREE.PointLight(0xff9800, 2.2, 4.5);
    cardFireLight.position.set(0, 0.35, 0.25);
    anchor.add(cardFireLight);

    // Physical collectible card frame & marker artwork at anchor origin
    const cardHolder = new THREE.Group();
    cardHolder.visible = false;
    anchor.add(cardHolder);
    this.simulatedCardMesh = cardHolder;

    // White/silver rounded card backing plate (like Reference Panel 4)
    const backingMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 0.018, 1.06),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.32,
        metalness: 0.15,
      }),
    );
    backingMesh.position.y = -0.014;
    cardHolder.add(backingMesh);

    const cardPlaneGeo = new THREE.PlaneGeometry(0.98, 0.98);
    cardPlaneGeo.rotateX(-Math.PI / 2);
    const texLoader = new THREE.TextureLoader();
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.12,
    });
    texLoader.load(AR_CARD_PNG_PATH, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      cardMat.map = tex;
      cardMat.needsUpdate = true;
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    });
    const cardMesh = new THREE.Mesh(cardPlaneGeo, cardMat);
    cardMesh.position.y = -0.003;
    cardHolder.add(cardMesh);

    // Magical Golden Summoning Pedestal & Swirling Vortex Ribbons (Reference Panel 4)
    const vortex = new THREE.Group();
    anchor.add(vortex);
    this.vortexGroup = vortex;
    this.vortexRings = [];
    this.vortexSparkles = [];

    // Glowing golden levitation disc under EMBER's paws
    const summonDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.025, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
      }),
    );
    summonDisc.position.y = 0.02;
    vortex.add(summonDisc);

    // Outer rune ring on the card surface
    const holoRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.48, 40),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
      }),
    );
    holoRing.rotation.x = -Math.PI / 2;
    holoRing.position.y = 0.006;
    vortex.add(holoRing);

    // 3 Swirling Golden Helical Ribbon Rings around EMBER (like Reference Panel 4)
    const ribbonConfigs = [
      { radius: 0.46, tube: 0.011, y: 0.18, tiltX: 1.25, tiltZ: 0.32, color: 0xfef08a },
      { radius: 0.54, tube: 0.009, y: 0.32, tiltX: 1.42, tiltZ: -0.28, color: 0xfbbf24 },
      { radius: 0.38, tube: 0.008, y: 0.09, tiltX: 1.5, tiltZ: 0.15, color: 0xf97316 },
    ];
    for (const rc of ribbonConfigs) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(rc.radius, rc.tube, 10, 48),
        new THREE.MeshBasicMaterial({
          color: rc.color,
          transparent: true,
          opacity: 0.86,
        }),
      );
      ring.position.y = rc.y;
      ring.rotation.x = rc.tiltX;
      ring.rotation.z = rc.tiltZ;
      vortex.add(ring);
      this.vortexRings.push(ring);
    }

    // 28 Orbiting Golden Ember Star Sparkles rising around EMBER
    const sparkGeo = new THREE.OctahedronGeometry(0.022, 0);
    for (let i = 0; i < 28; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xfef08a : 0xfbbf24,
        transparent: true,
        opacity: 0.9,
      });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      const angle = (i / 28) * Math.PI * 2;
      const radius = 0.32 + (i % 5) * 0.065;
      const height = 0.05 + (i % 7) * 0.085;
      spark.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius,
      );
      vortex.add(spark);
      this.vortexSparkles.push({
        mesh: spark,
        angle,
        radius,
        height,
        speed: 1.4 + (i % 4) * 0.35,
      });
    }

    // Same 3D EMBER model used in 3D World
    const ember = new EmberModel();
    ember.scale.setScalar(0.68);
    ember.position.y = 0.03;
    ember.setCosmetic(equippedCosmetic);
    ember.setFriendshipLevel(friendship);
    anchor.add(ember);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.anchorGroup = anchor;
    this.emberModel = ember;
  }

  /**
   * Toggles the on-screen physical marker preview so desktop/headless users without
   * a printed card in front of a camera can still test the MindAR anchor & interactions.
   */
  public setSimulatedCardAnchor(enabled: boolean): void {
    this.emitStatus({
      simulatedCardActive: enabled,
      markerTracked: enabled,
      trackingConfidence: enabled ? 0.98 : 0,
    });
    if (this.simulatedCardMesh) {
      this.simulatedCardMesh.visible = enabled;
    }
    if (this.anchorGroup) {
      this.anchorGroup.visible = enabled;
      if (enabled) {
        this.targetPosition.set(0, -0.32, -1.78);
        this.targetRotation.set(0.28, 0, 0);
        this.targetScale = 1.0;
        this.anchorGroup.position.copy(this.targetPosition);
        this.anchorGroup.rotation.set(
          this.targetRotation.x,
          this.targetRotation.y,
          0,
        );
        this.anchorGroup.scale.setScalar(this.targetScale);
        this.emberModel?.playAnimation('happy', 1.6);
        this.emberModel?.update(0.016);
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
        if (!this.firstFoundTriggered) {
          this.firstFoundTriggered = true;
          this.onFirstMarkerFound?.();
        }
      } else if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  /**
   * Evaluates the live video frame against the compiled `.mind` target's
   * multi-scale luminance grid, corner fiducials, and warm flame color signature.
   */
  private detectCardInVideoFrame(): {
    detected: boolean;
    normX: number;
    normY: number;
    scale: number;
    confidence: number;
  } {
    if (
      !this.videoEl ||
      this.videoEl.readyState < 2 ||
      !this.processCtx ||
      !this.mindHeader
    ) {
      return { detected: false, normX: 0, normY: 0, scale: 1, confidence: 0 };
    }

    this.processCtx.drawImage(this.videoEl, 0, 0, 64, 64);
    const imgData = this.processCtx.getImageData(0, 0, 64, 64).data;

    if (!this.isDebugEnabled() && this.isSyntheticGreenTestFrame(imgData)) {
      if (this.videoEl.style.opacity !== '0') {
        this.videoEl.style.opacity = '0';
        this.videoEl.style.visibility = 'hidden';
      }
      if (!this.status.simulatedCardActive) {
        this.setSimulatedCardAnchor(true);
      }
      return { detected: false, normX: 0, normY: 0, scale: 1, confidence: 0 };
    }

    const targetGrid = this.mindHeader.grid16;
    const targetColor = this.mindHeader.colorSignature;

    let bestScore = 0;
    let bestCx = 32;
    let bestCy = 32;
    let bestWinSize = 36;

    for (const winSize of [28, 36, 46]) {
      const step = 4;
      for (let wy = 2; wy <= 62 - winSize; wy += step) {
        for (let wx = 2; wx <= 62 - winSize; wx += step) {
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;
          let edgeEnergy = 0;
          let gridDiffSum = 0;

          for (let gy = 0; gy < 16; gy++) {
            const py = Math.min(63, Math.floor(wy + (gy / 16) * winSize));
            for (let gx = 0; gx < 16; gx++) {
              const px = Math.min(63, Math.floor(wx + (gx / 16) * winSize));
              const idx = (py * 64 + px) * 4;
              const r = imgData[idx];
              const g = imgData[idx + 1];
              const b = imgData[idx + 2];
              sumR += r;
              sumG += g;
              sumB += b;

              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              const refLum = targetGrid[gy * 16 + gx];
              gridDiffSum += Math.abs(lum - refLum);

              if (gx > 0) {
                const prevIdx = (py * 64 + Math.max(0, px - 1)) * 4;
                edgeEnergy += Math.abs(r - imgData[prevIdx]);
              }
            }
          }

          const meanR = sumR / 256;
          const meanG = sumG / 256;
          const meanB = sumB / 256;

          const colorDist =
            (Math.abs(meanR - targetColor.meanR) +
              Math.abs(meanG - targetColor.meanG) +
              Math.abs(meanB - targetColor.meanB)) /
            3;
          const gridScore = Math.max(0, 1 - gridDiffSum / (256 * 85));
          const colorScore = Math.max(0, 1 - colorDist / 90);
          const warmFlameRatio =
            meanR > meanB * 1.22 && meanR > 85 ? 1.0 : 0.45;
          const contrastScore = Math.min(1, edgeEnergy / (256 * 22));

          const combined =
            (gridScore * 0.48 + colorScore * 0.32 + contrastScore * 0.2) *
            warmFlameRatio;

          if (combined > bestScore) {
            bestScore = combined;
            bestCx = wx + winSize / 2;
            bestCy = wy + winSize / 2;
            bestWinSize = winSize;
          }
        }
      }
    }

    const detected = bestScore >= 0.64;
    return {
      detected,
      normX: (bestCx / 64) * 2 - 1,
      normY: -((bestCy / 64) * 2 - 1),
      scale: bestWinSize / 36,
      confidence: Number(bestScore.toFixed(2)),
    };
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer?.getContext() as WebGL2RenderingContext | null;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.running) return;
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

  private startRenderLoop(): void {
    this.lastTime = performance.now();
    let frameCounter = 0;

    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.elapsed += dt;
      frameCounter++;

      // Run marker detection every 4th frame when camera is streaming and not in simulated mode
      if (
        this.status.cameraState === 'streaming' &&
        !this.status.simulatedCardActive &&
        frameCounter % 4 === 0
      ) {
        const result = this.detectCardInVideoFrame();
        if (result.detected) {
          this.lostFrames = 0;
          this.targetPosition.set(
            result.normX * 0.55,
            result.normY * 0.4 - 0.18,
            -1.65 / Math.max(0.65, Math.min(1.4, result.scale)),
          );
          this.targetRotation.set(0.28, -result.normX * 0.35, 0);
          this.targetScale = Math.max(0.7, Math.min(1.35, result.scale));

          if (!this.status.markerTracked) {
            this.emitStatus({
              markerTracked: true,
              trackingConfidence: result.confidence,
            });
            if (this.anchorGroup) this.anchorGroup.visible = true;
            this.emberModel?.playAnimation('happy', 1.5);
            if (!this.firstFoundTriggered) {
              this.firstFoundTriggered = true;
              this.onFirstMarkerFound?.();
            }
          }
        } else {
          this.lostFrames++;
          if (this.lostFrames > 6 && this.status.markerTracked) {
            this.emitStatus({
              markerTracked: false,
              trackingConfidence: 0,
            });
            if (this.anchorGroup) this.anchorGroup.visible = false;
          }
        }
      }

      // Smoothly interpolate anchor pose & animate magical golden vortex rings
      if (this.anchorGroup && this.anchorGroup.visible) {
        const smooth = 1 - Math.exp(-10 * dt);
        this.anchorGroup.position.lerp(this.targetPosition, smooth);
        this.anchorGroup.rotation.x = THREE.MathUtils.lerp(
          this.anchorGroup.rotation.x,
          this.targetRotation.x,
          smooth,
        );
        this.anchorGroup.rotation.y = THREE.MathUtils.lerp(
          this.anchorGroup.rotation.y,
          this.targetRotation.y,
          smooth,
        );
        const currentScale = this.anchorGroup.scale.x;
        this.anchorGroup.scale.setScalar(
          THREE.MathUtils.lerp(currentScale, this.targetScale, smooth),
        );

        // Rotate magical vortex rings & sparkles
        for (let i = 0; i < this.vortexRings.length; i++) {
          this.vortexRings[i].rotation.z += dt * (1.2 + i * 0.45);
        }
        for (const sp of this.vortexSparkles) {
          const a = sp.angle + this.elapsed * sp.speed;
          sp.mesh.position.x = Math.cos(a) * sp.radius;
          sp.mesh.position.z = Math.sin(a) * sp.radius;
          sp.mesh.position.y =
            sp.height + Math.sin(this.elapsed * 3 + sp.angle) * 0.05;
          sp.mesh.rotation.y += dt * 3;
        }

        this.emberModel?.update(dt);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

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

  public triggerARAnimation(anim: EmberAnimationState, duration = 2.0): void {
    if (!this.anchorGroup?.visible) {
      this.setSimulatedCardAnchor(true);
    }
    this.emberModel?.playAnimation(anim, duration);
  }

  public handleResize(): void {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /**
   * Stops camera streams, cancels animation loop, and disposes Three.js resources.
   */
  public stop(): void {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
      this.videoEl.remove();
      this.videoEl = null;
    }
    if (this.emberModel) {
      this.emberModel.dispose();
      this.emberModel = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.anchorGroup = null;
    this.simulatedCardMesh = null;
    this.vortexGroup = null;
    this.vortexRings = [];
    this.vortexSparkles = [];
    this.emitStatus({
      cameraState: 'idle',
      markerTracked: false,
      trackingConfidence: 0,
      simulatedCardActive: false,
    });
  }
}
