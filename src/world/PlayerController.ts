import * as THREE from 'three';
import { groundHeightAt, resolveIslandMovement } from '../game/rules';

/**
 * Player Explorer & Third-Person Camera Controller
 *
 * Supports:
 * - Desktop: WASD / Arrow keys to move, Space to jump, Mouse drag to rotate camera, Wheel to zoom.
 * - Mobile: Virtual joystick input vector, Touch drag to rotate camera, Jump button.
 * - Smooth exponential damping on movement, squash-and-stretch jump arcs, and camera follow.
 */
export class PlayerController {
  public readonly group = new THREE.Group();
  private readonly characterPivot = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly torsoGroup = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly capeMesh: THREE.Group;

  // Physics & movement state
  public readonly position = new THREE.Vector3(
    0.35,
    groundHeightAt(0.35, 0.35),
    0.35,
  );
  public readonly velocity = new THREE.Vector3();
  private verticalVelocity = 0;
  private isGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private gaitTime = 0;
  private idleTime = 0;
  public facingYaw = -1.25; // Facing West-Northwest toward EMBER & Wooden Bridge initially

  // Camera state
  public cameraYaw = -0.08;
  public cameraPitch = 0.14;
  public cameraDistance = 5.4;
  public cameraSensitivity = 1.0;
  private readonly cameraTarget = new THREE.Vector3();
  private readonly desiredCameraPos = new THREE.Vector3();

  // Input state
  private readonly keysPressed = new Set<string>();
  private readonly joystickVector = new THREE.Vector2(0, 0);
  private isDraggingCamera = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private activeTouchId: number | null = null;
  public controlsEnabled = false;
  private onJumpCallback?: () => void;
  private onStepCallback?: () => void;

  // Scratch vectors to avoid GC in update loop
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _moveDir = new THREE.Vector3();
  private readonly _unitScale = new THREE.Vector3(1, 1, 1);

  constructor(callbacks?: { onJump?: () => void; onStep?: () => void }) {
    this.onJumpCallback = callbacks?.onJump;
    this.onStepCallback = callbacks?.onStep;

    this.group.name = 'IslandExplorer';
    this.group.position.copy(this.position);
    this.capeMesh = this.buildExplorerMesh();
    this.bindInputListeners();
  }

