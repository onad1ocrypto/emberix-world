import * as THREE from 'three';
import type { CosmeticId, EmberAnimationState } from '../types';

interface ParticleItem {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  isHeart: boolean;
}

/**
 * EMBER — Premium 3D Baby Fire Dragon Character
 *
 * Hierarchical multi-part Three.js model reused in both 3D WORLD and AR WORLD.
 * Features procedural dragon-scale bump/color textures, expressive Pixar-style eyes
 * with dual catchlights and brow ridges, animated smiling jaw with tongue & fangs,
 * curved ribbed horns, translucent head frills, 6 overlapping golden belly scutes,
 * 3-fingered glowing wings, articulated 3-segment tail with multi-layered flame plume,
 * 4 equippable 3D cosmetics, and 3D heart/star reaction particles.
 */
export class EmberModel extends THREE.Group {
  public readonly rootPivot = new THREE.Group();
  public readonly bodyGroup = new THREE.Group();
  public readonly headGroup = new THREE.Group();
  public readonly jawGroup = new THREE.Group();
  public readonly leftWingPivot = new THREE.Group();
  public readonly rightWingPivot = new THREE.Group();
  public readonly tailPivot = new THREE.Group();
  public readonly tailMidPivot = new THREE.Group();
  public readonly tailTipPivot = new THREE.Group();
  public readonly frontLeftLeg = new THREE.Group();
  public readonly frontRightLeg = new THREE.Group();
  public readonly leftForearmPivot = new THREE.Group();
  public readonly rightForearmPivot = new THREE.Group();
  public readonly leftHandPivot = new THREE.Group();
  public readonly rightHandPivot = new THREE.Group();
  public readonly backLeftLeg = new THREE.Group();
  public readonly backRightLeg = new THREE.Group();
  public readonly leftShinPivot = new THREE.Group();
  public readonly rightShinPivot = new THREE.Group();
  public readonly leftFootPivot = new THREE.Group();
  public readonly rightFootPivot = new THREE.Group();

  private leftEyelid!: THREE.Mesh;
  private rightEyelid!: THREE.Mesh;
  private leftBrow!: THREE.Mesh;
  private rightBrow!: THREE.Mesh;
  private leftPupil!: THREE.Mesh;
  private rightPupil!: THREE.Mesh;
  private tailFlameOuter!: THREE.Mesh;
  private tailFlameMid!: THREE.Mesh;
  private tailFlameInner!: THREE.Mesh;
  private sunberryProp!: THREE.Group;
  private smokeRingMesh!: THREE.Mesh;
  private happyMagicRing!: THREE.Mesh;

  // Cosmetic groups
  private foreheadTuftsGroup = new THREE.Group();
  private crownGroup = new THREE.Group();
  private collarGroup = new THREE.Group();
  private scarfGroup = new THREE.Group();
  private auraGroup = new THREE.Group();
  private auraOverheadHalo = new THREE.Group();

  // Animation state
  private currentAnim: EmberAnimationState = 'idle';
  private animTime = 0;
  private oneShotTimer = 0;
  private blinkTimer = 0;
  private nextBlinkIn = 2.8;
  private friendshipScale = 1.0;

  // Pooled 3D reaction particles (hearts + golden stars)
  private particles: ParticleItem[] = [];
  private particleGroup = new THREE.Group();

  // Continuous Magical Fire Embers around EMBER using THREE.Points
  private readonly fireEmberCount = 76;
  private fireEmberPoints!: THREE.Points;
  private fireEmberPositions = new Float32Array(this.fireEmberCount * 3);
  private fireEmberColors = new Float32Array(this.fireEmberCount * 3);
  private fireEmberAngles = new Float32Array(this.fireEmberCount);
  private fireEmberRadii = new Float32Array(this.fireEmberCount);
  private fireEmberProgress = new Float32Array(this.fireEmberCount);
  private fireEmberSpeeds = new Float32Array(this.fireEmberCount);
  private fireEmberIsTail = new Uint8Array(this.fireEmberCount);

  constructor() {
    super();
    this.name = 'EmberDragon';
    this.buildDragonHierarchy();
    this.buildCosmetics();
    this.buildReactionParticles();
    this.buildFireEmberPoints();
    this.setCosmetic('crown');
  }

  private createDragonScaleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Rich Crimson-Red (Merah) gradient with warm ruby-gold undertones
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#f42535');
      grad.addColorStop(0.5, '#dc1e28');
      grad.addColorStop(1, '#99111b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Overlapping dragon scales with gleaming Gold (Emas) rims and ruby centers
      const rows = 14;
      const cols = 14;
      const cellW = 256 / cols;
      const cellH = 256 / rows;
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const x = c * cellW + (r % 2 === 0 ? 0 : cellW * 0.5);
          const y = r * cellH;

          // Deep crimson scale shadow
          ctx.beginPath();
          ctx.arc(x, y - 1, cellW * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 60, 70, 0.22)';
          ctx.fill();

          // Metallic Gold (Emas) scale edge highlight
          ctx.beginPath();
          ctx.arc(x, y, cellW * 0.48, 0.12 * Math.PI, 0.88 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 215, 64, 0.62)';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  private createWingMembraneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Warm sunlit gold at top/knuckle fading to fiery amber-orange and crimson-red at scalloped trailing edge
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.0, '#ffe066');
      grad.addColorStop(0.38, '#ff9f1c');
      grad.addColorStop(0.75, '#f95738');
      grad.addColorStop(1.0, '#d90429');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Subtle glowing inner wing veins
      ctx.strokeStyle = 'rgba(255, 243, 176, 0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(64, 24);
        ctx.quadraticCurveTo(90 + i * 24, 110, 30 + i * 38, 240);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildDragonHierarchy(): void {
    const scaleTex = this.createDragonScaleTexture();
    const wingTex = this.createWingMembraneTexture();

    // Primary Crimson-Red (Merah) Dragon Body Scale Material
    const scaleMat = new THREE.MeshStandardMaterial({
      color: 0xe6192e,
      map: scaleTex,
      emissive: 0x6b0f1a,
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.14,
    });
    // Deep Ruby-Red Armor Accent Material for sculpted body flank plates
    const crimsonArmorMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.18,
      roughness: 0.24,
      metalness: 0.28,
    });
    // Warm Royal Gold (Emas) Belly Material
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xd97706,
      emissiveIntensity: 0.18,
      roughness: 0.22,
      metalness: 0.5,
    });
    // Gleaming Metallic Gold (Emas) Trim Material for body scutes, chest crest & armor rims
    const royalGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffdf00,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.28,
      roughness: 0.16,
      metalness: 0.78,
    });
    const hornMat = new THREE.MeshStandardMaterial({
      color: 0x4e2a1e,
      roughness: 0.24,
      metalness: 0.48,
    });
    const frillMat = new THREE.MeshStandardMaterial({
      color: 0xff5252,
      emissive: 0xd50000,
      emissiveIntensity: 0.25,
      roughness: 0.28,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const wingMembraneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: wingTex,
      emissive: 0xff6d00,
      emissiveIntensity: 0.28,
      roughness: 0.24,
      metalness: 0.1,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
    });
    const mouthInnerMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.5,
    });
    const tongueMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      roughness: 0.35,
    });
    const eyeScleraMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      roughness: 0.1,
      metalness: 0.02,
    });
    const eyeIrisOuterMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
      roughness: 0.08,
      metalness: 0.15,
    });
    const eyeIrisGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.08,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f0714 });
    const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const flameOuterMat = new THREE.MeshBasicMaterial({
      color: 0xff2a2a,
      transparent: true,
      opacity: 0.88,
    });
    const flameMidMat = new THREE.MeshBasicMaterial({
      color: 0xffbf00,
      transparent: true,
      opacity: 0.94,
    });
    const flameInnerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });

    // Soft glowing contact shadow + warm ember ground halo
    const shadowGeo = new THREE.CircleGeometry(0.48, 28);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0c0914,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.y = 0.015;
    this.add(contactShadow);

    // Subtle magical golden ring that pulses during happy/dance states
    this.happyMagicRing = new THREE.Mesh(
      new THREE.RingGeometry(0.44, 0.5, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.happyMagicRing.rotation.x = -Math.PI / 2;
    this.happyMagicRing.position.y = 0.025;
    this.add(this.happyMagicRing);

    this.add(this.rootPivot);
    this.rootPivot.position.y = 0.465;
    this.rootPivot.add(this.bodyGroup);

    // 1. Cute Chubby Pear-Shaped Baby Dino-Dragon Torso (Crimson-Red / Merah & Royal Gold / Emas)
    const torsoGeo = new THREE.SphereGeometry(0.295, 28, 24);
    torsoGeo.scale(1.04, 1.08, 1.08);
    const torsoMesh = new THREE.Mesh(torsoGeo, scaleMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.bodyGroup.add(torsoMesh);

    // Extra chubby lower baby-dino tummy / hip rounding so the silhouette is super cute & gemas
    const lowerTummyGeo = new THREE.SphereGeometry(0.245, 22, 18);
    lowerTummyGeo.scale(1.06, 0.86, 1.04);
    const lowerTummyMesh = new THREE.Mesh(lowerTummyGeo, scaleMat);
    lowerTummyMesh.position.set(0, -0.09, -0.01);
    this.bodyGroup.add(lowerTummyMesh);

    // Short cute baby dino neck bridge
    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.205, 0.16, 16),
      scaleMat,
    );
    neckMesh.position.set(0, 0.23, 0.065);
    neckMesh.rotation.x = 0.2;
    this.bodyGroup.add(neckMesh);

    // Plump Royal Gold Plated Belly Core (Emas)
    const bellyGeo = new THREE.SphereGeometry(0.258, 24, 20);
    bellyGeo.scale(0.82, 1.0, 0.74);
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.position.set(0, -0.02, 0.148);
    this.bodyGroup.add(bellyMesh);

    // 6 Rounded Golden Belly Scute Bands wrapping across the chubby dino tummy
    for (let i = 0; i < 6; i++) {
      const t = (i - 2.5) / 2.5;
      const yPos = -0.165 + i * 0.062;
      const curveFactor = Math.sqrt(Math.max(0.22, 1 - t * t * 0.62));
      const zPos = 0.172 + curveFactor * 0.145;
      const width = 0.225 * curveFactor;

      const scuteBand = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.018, width, 6, 12),
        i % 2 === 0 ? royalGoldMat : bellyMat,
      );
      scuteBand.rotation.z = Math.PI / 2;
      scuteBand.position.set(0, yPos, zPos);
      this.bodyGroup.add(scuteBand);
    }

    // Cute Golden Star-Heart Medallion on upper chest
    const chestMedallion = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.038, 0),
      royalGoldMat,
    );
    chestMedallion.scale.set(1.1, 1.25, 0.55);
    chestMedallion.position.set(0, 0.15, 0.295);
    this.bodyGroup.add(chestMedallion);

    // Cute Rounded Golden & Crimson Dino Back Scales / Dorsal Spines (chubby & friendly!)
    const spineGeo = new THREE.ConeGeometry(0.044, 0.11, 10);
    const spineBaseGeo = new THREE.TorusGeometry(0.038, 0.011, 8, 12);
    for (let i = 0; i < 5; i++) {
      const angle = -0.38 + i * 0.24;
      const sy = Math.cos(angle) * 0.275;
      const sz = -0.23 - i * 0.026;
      const rx = -Math.PI / 2.3 - i * 0.12;

      const spine = new THREE.Mesh(
        spineGeo,
        i % 2 === 0 ? royalGoldMat : crimsonArmorMat,
      );
      spine.position.set(0, sy, sz);
      spine.rotation.x = rx;
      this.bodyGroup.add(spine);

      const spineRing = new THREE.Mesh(spineBaseGeo, royalGoldMat);
      spineRing.position.set(0, sy * 0.92, sz + 0.02);
      spineRing.rotation.x = rx + Math.PI / 2;
      this.bodyGroup.add(spineRing);
    }

    // Cute Golden Spot Scales on the chubby dino flanks
    [-1, 1].forEach((side) => {
      const flankSpot1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 12, 10),
        royalGoldMat,
      );
      flankSpot1.scale.set(0.35, 0.85, 1.0);
      flankSpot1.position.set(side * 0.285, 0.03, -0.02);
      this.bodyGroup.add(flankSpot1);

      const flankSpot2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 12, 10),
        crimsonArmorMat,
      );
      flankSpot2.scale.set(0.35, 0.85, 1.0);
      flankSpot2.position.set(side * 0.278, -0.06, -0.08);
      this.bodyGroup.add(flankSpot2);
    });

    // 2. Adorable Big Baby Dino-Dragon Head, Rosy Cheeks, Short Snout & Happy Smiling Jaw
    this.headGroup.position.set(0, 0.34, 0.115);
    this.headGroup.scale.setScalar(1.1); // Slightly larger baby-proportioned head for extra cuteness!
    this.bodyGroup.add(this.headGroup);

    const craniumGeo = new THREE.SphereGeometry(0.258, 28, 24);
    craniumGeo.scale(1.1, 0.98, 1.04);
    const cranium = new THREE.Mesh(craniumGeo, scaleMat);
    cranium.castShadow = true;
    this.headGroup.add(cranium);

    // Plump adorable baby dino cheeks + Cute Rosy Pink Blush ovals ("cute, gemas dan lucu")
    const cheekBlushMat = new THREE.MeshStandardMaterial({
      color: 0xff6b8b,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.42,
      roughness: 0.35,
    });
    [-1, 1].forEach((side) => {
      const cheekPuff = new THREE.Mesh(
        new THREE.SphereGeometry(0.118, 16, 14),
        scaleMat,
      );
      cheekPuff.scale.set(1.14, 0.86, 0.98);
      cheekPuff.position.set(side * 0.178, -0.052, 0.112);
      this.headGroup.add(cheekPuff);

      const rosyBlush = new THREE.Mesh(
        new THREE.SphereGeometry(0.044, 14, 12),
        cheekBlushMat,
      );
      rosyBlush.scale.set(1.25, 0.68, 0.45);
      rosyBlush.position.set(side * 0.185, -0.032, 0.212);
      rosyBlush.rotation.y = side * 0.45;
      this.headGroup.add(rosyBlush);
    });

    // Cute Rounded Baby Dino Upper Snout
    const snoutGeo = new THREE.SphereGeometry(0.152, 22, 18);
    snoutGeo.scale(1.1, 0.68, 1.12);
    const snout = new THREE.Mesh(snoutGeo, scaleMat);
    snout.position.set(0, -0.042, 0.192);
    this.headGroup.add(snout);

    // Sculpted Nostrils with dark cavities
    const nostrilBumpGeo = new THREE.SphereGeometry(0.032, 12, 12);
    const nostrilHoleGeo = new THREE.SphereGeometry(0.018, 10, 10);
    [-1, 1].forEach((side) => {
      const bump = new THREE.Mesh(nostrilBumpGeo, scaleMat);
      bump.position.set(side * 0.058, -0.005, 0.305);
      const hole = new THREE.Mesh(nostrilHoleGeo, hornMat);
      hole.position.set(side * 0.058, -0.008, 0.326);
      this.headGroup.add(bump, hole);
    });

    // Animated Lower Jaw & Smiling Mouth (with pink tongue + tiny white baby dino teeth)
    this.jawGroup.position.set(0, -0.085, 0.12);
    this.headGroup.add(this.jawGroup);

    const lowerJawGeo = new THREE.SphereGeometry(0.125, 18, 14);
    lowerJawGeo.scale(0.95, 0.52, 1.12);
    const lowerJaw = new THREE.Mesh(lowerJawGeo, bellyMat);
    lowerJaw.position.set(0, -0.015, 0.08);
    this.jawGroup.add(lowerJaw);

    const mouthCavity = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 14, 12),
      mouthInnerMat,
    );
    mouthCavity.scale.set(0.92, 0.35, 0.95);
    mouthCavity.position.set(0, 0.012, 0.09);
    this.jawGroup.add(mouthCavity);

    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 12, 10),
      tongueMat,
    );
    tongue.scale.set(0.9, 0.32, 1.15);
    tongue.position.set(0, 0.018, 0.105);
    this.jawGroup.add(tongue);

    // Cute tiny baby dino fangs on upper snout
    const fangGeo = new THREE.ConeGeometry(0.014, 0.034, 8);
    [-1, 1].forEach((side) => {
      const fang = new THREE.Mesh(fangGeo, eyeScleraMat);
      fang.position.set(side * 0.065, -0.088, 0.265);
      fang.rotation.x = Math.PI;
      this.headGroup.add(fang);
    });

    // Rosy Fin-like Head / Ear Frills
    [-1, 1].forEach((side) => {
      const frillGroup = new THREE.Group();
      frillGroup.position.set(side * 0.23, 0.03, -0.02);
      frillGroup.rotation.y = side * 0.42;
      frillGroup.rotation.z = -side * 0.25;

      const frillShape = new THREE.Shape();
      frillShape.moveTo(0, 0);
      frillShape.quadraticCurveTo(side * 0.12, 0.12, side * 0.19, 0.08);
      frillShape.quadraticCurveTo(side * 0.14, 0.0, side * 0.17, -0.05);
      frillShape.quadraticCurveTo(side * 0.1, -0.08, 0, -0.07);
      frillShape.closePath();

      const frillMesh = new THREE.Mesh(
        new THREE.ShapeGeometry(frillShape),
        frillMat,
      );
      frillGroup.add(frillMesh);

      const cheekSpike = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.078, 8),
        royalGoldMat,
      );
      cheekSpike.position.set(side * 0.03, -0.09, 0.03);
      cheekSpike.rotation.z = -side * 1.3;
      frillGroup.add(cheekSpike);

      this.headGroup.add(frillGroup);
    });

    // Cute Stubby Curved Baby Dino-Dragon Horns with Golden Rings
    [-1, 1].forEach((side) => {
      const hornPivot = new THREE.Group();
      hornPivot.position.set(side * 0.135, 0.185, -0.03);
      hornPivot.rotation.z = -side * 0.4;
      hornPivot.rotation.x = -0.38;

      const hornMain = new THREE.Mesh(
        new THREE.ConeGeometry(0.052, 0.22, 14),
        hornMat,
      );
      hornMain.position.y = 0.1;
      hornPivot.add(hornMain);

      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.045 - r * 0.009, 0.008, 8, 16),
          r === 1 ? royalGoldMat : hornMat,
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.025 + r * 0.045;
        hornPivot.add(ring);
      }
      this.headGroup.add(hornPivot);
    });

    // Golden Flame Forehead Crest (3 cute dino tufts on top of head — hidden when Sunstone Crown is equipped)
    [-0.045, 0, 0.045].forEach((cx, idx) => {
      const h = idx === 1 ? 0.14 : 0.1;
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.042, h, 10),
        idx === 1 ? royalGoldMat : flameOuterMat,
      );
      tuft.position.set(cx, 0.25 + (idx === 1 ? 0.02 : 0), 0.02 - Math.abs(cx));
      tuft.rotation.x = -0.28;
      tuft.rotation.z = -cx * 3.5;
      this.foreheadTuftsGroup.add(tuft);
    });
    this.headGroup.add(this.foreheadTuftsGroup);

    // 3. Large Expressive Baby Eyes + Dual Specular Catchlights + Sculpted Brow Ridges
    const createEye = (side: number) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.118, 0.038, 0.205);
      eyeGroup.rotation.y = side * 0.26;

      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.078, 20, 20),
        eyeScleraMat,
      );
      sclera.scale.set(1.04, 1.18, 0.65);

      const irisOuter = new THREE.Mesh(
        new THREE.SphereGeometry(0.062, 18, 18),
        eyeIrisOuterMat,
      );
      irisOuter.scale.set(1.02, 1.15, 0.55);
      irisOuter.position.z = 0.022;

      const irisGold = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 16, 16),
        eyeIrisGoldMat,
      );
      irisGold.scale.set(0.96, 1.08, 0.52);
      irisGold.position.set(0, -0.004, 0.028);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 16, 16),
        pupilMat,
      );
      pupil.scale.set(0.9, 1.12, 0.45);
      pupil.position.z = 0.039;

      // Primary large specular highlight (makes eyes sparkle cutely!)
      const catchlightMain = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 12),
        catchlightMat,
      );
      catchlightMain.position.set(side * 0.016, 0.026, 0.056);

      // Secondary lower-opposite sparkle highlight
      const catchlightSub = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 10, 10),
        catchlightMat,
      );
      catchlightSub.position.set(-side * 0.018, -0.02, 0.054);

      const eyelidGeo = new THREE.SphereGeometry(
        0.082,
        18,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.55,
      );
      const eyelid = new THREE.Mesh(eyelidGeo, scaleMat);
      eyelid.scale.set(1.05, 1.18, 0.72);
      eyelid.rotation.x = -1.38;

      // Expressive sculpted brow ridge above eye socket
      const brow = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.014, 0.074, 6, 10),
        royalGoldMat,
      );
      brow.rotation.z = Math.PI / 2 - side * 0.22;
      brow.position.set(0, 0.11, 0.024);

      eyeGroup.add(
        sclera,
        irisOuter,
        irisGold,
        pupil,
        catchlightMain,
        catchlightSub,
        eyelid,
        brow,
      );
      this.headGroup.add(eyeGroup);
      return { eyelid, pupil, brow };
    };

    const leftEye = createEye(-1);
    const rightEye = createEye(1);
    this.leftEyelid = leftEye.eyelid;
    this.rightEyelid = rightEye.eyelid;
    this.leftPupil = leftEye.pupil;
    this.rightPupil = rightEye.pupil;
    this.leftBrow = leftEye.brow;
    this.rightBrow = rightEye.brow;

    // 4. Sculpted 3D Baby Dragon Wings with Curved TubeGeometry Bones, Golden Thumb Claw & Cambered Scalloped Membrane
    const buildWing = (side: number, pivot: THREE.Group) => {
      pivot.position.set(side * 0.19, 0.135, -0.095);
      this.bodyGroup.add(pivot);

      const shoulderPt = new THREE.Vector3(0, 0.02, 0);
      const knucklePt = new THREE.Vector3(side * 0.21, 0.23, 0.02);
      const outerTipPt = new THREE.Vector3(side * 0.5, 0.14, -0.05);
      const midFingerTipPt = new THREE.Vector3(side * 0.39, -0.08, -0.06);
      const innerFingerTipPt = new THREE.Vector3(side * 0.22, -0.16, -0.05);
      const bodyTrailPt = new THREE.Vector3(side * 0.04, -0.14, -0.02);

      const shoulderJoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 12, 10),
        scaleMat,
      );
      shoulderJoint.position.copy(shoulderPt);
      pivot.add(shoulderJoint);

      const leadingEdgeCurve = new THREE.CatmullRomCurve3([
        shoulderPt,
        new THREE.Vector3(side * 0.1, 0.15, 0.015),
        knucklePt,
        new THREE.Vector3(side * 0.36, 0.2, -0.02),
        outerTipPt,
      ]);
      const leadingBoneMesh = new THREE.Mesh(
        new THREE.TubeGeometry(leadingEdgeCurve, 20, 0.018, 10, false),
        scaleMat,
      );
      leadingBoneMesh.castShadow = true;
      pivot.add(leadingBoneMesh);

      const knuckleSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 12, 10),
        royalGoldMat,
      );
      knuckleSphere.position.copy(knucklePt);
      pivot.add(knuckleSphere);

      const thumbClaw = new THREE.Mesh(
        new THREE.ConeGeometry(0.016, 0.068, 10),
        royalGoldMat,
      );
      thumbClaw.position.set(
        knucklePt.x + side * 0.014,
        knucklePt.y + 0.034,
        knucklePt.z + 0.005,
      );
      thumbClaw.rotation.z = -side * 0.38;
      pivot.add(thumbClaw);

      const midRibCurve = new THREE.CatmullRomCurve3([
        knucklePt,
        new THREE.Vector3(side * 0.31, 0.05, -0.035),
        midFingerTipPt,
      ]);
      const innerRibCurve = new THREE.CatmullRomCurve3([
        knucklePt,
        new THREE.Vector3(side * 0.21, 0.02, -0.035),
        innerFingerTipPt,
      ]);

      [midRibCurve, innerRibCurve].forEach((curve) => {
        const ribMesh = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 14, 0.01, 8, false),
          royalGoldMat,
        );
        ribMesh.castShadow = true;
        pivot.add(ribMesh);
      });

      [outerTipPt, midFingerTipPt, innerFingerTipPt].forEach((tipPt, idx) => {
        const tipClaw = new THREE.Mesh(
          new THREE.ConeGeometry(0.011, 0.038, 8),
          royalGoldMat,
        );
        tipClaw.position.copy(tipPt);
        tipClaw.rotation.z =
          idx === 0 ? -side * 1.35 : idx === 1 ? -side * 2.2 : Math.PI;
        pivot.add(tipClaw);
      });

      const buildWebSection = (
        origin: THREE.Vector3,
        curveA: THREE.Curve<THREE.Vector3>,
        curveB: THREE.Curve<THREE.Vector3>,
        archAmountZ: number,
      ) => {
        const steps = 10;
        const positions: number[] = [];
        const uvs: number[] = [];

        for (let i = 0; i < steps; i++) {
          const t0 = i / steps;
          const t1 = (i + 1) / steps;

          const pA0 = curveA.getPoint(t0);
          const pA1 = curveA.getPoint(t1);
          const pB0 = curveB.getPoint(t0);
          const pB1 = curveB.getPoint(t1);

          const spanSteps = 6;
          for (let j = 0; j < spanSteps; j++) {
            const s0 = j / spanSteps;
            const s1 = (j + 1) / spanSteps;

            const samplePoint = (t: number, s: number, pA: THREE.Vector3, pB: THREE.Vector3) => {
              const p = new THREE.Vector3().lerpVectors(pA, pB, s);
              const midSpan = Math.sin(s * Math.PI);
              const scallopLift = Math.pow(t, 2.2) * midSpan * 0.044;
              p.lerp(origin, scallopLift * 0.55);
              p.y += scallopLift;
              p.z -= Math.sin(t * Math.PI) * midSpan * archAmountZ;
              return p;
            };

            const v00 = samplePoint(t0, s0, pA0, pB0);
            const v10 = samplePoint(t1, s0, pA1, pB1);
            const v01 = samplePoint(t0, s1, pA0, pB0);
            const v11 = samplePoint(t1, s1, pA1, pB1);

            positions.push(
              v00.x, v00.y, v00.z,
              v10.x, v10.y, v10.z,
              v11.x, v11.y, v11.z,
              v00.x, v00.y, v00.z,
              v11.x, v11.y, v11.z,
              v01.x, v01.y, v01.z,
            );
            uvs.push(
              s0, 1 - t0,
              s0, 1 - t1,
              s1, 1 - t1,
              s0, 1 - t0,
              s1, 1 - t1,
              s1, 1 - t0,
            );
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, wingMembraneMat);
        mesh.castShadow = true;
        pivot.add(mesh);
      };

      const outerLeadingSubCurve = new THREE.CatmullRomCurve3([
        knucklePt,
        new THREE.Vector3(side * 0.36, 0.2, -0.02),
        outerTipPt,
      ]);
      const innerShoulderCurve = new THREE.CatmullRomCurve3([
        knucklePt,
        new THREE.Vector3(side * 0.1, 0.15, 0.015),
        shoulderPt,
        bodyTrailPt,
      ]);

      buildWebSection(knucklePt, outerLeadingSubCurve, midRibCurve, 0.032);
      buildWebSection(knucklePt, midRibCurve, innerRibCurve, 0.036);
      buildWebSection(knucklePt, innerRibCurve, innerShoulderCurve, 0.028);
    };

    buildWing(-1, this.leftWingPivot);
    buildWing(1, this.rightWingPivot);

    // 5A. Cute Chubby Baby Dino Forelimbs & 3-Clawed Dino Paws ("Tangan Dino")
    // Attached on the upper-front chest (like a cute baby T-Rex / Charmander dino) so they are
    // unmistakably Dino forelimbs rather than humanoid arms, while being 100% clearly visible!
    const buildDinoArm = (
      side: number,
      shoulderPivot: THREE.Group,
      forearmPivot: THREE.Group,
      handPivot: THREE.Group,
    ) => {
      shoulderPivot.position.set(side * 0.205, 0.065, 0.15);
      this.bodyGroup.add(shoulderPivot);

      // Plump Rounded Dino Shoulder
      const shoulderBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 14, 12),
        scaleMat,
      );
      shoulderBall.scale.set(1.05, 0.98, 1.08);
      shoulderBall.castShadow = true;
      shoulderPivot.add(shoulderBall);

      // Cute Chubby Upper Dino Arm
      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.048, 0.062, 10, 14),
        scaleMat,
      );
      upperArm.position.set(side * 0.012, -0.042, 0.018);
      upperArm.rotation.z = side * 0.16;
      upperArm.rotation.x = -0.25;
      upperArm.castShadow = true;
      shoulderPivot.add(upperArm);

      // Cute Golden Scale Dimple on outer dino upper arm
      const armSpot = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 10, 8),
        royalGoldMat,
      );
      armSpot.scale.set(0.45, 0.95, 0.95);
      armSpot.position.set(side * 0.052, -0.04, 0.02);
      shoulderPivot.add(armSpot);

      // Articulated Dino Elbow & Chubby Forearm Pivot
      forearmPivot.position.set(side * 0.022, -0.082, 0.036);
      shoulderPivot.add(forearmPivot);

      const elbowJoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 10),
        scaleMat,
      );
      forearmPivot.add(elbowJoint);

      const forearmMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.045, 0.056, 10, 14),
        scaleMat,
      );
      forearmMesh.position.set(0, -0.035, 0.026);
      forearmMesh.rotation.x = -0.55;
      forearmMesh.castShadow = true;
      forearmPivot.add(forearmMesh);

      // Cute Golden Dino Wrist Ring
      const wristRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.044, 0.01, 8, 16),
        royalGoldMat,
      );
      wristRing.position.set(0, -0.058, 0.044);
      wristRing.rotation.x = Math.PI / 2 - 0.55;
      forearmPivot.add(wristRing);

      // Cute Chubby 3-Clawed Dino Paw ("Tangan Dino")
      handPivot.position.set(0, -0.072, 0.058);
      forearmPivot.add(handPivot);

      const pawMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 14, 12),
        scaleMat,
      );
      pawMesh.scale.set(1.16, 0.82, 1.18);
      pawMesh.castShadow = true;
      handPivot.add(pawMesh);

      // Soft Golden Dino Paw Cushion Pad
      const pawGoldPad = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 12, 10),
        bellyMat,
      );
      pawGoldPad.scale.set(0.95, 0.65, 0.9);
      pawGoldPad.position.set(0, -0.016, 0.012);
      handPivot.add(pawGoldPad);

      // 3 Cute Chubby Dino Fingers with Gleaming Curved Golden Claws
      const dinoFingerOffsets = [
        { fx: -0.034, fz: 0.042, yaw: 0.32 },
        { fx: 0, fz: 0.05, yaw: 0 },
        { fx: 0.034, fz: 0.042, yaw: -0.32 },
      ];
      for (const f of dinoFingerOffsets) {
        const fingerGroup = new THREE.Group();
        fingerGroup.position.set(f.fx, -0.008, f.fz);
        fingerGroup.rotation.y = f.yaw;

        const digitBulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 10, 8),
          scaleMat,
        );
        digitBulb.scale.set(0.95, 0.85, 1.3);
        digitBulb.position.set(0, -0.004, 0.01);

        const dinoClaw = new THREE.Mesh(
          new THREE.ConeGeometry(0.016, 0.048, 8),
          royalGoldMat,
        );
        dinoClaw.rotation.x = Math.PI / 1.85;
        dinoClaw.position.set(0, -0.014, 0.038);

        fingerGroup.add(digitBulb, dinoClaw);
        handPivot.add(fingerGroup);
      }
    };

    buildDinoArm(-1, this.frontLeftLeg, this.leftForearmPivot, this.leftHandPivot);
    buildDinoArm(1, this.frontRightLeg, this.rightForearmPivot, this.rightHandPivot);

    // 5B. Cute Chubby Drumstick Baby Dino Hind Legs & 3-Toed Dino Feet ("Kaki Dino")
    // Plump dinosaur haunches on the lower sides of the body with clearly visible knees, shins & 3-toed feet!
    const buildDinoHindLeg = (
      side: number,
      hipPivot: THREE.Group,
      shinPivot: THREE.Group,
      footPivot: THREE.Group,
    ) => {
      hipPivot.position.set(side * 0.195, -0.165, 0.01);
      this.bodyGroup.add(hipPivot);

      // Plump Drumstick Baby Dino Thigh / Haunch
      const thighGeo = new THREE.SphereGeometry(0.108, 18, 16);
      thighGeo.scale(0.95, 1.2, 1.16);
      const thighMesh = new THREE.Mesh(thighGeo, scaleMat);
      thighMesh.position.set(side * 0.018, -0.052, 0.012);
      thighMesh.castShadow = true;
      hipPivot.add(thighMesh);

      // Cute Golden & Crimson Dino Scale Spots on outer thigh
      const thighSpot = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 12, 10),
        crimsonArmorMat,
      );
      thighSpot.scale.set(0.42, 0.95, 0.95);
      thighSpot.position.set(side * 0.095, -0.045, 0.015);
      hipPivot.add(thighSpot);

      const thighGoldDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 10, 8),
        royalGoldMat,
      );
      thighGoldDot.scale.set(0.45, 0.9, 0.9);
      thighGoldDot.position.set(side * 0.106, -0.045, 0.015);
      hipPivot.add(thighGoldDot);

      // Articulated Dino Knee & Chubby Shin Pivot
      shinPivot.position.set(side * 0.022, -0.12, 0.022);
      hipPivot.add(shinPivot);

      // Cute Rounded Golden Knee Scale
      const kneeScale = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 12, 10),
        royalGoldMat,
      );
      kneeScale.scale.set(1.1, 0.95, 0.65);
      kneeScale.position.set(0, 0.008, 0.068);
      shinPivot.add(kneeScale);

      // Chubby Lower Dino Leg / Shin
      const shinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.082, 0.112, 14),
        scaleMat,
      );
      shinMesh.position.set(0, -0.052, -0.005);
      shinMesh.castShadow = true;
      shinPivot.add(shinMesh);

      // Gleaming Golden Dino Ankle Ring above the Foot
      const ankletRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.078, 0.015, 10, 20),
        royalGoldMat,
      );
      ankletRing.rotation.x = Math.PI / 2;
      ankletRing.position.set(0, -0.094, 0);
      shinPivot.add(ankletRing);

      // Wide, Adorable 3-Toed Baby Dino Foot ("Kaki Dino")
      footPivot.position.set(0, -0.112, 0.012);
      shinPivot.add(footPivot);

      const footArch = new THREE.Mesh(
        new THREE.SphereGeometry(0.088, 16, 12),
        scaleMat,
      );
      footArch.scale.set(1.18, 0.56, 1.38);
      footArch.position.set(0, -0.008, 0.034);
      footArch.castShadow = true;
      footPivot.add(footArch);

      // Golden Dino Foot Sole Cushion
      const solePad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.082, 0.018, 14),
        bellyMat,
      );
      solePad.scale.set(1.08, 1.0, 1.25);
      solePad.position.set(0, -0.038, 0.034);
      footPivot.add(solePad);

      // 3 Plump Forward Dino Toes + Large Curved Golden Claws
      const toeConfigs = [
        { tx: -0.056, tz: 0.098, yaw: 0.28 },
        { tx: 0, tz: 0.114, yaw: 0 },
        { tx: 0.056, tz: 0.098, yaw: -0.28 },
      ];
      for (const tCfg of toeConfigs) {
        const toeGroup = new THREE.Group();
        toeGroup.position.set(tCfg.tx, -0.018, tCfg.tz);
        toeGroup.rotation.y = tCfg.yaw;

        const toeBulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 10, 8),
          scaleMat,
        );
        toeBulb.scale.set(0.98, 0.84, 1.35);

        const talonClaw = new THREE.Mesh(
          new THREE.ConeGeometry(0.024, 0.066, 8),
          royalGoldMat,
        );
        talonClaw.rotation.x = Math.PI / 2.08;
        talonClaw.position.set(0, -0.004, 0.05);

        toeGroup.add(toeBulb, talonClaw);
        footPivot.add(toeGroup);
      }
    };

    buildDinoHindLeg(-1, this.backLeftLeg, this.leftShinPivot, this.leftFootPivot);
    buildDinoHindLeg(1, this.backRightLeg, this.rightShinPivot, this.rightFootPivot);

    // 6. Smooth, Continuous Tapered Baby Dinosaur Tail ("ekor dino belum sesuai , itu seperti ekor ikan. coba perbaiki ekor dino")
    // Thick at the pelvis/rump and tapering smoothly through 3 articulated conical segments to a single
    // sleek pointed dinosaur tail tip with cute dorsal dino spines along the top ridge and golden belly scutes underneath.
    this.tailPivot.position.set(0, -0.135, -0.17);
    this.bodyGroup.add(this.tailPivot);

    // Seamless rump-to-tail muscular dinosaur hip transition
    const tailRumpBlend = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 18, 14),
      scaleMat,
    );
    tailRumpBlend.scale.set(0.96, 0.94, 1.25);
    tailRumpBlend.position.set(0, 0.004, 0.01);
    tailRumpBlend.castShadow = true;
    this.tailPivot.add(tailRumpBlend);

    // Segment 1: Thick Muscular Dino Tail Base (tapers smoothly from r=0.136 to r=0.096 along -Z)
    const seg1Cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.096, 0.136, 0.22, 18),
      scaleMat,
    );
    seg1Cone.rotation.x = Math.PI / 2 - 0.04;
    seg1Cone.position.set(0, -0.002, -0.095);
    seg1Cone.scale.set(0.94, 1.0, 0.98);
    seg1Cone.castShadow = true;
    this.tailPivot.add(seg1Cone);

    // Golden-Cream Dino Underbelly Scute Band along the underside of Segment 1
    const seg1Belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.098, 0.21, 14),
      bellyMat,
    );
    seg1Belly.rotation.x = Math.PI / 2 - 0.07;
    seg1Belly.position.set(0, -0.046, -0.092);
    seg1Belly.scale.set(0.88, 1.0, 0.48);
    this.tailPivot.add(seg1Belly);

    // Cute Dinosaur Dorsal Spines / Plates along the top ridge of Segment 1
    [
      { y: 0.125, z: -0.04, r: 0.03, h: 0.078, mat: royalGoldMat },
      { y: 0.112, z: -0.115, r: 0.027, h: 0.07, mat: crimsonArmorMat },
      { y: 0.098, z: -0.18, r: 0.024, h: 0.062, mat: royalGoldMat },
    ].forEach((sp) => {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(sp.r, sp.h, 8),
        sp.mat,
      );
      spine.scale.set(0.62, 1.0, 1.25); // Authentic laterally-flattened dinosaur dorsal plate/spine!
      spine.position.set(0, sp.y, sp.z);
      spine.rotation.x = -0.26;
      spine.castShadow = true;
      this.tailPivot.add(spine);
    });

    // Segment 2: Mid-Tail Dino Taper (tapers smoothly from r=0.096 to r=0.056 along -Z)
    this.tailMidPivot.position.set(0, -0.006, -0.2);
    this.tailPivot.add(this.tailMidPivot);

    // Seamless spherical joint bridge at (0,0,0) so wagging never creates a gap
    const midJointSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 16, 12),
      scaleMat,
    );
    midJointSphere.scale.set(0.93, 0.96, 1.15);
    midJointSphere.castShadow = true;
    this.tailMidPivot.add(midJointSphere);

    const seg2Cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.095, 0.22, 16),
      scaleMat,
    );
    seg2Cone.rotation.x = Math.PI / 2 + 0.05;
    seg2Cone.position.set(0, 0.006, -0.105);
    seg2Cone.scale.set(0.93, 1.0, 0.98);
    seg2Cone.castShadow = true;
    this.tailMidPivot.add(seg2Cone);

    // Golden-Cream Dino Underbelly Scute Band underneath Segment 2
    const seg2Belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.066, 0.2, 12),
      bellyMat,
    );
    seg2Belly.rotation.x = Math.PI / 2 + 0.08;
    seg2Belly.position.set(0, -0.026, -0.1);
    seg2Belly.scale.set(0.85, 1.0, 0.45);
    this.tailMidPivot.add(seg2Belly);

    // Cute Dinosaur Dorsal Spines along the top ridge of Segment 2
    [
      { y: 0.092, z: -0.055, r: 0.022, h: 0.056, mat: crimsonArmorMat },
      { y: 0.076, z: -0.135, r: 0.019, h: 0.048, mat: royalGoldMat },
    ].forEach((sp) => {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(sp.r, sp.h, 8),
        sp.mat,
      );
      spine.scale.set(0.6, 1.0, 1.22);
      spine.position.set(0, sp.y, sp.z);
      spine.rotation.x = -0.22;
      spine.castShadow = true;
      this.tailMidPivot.add(spine);
    });

    // Segment 3: Sleek Pointed Dinosaur Tail Tip (tapers to a single natural dino point — NO fish fins!)
    this.tailTipPivot.position.set(0, 0.012, -0.205);
    this.tailMidPivot.add(this.tailTipPivot);

    const tipJointSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 14, 10),
      scaleMat,
    );
    tipJointSphere.scale.set(0.92, 0.95, 1.15);
    tipJointSphere.castShadow = true;
    this.tailTipPivot.add(tipJointSphere);

    // Main pointed dinosaur tail cone tapering smoothly down to a sleek tip
    const tipDinoCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.24, 16),
      scaleMat,
    );
    tipDinoCone.rotation.x = -Math.PI / 2 + 0.1;
    tipDinoCone.position.set(0, 0.012, -0.115);
    tipDinoCone.scale.set(0.92, 1.0, 0.96);
    tipDinoCone.castShadow = true;
    this.tailTipPivot.add(tipDinoCone);

    // Golden-Cream Dino Underbelly Taper under Segment 3
    const seg3Belly = new THREE.Mesh(
      new THREE.ConeGeometry(0.036, 0.18, 12),
      bellyMat,
    );
    seg3Belly.rotation.x = -Math.PI / 2 + 0.13;
    seg3Belly.position.set(0, -0.008, -0.09);
    seg3Belly.scale.set(0.82, 1.0, 0.42);
    this.tailTipPivot.add(seg3Belly);

    // Small Dinosaur Dorsal Spines near the pointed tip
    [
      { y: 0.056, z: -0.045, r: 0.016, h: 0.04, mat: crimsonArmorMat },
      { y: 0.044, z: -0.115, r: 0.013, h: 0.032, mat: royalGoldMat },
    ].forEach((sp) => {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(sp.r, sp.h, 8),
        sp.mat,
      );
      spine.scale.set(0.58, 1.0, 1.2);
      spine.position.set(0, sp.y, sp.z);
      spine.rotation.x = -0.18;
      this.tailTipPivot.add(spine);
    });

    // Sleek inline golden-ember dino tail-point cap (hugs the pointed dino tip with zero side fins)
    this.tailFlameOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.022, 0.075, 12),
      royalGoldMat,
    );
    this.tailFlameOuter.rotation.x = -Math.PI / 2 + 0.1;
    this.tailFlameOuter.position.set(0, 0.022, -0.22);

    this.tailFlameMid = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, 0.05, 10),
      flameMidMat,
    );
    this.tailFlameMid.position.set(0, 0.01, 0);
    this.tailFlameOuter.add(this.tailFlameMid);

    this.tailFlameInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.009, 0.032, 8),
      flameInnerMat,
    );
    this.tailFlameInner.position.set(0, 0.014, 0);
    this.tailFlameOuter.add(this.tailFlameInner);

    this.tailTipPivot.add(this.tailFlameOuter);

    // 7. Interactive Props for Eating & Surprised animations
    this.sunberryProp = new THREE.Group();
    const berryMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xff1744,
        emissive: 0xff6d00,
        emissiveIntensity: 0.45,
        roughness: 0.18,
      }),
    );
    const berryLeaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.038, 0.065, 6),
      new THREE.MeshStandardMaterial({ color: 0x00e676, roughness: 0.4 }),
    );
    berryLeaf.position.y = 0.08;
    this.sunberryProp.add(berryMesh, berryLeaf);
    this.sunberryProp.position.set(0, -0.02, 0.35);
    this.sunberryProp.visible = false;
    this.bodyGroup.add(this.sunberryProp);

    this.smokeRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.018, 10, 22),
      new THREE.MeshBasicMaterial({
        color: 0xffd54f,
        transparent: true,
        opacity: 0.85,
      }),
    );
    this.smokeRingMesh.visible = false;
    this.headGroup.add(this.smokeRingMesh);
  }

  private buildCosmetics(): void {
    // 1. Sunstone Crown — Royal golden diadem perched prominently atop EMBER's head
    this.crownGroup.position.set(0, 0.265, 0.025);
    this.crownGroup.rotation.x = -0.08;
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xd97706,
      emissiveIntensity: 0.38,
      roughness: 0.14,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });
    const velvetMat = new THREE.MeshStandardMaterial({
      color: 0x9f1239,
      emissive: 0x4c0519,
      emissiveIntensity: 0.25,
      roughness: 0.55,
    });
    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xff1744,
      emissiveIntensity: 0.78,
      roughness: 0.08,
      metalness: 0.2,
    });
    const sapphireMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.1,
    });

    const baseRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.132, 0.022, 14, 32),
      goldMat,
    );
    baseRim.rotation.x = Math.PI / 2;
    baseRim.position.y = -0.022;
    this.crownGroup.add(baseRim);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.148, 0.128, 0.082, 24, 1, false),
      goldMat,
    );
    this.crownGroup.add(band);

    const velvetCushion = new THREE.Mesh(
      new THREE.SphereGeometry(0.118, 20, 16),
      velvetMat,
    );
    velvetCushion.scale.set(1.0, 0.62, 1.0);
    velvetCushion.position.y = 0.025;
    this.crownGroup.add(velvetCushion);

    const spikeCount = 6;
    for (let i = 0; i < spikeCount; i++) {
      const a = (i / spikeCount) * Math.PI * 2;
      const point = new THREE.Mesh(
        new THREE.ConeGeometry(0.036, 0.105, 8),
        goldMat,
      );
      point.position.set(Math.sin(a) * 0.136, 0.078, Math.cos(a) * 0.136);
      point.rotation.z = -Math.sin(a) * 0.14;
      point.rotation.x = Math.cos(a) * 0.14;
      this.crownGroup.add(point);

      const pearl = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 12),
        i % 2 === 0 ? rubyMat : goldMat,
      );
      pearl.position.set(Math.sin(a) * 0.148, 0.132, Math.cos(a) * 0.148);
      this.crownGroup.add(pearl);
    }

    // Center Sunstone Ruby & side Sapphires on front of crown
    const centerRuby = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.052, 0),
      rubyMat,
    );
    centerRuby.scale.set(0.95, 1.2, 0.65);
    centerRuby.position.set(0, 0.015, 0.148);
    this.crownGroup.add(centerRuby);

    [-1, 1].forEach((side) => {
      const sideGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.034, 0),
        sapphireMat,
      );
      sideGem.position.set(side * 0.105, 0.01, 0.098);
      this.crownGroup.add(sideGem);
    });
    this.headGroup.add(this.crownGroup);

    // 2. Runic Star Collar — Arcane sapphire-obsidian & gold torc outside EMBER's 0.31m torso with 360° glowing cyan starlight crystals & floating shoulder runes
    this.collarGroup.position.set(0, 0.165, 0.035);
    this.collarGroup.rotation.x = 0.18;
    const collarObsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.85,
    });
    const manaGemMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.1,
      roughness: 0.06,
      metalness: 0.2,
    });

    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.305, 0.046, 18, 40),
      collarObsidianMat,
    );
    collarRing.rotation.x = Math.PI / 2;
    this.collarGroup.add(collarRing);

    // Dual golden trim rings wrapping outside collar
    [-0.028, 0.028].forEach((offsetY) => {
      const goldTrimRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.318, 0.016, 14, 40),
        goldMat,
      );
      goldTrimRing.rotation.x = Math.PI / 2;
      goldTrimRing.position.y = offsetY;
      this.collarGroup.add(goldTrimRing);
    });

    // Golden bezel & large cyan Starlight Mana Crystal Pendant on front chest
    const pendantBezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.078, 0.018, 12, 24),
      goldMat,
    );
    pendantBezel.position.set(0, -0.055, 0.345);
    this.collarGroup.add(pendantBezel);

    const manaGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.088, 0),
      manaGemMat,
    );
    manaGem.scale.set(0.9, 1.28, 0.7);
    manaGem.position.set(0, -0.055, 0.36);
    this.collarGroup.add(manaGem);

    // 8 glowing cyan runic crystals spaced 360° around the collar + 2 large floating shoulder rune crystals
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const runeStud = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.048, 0),
        manaGemMat,
      );
      runeStud.position.set(
        Math.sin(angle) * 0.345,
        0,
        Math.cos(angle) * 0.345,
      );
      this.collarGroup.add(runeStud);
    }
    [-1, 1].forEach((side) => {
      const shoulderCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.078, 0),
        manaGemMat,
      );
      shoulderCrystal.scale.set(0.8, 1.45, 0.8);
      shoulderCrystal.position.set(side * 0.39, 0.06, 0.06);
      shoulderCrystal.rotation.z = -side * 0.35;
      this.collarGroup.add(shoulderCrystal);
    });
    this.bodyGroup.add(this.collarGroup);

    // 3. Emberweave Scarf — Thick cozy hand-knitted Royal Indigo-Teal, Warm Cream & Gold winter scarf wrapped outside EMBER's 0.31m torso with flowing tails on front & sides
    this.scarfGroup.position.set(0, 0.16, 0.035);
    const scarfMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.32,
      roughness: 0.52,
      metalness: 0.08,
    });
    const scarfGoldStripeMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.42,
      roughness: 0.32,
      metalness: 0.35,
    });

    const scarfTorusLower = new THREE.Mesh(
      new THREE.TorusGeometry(0.312, 0.068, 20, 40),
      scarfMat,
    );
    scarfTorusLower.rotation.x = Math.PI / 2 + 0.18;
    this.scarfGroup.add(scarfTorusLower);

    const scarfTorusUpper = new THREE.Mesh(
      new THREE.TorusGeometry(0.295, 0.056, 18, 36),
      scarfMat,
    );
    scarfTorusUpper.rotation.x = Math.PI / 2 + 0.15;
    scarfTorusUpper.position.set(0, 0.048, 0.01);
    this.scarfGroup.add(scarfTorusUpper);

    const scarfGoldBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.332, 0.026, 14, 40),
      scarfGoldStripeMat,
    );
    scarfGoldBand.rotation.x = Math.PI / 2 + 0.18;
    scarfGoldBand.position.set(0, 0.015, 0.005);
    this.scarfGroup.add(scarfGoldBand);

    // Cozy oversized scarf knots & flowing tails on both front-right and side-left so it's unmistakable from every camera angle
    [-1, 1].forEach((side) => {
      const scarfKnot = new THREE.Mesh(
        new THREE.SphereGeometry(0.088, 16, 14),
        scarfMat,
      );
      scarfKnot.scale.set(1.15, 0.95, 0.95);
      scarfKnot.position.set(side * 0.24, -0.02, 0.24);
      this.scarfGroup.add(scarfKnot);

      const scarfTailMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.125, 0.34, 0.055),
        scarfMat,
      );
      scarfTailMain.position.set(side * 0.27, -0.175, 0.24);
      scarfTailMain.rotation.z = -side * 0.22;
      scarfTailMain.rotation.y = side * 0.55;
      this.scarfGroup.add(scarfTailMain);

      const scarfTailStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.132, 0.045, 0.062),
        scarfGoldStripeMat,
      );
      scarfTailStripe.position.set(side * 0.295, -0.275, 0.24);
      scarfTailStripe.rotation.z = -side * 0.22;
      scarfTailStripe.rotation.y = side * 0.55;
      this.scarfGroup.add(scarfTailStripe);
    });
    this.bodyGroup.add(this.scarfGroup);

    // 4. Solar Halo Aura — Intersecting celestial golden & violet rings + overhead solar halo + 8 large orbiting star crystals
    this.auraGroup.position.set(0, 0.16, 0);
    const solarGoldRingMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.1,
      metalness: 0.5,
    });
    const celestialCyanMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      roughness: 0.1,
      metalness: 0.4,
    });

    const outerOrbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.016, 12, 48),
      solarGoldRingMat,
    );
    outerOrbitRing.rotation.x = Math.PI / 2 + 0.28;
    outerOrbitRing.rotation.y = 0.22;
    this.auraGroup.add(outerOrbitRing);

    const innerOrbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.013, 12, 48),
      celestialCyanMat,
    );
    innerOrbitRing.rotation.x = Math.PI / 2 - 0.32;
    innerOrbitRing.rotation.z = -0.26;
    this.auraGroup.add(innerOrbitRing);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(i % 2 === 0 ? 0.068 : 0.052, 0),
        i % 2 === 0 ? solarGoldRingMat : celestialCyanMat,
      );
      star.position.set(
        Math.cos(a) * 0.56,
        Math.sin(i * 1.5) * 0.14,
        Math.sin(a) * 0.56,
      );
      this.auraGroup.add(star);
    }
    this.bodyGroup.add(this.auraGroup);

    // Overhead floating Solar Halo above EMBER's head
    this.auraOverheadHalo.position.set(0, 0.44, -0.02);
    const overheadHaloTorus = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.022, 14, 36),
      solarGoldRingMat,
    );
    overheadHaloTorus.rotation.x = Math.PI / 2;
    this.auraOverheadHalo.add(overheadHaloTorus);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const raySpike = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.036, 0),
        solarGoldRingMat,
      );
      raySpike.position.set(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24);
      this.auraOverheadHalo.add(raySpike);
    }
    this.headGroup.add(this.auraOverheadHalo);
  }

  private createHeartGeometry(): THREE.BufferGeometry {
    const x = 0;
    const y = 0;
    const heartShape = new THREE.Shape();
    heartShape.moveTo(x, y + 0.025);
    heartShape.bezierCurveTo(x, y + 0.025, x - 0.02, y, x - 0.05, y);
    heartShape.bezierCurveTo(x - 0.1, y, x - 0.1, y + 0.06, x - 0.1, y + 0.06);
    heartShape.bezierCurveTo(
      x - 0.1,
      y + 0.095,
      x - 0.06,
      y + 0.13,
      x,
      y + 0.16,
    );
    heartShape.bezierCurveTo(
      x + 0.06,
      y + 0.13,
      x + 0.1,
      y + 0.095,
      x + 0.1,
      y + 0.06,
    );
    heartShape.bezierCurveTo(x + 0.1, y + 0.06, x + 0.1, y, x + 0.05, y);
    heartShape.bezierCurveTo(x + 0.02, y, x, y + 0.025, x, y + 0.025);

    const geo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.008,
      bevelThickness: 0.008,
    });
    geo.center();
    geo.rotateZ(Math.PI);
    return geo;
  }

  private buildReactionParticles(): void {
    this.add(this.particleGroup);
    const starGeo = new THREE.OctahedronGeometry(0.042, 0);
    const heartGeo = this.createHeartGeometry();

    for (let i = 0; i < 20; i++) {
      const isHeart = i % 2 === 0;
      const mat = new THREE.MeshBasicMaterial({
        color: isHeart ? 0xfb7185 : 0xfbbf24,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(isHeart ? heartGeo : starGeo, mat);
      mesh.visible = false;
      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1.1,
        active: false,
        isHeart,
      });
    }
  }

  private createEmberParticleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const cx = 32;
      const cy = 32;
      // Glowing incandescent ember core with soft fiery falloff
      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 30);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.28, 'rgba(255, 240, 150, 0.95)');
      grad.addColorStop(0.62, 'rgba(255, 120, 30, 0.52)');
      grad.addColorStop(1.0, 'rgba(220, 20, 20, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      // Subtle 4-point spark flare
      ctx.fillStyle = 'rgba(255, 255, 240, 0.92)';
      ctx.beginPath();
      ctx.moveTo(cx, 5);
      ctx.quadraticCurveTo(cx + 2.5, cy - 2.5, 59, cy);
      ctx.quadraticCurveTo(cx + 2.5, cy + 2.5, cx, 59);
      ctx.quadraticCurveTo(cx - 2.5, cy + 2.5, 5, cy);
      ctx.quadraticCurveTo(cx - 2.5, cy - 2.5, cx, 5);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Builds a THREE.Points particle system that emits glowing crimson, orange, and
   * royal-gold fire embers swirling around EMBER's body and rising from the tail flame.
   */
  private buildFireEmberPoints(): void {
    const count = this.fireEmberCount;
    for (let i = 0; i < count; i++) {
      const isTail = i < 26 ? 1 : 0;
      this.fireEmberIsTail[i] = isTail;
      this.fireEmberAngles[i] = (i / count) * Math.PI * 2 * 3.0;
      this.fireEmberRadii[i] = isTail
        ? 0.04 + (i % 5) * 0.025
        : 0.28 + (i % 7) * 0.042;
      this.fireEmberProgress[i] = (i * 0.37) % 1.0;
      this.fireEmberSpeeds[i] = 0.42 + (i % 6) * 0.11;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.fireEmberPositions, 3),
    );
    geo.setAttribute(
      'color',
      new THREE.BufferAttribute(this.fireEmberColors, 3),
    );

    const mat = new THREE.PointsMaterial({
      size: 0.086,
      map: this.createEmberParticleTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.fireEmberPoints = new THREE.Points(geo, mat);
    this.fireEmberPoints.name = 'EmberMagicalFirePoints';
    this.fireEmberPoints.frustumCulled = false;
    // Allow pointer raycasts to pass right through the particle cloud to hit EMBER's body
    this.fireEmberPoints.raycast = () => {};
    this.add(this.fireEmberPoints);
    this.updateFireEmberPoints(0.016);
  }

  private updateFireEmberPoints(dt: number): void {
    if (!this.fireEmberPoints) return;
    const isExcited =
      this.currentAnim === 'happy' ||
      this.currentAnim === 'dancing' ||
      this.currentAnim === 'jump' ||
      this.currentAnim === 'run';
    const isSleeping = this.currentAnim === 'sleeping';
    const speedMult = isSleeping ? 0.45 : isExcited ? 1.65 : 1.0;
    const radiusScale = 0.92 + (this.friendshipScale - 0.85) * 0.35;

    // Approximate tail flame tip position in EmberModel space
    const tailSwayX = Math.sin(this.animTime * 2.6) * 0.14;
    const tailTipY = this.rootPivot.position.y + 0.04;
    const tailTipZ = -0.56;

    for (let i = 0; i < this.fireEmberCount; i++) {
      let prog =
        this.fireEmberProgress[i] +
        dt * this.fireEmberSpeeds[i] * speedMult;
      if (prog >= 1.0) {
        prog -= Math.floor(prog);
      }
      this.fireEmberProgress[i] = prog;

      const idx3 = i * 3;
      const angle =
        this.fireEmberAngles[i] +
        this.animTime * (this.fireEmberIsTail[i] ? 3.2 : 1.85) +
        prog * 2.4;

      if (this.fireEmberIsTail[i] === 1) {
        // Rising fiery sparks from the tail flame plume
        const spread = this.fireEmberRadii[i] * (0.5 + prog * 1.6);
        this.fireEmberPositions[idx3] =
          tailSwayX + Math.cos(angle) * spread;
        this.fireEmberPositions[idx3 + 1] = tailTipY + prog * 0.58;
        this.fireEmberPositions[idx3 + 2] =
          tailTipZ + Math.sin(angle) * spread;
      } else {
        // Swirling magical fire embers orbiting EMBER's crimson & gold body flanks
        const r =
          (this.fireEmberRadii[i] + 0.06) *
          radiusScale *
          (1.0 + Math.sin(prog * Math.PI) * 0.16);
        let px = Math.cos(angle) * r;
        let pz = Math.sin(angle) * r;
        // Keep the direct front camera-to-face line clear so eyes & belly stay crisp
        if (pz > 0.18 && Math.abs(px) < 0.28) {
          px = (px >= 0 ? 1 : -1) * 0.32;
        }
        this.fireEmberPositions[idx3] = px;
        this.fireEmberPositions[idx3 + 1] =
          0.08 + prog * 0.86 + Math.sin(angle * 2.0) * 0.04;
        this.fireEmberPositions[idx3 + 2] = pz;
      }

      const fade = Math.sin(prog * Math.PI);
      const shimmer = 0.78 + 0.22 * Math.sin(this.animTime * 9.0 + i * 1.7);
      const intensity = fade * shimmer;

      const rCol = 1.0 * intensity;
      const gCol = Math.max(0.14, 0.95 - prog * 0.78) * intensity;
      const bCol = Math.max(0.05, (1.0 - prog * 1.35) * 0.42) * intensity;

      this.fireEmberColors[idx3] = rCol;
      this.fireEmberColors[idx3 + 1] = gCol;
      this.fireEmberColors[idx3 + 2] = bCol;
    }

    const geo = this.fireEmberPoints.geometry;
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  public setCosmetic(cosmeticId: CosmeticId): void {
    this.crownGroup.visible = cosmeticId === 'crown';
    this.foreheadTuftsGroup.visible = cosmeticId !== 'crown';
    this.collarGroup.visible = cosmeticId === 'collar';
    this.scarfGroup.visible = cosmeticId === 'scarf';
    this.auraGroup.visible = cosmeticId === 'flame_aura';
    this.auraOverheadHalo.visible = cosmeticId === 'flame_aura';
  }

  public setFriendshipLevel(friendship: number): void {
    this.friendshipScale =
      0.85 + (Math.min(100, Math.max(0, friendship)) / 100) * 0.55;
  }

  public getAnimationState(): EmberAnimationState {
    return this.currentAnim;
  }

  public playAnimation(
    state: EmberAnimationState,
    durationSeconds = 0,
  ): void {
    if (this.currentAnim !== state) {
      this.currentAnim = state;
      this.animTime = 0;
    }
    if (durationSeconds > 0) {
      this.oneShotTimer = durationSeconds;
      this.spawnReactionBurst(state);
    }
  }

  public spawnReactionBurst(state: EmberAnimationState): void {
    const primaryColor =
      state === 'happy'
        ? 0xff4081
        : state === 'eating'
          ? 0xffab00
          : state === 'sleeping'
            ? 0x60a5fa
            : state === 'dancing'
              ? 0xc084fc
              : 0xfde047;

    let spawned = 0;
    for (const p of this.particles) {
      if (spawned >= 12) break;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.85 + Math.random() * 0.5;
      p.mesh.visible = true;
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(
        p.isHeart && state === 'happy' ? 0xf43f5e : primaryColor,
      );
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      const side = spawned % 2 === 0 ? -1 : 1;
      const spreadX = side * (0.28 + (spawned % 3) * 0.09 + Math.random() * 0.06);
      const spreadY = 0.52 + (spawned % 4) * 0.11 + Math.random() * 0.08;
      const spreadZ = (Math.random() - 0.5) * 0.16;
      p.mesh.position.set(spreadX, spreadY, spreadZ);
      p.velocity.set(
        side * (0.14 + Math.random() * 0.16),
        0.55 + Math.random() * 0.45,
        (Math.random() - 0.5) * 0.15,
      );
      spawned++;
    }
  }

  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.05);
    this.animTime += clampedDt;

    if (this.oneShotTimer > 0) {
      this.oneShotTimer -= clampedDt;
      if (this.oneShotTimer <= 0 && this.currentAnim !== 'sleeping') {
        this.currentAnim = 'idle';
        this.animTime = 0;
      }
    }

    // Update orbiting aura if visible
    if (this.auraGroup.visible) {
      this.auraGroup.rotation.y += clampedDt * 1.8;
      this.auraOverheadHalo.rotation.y -= clampedDt * 2.2;
      this.auraOverheadHalo.position.y =
        0.44 + Math.sin(this.animTime * 4.0) * 0.025;
    }

    // Update reaction particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += clampedDt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.addScaledVector(p.velocity, clampedDt);
      p.mesh.rotation.y += clampedDt * 2.4;
      const ratio = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar((p.isHeart ? 0.34 : 0.42) + ratio * 0.34);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
    }

    // Update THREE.Points magical fire embers around EMBER
    this.updateFireEmberPoints(clampedDt);

    // Flickering multi-layered tail flame scaled by Friendship
    const flamePulse =
      (1 + Math.sin(this.animTime * 15) * 0.15) * this.friendshipScale;
    this.tailFlameOuter.scale.set(
      flamePulse,
      flamePulse * (this.currentAnim === 'sleeping' ? 0.55 : 1.15),
      flamePulse,
    );
    this.tailFlameMid.scale.setScalar(
      0.92 + Math.cos(this.animTime * 21) * 0.12,
    );

    // Pulse ground magic ring during happy / dancing states
    const ringMat = this.happyMagicRing.material as THREE.MeshBasicMaterial;
    if (
      this.currentAnim === 'happy' ||
      this.currentAnim === 'dancing' ||
      this.currentAnim === 'jump'
    ) {
      ringMat.opacity = 0.55 + Math.sin(this.animTime * 8) * 0.25;
      this.happyMagicRing.scale.setScalar(
        1 + Math.sin(this.animTime * 6) * 0.15,
      );
    } else {
      ringMat.opacity = Math.max(0, ringMat.opacity - clampedDt * 2.5);
    }

    // Reset transient props
    this.sunberryProp.visible = this.currentAnim === 'eating';
    this.smokeRingMesh.visible = this.currentAnim === 'surprised';

    // Automatic eye blink in non-sleeping states
    this.blinkTimer += clampedDt;
    let isBlinking = false;
    if (this.blinkTimer >= this.nextBlinkIn) {
      if (this.blinkTimer <= this.nextBlinkIn + 0.14) {
        isBlinking = true;
      } else {
        this.blinkTimer = 0;
        this.nextBlinkIn = 2.4 + Math.random() * 2.6;
      }
    }

    // Reset baseline transforms before applying state pose
    this.rootPivot.position.set(0, 0.46, 0);
    this.rootPivot.rotation.set(0, 0, 0);
    // Cute baby dino baseline posture: slight forward tilt with counter-tilted head & tail
    this.bodyGroup.rotation.set(0.12, 0, 0);
    this.bodyGroup.scale.set(1, 1, 1);
    this.headGroup.rotation.set(-0.1, 0, 0);
    this.jawGroup.rotation.x = 0.18; // Cute happy baby dino smile by default
    this.leftPupil.scale.set(0.9, 1.12, 0.45);
    this.rightPupil.scale.set(0.9, 1.12, 0.45);
    this.leftBrow.rotation.z = Math.PI / 2 + 0.16;
    this.rightBrow.rotation.z = Math.PI / 2 - 0.16;

    this.leftWingPivot.rotation.set(0, 0.22, 0);
    this.rightWingPivot.rotation.set(0, -0.22, 0);
    this.tailPivot.rotation.set(-0.04, 0, 0);
    this.tailMidPivot.rotation.set(0.1, 0, 0);
    this.tailTipPivot.rotation.set(0.08, 0, 0);

    // Default Cute Baby Dino Forelimb Pose ("Tangan Dino"): held forward in front of the chest!
    this.frontLeftLeg.rotation.set(-0.55, 0.18, -0.22);
    this.frontRightLeg.rotation.set(-0.55, -0.18, 0.22);
    this.leftForearmPivot.rotation.set(-0.48, 0.15, -0.08);
    this.rightForearmPivot.rotation.set(-0.48, -0.15, 0.08);
    this.leftHandPivot.rotation.set(0.28, 0, 0);
    this.rightHandPivot.rotation.set(0.28, 0, 0);

    // Default Cute Baby Dino Hind Leg Pose ("Kaki Dino"): planted beneath the chubby haunches
    this.backLeftLeg.rotation.set(-0.2, 0.14, -0.05);
    this.backRightLeg.rotation.set(-0.2, -0.14, 0.05);
    this.leftShinPivot.rotation.set(0.18, 0, 0.04);
    this.rightShinPivot.rotation.set(0.18, 0, -0.04);
    this.leftFootPivot.rotation.set(-0.1, 0.08, 0.02);
    this.rightFootPivot.rotation.set(-0.1, -0.08, -0.02);

    const t = this.animTime;

    switch (this.currentAnim) {
      case 'idle': {
        const breath = Math.sin(t * 2.8);
        this.rootPivot.position.y = 0.46 + breath * 0.024;
        this.bodyGroup.rotation.x = 0.12 + breath * 0.03;
        this.bodyGroup.scale.set(
          1 + breath * 0.024,
          1 - breath * 0.016,
          1 + breath * 0.024,
        );
        // Cute curious baby dino head tilts!
        this.headGroup.rotation.x = -0.1 - breath * 0.03;
        this.headGroup.rotation.z = Math.sin(t * 1.6) * 0.095;
        this.headGroup.rotation.y = Math.sin(t * 1.1) * 0.15;
        this.jawGroup.rotation.x = 0.2 + breath * 0.05;
        this.leftWingPivot.rotation.y = 0.22 + Math.sin(t * 3.4) * 0.16;
        this.rightWingPivot.rotation.y = -0.22 - Math.sin(t * 3.4) * 0.16;

        // Smooth 3-segment S-wave Dino Tail wag!
        this.tailPivot.rotation.x = -0.04 - breath * 0.03;
        this.tailPivot.rotation.y = Math.sin(t * 2.8) * 0.28;
        this.tailMidPivot.rotation.x = 0.1 + Math.cos(t * 2.8) * 0.04;
        this.tailMidPivot.rotation.y = Math.sin(t * 2.8 - 0.65) * 0.32;
        this.tailTipPivot.rotation.x = 0.08;
        this.tailTipPivot.rotation.y = Math.sin(t * 2.8 - 1.3) * 0.28;

        // Cute baby dino front paws bobbing in front of the chest
        this.frontLeftLeg.rotation.x = -0.55 + breath * 0.1;
        this.frontRightLeg.rotation.x = -0.55 - breath * 0.1;
        this.leftForearmPivot.rotation.x = -0.48 + Math.cos(t * 2.8) * 0.12;
        this.rightForearmPivot.rotation.x = -0.48 - Math.cos(t * 2.8) * 0.12;
        this.leftHandPivot.rotation.x = 0.28 + Math.sin(t * 2.8) * 0.14;
        this.rightHandPivot.rotation.x = 0.28 - Math.sin(t * 2.8) * 0.14;

        // Hind legs stay planted while tummy bobs
        this.backLeftLeg.rotation.x = -0.2 - breath * 0.05;
        this.backRightLeg.rotation.x = -0.2 - breath * 0.05;
        this.leftShinPivot.rotation.x = 0.18 + breath * 0.08;
        this.rightShinPivot.rotation.x = 0.18 + breath * 0.08;
        this.leftFootPivot.rotation.x = -0.1 - breath * 0.03;
        this.rightFootPivot.rotation.x = -0.1 - breath * 0.03;
        break;
      }

      case 'walk': {
        // DINO WALK ("berjalan seperti dino bukan seperti manusia tapi dengan tangan dan kaki terlihat jelas")
        const w = t * 9.2;
        const sinW = Math.sin(w);
        const cosW = Math.cos(w);

        // Bouncy forward-leaning baby dinosaur waddle & stride!
        this.rootPivot.position.y = 0.43 + Math.abs(sinW) * 0.075;
        this.rootPivot.position.x = cosW * 0.042;
        // Forward-pitched Dino spine (~27 degrees) + cute side-to-side dino waddle
        this.bodyGroup.rotation.x = 0.46 + Math.cos(w * 2) * 0.05;
        this.bodyGroup.rotation.z = cosW * 0.11;
        this.bodyGroup.rotation.y = -sinW * 0.14;

        // Head counter-rotates up to look cheerfully forward + cute dino head bob!
        this.headGroup.rotation.x = -0.4 + Math.sin(w * 2) * 0.06;
        this.headGroup.rotation.z = -cosW * 0.08;
        this.headGroup.rotation.y = sinW * 0.1;
        this.jawGroup.rotation.x = 0.24;

        // Dino Hind Legs ("Kaki Dino"): compensate for forward body pitch (-0.46) with big stompy dino strides!
        const leftKneeLift = Math.max(0, cosW);
        const rightKneeLift = Math.max(0, -cosW);
        this.backLeftLeg.rotation.x = -0.46 - sinW * 0.72;
        this.backRightLeg.rotation.x = -0.46 + sinW * 0.72;
        this.backLeftLeg.rotation.z = -0.06 - cosW * 0.08;
        this.backRightLeg.rotation.z = 0.06 - cosW * 0.08;

        this.leftShinPivot.rotation.x = 0.22 + leftKneeLift * 0.78;
        this.rightShinPivot.rotation.x = 0.22 + rightKneeLift * 0.78;

        this.leftFootPivot.rotation.x = -0.12 + sinW * 0.36 - leftKneeLift * 0.26;
        this.rightFootPivot.rotation.x = -0.12 - sinW * 0.36 - rightKneeLift * 0.26;

        // Cute Baby Dino Forelimbs ("Tangan Dino"): held out in front of chest paddling cutely like a baby dino!
        this.frontLeftLeg.rotation.set(
          -0.78 + sinW * 0.36,
          0.22,
          -0.24 - Math.max(0, -sinW) * 0.12,
        );
        this.frontRightLeg.rotation.set(
          -0.78 - sinW * 0.36,
          -0.22,
          0.24 + Math.max(0, sinW) * 0.12,
        );
        this.leftForearmPivot.rotation.set(
          -0.58 - Math.max(0, -sinW) * 0.32,
          0.16,
          -0.08,
        );
        this.rightForearmPivot.rotation.set(
          -0.58 - Math.max(0, sinW) * 0.32,
          -0.16,
          0.08,
        );
        this.leftHandPivot.rotation.set(0.32 + sinW * 0.28, 0, 0);
        this.rightHandPivot.rotation.set(0.32 - sinW * 0.28, 0, 0);

        // Counter-balancing horizontal Dino Tail wagging happily side-to-side (counter-rotates forward body pitch!)
        this.tailPivot.rotation.x = -0.34 + Math.sin(w * 2) * 0.04;
        this.tailPivot.rotation.y = cosW * 0.38;
        this.tailMidPivot.rotation.x = 0.12;
        this.tailMidPivot.rotation.y = Math.cos(w - 0.6) * 0.36;
        this.tailTipPivot.rotation.x = 0.08;
        this.tailTipPivot.rotation.y = Math.cos(w - 1.2) * 0.32;

        this.leftWingPivot.rotation.y = 0.24 + sinW * 0.2;
        this.rightWingPivot.rotation.y = -0.24 - sinW * 0.2;
        break;
      }

      case 'run': {
        // ENERGETIC BABY DINO SPRINT (deep forward dinosaur tilt + fast bouncy legs & paddling dino paws)
        const r = t * 14.2;
        const sinR = Math.sin(r);
        const cosR = Math.cos(r);

        this.rootPivot.position.y = 0.415 + Math.abs(sinR) * 0.115;
        this.rootPivot.position.x = cosR * 0.048;
        this.bodyGroup.rotation.x = 0.58 + Math.cos(r * 2) * 0.07;
        this.bodyGroup.rotation.z = cosR * 0.12;
        this.bodyGroup.rotation.y = -sinR * 0.16;
        this.headGroup.rotation.x = -0.5 + Math.sin(r * 2) * 0.07;
        this.jawGroup.rotation.x = 0.3;

        // Fast high-knee dino sprint legs ("Kaki Dino")
        const leftRunKnee = Math.max(0, cosR);
        const rightRunKnee = Math.max(0, -cosR);
        this.backLeftLeg.rotation.x = -0.56 - sinR * 0.92;
        this.backRightLeg.rotation.x = -0.56 + sinR * 0.92;
        this.leftShinPivot.rotation.x = 0.25 + leftRunKnee * 0.92;
        this.rightShinPivot.rotation.x = 0.25 + rightRunKnee * 0.92;
        this.leftFootPivot.rotation.x = -0.1 + sinR * 0.44;
        this.rightFootPivot.rotation.x = -0.1 - sinR * 0.44;

        // Cute dino paws tucked forward paddling excitedly ("Tangan Dino")
        this.frontLeftLeg.rotation.set(-0.92 + sinR * 0.45, 0.25, -0.28);
        this.frontRightLeg.rotation.set(-0.92 - sinR * 0.45, -0.25, 0.28);
        this.leftForearmPivot.rotation.set(-0.68 - Math.max(0, -sinR) * 0.35, 0.18, 0);
        this.rightForearmPivot.rotation.set(-0.68 - Math.max(0, sinR) * 0.35, -0.18, 0);
        this.leftHandPivot.rotation.x = 0.35 + sinR * 0.32;
        this.rightHandPivot.rotation.x = 0.35 - sinR * 0.32;

        // Horizontal streaming Dino Tail counter-balancing the deep sprint lean!
        this.tailPivot.rotation.x = -0.46 + Math.sin(r * 2) * 0.05;
        this.tailPivot.rotation.y = cosR * 0.42;
        this.tailMidPivot.rotation.x = 0.1;
        this.tailMidPivot.rotation.y = Math.cos(r - 0.55) * 0.38;
        this.tailTipPivot.rotation.x = 0.06;
        this.tailTipPivot.rotation.y = Math.cos(r - 1.1) * 0.34;

        this.leftWingPivot.rotation.y = 0.42 + Math.sin(r * 1.5) * 0.34;
        this.rightWingPivot.rotation.y = -0.42 - Math.sin(r * 1.5) * 0.34;
        break;
      }

      case 'jump': {
        const jumpArc = Math.max(0, Math.sin(t * 4.5));
        this.rootPivot.position.y = 0.465 + jumpArc * 0.56;
        this.rootPivot.rotation.y = t * 3.8;
        this.bodyGroup.rotation.x = -0.05;
        this.headGroup.rotation.x = -0.05;
        this.jawGroup.rotation.x = 0.36;
        this.leftWingPivot.rotation.y = Math.sin(t * 18) * 0.65;
        this.rightWingPivot.rotation.y = -Math.sin(t * 18) * 0.65;

        // Cute dino paws thrown up joyfully in the air
        this.frontLeftLeg.rotation.set(-1.25, 0.1, -0.68);
        this.frontRightLeg.rotation.set(-1.25, -0.1, 0.68);
        this.leftForearmPivot.rotation.set(-0.35, 0, -0.2);
        this.rightForearmPivot.rotation.set(-0.35, 0, 0.2);
        this.leftHandPivot.rotation.z = -0.25;
        this.rightHandPivot.rotation.z = 0.25;

        // Dino legs tucked in mid-air
        this.backLeftLeg.rotation.x = -0.58;
        this.backRightLeg.rotation.x = -0.58;
        this.leftShinPivot.rotation.x = 0.88;
        this.rightShinPivot.rotation.x = 0.88;
        this.leftFootPivot.rotation.x = 0.35;
        this.rightFootPivot.rotation.x = 0.35;

        this.tailPivot.rotation.x = 0.08;
        this.tailMidPivot.rotation.x = 0.14;
        this.tailTipPivot.rotation.x = 0.1;
        break;
      }

      case 'happy': {
        const h = t * 10;
        const hopL = Math.max(0, Math.sin(h));
        const hopR = Math.max(0, -Math.sin(h));

        // Stands upright happily!
        this.rootPivot.position.y = 0.475 + Math.abs(Math.sin(h)) * 0.13;
        this.bodyGroup.rotation.x = -0.04;
        this.bodyGroup.rotation.z = Math.sin(h * 0.5) * 0.12;
        this.headGroup.rotation.z = Math.sin(h * 0.8) * 0.22;
        this.headGroup.rotation.x = -0.08 + Math.sin(h) * 0.08;
        this.jawGroup.rotation.x = 0.38 + Math.sin(h) * 0.08;
        this.leftBrow.rotation.z = Math.PI / 2 + 0.28;
        this.rightBrow.rotation.z = Math.PI / 2 - 0.28;

        // Enthusiastic Right Dino Paw Wave 👋 + Cheerful Left Dino Paw Bounce
        this.frontRightLeg.rotation.set(-1.38, -0.2, 0.65 + Math.sin(h * 1.4) * 0.25);
        this.rightForearmPivot.rotation.set(-0.32, 0, 0.22 + Math.sin(h * 1.8) * 0.48);
        this.rightHandPivot.rotation.set(0, 0, Math.sin(h * 1.8 - 0.4) * 0.42);

        this.frontLeftLeg.rotation.set(-0.68 + Math.sin(h) * 0.25, 0.18, -0.42);
        this.leftForearmPivot.rotation.set(-0.55, 0.2, -0.15);

        // Alternating happy dino foot hops
        this.backLeftLeg.rotation.x = -0.12 - hopL * 0.48;
        this.leftShinPivot.rotation.x = 0.2 + hopL * 0.65;
        this.backRightLeg.rotation.x = -0.12 - hopR * 0.48;
        this.rightShinPivot.rotation.x = 0.2 + hopR * 0.65;

        this.leftWingPivot.rotation.y = Math.sin(h * 2) * 0.6;
        this.rightWingPivot.rotation.y = -Math.sin(h * 2) * 0.6;
        this.tailPivot.rotation.x = 0.1;
        this.tailPivot.rotation.y = Math.sin(h * 1.8) * 0.42;
        this.tailMidPivot.rotation.x = 0.14;
        this.tailMidPivot.rotation.y = Math.sin(h * 1.8 - 0.55) * 0.38;
        this.tailTipPivot.rotation.y = Math.sin(h * 1.8 - 1.1) * 0.32;
        break;
      }

      case 'eating': {
        const chomp = t * 11;
        this.rootPivot.position.y = 0.41;
        this.bodyGroup.rotation.x = 0.16;
        this.headGroup.rotation.x = 0.14 + Math.sin(chomp) * 0.16;
        this.jawGroup.rotation.x = 0.24 + Math.abs(Math.sin(chomp)) * 0.32;

        // Both cute dino paws hold the glowing Sunberry while munching!
        const holdBob = Math.sin(chomp) * 0.08;
        this.frontLeftLeg.rotation.set(-0.88 + holdBob, 0.36, -0.12);
        this.frontRightLeg.rotation.set(-0.88 + holdBob, -0.36, 0.12);
        this.leftForearmPivot.rotation.set(-0.58, 0.38, 0.12);
        this.rightForearmPivot.rotation.set(-0.58, -0.38, -0.12);
        this.leftHandPivot.rotation.set(0.2, 0.3, 0);
        this.rightHandPivot.rotation.set(0.2, -0.3, 0);

        // Happy wiggling dino feet while eating
        this.leftFootPivot.rotation.x = Math.sin(chomp) * 0.22;
        this.rightFootPivot.rotation.x = -Math.sin(chomp) * 0.22;

        this.sunberryProp.scale.setScalar(
          Math.max(0.25, 1 - (t % 1.4) * 0.45),
        );
        this.tailPivot.rotation.x = -0.06;
        this.tailPivot.rotation.y = Math.sin(chomp) * 0.34;
        this.tailMidPivot.rotation.y = Math.sin(chomp - 0.6) * 0.3;
        this.tailTipPivot.rotation.y = Math.sin(chomp - 1.2) * 0.26;
        break;
      }

      case 'sleeping': {
        this.rootPivot.position.y = 0.25;
        this.bodyGroup.rotation.x = 0.28;
        this.bodyGroup.scale.set(
          1 + Math.sin(t * 1.6) * 0.035,
          0.88 - Math.sin(t * 1.6) * 0.025,
          1 + Math.sin(t * 1.6) * 0.035,
        );
        this.headGroup.rotation.x = 0.32;
        this.headGroup.rotation.z = 0.18;
        this.jawGroup.rotation.x = 0.05;
        this.leftWingPivot.rotation.y = 0.55;
        this.rightWingPivot.rotation.y = -0.55;

        // Dino paws tucked cozily near the chest
        this.frontLeftLeg.rotation.set(-0.65, 0.35, -0.2);
        this.frontRightLeg.rotation.set(-0.65, -0.35, 0.2);
        this.leftForearmPivot.rotation.set(-0.75, 0.3, 0);
        this.rightForearmPivot.rotation.set(-0.75, -0.3, 0);

        // Hind legs relaxed forward in a seated/curled nap pose
        this.backLeftLeg.rotation.set(-0.85, 0.25, -0.15);
        this.backRightLeg.rotation.set(-0.85, -0.25, 0.15);
        this.leftShinPivot.rotation.set(0.45, 0, 0);
        this.rightShinPivot.rotation.set(0.45, 0, 0);

        // Tail curled gently to the side while sleeping
        this.tailPivot.rotation.x = -0.16;
        this.tailPivot.rotation.y = 0.35 + Math.sin(t * 1.6) * 0.06;
        this.tailMidPivot.rotation.y = 0.42 + Math.sin(t * 1.6 - 0.5) * 0.06;
        this.tailTipPivot.rotation.y = 0.38;
        isBlinking = true; // Keep eyes peacefully closed
        break;
      }

      case 'dancing': {
        // STANDING DINO DANCE ("ketika menari pet beridir" + cute, gemas & lucu!)
        const d = t * 7.8;
        const sinD = Math.sin(d);
        const cosD = Math.cos(d);
        const sin2D = Math.sin(d * 2);

        // Stands tall & upright on its two hind dino legs!
        this.rootPivot.position.y = 0.48 + Math.abs(sin2D) * 0.12;
        this.rootPivot.position.x = sinD * 0.12;
        this.rootPivot.rotation.y = Math.sin(d * 0.5) * 0.82;
        this.bodyGroup.rotation.x = -0.06 + Math.sin(d * 2) * 0.06; // Upright standing spine!
        this.bodyGroup.rotation.z = cosD * 0.22; // Cute tummy & hip wiggle!
        this.headGroup.rotation.z = -cosD * 0.24;
        this.headGroup.rotation.x = 0.04 + Math.sin(d * 2) * 0.1;
        this.jawGroup.rotation.x = 0.38;

        // Cute Dino Paws ("Tangan Dino") raised high in the air waving & grooving to the beat!
        this.frontLeftLeg.rotation.set(
          -1.18 + sin2D * 0.52,
          0.18,
          -0.68 - cosD * 0.32,
        );
        this.frontRightLeg.rotation.set(
          -1.18 - sin2D * 0.52,
          -0.18,
          0.68 - cosD * 0.32,
        );
        this.leftForearmPivot.rotation.set(
          -0.42 + Math.cos(d * 2) * 0.32,
          0,
          -0.28 + sin2D * 0.35,
        );
        this.rightForearmPivot.rotation.set(
          -0.42 - Math.cos(d * 2) * 0.32,
          0,
          0.28 + sin2D * 0.35,
        );
        this.leftHandPivot.rotation.set(
          Math.cos(d * 2) * 0.28,
          0,
          Math.sin(d * 4) * 0.42,
        );
        this.rightHandPivot.rotation.set(
          -Math.cos(d * 2) * 0.28,
          0,
          -Math.sin(d * 4) * 0.42,
        );

        // Alternating Upright Dance Kicks & Knee Bounces on 3-Toed Dino Feet ("Kaki Dino")
        const kickLeft = Math.max(0, sinD);
        const kickRight = Math.max(0, -sinD);
        this.backLeftLeg.rotation.set(
          -0.06 - kickLeft * 0.72,
          0.18,
          -0.08 - kickLeft * 0.32,
        );
        this.backRightLeg.rotation.set(
          -0.06 - kickRight * 0.72,
          -0.18,
          0.08 + kickRight * 0.32,
        );
        this.leftShinPivot.rotation.x =
          0.16 + kickLeft * 0.55 + (1 - kickLeft) * Math.abs(sin2D) * 0.28;
        this.rightShinPivot.rotation.x =
          0.16 + kickRight * 0.55 + (1 - kickRight) * Math.abs(sin2D) * 0.28;
        this.leftFootPivot.rotation.x = -0.08 - kickLeft * 0.35;
        this.rightFootPivot.rotation.x = -0.08 - kickRight * 0.35;

        this.leftWingPivot.rotation.z = sin2D * 0.42;
        this.rightWingPivot.rotation.z = -sin2D * 0.42;

        // Rhythmic standing Dino Tail groove curving gracefully upward & swaying to the music!
        this.tailPivot.rotation.x = 0.14 + Math.abs(sin2D) * 0.06;
        this.tailPivot.rotation.y = sin2D * 0.44;
        this.tailMidPivot.rotation.x = 0.16;
        this.tailMidPivot.rotation.y = Math.sin(d * 2 - 0.55) * 0.4;
        this.tailTipPivot.rotation.x = 0.1;
        this.tailTipPivot.rotation.y = Math.sin(d * 2 - 1.1) * 0.36;
        break;
      }

      case 'surprised': {
        const s = Math.min(1, t * 4);
        const hop = Math.sin(s * Math.PI);
        this.rootPivot.position.y = 0.465 + hop * 0.24;
        this.bodyGroup.rotation.x = -0.18 * (1 - t * 0.4);
        this.headGroup.rotation.x = -0.15;
        this.jawGroup.rotation.x = 0.44;
        this.leftPupil.scale.setScalar(1.25);
        this.rightPupil.scale.setScalar(1.25);
        this.leftWingPivot.rotation.y = -0.35;
        this.rightWingPivot.rotation.y = 0.35;

        // Startled wide-open dino paws & splayed legs
        this.frontLeftLeg.rotation.set(-0.78, 0, -0.85);
        this.frontRightLeg.rotation.set(-0.78, 0, 0.85);
        this.leftForearmPivot.rotation.set(-0.25, 0, -0.32);
        this.rightForearmPivot.rotation.set(-0.25, 0, 0.32);
        this.backLeftLeg.rotation.set(-0.35 * hop, 0.2, -0.28);
        this.backRightLeg.rotation.set(-0.35 * hop, -0.2, 0.28);
        this.leftShinPivot.rotation.x = 0.45 * hop;
        this.rightShinPivot.rotation.x = 0.45 * hop;

        const ringProgress = (t * 1.4) % 1;
        this.smokeRingMesh.position.set(0, -0.03, 0.36 + ringProgress * 0.55);
        this.smokeRingMesh.scale.setScalar(0.5 + ringProgress * 1.8);
        (this.smokeRingMesh.material as THREE.MeshBasicMaterial).opacity =
          1 - ringProgress;
        break;
      }
    }

    // Apply eyelid rotation (-1.38 open, 0.08 closed)
    const targetLidRot = isBlinking ? 0.08 : -1.38;
    this.leftEyelid.rotation.x = targetLidRot;
    this.rightEyelid.rotation.x = targetLidRot;
  }

  public dispose(): void {
    this.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