  private createTunicFabricTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, '#1e40af');
      grad.addColorStop(0.6, '#1d4ed8');
      grad.addColorStop(1, '#172554');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      // Subtle woven fabric cross-hatch + gold embroidery border at bottom
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 128; i += 4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(128, i);
        ctx.stroke();
      }
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 114, 128, 10);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildExplorerMesh(): THREE.Group {
    // Contact shadow
    const shadowGeo = new THREE.CircleGeometry(0.42, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0c0914,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.015;
    this.group.add(shadow);

    this.group.add(this.characterPivot);

    // PBR Materials for realistic Dragon Keeper Hero
    const tunicMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      map: this.createTunicFabricTexture(),
      roughness: 0.58,
      metalness: 0.12,
    });
    const vestCrimsonMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.48,
      metalness: 0.18,
    });
    const goldArmorMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.18,
      roughness: 0.22,
      metalness: 0.82,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfcd5b5,
      roughness: 0.42,
      metalness: 0.02,
    });
    const blushMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      roughness: 0.5,
      transparent: true,
      opacity: 0.45,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x4a2511,
      roughness: 0.46,
      metalness: 0.08,
    });
    const trousersMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.68,
      metalness: 0.08,
    });
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x5c2d0c,
      roughness: 0.52,
      metalness: 0.15,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x3b1908,
      roughness: 0.58,
      metalness: 0.12,
    });
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.52,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const shirtCollarMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
    });
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.12,
    });

    // ========================================================================
    // 1. ANATOMICAL TORSO, ROYAL TUNIC, CRIMSON VEST & GOLD PAULDRONS
    // ========================================================================
    this.torsoGroup.position.y = 0.62;
    this.characterPivot.add(this.torsoGroup);

    // Sculpted upper chest
    const chestGeo = new THREE.CylinderGeometry(0.185, 0.15, 0.34, 18);
    chestGeo.scale(1.12, 1, 0.82);
    const chestMesh = new THREE.Mesh(chestGeo, tunicMat);
    chestMesh.position.y = 0.08;
    chestMesh.castShadow = true;
    chestMesh.receiveShadow = true;
    this.torsoGroup.add(chestMesh);

    // Crimson Dragon Keeper Surcoat / Vest Panels
    const vestMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.156, 0.3, 18),
      vestCrimsonMat,
    );
    vestMesh.scale.set(1.06, 1, 0.84);
    vestMesh.position.y = 0.08;
    this.torsoGroup.add(vestMesh);

    // White adventurer inner collar + neck
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.135, 0.08, 16),
      shirtCollarMat,
    );
    collar.position.y = 0.25;
    this.torsoGroup.add(collar);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.082, 0.12, 14),
      skinMat,
    );
    neck.position.y = 0.31;
    this.torsoGroup.add(neck);

    // Flared Tunic Coat Skirt below waist
    const coatSkirtGeo = new THREE.CylinderGeometry(0.155, 0.235, 0.25, 18);
    coatSkirtGeo.scale(1.08, 1, 0.86);
    const coatSkirt = new THREE.Mesh(coatSkirtGeo, tunicMat);
    coatSkirt.position.y = -0.16;
    coatSkirt.castShadow = true;
    this.torsoGroup.add(coatSkirt);

    // Golden Tunic Hem Trim Ring
    const hemTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.236, 0.242, 0.032, 18),
      goldArmorMat,
    );
    hemTrim.scale.set(1.08, 1, 0.86);
    hemTrim.position.y = -0.27;
    this.torsoGroup.add(hemTrim);

    // Sculpted Leather Belt, Golden Buckle & Side Adventurer Satchel
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.164, 0.168, 0.068, 18),
      leatherMat,
    );
    belt.scale.set(1.09, 1, 0.87);
    belt.position.y = -0.05;
    this.torsoGroup.add(belt);

    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.078, 0.035),
      goldArmorMat,
    );
    buckle.position.set(0, -0.05, 0.145);
    const buckleGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.022, 0),
      gemMat,
    );
    buckleGem.position.set(0, -0.05, 0.165);
    this.torsoGroup.add(buckle, buckleGem);

    // Diagonal Leather Chest Baldric Strap + Gold Dragon Medallion
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.36, 0.165),
      leatherMat,
    );
    strap.position.set(0, 0.08, 0);
    strap.rotation.z = 0.52;
    const chestMedallion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.025, 12),
      goldArmorMat,
    );
    chestMedallion.rotation.x = Math.PI / 2;
    chestMedallion.position.set(0, 0.12, 0.152);
    this.torsoGroup.add(strap, chestMedallion);

    // Side Hip Satchel Pouch
    const pouch = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.11, 0.11),
      leatherMat,
    );
    pouch.position.set(0.19, -0.12, 0.02);
    pouch.rotation.z = -0.15;
    this.torsoGroup.add(pouch);

    // Left & Right Armored Golden Shoulder Pauldrons
    [-1, 1].forEach((side) => {
      const pauldronGroup = new THREE.Group();
      pauldronGroup.position.set(side * 0.225, 0.21, 0);

      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
        goldArmorMat,
      );
      pauldron.scale.set(1.15, 0.85, 1.05);
      pauldron.rotation.z = -side * 0.38;
      pauldron.castShadow = true;

      const pauldronRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.088, 0.012, 8, 16),
        vestCrimsonMat,
      );
      pauldronRim.rotation.x = Math.PI / 2;
      pauldronRim.rotation.y = -side * 0.38;
      pauldronRim.position.y = -0.01;

      pauldronGroup.add(pauldron, pauldronRim);
      this.torsoGroup.add(pauldronGroup);
    });

    // ========================================================================
    // 2. EXPRESSIVE HERO HEAD, ANIME/RPG EYES, LAYERED HAIR & KEEPER CIRCLET
    // ========================================================================
    this.headGroup.position.set(0, 1.02, 0);
    this.characterPivot.add(this.headGroup);

    // Sculpted head cranium + jawline
    const headGeo = new THREE.SphereGeometry(0.168, 24, 20);
    headGeo.scale(0.96, 1.04, 0.96);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Sculpted nose & rosy cheeks
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.022, 0.048, 8),
      skinMat,
    );
    nose.position.set(0, -0.015, 0.168);
    nose.rotation.x = Math.PI / 2 - 0.15;
    this.headGroup.add(nose);

    [-1, 1].forEach((side) => {
      // Ears
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 10, 10),
        skinMat,
      );
      ear.scale.set(0.55, 1.15, 0.75);
      ear.position.set(side * 0.162, -0.01, -0.01);
      this.headGroup.add(ear);

      // Cheek blush
      const blush = new THREE.Mesh(
        new THREE.CircleGeometry(0.028, 12),
        blushMat,
      );
      blush.position.set(side * 0.088, -0.038, 0.148);
      blush.rotation.y = side * 0.42;
      this.headGroup.add(blush);

      // Expressive RPG Eyes (Sclera, Sapphire Iris, Pupil, Catchlight, Brow)
      const eyeSocket = new THREE.Group();
      eyeSocket.position.set(side * 0.062, 0.012, 0.148);
      eyeSocket.rotation.y = side * 0.22;

      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 14, 12),
        shirtCollarMat,
      );
      sclera.scale.set(1.05, 1.18, 0.45);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.023, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x2563eb }),
      );
      iris.scale.set(1, 1.15, 0.42);
      iris.position.z = 0.008;

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x0f172a }),
      );
      pupil.scale.set(1, 1.1, 0.4);
      pupil.position.z = 0.014;

      const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.0065, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      highlight.position.set(side * 0.007, 0.009, 0.021);

      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.048, 0.012, 0.012),
        hairMat,
      );
      brow.position.set(0, 0.042, 0.012);
      brow.rotation.z = -side * 0.12;

      eyeSocket.add(sclera, iris, pupil, highlight, brow);
      this.headGroup.add(eyeSocket);
    });

    // Warm confident smile
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.026, 0.0055, 8, 14, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x991b1b }),
    );
    smile.rotation.x = Math.PI;
    smile.position.set(0, -0.052, 0.154);
    this.headGroup.add(smile);

    // Layered Chestnut Adventurer Hair (Crown dome, spiky back locks, side locks & bangs)
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.178, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat,
    );
    hairCap.position.set(0, 0.015, -0.012);
    hairCap.rotation.x = -0.18;
    hairCap.castShadow = true;
    this.headGroup.add(hairCap);

    // Back layered hair spikes so the hero looks realistic from behind (3rd-person view!)
    const backHairSpikes: [number, number, number, number, number][] = [
      [0, -0.02, -0.165, 0.068, 0.18],
      [-0.075, -0.01, -0.155, 0.06, 0.17],
      [0.075, -0.01, -0.155, 0.06, 0.17],
      [-0.13, 0.01, -0.115, 0.052, 0.15],
      [0.13, 0.01, -0.115, 0.052, 0.15],
      [0, 0.08, -0.16, 0.065, 0.16],
      [-0.065, 0.09, -0.15, 0.055, 0.15],
      [0.065, 0.09, -0.15, 0.055, 0.15],
    ];
    for (const [hx, hy, hz, hr, hh] of backHairSpikes) {
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(hr, hh, 10),
        hairMat,
      );
      tuft.position.set(hx, hy, hz);
      tuft.rotation.x = Math.PI * 0.82;
      tuft.rotation.z = -hx * 2.2;
      this.headGroup.add(tuft);
    }

    // Front & side hair bangs framing the face
    [-0.085, -0.03, 0.03, 0.085].forEach((bx, idx) => {
      const bang = new THREE.Mesh(
        new THREE.ConeGeometry(0.038, 0.11, 8),
        hairMat,
      );
      bang.position.set(bx, 0.095, 0.145 - Math.abs(bx) * 0.3);
      bang.rotation.x = Math.PI * 0.92;
      bang.rotation.z = (idx - 1.5) * 0.18;
      this.headGroup.add(bang);
    });

    // Golden Dragon Keeper Headband Circlet + Glowing Forehead Crest Gem
    const circlet = new THREE.Mesh(
      new THREE.TorusGeometry(0.172, 0.016, 10, 28),
      goldArmorMat,
    );
    circlet.rotation.x = Math.PI / 2 - 0.14;
    circlet.position.set(0, 0.082, 0.005);
    const circletGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.032, 0),
      gemMat,
    );
    circletGem.position.set(0, 0.105, 0.175);
    this.headGroup.add(circlet, circletGem);

    // ========================================================================
    // 3. FLOWING ROYAL CRIMSON & GOLD CAPE (WITH CLASP & SCULPTED FOLDS)
    // ========================================================================
    const capeGroup = new THREE.Group();
    capeGroup.position.set(0, 0.84, -0.14);
    this.characterPivot.add(capeGroup);

    // Draped trapezoid cape geometry with vertex pleats
    const capeGeo = new THREE.PlaneGeometry(0.46, 0.62, 12, 8);
    const capePos = capeGeo.attributes.position;
    for (let i = 0; i < capePos.count; i++) {
      const u = capePos.getX(i); // -0.23 .. +0.23
      const v = capePos.getY(i); // -0.31 .. +0.31
      const t = (0.31 - v) / 0.62; // 0 at top shoulders, 1 at bottom hem
      const widthScale = 0.72 + t * 0.45;
      const x = u * widthScale;
      const pleatWave = Math.sin(u * 26) * 0.018 * t;
      const curveBack = -Math.sin(t * Math.PI * 0.65) * 0.065;
      capePos.setX(i, x);
      capePos.setY(i, v - 0.31);
      capePos.setZ(i, curveBack + pleatWave);
    }
    capeGeo.computeVertexNormals();

    const capeCloth = new THREE.Mesh(capeGeo, capeMat);
    capeCloth.castShadow = true;
    capeGroup.add(capeCloth);

    // Golden Cape Bottom Border Band & Sun Emblem on Back
    const capeGoldHem = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.035, 0.025),
      goldArmorMat,
    );
    capeGoldHem.position.set(0, -0.6, -0.055);
    const capeBackCrest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.055, 0),
      goldArmorMat,
    );
    capeBackCrest.scale.set(1, 1.35, 0.3);
    capeBackCrest.position.set(0, -0.26, -0.062);
    capeGroup.add(capeGoldHem, capeBackCrest);

    // Golden Shoulder Cape Clasps
    [-0.15, 0.15].forEach((cx) => {
      const clasp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.024, 12),
        goldArmorMat,
      );
      clasp.rotation.x = Math.PI / 2;
      clasp.position.set(cx, -0.02, 0.02);
      capeGroup.add(clasp);
    });

    // ========================================================================
    // 4. ARTICULATED ARMS (SLEEVE, FOREARM BRACER, GOLD CUFF & HAND)
    // ========================================================================
    const buildArm = (armGroup: THREE.Group, side: number) => {
      armGroup.position.set(side * 0.235, 0.8, 0);
      this.characterPivot.add(armGroup);

      // Upper sleeve
      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.054, 0.14, 8, 12),
        tunicMat,
      );
      upperArm.position.y = -0.09;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // Leather & Gold Forearm Bracer
      const bracer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.045, 0.13, 12),
        leatherMat,
      );
      bracer.position.y = -0.22;
      bracer.castShadow = true;

      const bracerGoldRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.051, 0.009, 8, 14),
        goldArmorMat,
      );
      bracerGoldRing.rotation.x = Math.PI / 2;
      bracerGoldRing.position.y = -0.17;

      // Sculpted Hand & Thumb
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.046, 12, 12),
        skinMat,
      );
      hand.scale.set(0.88, 1.08, 0.92);
      hand.position.y = -0.31;

      const thumb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.014, 0.026, 6, 8),
        skinMat,
      );
      thumb.position.set(-side * 0.032, -0.3, 0.026);
      thumb.rotation.z = side * 0.5;

      armGroup.add(bracer, bracerGoldRing, hand, thumb);
    };

    buildArm(this.leftArm, -1);
    buildArm(this.rightArm, 1);

    // ========================================================================
    // 5. ARTICULATED LEGS (TROUSERS, GOLD KNEE GUARD & CUFFED LEATHER BOOTS)
    // ========================================================================
    const buildLeg = (legGroup: THREE.Group, side: number) => {
      legGroup.position.set(side * 0.1, 0.38, 0);
      this.characterPivot.add(legGroup);

      // Upper thigh trousers
      const thigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.064, 0.14, 8, 12),
        trousersMat,
      );
      thigh.position.y = -0.1;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // Golden Knee Guard
      const kneePad = new THREE.Mesh(
        new THREE.SphereGeometry(0.044, 10, 10),
        goldArmorMat,
      );
      kneePad.scale.set(1, 1.1, 0.6);
      kneePad.position.set(0, -0.18, 0.052);
      legGroup.add(kneePad);

      // Folded Leather Boot Cuff
      const bootCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.06, 0.065, 12),
        leatherMat,
      );
      bootCuff.position.y = -0.21;

      // Boot Shaft
      const bootShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.054, 0.13, 12),
        bootMat,
      );
      bootShaft.position.y = -0.29;
      bootShaft.castShadow = true;

      // Sculpted Boot Foot + Sole + Gold Buckle
      const bootFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.115, 0.068, 0.195),
        bootMat,
      );
      bootFoot.position.set(0, -0.345, 0.035);
      bootFoot.castShadow = true;

      const bootToe = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 12, 10),
        bootMat,
      );
      bootToe.scale.set(1.02, 0.62, 1.1);
      bootToe.position.set(0, -0.345, 0.115);

      const bootBuckle = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.028, 0.02),
        goldArmorMat,
      );
      bootBuckle.position.set(0, -0.28, 0.062);

      legGroup.add(bootCuff, bootShaft, bootFoot, bootToe, bootBuckle);
    };

    buildLeg(this.leftLeg, -1);
    buildLeg(this.rightLeg, 1);

    return capeGroup;
  }

  private bindInputListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      if (!this.controlsEnabled) return;
      const code = e.code;
      if (code === 'Space' && !this.keysPressed.has('Space')) {
        this.jumpBufferTimer = 0.14;
      }
      this.keysPressed.add(code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
      if (e.code === 'Space' && this.verticalVelocity > 0) {
        this.verticalVelocity *= 0.48; // Variable jump cut
      }
    });

    window.addEventListener('blur', () => {
      this.keysPressed.clear();
      this.joystickVector.set(0, 0);
      this.isDraggingCamera = false;
    });

    // Mouse camera orbit & zoom when dragging on canvas/viewport
    window.addEventListener('mousedown', (e) => {
      if (!this.controlsEnabled) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, input, select, dialog, .ui-card, .joystick-zone')) {
        return;
      }
      this.isDraggingCamera = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDraggingCamera || !this.controlsEnabled) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      this.cameraYaw -= dx * 0.0055 * this.cameraSensitivity;
      this.cameraPitch = THREE.MathUtils.clamp(
        this.cameraPitch + dy * 0.0045 * this.cameraSensitivity,
        0.12,
        1.15,
      );
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingCamera = false;
    });

    window.addEventListener(
      'wheel',
      (e) => {
        if (!this.controlsEnabled) return;
        const target = e.target as HTMLElement | null;
        if (target && target.closest('.modal-scroll')) return;
        this.cameraDistance = THREE.MathUtils.clamp(
          this.cameraDistance + e.deltaY * 0.004,
          3.2,
          12.0,
        );
      },
      { passive: true },
    );

    // Touch camera rotation (on right half of screen outside buttons/joystick)
    window.addEventListener(
      'touchstart',
      (e) => {
        if (!this.controlsEnabled) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          const el = document.elementFromPoint(t.clientX, t.clientY);
          if (el && el.closest('button, input, .ui-card, .joystick-zone')) {
            continue;
          }
          if (this.activeTouchId === null) {
            this.activeTouchId = t.identifier;
            this.lastPointerX = t.clientX;
            this.lastPointerY = t.clientY;
          }
        }
      },
      { passive: true },
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (!this.controlsEnabled || this.activeTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.activeTouchId) {
            const dx = t.clientX - this.lastPointerX;
            const dy = t.clientY - this.lastPointerY;
            this.lastPointerX = t.clientX;
            this.lastPointerY = t.clientY;
            this.cameraYaw -= dx * 0.0065 * this.cameraSensitivity;
            this.cameraPitch = THREE.MathUtils.clamp(
              this.cameraPitch + dy * 0.005 * this.cameraSensitivity,
              0.12,
              1.15,
            );
          }
        }
      },
      { passive: true },
    );

    const endTouch = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.activeTouchId) {
          this.activeTouchId = null;
        }
      }
    };
    window.addEventListener('touchend', endTouch, { passive: true });
    window.addEventListener('touchcancel', endTouch, { passive: true });
  }

  public setJoystickVector(x: number, y: number): void {
    this.joystickVector.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1),
    );
  }

  public triggerJump(): void {
    this.jumpBufferTimer = 0.14;
  }

  public clearInputs(): void {
    this.keysPressed.clear();
    this.joystickVector.set(0, 0);
    this.isDraggingCamera = false;
  }

  public updateSelfiePose(
    pose: 'wave' | 'dance' | 'jump' | 'surprise' | 'sleep',
    dt: number,
    standX: number,
    standZ: number,
    faceYaw: number,
  ): void {
    this.idleTime += Math.min(dt, 0.05);
    const t = this.idleTime;
    const baseY = groundHeightAt(standX, standZ);
    this.position.set(standX, baseY, standZ);
    this.facingYaw = faceYaw;

    let jumpOffset = 0;
    if (pose === 'wave') {
      // Friendly wave pose with right arm raised waving at the selfie camera
      this.torsoGroup.position.y = 0.62 + Math.sin(t * 2.5) * 0.015;
      this.torsoGroup.rotation.y = -0.14;
      this.headGroup.position.y = 1.02 + Math.sin(t * 2.5) * 0.015;
      this.headGroup.rotation.y = 0.12;
      this.headGroup.rotation.z = 0.08;
      this.rightArm.rotation.x = -2.45;
      this.rightArm.rotation.z = -0.45 + Math.sin(t * 7.5) * 0.28;
      this.leftArm.rotation.x = -0.25;
      this.leftArm.rotation.z = 0.18;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    } else if (pose === 'dance') {
      // Groove rhythm alongside the pet
      const beat = Math.sin(t * 7.0);
      const bounce = Math.abs(Math.cos(t * 7.0));
      jumpOffset = bounce * 0.06;
      this.torsoGroup.position.y = 0.62 + bounce * 0.03;
      this.torsoGroup.rotation.y = beat * 0.25;
      this.headGroup.position.y = 1.02 + bounce * 0.03;
      this.headGroup.rotation.z = beat * 0.12;
      this.leftArm.rotation.x = -1.9 + beat * 0.45;
      this.rightArm.rotation.x = -1.9 - beat * 0.45;
      this.leftArm.rotation.z = 0.35;
      this.rightArm.rotation.z = -0.35;
      this.leftLeg.rotation.x = beat * 0.35;
      this.rightLeg.rotation.x = -beat * 0.35;
    } else if (pose === 'jump') {
      const hop = Math.max(0, Math.sin(t * 4.5));
      jumpOffset = hop * 0.28;
      this.torsoGroup.position.y = 0.62;
      this.torsoGroup.rotation.y = 0;
      this.headGroup.position.y = 1.02;
      this.headGroup.rotation.z = 0;
      this.leftArm.rotation.x = -2.5;
      this.rightArm.rotation.x = -2.5;
      this.leftArm.rotation.z = 0.42;
      this.rightArm.rotation.z = -0.42;
      this.leftLeg.rotation.x = -0.35 * hop;
      this.rightLeg.rotation.x = 0.25 * hop;
    } else if (pose === 'surprise') {
      this.torsoGroup.position.y = 0.62 + Math.sin(t * 4) * 0.02;
      this.headGroup.rotation.z = -0.1;
      this.leftArm.rotation.x = -1.6;
      this.rightArm.rotation.x = -1.6;
      this.leftArm.rotation.z = 0.25;
      this.rightArm.rotation.z = -0.25;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    } else {
      // Calm cozy pose
      const breath = Math.sin(t * 2.0);
      this.torsoGroup.position.y = 0.62 + breath * 0.01;
      this.headGroup.rotation.z = 0.05;
      this.leftArm.rotation.x = -0.15;
      this.rightArm.rotation.x = -0.35;
      this.leftArm.rotation.z = 0.08;
      this.rightArm.rotation.z = -0.12;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }

    this.group.position.set(standX, baseY + jumpOffset, standZ);
    this.group.rotation.y = faceYaw;
  }

  public update(dt: number, camera: THREE.Camera): void {
    const clampedDt = Math.min(dt, 0.12);

    // Collect movement intent from keyboard + virtual joystick
    let inputX = this.joystickVector.x;
    let inputZ = this.joystickVector.y;

    if (this.controlsEnabled) {
      if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) {
        inputZ -= 1;
      }
      if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) {
        inputZ += 1;
      }
      if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) {
        inputX -= 1;
      }
      if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) {
        inputX += 1;
      }
    }

    // Compute camera-relative movement vector on XZ plane
    this._forward.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    this._right.set(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

    this._moveDir
      .set(0, 0, 0)
      .addScaledVector(this._right, inputX)
      .addScaledVector(this._forward, -inputZ);

    const moveLen = this._moveDir.length();
    if (moveLen > 1) {
      this._moveDir.divideScalar(moveLen);
    }

    const moveSpeed = 5.4;
    const damping = 1 - Math.exp(-10 * clampedDt);
    this.velocity.x = THREE.MathUtils.lerp(
      this.velocity.x,
      this._moveDir.x * moveSpeed,
      damping,
    );
    this.velocity.z = THREE.MathUtils.lerp(
      this.velocity.z,
      this._moveDir.z * moveSpeed,
      damping,
    );

    // Advance horizontal position & resolve collisions against bridge pillars, railings, river, and island bounds
    const prevX = this.position.x;
    const prevZ = this.position.z;
    const rawNextX = prevX + this.velocity.x * clampedDt;
    const rawNextZ = prevZ + this.velocity.z * clampedDt;
    const resolvedPos = resolveIslandMovement(prevX, prevZ, rawNextX, rawNextZ);
    if (resolvedPos.blockedByRiver) {
      this.velocity.x *= 0.2;
    }
    if (resolvedPos.blockedByBridgePillar) {
      if (Math.abs(resolvedPos.x - rawNextX) > 0.001) this.velocity.x *= 0.2;
      if (Math.abs(resolvedPos.z - rawNextZ) > 0.001) this.velocity.z *= 0.2;
    }
    this.position.x = resolvedPos.x;
    this.position.z = resolvedPos.z;

    // Ground height & jump physics
    const groundY = groundHeightAt(this.position.x, this.position.z);
    if (this.isGrounded) {
      this.coyoteTimer = 0.1;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - clampedDt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - clampedDt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.verticalVelocity = 6.2;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.characterPivot.scale.set(0.86, 1.18, 0.86); // Takeoff stretch
      this.onJumpCallback?.();
    }

    this.verticalVelocity -= 15.5 * clampedDt; // Gravity
    this.position.y += this.verticalVelocity * clampedDt;

    if (this.position.y <= groundY) {
      if (!this.isGrounded && this.verticalVelocity < -2.0) {
        this.characterPivot.scale.set(1.18, 0.82, 1.18); // Landing squash
      }
      this.position.y = groundY;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }

    // Recover squash-and-stretch smoothly without GC allocation
    this.characterPivot.scale.lerp(this._unitScale, damping);
    this.idleTime += clampedDt;

    // Rotate character to face movement direction
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.25) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetYaw - this.facingYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.facingYaw += diff * Math.min(1, clampedDt * 12);

      // Gait cycle synced to distance traveled
      this.gaitTime += horizontalSpeed * clampedDt * 2.5;
      const swing = Math.sin(this.gaitTime);
      const bounce = Math.abs(Math.cos(this.gaitTime));
      this.torsoGroup.position.y = 0.62 + bounce * 0.028;
      this.torsoGroup.rotation.y = -swing * 0.12;
      this.headGroup.position.y = 1.02 + bounce * 0.025;
      this.headGroup.rotation.y = swing * 0.06;
      this.leftLeg.rotation.x = swing * 0.58;
      this.rightLeg.rotation.x = -swing * 0.58;
      this.leftArm.rotation.x = -swing * 0.48;
      this.rightArm.rotation.x = swing * 0.48;
      this.leftArm.rotation.z = 0.06;
      this.rightArm.rotation.z = -0.06;
      this.capeMesh.rotation.x = 0.26 + bounce * 0.24;

      if (this.isGrounded) {
        this.onStepCallback?.();
      }
    } else {
      // Lifelike idle breathing & subtle head motion
      const breath = Math.sin(this.idleTime * 2.2);
      this.torsoGroup.position.y = 0.62 + breath * 0.01;
      this.torsoGroup.rotation.y *= 0.85;
      this.headGroup.position.y = 1.02 + breath * 0.012;
      this.headGroup.rotation.y = Math.sin(this.idleTime * 0.9) * 0.08;
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.leftArm.rotation.x = Math.sin(this.idleTime * 1.8) * 0.04;
      this.rightArm.rotation.x = -Math.sin(this.idleTime * 1.8) * 0.04;
      this.leftArm.rotation.z = 0.05 + breath * 0.015;
      this.rightArm.rotation.z = -0.05 - breath * 0.015;
      this.capeMesh.rotation.x = 0.14 + Math.sin(this.idleTime * 2.0) * 0.03;
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.facingYaw;

    // Smooth third-person camera follow
    if (this.controlsEnabled) {
      this.cameraTarget.set(
        this.position.x,
        this.position.y + 1.15,
        this.position.z,
      );
      const horizDist = this.cameraDistance * Math.cos(this.cameraPitch);
      const vertDist = this.cameraDistance * Math.sin(this.cameraPitch);

      this.desiredCameraPos.set(
        this.cameraTarget.x + Math.sin(this.cameraYaw) * horizDist,
        this.cameraTarget.y + vertDist,
        this.cameraTarget.z + Math.cos(this.cameraYaw) * horizDist,
      );

      // Prevent camera from dipping below island terrain
      const camGroundY = groundHeightAt(
        this.desiredCameraPos.x,
        this.desiredCameraPos.z,
      );
      this.desiredCameraPos.y = Math.max(
        this.desiredCameraPos.y,
        camGroundY + 0.65,
      );

      const camSmooth = 1 - Math.exp(-8 * clampedDt);
      camera.position.lerp(this.desiredCameraPos, camSmooth);
      camera.lookAt(this.cameraTarget);
    }
  }
}
