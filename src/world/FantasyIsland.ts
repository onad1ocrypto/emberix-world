import * as THREE from 'three';
import {
  BRIDGE_MAX_X,
  BRIDGE_MIN_X,
  BRIDGE_RAILING_Z,
  bridgeDeckHeightAt,
  groundHeightAt,
  ISLAND_ROCKS,
  ISLAND_TREES,
  riverCenterXAt,
  riverWaterHalfWidthAt,
  terrainHeightAt,
  WATER_SURFACE_Y,
} from '../game/rules';
import type { GraphicsQuality } from '../types';

export interface InteractiveZone {
  id: string;
  label: string;
  actionHint: string;
  position: THREE.Vector3;
  radius: number;
  meshGroup: THREE.Group;
}

/**
 * Solara Fantasy Island — Richly Detailed 3D Fantasy Environment
 *
 * Includes sculpted emerald grass terrain, paved golden stone pathways,
 * mossy sanctuary outcrop with crystal lotus flowers, winding turquoise river
 * flowing underneath an arched rustic timber & stone bridge, multi-tier waterfalls
 * with UV-animated water streaks, splash foam & THREE.Points mist spray,
 * grand northern cliff Fantasy Castle, 3 floating sky islands with sky-waterfalls,
 * cozy Keeper Cottage, lush broadleaf trees, glowing crystal clusters,
 * bioluminescent mushrooms, 3D flowers, drifting sky clouds, and ambient sparkles.
 */
export class FantasyIsland extends THREE.Group {
  public readonly interactiveZones: InteractiveZone[] = [];
  private crystals: THREE.Mesh[] = [];
  private floatingIslands: { group: THREE.Group; baseY: number; phase: number }[] = [];
  private skyClouds: { group: THREE.Group; baseX: number; speed: number }[] = [];
  private waterfallMesh!: THREE.Mesh;
  private upperWaterfallMesh!: THREE.Mesh;
  private riverMesh!: THREE.Mesh;
  private riverTexture!: THREE.CanvasTexture;
  private waterfallTexture!: THREE.CanvasTexture;
  private foamRings: { mesh: THREE.Mesh; baseScale: number; phase: number }[] = [];
  private waterfallMistPoints!: THREE.Points;
  private waterfallMistPositions!: Float32Array;
  private waterfallMistVelocities!: Float32Array;
  private waterfallMistCount = 84;
  private firefliesMesh!: THREE.InstancedMesh;
  private fireflyData: {
    basePos: THREE.Vector3;
    speed: number;
    phase: number;
  }[] = [];
  private waterfallDrops: {
    mesh: THREE.Mesh;
    vy: number;
    baseY: number;
    minY: number;
  }[] = [];
  private riverFish: {
    group: THREE.Group;
    tailPivot: THREE.Group;
    leftFin: THREE.Mesh;
    rightFin: THREE.Mesh;
    splashRing: THREE.Mesh;
    zMin: number;
    zMax: number;
    zPos: number;
    zDir: number;
    swimSpeed: number;
    laneOffset: number;
    wigglePhase: number;
    jumpCooldown: number;
    jumpProgress: number;
    jumpDuration: number;
    jumpHeight: number;
  }[] = [];
  private dummy = new THREE.Object3D();
  private elapsed = 0;

  constructor(quality: GraphicsQuality = 'medium') {
    super();
    this.name = 'SolaraFantasyIsland';
    this.buildTerrain(quality);
    this.buildWaterAndWaterfall();
    this.buildRiverFish();
    this.buildWoodenBridge();
    this.buildSanctuaryShrine();
    this.buildKeeperCottage();
    this.buildFantasyCastle();
    this.buildFloatingIslands();
    this.buildInstancedFloraAndRocks(quality);
    this.buildMushroomsAndCrystals();
    this.buildDistantMountains();
    this.buildSkyClouds();
    this.buildFloatingParticles(quality);
  }

  private createGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, '#3ca638');
      grad.addColorStop(0.5, '#359832');
      grad.addColorStop(1, '#2d862a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Soft sunlit moss patches
      for (let i = 0; i < 90; i++) {
        const px = Math.random() * 512;
        const py = Math.random() * 512;
        const rad = 14 + Math.random() * 32;
        const rGrad = ctx.createRadialGradient(px, py, 2, px, py, rad);
        rGrad.addColorStop(0, 'rgba(132, 225, 62, 0.25)');
        rGrad.addColorStop(1, 'rgba(132, 225, 62, 0)');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crisp grass blades & clover specks
      for (let i = 0; i < 3600; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle =
          i % 3 === 0 ? '#65c943' : i % 3 === 1 ? '#257021' : '#84cc16';
        ctx.fillRect(x, y, 2, 6);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 24);
    return tex;
  }

  private createFlowingRiverTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Crystal turquoise-to-aqua water base
      const grad = ctx.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0.0, '#0284c7');
      grad.addColorStop(0.22, '#0ea5e9');
      grad.addColorStop(0.5, '#38bdf8');
      grad.addColorStop(0.78, '#0ea5e9');
      grad.addColorStop(1.0, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 512);

      // Shimmering aqua caustic bands
      for (let i = 0; i < 45; i++) {
        const x = 20 + ((i * 47) % 216);
        const y = (i * 73) % 512;
        const w = 12 + (i % 4) * 10;
        const h = 42 + (i % 5) * 24;
        const rGrad = ctx.createRadialGradient(x, y, 2, x, y, h * 0.6);
        rGrad.addColorStop(0, 'rgba(186, 230, 253, 0.55)');
        rGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = rGrad;
        ctx.fillRect(x - w, y - h * 0.5, w * 2, h);
      }

      // Flowing white-water current streaks along Y
      ctx.strokeStyle = 'rgba(240, 249, 255, 0.72)';
      for (let i = 0; i < 36; i++) {
        const x = 18 + ((i * 31) % 220);
        const y = (i * 59) % 480;
        const len = 28 + (i % 4) * 18;
        ctx.lineWidth = 1.5 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + ((i % 2 === 0 ? 1 : -1) * 8), y + len * 0.5, x, y + len);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.5, 10);
    return tex;
  }

  private createWaterfallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0.0, '#38bdf8');
      grad.addColorStop(0.25, '#7dd3fc');
      grad.addColorStop(0.5, '#e0f2fe');
      grad.addColorStop(0.75, '#7dd3fc');
      grad.addColorStop(1.0, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 512);

      // Cascading frothy white vertical water streaks
      for (let i = 0; i < 64; i++) {
        const x = (i * 29) % 256;
        const y = (i * 43) % 512;
        const w = 4 + (i % 5) * 3;
        const h = 65 + (i % 6) * 35;
        const sGrad = ctx.createLinearGradient(x, y, x, y + h);
        sGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        sGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.88)');
        sGrad.addColorStop(0.8, 'rgba(224, 242, 254, 0.75)');
        sGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sGrad;
        ctx.fillRect(x, y, w, h);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2.5);
    return tex;
  }

  private buildTerrain(quality: GraphicsQuality): void {
    const segments = quality === 'low' ? 72 : quality === 'medium' ? 112 : 140;
    const geo = new THREE.PlaneGeometry(96, 96, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      // Use terrainHeightAt so the river channel stays carved deep below the wooden bridge!
      const y = terrainHeightAt(x, z);
      posAttr.setY(i, y);

      const distFromCenter = Math.hypot(x, z);
      const riverCenter = riverCenterXAt(z);
      const distToRiver = Math.abs(x - riverCenter);
      const isBridgeApproach =
        Math.abs(z) < 1.65 &&
        ((x >= -2.8 && x <= 1.8) || (x >= -12.8 && x <= -9.5));

      if (y < WATER_SURFACE_Y - 0.12) {
        // Deep turquoise riverbed pebbles
        color.setHex(0x1e6091);
      } else if (distToRiver < riverWaterHalfWidthAt(z) + 0.85 && z > -21 && z < 31) {
        // Golden sandy & stone riverbank shoreline
        color.setHex(0xebd098);
      } else if (isBridgeApproach) {
        // Warm golden cobblestone path leading to the bridge entrances
        color.setHex(0xd9b372);
      } else if (y > 2.35) {
        // Elevated cliff moss & stone
        color.setHex(0x52824f);
      } else if (distFromCenter < 6.2) {
        // Sunlit sanctuary meadow
        color.setHex(0x6ec238);
      } else {
        // Lush vibrant emerald grass
        color.setHex(0x4ea836);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: this.createGrassTexture(),
      roughness: 0.82,
      metalness: 0.04,
    });

    const terrainMesh = new THREE.Mesh(geo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.add(terrainMesh);

    // Stepping stone pathway from Sanctuary to Bridge & Cottage
    const stoneStepMat = new THREE.MeshStandardMaterial({
      color: 0xd6c7b2,
      roughness: 0.72,
      metalness: 0.08,
    });
    const pathPoints: [number, number, number][] = [
      [-1.4, 0, 0.55],
      [-2.2, 0, 0.52],
      [-10.4, 0, 0.52],
      [-11.3, 0, 0.48],
      [2.2, 2.2, 0.52],
      [3.6, 3.8, 0.58],
      [4.9, 5.2, 0.5],
      [2.6, -1.6, 0.5],
      [4.5, -2.8, 0.55],
      [6.1, -3.8, 0.48],
    ];
    for (const [px, pz, rad] of pathPoints) {
      const py = terrainHeightAt(px, pz);
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(rad, rad * 1.08, 0.08, 10),
        stoneStepMat,
      );
      stone.position.set(px, py + 0.03, pz);
      stone.rotation.y = px * 1.3;
      stone.receiveShadow = true;
      this.add(stone);
    }

    // Surrounding crystal-blue ocean water plane
    const oceanGeo = new THREE.CircleGeometry(150, 48);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.18,
      roughness: 0.18,
      metalness: 0.35,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.y = -0.35;
    this.add(ocean);
  }

  private buildWaterAndWaterfall(): void {
    this.riverTexture = this.createFlowingRiverTexture();
    this.waterfallTexture = this.createWaterfallTexture();

    // Winding turquoise small river surface plane that flows from the northern waterfall
    // plunge pool (z = -20.5) right underneath the wooden bridge (z = 0) to the southern sea (z = 31.5)
    const riverLength = 52;
    const riverShape = new THREE.PlaneGeometry(1, riverLength, 24, 96);
    riverShape.rotateX(-Math.PI / 2);
    const pos = riverShape.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const normalizedX = pos.getX(i); // -0.5 .. +0.5
      const rawZ = pos.getZ(i); // -26 .. +26
      const z = rawZ + 5.5; // -20.5 .. +31.5
      const halfW = riverWaterHalfWidthAt(z);
      const center = riverCenterXAt(z);
      pos.setX(i, center + normalizedX * (halfW * 2.05));
      pos.setY(i, WATER_SURFACE_Y);
      pos.setZ(i, z);
    }
    riverShape.computeVertexNormals();

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      map: this.riverTexture,
      emissive: 0x0284c7,
      emissiveIntensity: 0.36,
      roughness: 0.1,
      metalness: 0.28,
      transparent: true,
      opacity: 0.92,
    });
    this.riverMesh = new THREE.Mesh(riverShape, waterMat);
    this.riverMesh.receiveShadow = true;
    this.add(this.riverMesh);

    // Smooth riverside cobblestones, mossy boulders & water lilies along both riverbanks
    // (especially framing the river channel as it flows underneath the wooden bridge!)
    const bankStoneMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.78,
      metalness: 0.08,
    });
    const mossyStoneMat = new THREE.MeshStandardMaterial({
      color: 0x4d7c0f,
      roughness: 0.82,
    });
    const lilyPadMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.55,
    });
    const lotusFlowerMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.38,
      roughness: 0.3,
    });

    for (let z = -19.0; z <= 22.0; z += 1.55) {
      // Leave bridge entrance paths clear
      const isBridgeEntrance = Math.abs(z) < 1.5;
      if (isBridgeEntrance) continue;

      const center = riverCenterXAt(z);
      const halfW = riverWaterHalfWidthAt(z);
      [-1, 1].forEach((side, sIdx) => {
        const bx = center + side * (halfW + 0.18 + ((Math.abs(Math.round(z * 3)) + sIdx) % 3) * 0.14);
        const by = terrainHeightAt(bx, z);
        const rx = 0.28 + ((Math.abs(Math.round(z * 7)) + sIdx) % 4) * 0.11;
        const boulder = new THREE.Mesh(
          new THREE.DodecahedronGeometry(rx, 1),
          (Math.round(z) + sIdx) % 3 === 0 ? mossyStoneMat : bankStoneMat,
        );
        boulder.position.set(bx, Math.max(WATER_SURFACE_Y - 0.04, by + 0.05), z);
        boulder.scale.set(1.25, 0.62, 1.1);
        boulder.rotation.y = z * 0.9;
        boulder.receiveShadow = true;
        this.add(boulder);
      });
    }

    // Floating emerald water-lily pads & pink lotus blossoms in calm eddies near the bridge & lagoon
    const lilyCoords: [number, number][] = [
      [riverCenterXAt(-16.2) - 1.5, -16.2],
      [riverCenterXAt(-15.4) + 1.4, -15.4],
      [riverCenterXAt(-5.2) - 1.1, -5.2],
      [riverCenterXAt(-3.4) + 1.0, -3.4],
      [riverCenterXAt(3.2) - 1.0, 3.2],
      [riverCenterXAt(4.8) + 1.15, 4.8],
    ];
    for (const [lx, lz] of lilyCoords) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.03, 14),
        lilyPadMat,
      );
      pad.position.set(lx, WATER_SURFACE_Y + 0.02, lz);
      const blossom = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11, 1),
        lotusFlowerMat,
      );
      blossom.scale.set(1.2, 0.65, 1.2);
      blossom.position.set(lx, WATER_SURFACE_Y + 0.08, lz);
      this.add(pad, blossom);
    }

    // ============================================================================
    // GRAND MULTI-TIER WATERFALL CLIFF SANCTUARY AT (x: -6.5, z: -21.5)
    // ============================================================================
    const cliffGroup = new THREE.Group();
    cliffGroup.position.set(-6.5, 0, -21.8);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.78,
      metalness: 0.12,
    });
    const mossCapMat = new THREE.MeshStandardMaterial({
      color: 0x4ca636,
      roughness: 0.72,
    });
    const waterfallCrystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.14,
      metalness: 0.4,
    });

    const cliffPositions: [number, number, number, number, number, number][] = [
      [-3.3, 2.7, 0.4, 2.8, 5.4, 2.7],
      [3.3, 2.6, 0.4, 2.8, 5.2, 2.7],
      [0, 2.2, -1.2, 5.0, 4.9, 2.5],
      [-5.1, 1.5, 1.8, 2.3, 3.2, 2.3],
      [5.1, 1.5, 1.8, 2.3, 3.2, 2.3],
      [-1.9, 1.1, 2.1, 1.4, 2.1, 1.5],
      [1.9, 1.1, 2.1, 1.4, 2.1, 1.5],
      [2.4, 5.4, -2.8, 4.2, 5.8, 3.5],
      [-2.4, 5.2, -3.0, 4.0, 5.5, 3.4],
    ];
    for (const [cx, cy, cz, sx, sy, sz] of cliffPositions) {
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1, 1),
        rockMat,
      );
      boulder.position.set(cx, cy, cz);
      boulder.scale.set(sx, sy, sz);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      cliffGroup.add(boulder);

      const mossTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.92, 12, 10),
        mossCapMat,
      );
      mossTop.position.set(cx, cy + sy * 0.72, cz);
      mossTop.scale.set(sx * 0.95, sy * 0.25, sz * 0.95);
      cliffGroup.add(mossTop);
    }

    // Glowing aqua mana crystals framing the waterfall ledges
    const ledgeCrystals: [number, number, number, number][] = [
      [-2.4, 2.6, 2.2, -0.22],
      [2.4, 2.5, 2.2, 0.22],
      [-3.8, 1.4, 2.9, -0.3],
      [3.8, 1.4, 2.9, 0.3],
    ];
    for (const [lx, ly, lz, rotZ] of ledgeCrystals) {
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        waterfallCrystalMat,
      );
      shard.scale.set(0.7, 1.85, 0.7);
      shard.position.set(lx, ly, lz);
      shard.rotation.z = rotZ;
      cliffGroup.add(shard);
    }

    // Upper Terrace Emerald Basin Pool between Upper & Lower Waterfalls
    const upperBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.1, 0.25, 24),
      waterMat,
    );
    upperBasin.position.set(0, 4.45, -0.5);
    cliffGroup.add(upperBasin);

    this.add(cliffGroup);

    // Lower Main Waterfall Curtain (with UV-scrolling cascading water texture!)
    const fallGeo = new THREE.CylinderGeometry(1.95, 2.55, 4.4, 24, 12, true, -Math.PI * 0.42, Math.PI * 0.84);
    const fallMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      map: this.waterfallTexture,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.48,
      roughness: 0.15,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });
    this.waterfallMesh = new THREE.Mesh(fallGeo, fallMat);
    this.waterfallMesh.position.set(-6.5, 2.65, -19.6);
    this.waterfallMesh.scale.set(1.05, 1, 0.48);
    this.add(this.waterfallMesh);

    // Upper Castle Cliff Waterfall Curtain
    this.upperWaterfallMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.8, 4.3, 20, 8, true, -Math.PI * 0.42, Math.PI * 0.84),
      fallMat,
    );
    this.upperWaterfallMesh.position.set(-5.8, 6.45, -22.6);
    this.upperWaterfallMesh.scale.set(1, 1, 0.42);
    this.add(this.upperWaterfallMesh);

    // Concentric animated glowing foam rings at the waterfall plunge lagoon & under the bridge
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xf0f9ff,
      transparent: true,
      opacity: 0.76,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const foamConfigs: [number, number, number, number, number][] = [
      [-6.5, -18.5, 1.3, 2.2, 0.0],
      [-6.5, -18.5, 2.1, 3.1, 1.6],
      [riverCenterXAt(-8.0), -8.0, 0.55, 1.05, 0.8],
      [riverCenterXAt(0), 0.0, 0.65, 1.25, 2.2], // Right underneath the wooden bridge!
      [riverCenterXAt(6.0), 6.0, 0.55, 1.05, 3.1],
    ];
    for (const [fx, fz, innerR, outerR, phase] of foamConfigs) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(innerR, outerR, 28),
        foamMat,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(fx, WATER_SURFACE_Y + 0.025, fz);
      this.add(ring);
      this.foamRings.push({ mesh: ring, baseScale: 1.0, phase });
    }

    // Waterfall splash mist droplets
    const dropGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const dropMat = new THREE.MeshBasicMaterial({
      color: 0xf0f9ff,
      transparent: true,
      opacity: 0.78,
    });
    for (let i = 0; i < 20; i++) {
      const drop = new THREE.Mesh(dropGeo, dropMat);
      const baseY = 4.4 + (i % 3) * 1.2;
      drop.position.set(
        -6.5 + (Math.random() - 0.5) * 3.6,
        WATER_SURFACE_Y + Math.random() * 3.6,
        -19.1 + (Math.random() - 0.5) * 1.4,
      );
      this.add(drop);
      this.waterfallDrops.push({
        mesh: drop,
        vy: 2.5 + Math.random() * 1.6,
        baseY,
        minY: WATER_SURFACE_Y,
      });
    }

    // Dedicated THREE.Points Waterfall Mist Spray rising at the base of the cascade
    this.waterfallMistPositions = new Float32Array(this.waterfallMistCount * 3);
    this.waterfallMistVelocities = new Float32Array(this.waterfallMistCount * 3);
    for (let i = 0; i < this.waterfallMistCount; i++) {
      this.resetWaterfallMistParticle(i, Math.random());
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.waterfallMistPositions, 3),
    );
    const mistMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.34,
      map: this.createSparkleSpriteTexture(),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.waterfallMistPoints = new THREE.Points(mistGeo, mistMat);
    this.waterfallMistPoints.name = 'WaterfallMistPoints';
    this.waterfallMistPoints.frustumCulled = false;
    this.waterfallMistPoints.raycast = () => {};
    this.add(this.waterfallMistPoints);
  }

  private resetWaterfallMistParticle(index: number, initialProgress = 0): void {
    const idx3 = index * 3;
    const angle = (index * 1.73 + Math.random() * 0.6) % (Math.PI * 2);
    const radius = 0.6 + Math.random() * 2.2;
    this.waterfallMistPositions[idx3] = -6.5 + Math.cos(angle) * radius;
    this.waterfallMistPositions[idx3 + 1] =
      WATER_SURFACE_Y + 0.1 + initialProgress * 2.6;
    this.waterfallMistPositions[idx3 + 2] =
      -18.8 + Math.sin(angle) * (radius * 0.65);

    this.waterfallMistVelocities[idx3] = Math.cos(angle) * (0.25 + Math.random() * 0.35);
    this.waterfallMistVelocities[idx3 + 1] = 0.75 + Math.random() * 0.65;
    this.waterfallMistVelocities[idx3 + 2] = 0.35 + Math.random() * 0.45;
  }

  private buildWoodenBridge(): void {
    const bridgeGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xa15c2f,
      roughness: 0.72,
      metalness: 0.08,
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x5c2d0c,
      roughness: 0.8,
      metalness: 0.08,
    });
    const stonePillarMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.72,
      metalness: 0.1,
    });
    const goldCapMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.3,
      roughness: 0.28,
      metalness: 0.75,
    });
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 4 Grand Stone Abutment Corner Pillars at (BRIDGE_MIN_X, ±1.72) and (BRIDGE_MAX_X, ±1.72)
    // matching BRIDGE_PILLAR_COLLIDERS in rules.ts
    [BRIDGE_MIN_X, BRIDGE_MAX_X].forEach((bx) => {
      [-1.72, 1.72].forEach((bz) => {
        const deckY = bridgeDeckHeightAt(bx);
        const pillarHeight = deckY + 1.15;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.38, pillarHeight, 12),
          stonePillarMat,
        );
        pillar.position.set(bx, pillarHeight / 2 + 0.05, bz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        bridgeGroup.add(pillar);

        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.35, 0.14, 12),
          goldCapMat,
        );
        cap.position.set(bx, pillarHeight + 0.08, bz);
        bridgeGroup.add(cap);

        const lantern = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.18, 0),
          lanternMat,
        );
        lantern.position.set(bx, pillarHeight + 0.28, bz);
        bridgeGroup.add(lantern);
      });
    });

    // Arched Wooden Bridge Deck Planks spanning x ∈ [BRIDGE_MIN_X, BRIDGE_MAX_X] over the flowing river
    const plankCount = 19;
    const spanX = BRIDGE_MAX_X - BRIDGE_MIN_X;
    for (let i = 0; i < plankCount; i++) {
      const t = i / (plankCount - 1);
      const x = BRIDGE_MIN_X + t * spanX;
      const y = bridgeDeckHeightAt(x);

      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.13, 3.55),
        woodMat,
      );
      plank.position.set(x, y, 0);
      plank.castShadow = true;
      plank.receiveShadow = true;
      bridgeGroup.add(plank);

      // Sturdy timber support & railing pillars every 3 planks (x = -9.8, -8.6, -7.4, -6.2, -5.0, -3.8, -2.6)
      // extending down into the riverbed so the bridge pillars visibly anchor into the ground/riverbanks
      if (i % 3 === 0) {
        [-BRIDGE_RAILING_Z, BRIDGE_RAILING_Z].forEach((zSide) => {
          const topY = y + 1.02;
          const bottomY = 0.12;
          const totalPostH = topY - bottomY;
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.13, totalPostH, 10),
            postMat,
          );
          post.position.set(x, bottomY + totalPostH / 2, zSide);
          post.castShadow = true;
          bridgeGroup.add(post);

          const postCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 10, 8),
            goldCapMat,
          );
          postCap.position.set(x, topY + 0.04, zSide);
          bridgeGroup.add(postCap);

          // Upper & lower connecting wooden handrail beams so players clearly see the solid barrier
          if (i < plankCount - 3) {
            const nextT = (i + 3) / (plankCount - 1);
            const nextX = BRIDGE_MIN_X + nextT * spanX;
            const nextY = bridgeDeckHeightAt(nextX);
            const railLen = Math.hypot(nextX - x, nextY - y);
            const angleZ = Math.PI / 2 - Math.atan2(nextY - y, nextX - x);

            [0.86, 0.46].forEach((railHeightOffset) => {
              const rail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.055, 0.055, railLen, 8),
                postMat,
              );
              rail.position.set(
                (x + nextX) / 2,
                (y + nextY) / 2 + railHeightOffset,
                zSide,
              );
              rail.rotation.z = angleZ;
              rail.castShadow = true;
              bridgeGroup.add(rail);
            });
          }

          if (i === 6 || i === 12) {
            const lantern = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.15, 0),
              lanternMat,
            );
            lantern.position.set(x, topY + 0.2, zSide);
            bridgeGroup.add(lantern);
          }
        });
      }
    }

    // Sloped wooden approach ramp planks at both bridge entrances so the deck meets the banks flush
    const rampSteps = [
      { x: BRIDGE_MAX_X + 0.34, y: 1.0, rotZ: -0.18 },
      { x: BRIDGE_MAX_X + 0.66, y: 0.94, rotZ: -0.16 },
      { x: BRIDGE_MIN_X - 0.34, y: 0.98, rotZ: 0.18 },
      { x: BRIDGE_MIN_X - 0.66, y: 0.91, rotZ: 0.16 },
    ];
    for (const rStep of rampSteps) {
      const rampPlank = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.12, 3.2),
        woodMat,
      );
      rampPlank.position.set(rStep.x, rStep.y, 0);
      rampPlank.rotation.z = rStep.rotZ;
      rampPlank.receiveShadow = true;
      bridgeGroup.add(rampPlank);
    }

    this.add(bridgeGroup);
  }

  private buildSanctuaryShrine(): void {
    const shrineGroup = new THREE.Group();
    // Anchor at terrainHeightAt(0, 0) = 1.48 so the top of the 0.05m sanctuary pad matches groundHeightAt(0, 0) = 1.53 flush!
    shrineGroup.position.set(0, terrainHeightAt(0, 0), 0);

    // Mossy natural sanctuary pedestal & stone rim (flush with terrain so characters never clip inside)
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.68,
      metalness: 0.15,
    });
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x4da832,
      roughness: 0.78,
      metalness: 0.04,
    });
    const goldRuneMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.22,
      metalness: 0.78,
    });

    const baseDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.32, 0.07, 32),
      stoneMat,
    );
    baseDisc.position.y = 0.005;
    baseDisc.receiveShadow = true;
    shrineGroup.add(baseDisc);

    // Lush mossy inner meadow pad whose top sits at 1.48 + 0.05 = 1.53 (exact match with groundHeightAt!)
    const mossDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.92, 2.06, 0.06, 32),
      mossMat,
    );
    mossDisc.position.y = 0.02;
    mossDisc.receiveShadow = true;
    shrineGroup.add(mossDisc);

    const runeRing = new THREE.Mesh(
      new THREE.RingGeometry(1.88, 2.08, 36),
      goldRuneMat,
    );
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.052;
    shrineGroup.add(runeRing);

    // Low-profile glowing pink/magenta crystal lotus blossoms on the outer rim (no waist-high grey dome rocks inside the circle!)
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });

    const rimAngles = [0.65, 2.35, -2.35, -0.65];
    for (const ang of rimAngles) {
      const rx = Math.cos(ang) * 1.96;
      const rz = Math.sin(ang) * 1.96;

      // Glowing magenta blossom petals sitting flat on the moss pad rim
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.ConeGeometry(0.05, 0.12, 6),
          lotusMat,
        );
        petal.position.set(
          rx + Math.cos(pa) * 0.09,
          0.07,
          rz + Math.sin(pa) * 0.09,
        );
        petal.rotation.z = -Math.cos(pa) * 0.65;
        petal.rotation.x = Math.sin(pa) * 0.65;
        shrineGroup.add(petal);
      }
    }

    this.add(shrineGroup);

    // Interactive Sunberry Bush landmark (East meadow)
    const bushGroup = new THREE.Group();
    const bx = 7.5;
    const bz = -4.5;
    bushGroup.position.set(bx, groundHeightAt(bx, bz), bz);
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.7,
    });
    const berryMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xff5722,
      emissiveIntensity: 0.55,
      roughness: 0.18,
    });
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 14, 12),
        foliageMat,
      );
      puff.position.set(
        Math.cos(i * 1.3) * 0.4,
        0.52 + (i % 2) * 0.22,
        Math.sin(i * 1.3) * 0.4,
      );
      bushGroup.add(puff);
    }
    for (let i = 0; i < 8; i++) {
      const berry = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        berryMat,
      );
      const a = (i / 8) * Math.PI * 2;
      berry.position.set(
        Math.cos(a) * 0.72,
        0.58 + (i % 2) * 0.22,
        Math.sin(a) * 0.72,
      );
      bushGroup.add(berry);
    }
    this.add(bushGroup);
    this.interactiveZones.push({
      id: 'sunberry_bush',
      label: 'Sunberry Orchard',
      actionHint: 'Harvest Fresh Sunberry (Feed EMBER)',
      position: bushGroup.position.clone(),
      radius: 3.2,
      meshGroup: bushGroup,
    });

    // Interactive colorful plush dino bed in the main game arena
    const mainDinoBed = this.buildColorfulDinoBed(3.35, 0.45, -0.42, 'turquoise_pink');
    this.add(mainDinoBed);
    this.interactiveZones.push({
      id: 'dragon_nest',
      label: 'Rainbow Dino Bed',
      actionHint: 'Sleep on the cozy Dino Bed (Sleep / Restore Energy)',
      position: mainDinoBed.position.clone(),
      radius: 3.2,
      meshGroup: mainDinoBed,
    });

    // Secondary Cozy Colorful Dino Bed in the South-East meadow
    const meadowDinoBed = this.buildColorfulDinoBed(5.6, 5.8, -0.75, 'sunny_lavender');
    this.add(meadowDinoBed);
    this.interactiveZones.push({
      id: 'dragon_nest_meadow',
      label: 'Meadow Dino Bed',
      actionHint: 'Sleep on the cozy Dino Bed (Sleep / Restore Energy)',
      position: meadowDinoBed.position.clone(),
      radius: 3.2,
      meshGroup: meadowDinoBed,
    });
  }

  /**
   * Builds a super-cute, colorful 3D plush dinosaur bed
   * with a quilted rainbow-star mattress, 14 plump multi-colored bolster cushions,
   * a smiling sleeping 3D plush dino head pillow with golden horns & rosy cheeks,
   * rainbow triangular dino dorsal spines around the rim, a curled plush dino tail,
   * chubby hugging dino paws, and star/heart throw pillows.
   */
  private buildColorfulDinoBed(
    bx: number,
    bz: number,
    rotY: number,
    paletteVariant: 'turquoise_pink' | 'sunny_lavender' = 'turquoise_pink',
  ): THREE.Group {
    const bedGroup = new THREE.Group();
    const baseTerrainY = terrainHeightAt(bx, bz);
    bedGroup.position.set(bx, baseTerrainY, bz);
    bedGroup.rotation.y = rotY;

    const mattressTex = this.createDinoBedMattressTexture();
    const blanketTex = this.createDinoBlanketTexture();

    // 1. Scalloped Royal-Gold & Berry Base Trim (sits flush on terrain, prevents any gap)
    const baseRimMat = new THREE.MeshStandardMaterial({
      color: paletteVariant === 'turquoise_pink' ? 0x7c4dff : 0xff4081,
      roughness: 0.5,
      metalness: 0.08,
    });
    const baseTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.22, 1.28, 0.14, 32),
      baseRimMat,
    );
    baseTrim.position.y = 0.03;
    baseTrim.receiveShadow = true;
    bedGroup.add(baseTrim);

    const goldPipingMat = new THREE.MeshStandardMaterial({
      color: 0xffd740,
      roughness: 0.32,
      metalness: 0.25,
    });
    const goldPiping = new THREE.Mesh(
      new THREE.TorusGeometry(1.21, 0.038, 12, 36),
      goldPipingMat,
    );
    goldPiping.rotation.x = Math.PI / 2;
    goldPiping.position.y = 0.09;
    bedGroup.add(goldPiping);

    // 2. Quilted Rainbow-Pastel & Star-Paw Mattress (top surface at y = 0.18)
    const mattressMat = new THREE.MeshStandardMaterial({
      map: mattressTex,
      roughness: 0.55,
      metalness: 0.02,
    });
    const mattress = new THREE.Mesh(
      new THREE.CylinderGeometry(1.06, 1.1, 0.16, 36),
      mattressMat,
    );
    mattress.position.y = 0.10;
    mattress.receiveShadow = true;
    mattress.castShadow = true;
    bedGroup.add(mattress);

    // Inner quilted piping ring around the mattress edge
    const innerPiping = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.025, 10, 32),
      goldPipingMat,
    );
    innerPiping.rotation.x = Math.PI / 2;
    innerPiping.position.y = 0.182;
    bedGroup.add(innerPiping);

    // 3. Plump Multi-Colored Segmented Plush Bolster Rim (14 vibrant rainbow cloud cushions)
    const rainbowBolsterColors = [
      0xe11d48, // Vivid Crimson-Rose
      0xf97316, // Bright Tangerine
      0xf59e0b, // Rich Golden-Amber
      0x10b981, // Vivid Emerald-Mint
      0x06b6d4, // Saturated Turquoise-Cyan
      0x3b82f6, // Royal Sky-Blue
      0x8b5cf6, // Vivid Amethyst-Purple
      0xec4899, // Hot Candy-Pink
      0xef4444, // Coral Red
      0xeab308, // Sunburst Gold
      0x14b8a6, // Tropical Teal
      0x6366f1, // Indigo Periwinkle
      0xa855f7, // Orchid Violet
      0xf43f5e, // Berry Rose
    ];

    const bolsterCount = 14;
    const bolsterRadius = 1.04;
    const bolsterGeo = new THREE.SphereGeometry(0.32, 18, 14);
    const seamBandGeo = new THREE.TorusGeometry(0.27, 0.022, 8, 20);

    for (let i = 0; i < bolsterCount; i++) {
      const angle = (i / bolsterCount) * Math.PI * 2;
      // Leave a slightly lower step-in front entrance around angle = 0 (+Z)
      const isFrontEntrance = Math.cos(angle) > 0.82;
      const colorHex = rainbowBolsterColors[i % rainbowBolsterColors.length];
      const puffMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.64,
        metalness: 0.02,
      });

      const puff = new THREE.Mesh(bolsterGeo, puffMat);
      const bxPos = Math.sin(angle) * bolsterRadius;
      const bzPos = Math.cos(angle) * bolsterRadius;
      const scaleY = isFrontEntrance ? 0.58 : 0.88;
      puff.position.set(bxPos, isFrontEntrance ? 0.19 : 0.26, bzPos);
      puff.scale.set(1.12, scaleY, 0.96);
      puff.rotation.y = angle;
      puff.castShadow = true;
      puff.receiveShadow = true;
      bedGroup.add(puff);

      // Cute golden ribbon seam between bolster puffs
      if (!isFrontEntrance) {
        const seamAngle = angle + Math.PI / bolsterCount;
        const seam = new THREE.Mesh(seamBandGeo, goldPipingMat);
        seam.position.set(
          Math.sin(seamAngle) * bolsterRadius,
          0.26,
          Math.cos(seamAngle) * bolsterRadius,
        );
        seam.rotation.y = seamAngle + Math.PI / 2;
        bedGroup.add(seam);
      }
    }

    // 4. Big Cute 3D Plush Dinosaur Head Pillow at the Headboard (-Z back of bed)
    const dinoHeadGroup = new THREE.Group();
    dinoHeadGroup.position.set(0, 0.44, -1.04);
    bedGroup.add(dinoHeadGroup);

    const dinoMainColor =
      paletteVariant === 'turquoise_pink' ? 0x06b6d4 : 0xec4899;
    const dinoSnoutColor =
      paletteVariant === 'turquoise_pink' ? 0xfde047 : 0xfef08a;
    const dinoCheekColor = 0xf43f5e;

    const dinoHeadMat = new THREE.MeshStandardMaterial({
      color: dinoMainColor,
      roughness: 0.6,
      metalness: 0.02,
    });
    const dinoSnoutMat = new THREE.MeshStandardMaterial({
      color: dinoSnoutColor,
      roughness: 0.62,
      metalness: 0.02,
    });
    const cheekMat = new THREE.MeshStandardMaterial({
      color: dinoCheekColor,
      roughness: 0.4,
      emissive: 0xff1744,
      emissiveIntensity: 0.18,
    });
    const darkFeatureMat = new THREE.MeshStandardMaterial({
      color: 0x261420,
      roughness: 0.35,
    });

    // Chubby main dino head cushion
    const headDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 24, 20),
      dinoHeadMat,
    );
    headDome.scale.set(1.28, 0.96, 1.05);
    headDome.castShadow = true;
    dinoHeadGroup.add(headDome);

    // Cute rounded dino snout / muzzle projecting forward toward the mattress (+Z)
    const snoutMuzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 20, 16),
      dinoHeadMat,
    );
    snoutMuzzle.position.set(0, -0.06, 0.34);
    snoutMuzzle.scale.set(1.24, 0.76, 0.92);
    snoutMuzzle.castShadow = true;
    dinoHeadGroup.add(snoutMuzzle);

    // Creamy-yellow lower jaw / chin patch
    const lowerChin = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 18, 14),
      dinoSnoutMat,
    );
    lowerChin.position.set(0, -0.15, 0.33);
    lowerChin.scale.set(1.16, 0.56, 0.88);
    dinoHeadGroup.add(lowerChin);

    // Cute happy closed sleeping eyes (curved dark arcs on left & right of dino head)
    const eyeArcGeo = new THREE.TorusGeometry(0.085, 0.02, 10, 20, Math.PI);
    const cheekGeo = new THREE.SphereGeometry(0.078, 14, 12);
    const nostrilGeo = new THREE.SphereGeometry(0.028, 10, 10);
    const hornGeo = new THREE.ConeGeometry(0.075, 0.22, 14);
    const hornTipGeo = new THREE.SphereGeometry(0.032, 10, 10);

    for (const side of [-1, 1]) {
      // Happy sleeping arc eye
      const eyeArc = new THREE.Mesh(eyeArcGeo, darkFeatureMat);
      eyeArc.position.set(side * 0.26, 0.11, 0.39);
      eyeArc.rotation.y = side * 0.35;
      eyeArc.rotation.x = -0.18;
      dinoHeadGroup.add(eyeArc);

      // Cute rosy pink blush cheeks
      const cheek = new THREE.Mesh(cheekGeo, cheekMat);
      cheek.position.set(side * 0.36, -0.02, 0.42);
      cheek.scale.set(1.25, 0.78, 0.55);
      dinoHeadGroup.add(cheek);

      // Cute little nostrils on the snout tip
      const nostril = new THREE.Mesh(nostrilGeo, darkFeatureMat);
      nostril.position.set(side * 0.11, 0.04, 0.62);
      dinoHeadGroup.add(nostril);

      // Stubby golden plush dino horns on top of head
      const hornGroup = new THREE.Group();
      hornGroup.position.set(side * 0.28, 0.36, -0.02);
      hornGroup.rotation.z = -side * 0.32;
      hornGroup.rotation.x = -0.15;
      const hornCone = new THREE.Mesh(hornGeo, goldPipingMat);
      hornCone.position.y = 0.09;
      const hornTip = new THREE.Mesh(hornTipGeo, goldPipingMat);
      hornTip.position.y = 0.20;
      hornGroup.add(hornCone, hornTip);
      dinoHeadGroup.add(hornGroup);
    }

    // Happy stitched smile on the snout
    const smileArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.016, 8, 20, Math.PI),
      darkFeatureMat,
    );
    smileArc.position.set(0, -0.08, 0.61);
    smileArc.rotation.z = Math.PI;
    smileArc.rotation.x = 0.22;
    dinoHeadGroup.add(smileArc);

    // Cute colorful plush dino crest plates on top of the head
    const headCrestColors = [0xff4081, 0xffea00, 0x7c4dff];
    for (let c = 0; c < 3; c++) {
      const crestPlate = new THREE.Mesh(
        new THREE.ConeGeometry(0.09 - c * 0.012, 0.22 - c * 0.03, 4),
        new THREE.MeshStandardMaterial({
          color: headCrestColors[c],
          roughness: 0.4,
        }),
      );
      crestPlate.position.set(0, 0.45 - c * 0.06, -0.04 - c * 0.18);
      crestPlate.rotation.y = Math.PI / 4;
      crestPlate.rotation.x = -0.35 - c * 0.18;
      crestPlate.scale.set(0.45, 1.0, 1.25);
      dinoHeadGroup.add(crestPlate);
    }

    // 5. Two Chubby Plush Dino Arms/Paws Hugging the Left & Right Bolsters
    const pawToeGeo = new THREE.SphereGeometry(0.045, 10, 10);
    for (const side of [-1, 1]) {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.78, 0.32, -0.78);
      armGroup.rotation.y = -side * 0.55;
      const armBody = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.13, 0.28, 10, 14),
        dinoHeadMat,
      );
      armBody.rotation.x = Math.PI / 2;
      armBody.scale.set(1.1, 1.0, 0.82);
      armGroup.add(armBody);

      // 3 cream-gold plush toe beans at the tip of each hugging paw
      for (let t = -1; t <= 1; t++) {
        const toe = new THREE.Mesh(pawToeGeo, dinoSnoutMat);
        toe.position.set(t * 0.065, -0.02, 0.22);
        toe.scale.set(0.85, 0.75, 1.2);
        armGroup.add(toe);
      }
      bedGroup.add(armGroup);
    }

    // 6. Rainbow Dinosaur Dorsal Spines Around the Outer Bolster Rim
    const spineColors = [
      0xff4081, // Hot Pink
      0xffea00, // Bright Yellow
      0x00e676, // Neon Mint
      0x00e5ff, // Electric Cyan
      0x7c4dff, // Royal Violet
      0xff6e40, // Tangerine
      0xff5252, // Coral Red
      0xffd740, // Sunny Gold
      0x69f0ae, // Emerald Mint
    ];
    const spineAngles = [
      -2.35, -1.9, -1.45, -1.0, -0.58,
      2.35, 1.9, 1.45, 1.0,
    ];
    for (let s = 0; s < spineAngles.length; s++) {
      const a = spineAngles[s];
      const spineGroup = new THREE.Group();
      const rOuter = 1.24;
      spineGroup.position.set(Math.sin(a) * rOuter, 0.36, Math.cos(a) * rOuter);
      spineGroup.rotation.y = a;

      const outerSpine = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.32, 4),
        new THREE.MeshStandardMaterial({
          color: spineColors[s % spineColors.length],
          roughness: 0.42,
        }),
      );
      outerSpine.rotation.y = Math.PI / 4;
      outerSpine.rotation.x = 0.38;
      outerSpine.scale.set(0.42, 1.0, 1.35);
      outerSpine.castShadow = true;

      const innerSpineCore = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.22, 4),
        dinoSnoutMat,
      );
      innerSpineCore.rotation.y = Math.PI / 4;
      innerSpineCore.rotation.x = 0.38;
      innerSpineCore.position.y = 0.02;
      innerSpineCore.scale.set(0.48, 1.0, 1.1);

      spineGroup.add(outerSpine, innerSpineCore);
      bedGroup.add(spineGroup);
    }

    // 7. Cute Curled Plush Dinosaur Tail Wrapping Around the Front-Right Side
    const tailSegments = [
      { x: 0.72, y: 0.24, z: 0.98, r: 0.22, color: dinoMainColor },
      { x: 0.98, y: 0.23, z: 0.78, r: 0.18, color: 0xff80ab },
      { x: 1.16, y: 0.22, z: 0.50, r: 0.145, color: 0xffd740 },
      { x: 1.22, y: 0.21, z: 0.22, r: 0.11, color: 0x69f0ae },
    ];
    for (let t = 0; t < tailSegments.length; t++) {
      const seg = tailSegments[t];
      const segMesh = new THREE.Mesh(
        new THREE.SphereGeometry(seg.r, 16, 14),
        new THREE.MeshStandardMaterial({ color: seg.color, roughness: 0.44 }),
      );
      segMesh.position.set(seg.x, seg.y, seg.z);
      segMesh.scale.set(1.15, 0.85, 1.15);
      segMesh.castShadow = true;
      bedGroup.add(segMesh);

      // Cute mini dorsal spine on each tail segment
      const tailSpine = new THREE.Mesh(
        new THREE.ConeGeometry(seg.r * 0.48, seg.r * 1.15, 4),
        goldPipingMat,
      );
      tailSpine.position.set(seg.x, seg.y + seg.r * 0.88, seg.z);
      tailSpine.rotation.y = Math.PI / 4;
      tailSpine.scale.set(0.45, 1.0, 1.2);
      bedGroup.add(tailSpine);
    }
    // Tapered plush dino tail tip cone
    const tailTipCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.095, 0.28, 14),
      new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.42 }),
    );
    tailTipCone.position.set(1.20, 0.22, -0.02);
    tailTipCone.rotation.x = -Math.PI / 2 + 0.15;
    tailTipCone.rotation.z = 0.25;
    bedGroup.add(tailTipCone);

    // 8. Cozy Throw Pillows (Golden Star Pillow, Pink Heart Cushion, Cyan Cloud Pillow) & Folded Rainbow Blanket
    // 8a. Golden Star Pillow
    const starPillowGroup = new THREE.Group();
    starPillowGroup.position.set(-0.48, 0.26, -0.52);
    starPillowGroup.rotation.x = 0.35;
    starPillowGroup.rotation.z = -0.25;
    const starCenter = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 12),
      goldPipingMat,
    );
    starCenter.scale.set(1.1, 0.55, 1.1);
    starPillowGroup.add(starCenter);
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const pointCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.075, 0.16, 10),
        goldPipingMat,
      );
      pointCone.position.set(Math.sin(pa) * 0.14, 0, Math.cos(pa) * 0.14);
      pointCone.rotation.x = Math.PI / 2;
      pointCone.rotation.z = -pa;
      pointCone.scale.set(1.0, 1.0, 0.55);
      starPillowGroup.add(pointCone);
    }
    bedGroup.add(starPillowGroup);

    // 8b. Candy-Pink Chubby Heart Pillow
    const heartPillowGroup = new THREE.Group();
    heartPillowGroup.position.set(0.46, 0.25, -0.50);
    heartPillowGroup.rotation.x = 0.32;
    heartPillowGroup.rotation.z = 0.24;
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xff4081,
      roughness: 0.4,
    });
    const heartLobeL = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 12),
      heartMat,
    );
    heartLobeL.position.set(-0.065, 0, -0.03);
    heartLobeL.scale.set(1.0, 0.6, 1.0);
    const heartLobeR = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 12),
      heartMat,
    );
    heartLobeR.position.set(0.065, 0, -0.03);
    heartLobeR.scale.set(1.0, 0.6, 1.0);
    const heartBase = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.20, 14),
      heartMat,
    );
    heartBase.position.set(0, 0, 0.06);
    heartBase.rotation.x = Math.PI / 2;
    heartBase.scale.set(1.15, 1.0, 0.55);
    heartPillowGroup.add(heartLobeL, heartLobeR, heartBase);
    bedGroup.add(heartPillowGroup);

    // 8c. Folded Rainbow Pastel Blanket along the front-left mattress edge
    const blanketMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.72, 12, 20),
      new THREE.MeshStandardMaterial({
        map: blanketTex,
        roughness: 0.55,
      }),
    );
    blanketMesh.position.set(-0.32, 0.21, 0.58);
    blanketMesh.rotation.z = Math.PI / 2;
    blanketMesh.rotation.y = 0.42;
    blanketMesh.scale.set(0.65, 1.0, 1.35);
    blanketMesh.castShadow = true;
    bedGroup.add(blanketMesh);

    return bedGroup;
  }

  private createDinoBedMattressTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Soft pastel rainbow pie slices radiating from center
    const cx = 256;
    const cy = 256;
    const sliceColors = [
      '#fda4af', // Vibrant Rose Pink
      '#fde047', // Sunny Buttercup Gold
      '#7dd3fc', // Sky Cyan
      '#6ee7b7', // Fresh Mint Emerald
      '#c4b5fd', // Soft Orchid Lavender
      '#fdba74', // Warm Tangerine Peach
      '#f9a8d4', // Candy Bubblegum
      '#93c5fd', // Periwinkle Blue
    ];
    const slices = sliceColors.length;
    for (let i = 0; i < slices; i++) {
      const a0 = (i / slices) * Math.PI * 2;
      const a1 = ((i + 1) / slices) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 260, a0, a1);
      ctx.closePath();
      ctx.fillStyle = sliceColors[i];
      ctx.fill();
    }

    // Quilted diamond/radial stitching lines
    ctx.strokeStyle = 'rgba(255, 160, 190, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    for (const r of [90, 155, 215]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Cute colorful confetti stars & polka dots around the quilt
    const dotColors = ['#ff4081', '#ffab00', '#00b0ff', '#00e676', '#7c4dff'];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + 0.13;
      const rad = i % 2 === 0 ? 124 : 186;
      const px = cx + Math.cos(angle) * rad;
      const py = cy + Math.sin(angle) * rad;
      ctx.fillStyle = dotColors[i % dotColors.length];
      ctx.beginPath();
      ctx.arc(px, py, i % 3 === 0 ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center Cream Medallion with a Cute Pastel Dino Paw Print
    ctx.fillStyle = '#fffdf7';
    ctx.beginPath();
    ctx.arc(cx, cy, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffd54f';
    ctx.stroke();

    // Dino Paw Print pad + 3 toes in center
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 30, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    const toeOffsets = [
      { dx: -26, dy: -18, rot: -0.35 },
      { dx: 0, dy: -26, rot: 0 },
      { dx: 26, dy: -18, rot: 0.35 },
    ];
    for (const toe of toeOffsets) {
      ctx.beginPath();
      ctx.ellipse(cx + toe.dx, cy + toe.dy, 11, 15, toe.rot, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  private createDinoBlanketTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const stripes = [
      '#ff80ab',
      '#ffd740',
      '#69f0ae',
      '#40c4ff',
      '#b388ff',
      '#ff9e80',
    ];
    const h = 256 / stripes.length;
    for (let i = 0; i < stripes.length; i++) {
      ctx.fillStyle = stripes[i];
      ctx.fillRect(0, i * h, 256, h + 1);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(0, i * h, 256, 4);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  private createCastleWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#d6b88e';
    ctx.fillRect(0, 0, 256, 256);

    const rows = 8;
    const cols = 4;
    const rowH = 256 / rows;
    const colW = 256 / cols;
    const brickPalette = ['#e5c99f', '#d4b283', '#c8a06e', '#dfc195', '#cca777'];

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offset;
        const by = r * rowH;
        ctx.fillStyle = brickPalette[(r * 5 + c + 10) % brickPalette.length];
        ctx.fillRect(bx + 2, by + 2, colW - 4, rowH - 4);

        ctx.fillStyle = 'rgba(255, 248, 231, 0.35)';
        ctx.fillRect(bx + 2, by + 2, colW - 4, 3);
        ctx.fillStyle = 'rgba(92, 64, 35, 0.28)';
        ctx.fillRect(bx + 2, by + rowH - 5, colW - 4, 3);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createRoofTileTexture(baseHex: string, darkHex: string, lightHex: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);

    const rows = 8;
    const cols = 8;
    const rH = 256 / rows;
    const cW = 256 / cols;

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const cx = c * cW + offset + cW * 0.5;
        const cy = r * rH + rH * 0.5;

        ctx.beginPath();
        ctx.arc(cx, cy, cW * 0.52, 0, Math.PI, false);
        ctx.fillStyle = (r + c) % 2 === 0 ? baseHex : lightHex;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = darkHex;
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createMushroomCapTexture(
    capColorTop: string,
    capColorEdge: string,
    spotColor: string,
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, capColorTop);
    grad.addColorStop(0.72, capColorEdge);
    grad.addColorStop(1, '#3b0764');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle radial striations
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    for (let x = 8; x < 256; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    // Natural organic toadstool spots
    const spots = [
      [42, 65, 18],
      [115, 52, 22],
      [195, 68, 19],
      [75, 128, 24],
      [158, 122, 21],
      [230, 134, 17],
      [35, 188, 16],
      [112, 194, 20],
      [188, 185, 18],
    ];
    for (const [sx, sy, sr] of spots) {
      const sGrad = ctx.createRadialGradient(sx - 3, sy - 3, 2, sx, sy, sr);
      sGrad.addColorStop(0, '#ffffff');
      sGrad.addColorStop(0.75, spotColor);
      sGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Builds the upgraded storybook Dragon Pet Sanctuary House ("bangunan rumah pet")
   * with a stone cobble terrace, half-timbered walls, dragon-scale shingled roof,
   * side round turret tower, roof dormer, cozy front porch with lantern, and window flower boxes.
   */
  private buildKeeperCottage(): void {
    const cottage = new THREE.Group();
    const cx = 4.95;
    const cz = -7.6;
    const groundY = terrainHeightAt(cx, cz);
    cottage.position.set(cx, groundY, cz);
    cottage.rotation.y = -0.44;

    const wallTex = this.createCastleWallTexture();
    const shingleRedTex = this.createRoofTileTexture('#dc2626', '#7f1d1d', '#f87171');
    const shingleBlueTex = this.createRoofTileTexture('#2563eb', '#1e3a8a', '#60a5fa');

    const stoneBaseMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.85,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0xfef3c7,
      roughness: 0.65,
    });
    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.8,
    });
    const mainRoofMat = new THREE.MeshStandardMaterial({
      map: shingleRedTex,
      color: 0xef4444,
      roughness: 0.5,
      metalness: 0.08,
    });
    const turretRoofMat = new THREE.MeshStandardMaterial({
      map: shingleBlueTex,
      color: 0x3b82f6,
      roughness: 0.48,
      metalness: 0.12,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
      roughness: 0.28,
      metalness: 0.72,
    });
    const windowGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 1. Grounded Stone Foundation Plinth (prevents any slope gap)
    const foundation = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.55, 0.9, 12),
      stoneBaseMat,
    );
    foundation.position.y = -0.15;
    foundation.receiveShadow = true;
    cottage.add(foundation);

    // Front stone steps leading up to the porch
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.15 - s * 0.08, 0.16, 0.36),
        stoneBaseMat,
      );
      step.position.set(0, 0.06 + s * 0.1, 1.48 + (2 - s) * 0.26);
      cottage.add(step);
    }

    // 2. Main Cozy Sanctuary Hall
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.15, 2.35),
      wallMat,
    );
    body.position.y = 1.32;
    body.castShadow = true;
    body.receiveShadow = true;
    cottage.add(body);

    // Rich dark oak half-timber framing beams (vertical, horizontal & diagonal braces)
    [-1.38, 0, 1.38].forEach((bx) => {
      [-1.16, 1.16].forEach((bz) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 2.18, 0.14),
          timberMat,
        );
        post.position.set(bx, 1.32, bz);
        cottage.add(post);
      });
    });
    [0.32, 1.32, 2.32].forEach((by) => {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(2.88, 0.13, 2.43),
        timberMat,
      );
      beam.position.y = by;
      cottage.add(beam);
    });

    // 3. Steep Storybook Dragon-Scale Roof + Golden Crest Finial
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.48, 1.85, 4),
      mainRoofMat,
    );
    roof.position.y = 3.22;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    cottage.add(roof);

    const roofCrest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      goldTrimMat,
    );
    roofCrest.position.y = 4.22;
    cottage.add(roofCrest);

    // 4. Side Round Dragon Turret Tower (Left Wing)
    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.96, 2.85, 16),
      wallMat,
    );
    turret.position.set(-1.65, 1.65, -0.25);
    turret.castShadow = true;
    cottage.add(turret);

    const turretRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.16, 16),
      goldTrimMat,
    );
    turretRing.position.set(-1.65, 3.08, -0.25);
    cottage.add(turretRing);

    const turretRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.15, 1.75, 16),
      turretRoofMat,
    );
    turretRoof.position.set(-1.65, 3.95, -0.25);
    turretRoof.castShadow = true;
    cottage.add(turretRoof);

    const turretFinial = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      goldTrimMat,
    );
    turretFinial.position.set(-1.65, 4.9, -0.25);
    cottage.add(turretFinial);

    // Turret glowing arched window
    const turretWin = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.58, 0.12),
      windowGlowMat,
    );
    turretWin.position.set(-1.65, 2.15, 0.62);
    cottage.add(turretWin);

    // 5. Front Gable Dormer Window on Roof
    const dormerBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.72, 0.85),
      wallMat,
    );
    dormerBox.position.set(0, 2.95, 0.82);
    const dormerRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 0.62, 4),
      turretRoofMat,
    );
    dormerRoof.position.set(0, 3.55, 0.85);
    dormerRoof.rotation.y = Math.PI / 4;
    const dormerWin = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 12),
      windowGlowMat,
    );
    dormerWin.position.set(0, 2.95, 1.26);
    cottage.add(dormerBox, dormerRoof, dormerWin);

    // 6. Welcoming Front Timber Porch Canopy + Glowing Lantern
    const porchRoof = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.14, 0.78),
      mainRoofMat,
    );
    porchRoof.position.set(0, 1.92, 1.48);
    porchRoof.rotation.x = 0.24;
    cottage.add(porchRoof);

    [-0.58, 0.58].forEach((px) => {
      const porchPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 1.65, 8),
        timberMat,
      );
      porchPost.position.set(px, 1.05, 1.72);
      cottage.add(porchPost);
    });

    // Arched oak sanctuary door with golden dragon emblem
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 1.42, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7 }),
    );
    door.position.set(0, 0.98, 1.18);
    const doorEmblem = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.18, 12),
      goldTrimMat,
    );
    doorEmblem.position.set(0, 1.2, 1.26);
    cottage.add(door, doorEmblem);

    // Hanging warm lantern by the entrance
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfde047 }),
    );
    lantern.position.set(0.58, 1.68, 1.82);
    cottage.add(lantern);

    // 7. Framed Glowing Windows with Overflowing Colorful Flower Boxes
    const flowerColors = [0xf43f5e, 0xfbbf24, 0xc084fc, 0x38bdf8];
    [-0.86, 0.86].forEach((wx, wIdx) => {
      const winFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.62, 0.14),
        timberMat,
      );
      winFrame.position.set(wx, 1.45, 1.18);
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.48, 0.16),
        windowGlowMat,
      );
      win.position.set(wx, 1.45, 1.19);
      cottage.add(winFrame, win);

      // Wooden flower box + lush green bush + colorful 3D blossoms
      const planter = new THREE.Mesh(
        new THREE.BoxGeometry(0.64, 0.18, 0.24),
        timberMat,
      );
      planter.position.set(wx, 1.06, 1.28);
      cottage.add(planter);

      for (let f = 0; f < 4; f++) {
        const fx = wx - 0.21 + f * 0.14;
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 }),
        );
        leaf.position.set(fx, 1.18, 1.29);
        const blossom = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.075, 1),
          new THREE.MeshStandardMaterial({
            color: flowerColors[(f + wIdx * 2) % flowerColors.length],
            roughness: 0.3,
          }),
        );
        blossom.position.set(fx, 1.25, 1.31);
        cottage.add(leaf, blossom);
      }
    });

    // 8. Stone Chimney
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.32, 1.9, 8),
      stoneBaseMat,
    );
    chimney.position.set(0.95, 3.05, -0.45);
    cottage.add(chimney);

    this.add(cottage);
  }

  /**
   * Builds the grand fairy-tale Fantasy Castle firmly anchored on the ground
   * ("tempatkan kastil itu di tanah dan buat warna warni kastil tajam")
   * with a deep stepped royal cliff foundation, high-contrast golden-amber stone masonry,
   * crimson/cobalt/amethyst/emerald spire roofs, stained-glass windows, and banners.
   */
  private buildFantasyCastle(): void {
    const castle = new THREE.Group();
    const castleX = -1.0;
    const castleZ = -22.2;
    const groundY = terrainHeightAt(castleX, castleZ);
    // Anchor castle directly on the island terrain so it sits solidly on the ground
    castle.position.set(castleX, groundY - 0.15, castleZ);
    castle.scale.setScalar(1.22);

    const wallTex = this.createCastleWallTexture();
    const crimsonRoofTex = this.createRoofTileTexture('#dc2626', '#7f1d1d', '#fb7185');
    const cobaltRoofTex = this.createRoofTileTexture('#1d4ed8', '#1e3a8a', '#60a5fa');
    const amethystRoofTex = this.createRoofTileTexture('#7c3aed', '#4c1d95', '#c084fc');
    const emeraldRoofTex = this.createRoofTileTexture('#0d9488', '#134e4a', '#2dd4bf');

    // Rich warm sandstone & golden-ochre masonry (avoids washed-out white in bright sun)
    const lowerWallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0xd97706,
      roughness: 0.68,
      metalness: 0.08,
    });
    const upperWallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0xfbbf24,
      roughness: 0.58,
      metalness: 0.1,
    });
    const foundationStoneMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.85,
      metalness: 0.08,
    });
    const trimGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      roughness: 0.24,
      metalness: 0.78,
    });
    const crimsonRoofMat = new THREE.MeshStandardMaterial({
      map: crimsonRoofTex,
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.18,
      roughness: 0.38,
      metalness: 0.18,
    });
    const royalBlueRoofMat = new THREE.MeshStandardMaterial({
      map: cobaltRoofTex,
      color: 0x2563eb,
      emissive: 0x1e40af,
      emissiveIntensity: 0.18,
      roughness: 0.38,
      metalness: 0.18,
    });
    const amethystRoofMat = new THREE.MeshStandardMaterial({
      map: amethystRoofTex,
      color: 0x8b5cf6,
      emissive: 0x5b21b6,
      emissiveIntensity: 0.2,
      roughness: 0.38,
      metalness: 0.18,
    });
    const emeraldRoofMat = new THREE.MeshStandardMaterial({
      map: emeraldRoofTex,
      color: 0x14b8a6,
      emissive: 0x0f766e,
      emissiveIntensity: 0.18,
      roughness: 0.38,
      metalness: 0.18,
    });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const stainedGlassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. Deep Grounded Stone Plinth & Terrace (extends 2.4m down into terrain so zero floating gap)
    const deepPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(4.8, 5.8, 2.6, 12),
      foundationStoneMat,
    );
    deepPlinth.position.y = -0.9;
    deepPlinth.receiveShadow = true;
    castle.add(deepPlinth);

    const upperPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.85, 5.2),
      foundationStoneMat,
    );
    upperPlinth.position.y = 0.42;
    upperPlinth.castShadow = true;
    upperPlinth.receiveShadow = true;
    castle.add(upperPlinth);

    // Grand Front Royal Staircase with Crimson Carpet Runner leading down to the ground
    for (let s = 0; s < 5; s++) {
      const stepW = 2.2 - s * 0.08;
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepW, 0.22, 0.55),
        foundationStoneMat,
      );
      step.position.set(0, 0.08 + s * 0.18, 3.85 - s * 0.32);
      const carpet = new THREE.Mesh(
        new THREE.BoxGeometry(stepW * 0.55, 0.24, 0.57),
        crimsonRoofMat,
      );
      carpet.position.copy(step.position);
      castle.add(step, carpet);
    }

    // 2. Outer Curtain Battlement Wall + Crenellated Merlons
    const curtainWall = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 2.8, 4.2),
      lowerWallMat,
    );
    curtainWall.position.y = 2.15;
    curtainWall.castShadow = true;
    curtainWall.receiveShadow = true;
    castle.add(curtainWall);

    // Battlement Merlons along the front & sides
    for (let mx = -2.6; mx <= 2.6; mx += 0.65) {
      const merlonFront = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.42, 0.38),
        trimGoldMat,
      );
      merlonFront.position.set(mx, 3.72, 2.02);
      castle.add(merlonFront);
    }

    // 3. Central Grand Royal Keep + Pitched Cobalt Blue Palace Roof
    const keep = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 4.8, 3.1),
      upperWallMat,
    );
    keep.position.y = 3.25;
    keep.castShadow = true;
    keep.receiveShadow = true;
    castle.add(keep);

    const keepRoof = new THREE.Mesh(
      new THREE.ConeGeometry(2.95, 2.35, 4),
      royalBlueRoofMat,
    );
    keepRoof.position.y = 6.75;
    keepRoof.rotation.y = Math.PI / 4;
    keepRoof.castShadow = true;
    castle.add(keepRoof);

    // Glowing Rose Stained-Glass Window on Central Keep
    const roseOuter = new THREE.Mesh(
      new THREE.CircleGeometry(0.68, 16),
      trimGoldMat,
    );
    roseOuter.position.set(0, 4.55, 1.58);
    const roseInner = new THREE.Mesh(
      new THREE.CircleGeometry(0.52, 16),
      stainedGlassMat,
    );
    roseInner.position.set(0, 4.55, 1.6);
    castle.add(roseOuter, roseInner);

    // 4. Grand Arched Gatehouse Entrance + Portcullis + Royal Banners
    const gatehouse = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 2.65, 1.25),
      lowerWallMat,
    );
    gatehouse.position.set(0, 2.05, 2.35);
    const gateArch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.68, 1.85, 12),
      new THREE.MeshStandardMaterial({ color: 0x291d12, roughness: 0.9 }),
    );
    gateArch.position.set(0, 1.65, 2.42);
    castle.add(gatehouse, gateArch);

    // Hanging Royal Crimson & Gold Banners flanking the Gatehouse
    [-1.65, 1.65].forEach((bx, bIdx) => {
      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 1.65, 0.08),
        bIdx === 0 ? crimsonRoofMat : amethystRoofMat,
      );
      banner.position.set(bx, 2.35, 2.14);
      const bannerTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.14, 0.1),
        trimGoldMat,
      );
      bannerTrim.position.set(bx, 3.18, 2.15);
      castle.add(banner, bannerTrim);
    });

    // 5. 7 Soaring Multi-Colored Fairy-Tale Spire Towers (Sharp Crimson, Cobalt, Amethyst & Emerald)
    const roofMaterials = [
      crimsonRoofMat,
      royalBlueRoofMat,
      amethystRoofMat,
      emeraldRoofMat,
    ];
    const towers: [number, number, number, number, number, boolean][] = [
      [0, 6.6, -0.2, 1.12, 0, true], // Center Grand Crimson Citadel Spire
      [-2.85, 4.4, 1.65, 0.88, 1, false], // Front-Left Royal Cobalt Tower
      [2.85, 4.4, 1.65, 0.88, 2, false], // Front-Right Imperial Amethyst Tower
      [-2.1, 5.5, -1.0, 0.82, 3, true], // Mid-Left Emerald Teal Tower
      [2.1, 5.5, -1.0, 0.82, 0, true], // Mid-Right Crimson Tower
      [-3.6, 3.4, -0.3, 0.68, 2, false], // Outer-Left Amethyst Bastion
      [3.6, 3.4, -0.3, 0.68, 1, false], // Outer-Right Cobalt Bastion
    ];

    for (const [tx, th, tz, tr, roofIdx, isUpperWall] of towers) {
      const towerCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(tr, tr * 1.1, th, 16),
        isUpperWall ? upperWallMat : lowerWallMat,
      );
      towerCyl.position.set(tx, th / 2 + 0.6, tz);
      towerCyl.castShadow = true;
      towerCyl.receiveShadow = true;
      castle.add(towerCyl);

      // Decorative Golden Belt & Cornice Rings
      const midBand = new THREE.Mesh(
        new THREE.CylinderGeometry(tr * 1.07, tr * 1.07, 0.16, 16),
        trimGoldMat,
      );
      midBand.position.set(tx, th * 0.55 + 0.6, tz);
      const topCornice = new THREE.Mesh(
        new THREE.CylinderGeometry(tr * 1.16, tr * 1.1, 0.26, 16),
        trimGoldMat,
      );
      topCornice.position.set(tx, th + 0.6, tz);
      castle.add(midBand, topCornice);

      const roofCone = new THREE.Mesh(
        new THREE.ConeGeometry(tr * 1.38, tr * 2.75, 16),
        roofMaterials[roofIdx % roofMaterials.length],
      );
      roofCone.position.set(tx, th + 0.6 + tr * 1.38, tz);
      roofCone.castShadow = true;
      castle.add(roofCone);

      const finial = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.24, 0),
        trimGoldMat,
      );
      finial.position.set(tx, th + 0.6 + tr * 2.82, tz);
      castle.add(finial);

      // Fluttering Pennant Flag atop Spire
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.55, 3),
        roofMaterials[(roofIdx + 1) % roofMaterials.length],
      );
      flag.rotation.z = -Math.PI / 2;
      flag.position.set(tx + 0.26, th + 0.8 + tr * 2.82, tz);
      castle.add(flag);

      // Glowing arched tower window
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.68, 0.14),
        windowMat,
      );
      win.position.set(tx, th * 0.72 + 0.6, tz + tr);
      castle.add(win);
    }

    this.add(castle);
  }

  /**
   * Builds 3 floating sky islands with waterfalls and mini castle towers
   * (matching Reference Panel 1 & Panel 2).
   */
  private buildFloatingIslands(): void {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.82,
    });
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.68,
    });
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.65,
    });
    const fallMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });

    const configs = [
      { x: 7.4, y: 4.5, z: -16.0, scale: 1.42, hasWaterfall: false, hasSpire: true },
      { x: 10.2, y: 4.4, z: -13.2, scale: 0.85, hasWaterfall: false, hasSpire: false },
      { x: -8.8, y: 5.6, z: -18.5, scale: 0.95, hasWaterfall: false, hasSpire: false },
    ];

    configs.forEach((cfg, idx) => {
      const group = new THREE.Group();
      group.position.set(cfg.x, cfg.y, cfg.z);
      group.scale.setScalar(cfg.scale);

      // Craggy inverted cone underside
      const underRock = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 2.8, 9),
        rockMat,
      );
      underRock.rotation.x = Math.PI;
      underRock.position.y = -1.4;
      group.add(underRock);

      // Lush green top cap
      const topGrass = new THREE.Mesh(
        new THREE.CylinderGeometry(2.35, 2.15, 0.45, 12),
        grassMat,
      );
      topGrass.position.y = 0.15;
      group.add(topGrass);

      // Mini broadleaf trees on floating island
      [-0.9, 0.85].forEach((tx, tIdx) => {
        const canopy = new THREE.Mesh(
          new THREE.SphereGeometry(0.68, 12, 10),
          treeMat,
        );
        canopy.position.set(tx, 0.85 + tIdx * 0.15, -0.3);
        group.add(canopy);
      });

      if (cfg.hasSpire) {
        const spireTower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.65, 2.2, 12),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.55 }),
        );
        spireTower.position.set(0, 1.3, 0);
        const spireRoof = new THREE.Mesh(
          new THREE.ConeGeometry(0.78, 1.4, 12),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }),
        );
        spireRoof.position.set(0, 3.1, 0);
        group.add(spireTower, spireRoof);
      }

      if (cfg.hasWaterfall) {
        const skyFall = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.65, 4.2, 10, 1, true),
          fallMat,
        );
        skyFall.position.set(0.4, -2.0, 1.65);
        group.add(skyFall);
      }

      this.add(group);
      this.floatingIslands.push({
        group,
        baseY: cfg.y,
        phase: idx * 1.7,
      });
    });
  }

  private buildInstancedFloraAndRocks(quality: GraphicsQuality): void {
    const treeCount = ISLAND_TREES.length;

    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.36, 1.85, 8);
    trunkGeo.translate(0, 0.9, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.86,
    });

    // Lush rounded fantasy canopy (blends well with pines)
    const canopyGeo = new THREE.DodecahedronGeometry(1.38, 1);
    canopyGeo.scale(1.05, 0.92, 1.05);
    canopyGeo.translate(0, 2.55, 0);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.68,
    });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    trunkInst.castShadow = quality !== 'low';
    canopyInst.castShadow = quality !== 'low';
    canopyInst.receiveShadow = true;

    const tint = new THREE.Color();
    for (let idx = 0; idx < treeCount; idx++) {
      const tree = ISLAND_TREES[idx];
      const y = terrainHeightAt(tree.x, tree.z);
      this.dummy.position.set(tree.x, y - 0.05, tree.z);
      this.dummy.rotation.set(0, tree.rotY, 0);
      this.dummy.scale.set(tree.scaleX, tree.scaleY, tree.scaleZ);
      this.dummy.updateMatrix();

      trunkInst.setMatrixAt(idx, this.dummy.matrix);
      canopyInst.setMatrixAt(idx, this.dummy.matrix);

      tint.setHSL(
        0.3 + ((tree.colorIndex % 5) - 2) * 0.025,
        0.74,
        0.43 + (tree.colorIndex % 3) * 0.045,
      );
      canopyInst.setColorAt(idx, tint);
    }

    trunkInst.count = treeCount;
    canopyInst.count = treeCount;
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    this.add(trunkInst, canopyInst);

    // Instanced Rocks (synced 1:1 with ISLAND_ROCKS colliders in rules.ts)
    const rockCount = ISLAND_ROCKS.length;
    const rockGeo = new THREE.DodecahedronGeometry(0.55, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.82,
      metalness: 0.1,
    });
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    for (let idx = 0; idx < rockCount; idx++) {
      const rock = ISLAND_ROCKS[idx];
      const y = terrainHeightAt(rock.x, rock.z);
      this.dummy.position.set(rock.x, y + 0.15, rock.z);
      this.dummy.rotation.set(rock.rotX, rock.rotY, 0);
      this.dummy.scale.set(rock.scaleX, rock.scaleY, rock.scaleZ);
      this.dummy.updateMatrix();
      rockInst.setMatrixAt(idx, this.dummy.matrix);
    }
    rockInst.count = rockCount;
    rockInst.instanceMatrix.needsUpdate = true;
    rockInst.computeBoundingSphere();
    this.add(rockInst);

    // Instanced Colorful Fantasy Blossom Flowers (with green stems + golden centers)
    const flowerCount = quality === 'low' ? 75 : 130;
    const stemGeo = new THREE.CylinderGeometry(0.025, 0.032, 0.24, 6);
    stemGeo.translate(0, 0.12, 0);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.65,
    });

    const flowerGeo = new THREE.OctahedronGeometry(0.18, 1);
    flowerGeo.scale(1.28, 0.48, 1.28);
    flowerGeo.translate(0, 0.24, 0);
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    });

    const centerGeo = new THREE.SphereGeometry(0.068, 8, 6);
    centerGeo.translate(0, 0.28, 0);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.3,
      roughness: 0.35,
    });

    const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
    const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    const centerInst = new THREE.InstancedMesh(centerGeo, centerMat, flowerCount);

    const palette = [
      0xf43f5e, // Ruby Rose
      0xfbbf24, // Sunburst Marigold
      0xa855f7, // Royal Orchid
      0x38bdf8, // Sky Bluebell
      0xfb7185, // Coral Peony
      0xec4899, // Magenta Lotus
    ];
    let placedFlowers = 0;
    for (let i = 0; i < flowerCount * 2 && placedFlowers < flowerCount; i++) {
      const a = i * 1.91;
      const r = 2.6 + ((i * 2.3) % 28);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x - riverCenterXAt(z)) < riverWaterHalfWidthAt(z) + 0.85) {
        continue;
      }
      // Keep the front yard & stone steps of the small Pet House and the Colorful Dino Beds clear of random flowers
      if (
        Math.hypot(x - 3.9, z + 5.6) < 4.2 ||
        Math.hypot(x - 3.35, z - 0.45) < 2.2 ||
        Math.hypot(x - 5.6, z - 5.8) < 2.2
      ) {
        continue;
      }
      const y = terrainHeightAt(x, z);
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, i, 0);
      this.dummy.scale.setScalar(0.88 + (i % 3) * 0.28);
      this.dummy.updateMatrix();
      stemInst.setMatrixAt(placedFlowers, this.dummy.matrix);
      flowerInst.setMatrixAt(placedFlowers, this.dummy.matrix);
      centerInst.setMatrixAt(placedFlowers, this.dummy.matrix);
      tint.setHex(palette[i % palette.length]);
      flowerInst.setColorAt(placedFlowers, tint);
      placedFlowers++;
    }
    stemInst.count = placedFlowers;
    flowerInst.count = placedFlowers;
    centerInst.count = placedFlowers;
    stemInst.instanceMatrix.needsUpdate = true;
    flowerInst.instanceMatrix.needsUpdate = true;
    centerInst.instanceMatrix.needsUpdate = true;
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
    stemInst.computeBoundingSphere();
    flowerInst.computeBoundingSphere();
    centerInst.computeBoundingSphere();
    this.add(stemInst, flowerInst, centerInst);

    // Build Dedicated Enchanted Flower Gardens ("tambahkan taman bunga indah")
    this.buildEnchantedFlowerGarden();
  }

  /**
   * Builds lush, colorful Enchanted Flower Gardens in the sunny West Meadow
   * (across the bridge, relocated away from the front of the small Pet House)
   * and southern meadows, featuring stone garden borders, a rose-covered
   * wooden floral archway, and multi-petaled 3D blossoms.
   */
  private buildEnchantedFlowerGarden(): void {
    const gardenGroup = new THREE.Group();

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.62,
    });
    const brightLeafMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.55,
    });
    const stoneBorderMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.78,
    });
    const archWoodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.75,
    });
    const centerGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const petalMats = [
      new THREE.MeshStandardMaterial({ color: 0xe11d48, emissive: 0x9f1239, emissiveIntensity: 0.22, roughness: 0.3 }), // Crimson Rose
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xb45309, emissiveIntensity: 0.22, roughness: 0.3 }), // Golden Tulip
      new THREE.MeshStandardMaterial({ color: 0x9333ea, emissive: 0x581c87, emissiveIntensity: 0.25, roughness: 0.3 }), // Violet Iris
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.25, roughness: 0.3 }), // Azure Lily
      new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xbe185d, emissiveIntensity: 0.22, roughness: 0.3 }), // Pink Peony
    ];

    // Relocated flower gardens from the front/sightline of the small Pet House
    // to (-11.2, -1.5) in the West Meadow and (9.8, 3.8) in the East Meadow!
    const gardenBeds = [
      { gx: -11.2, gz: -1.5, rx: 1.75, rz: 1.25, hasArch: true },
      { gx: -2.15, gz: 2.85, rx: 1.45, rz: 1.1, hasArch: false },
      { gx: 9.8, gz: 3.8, rx: 1.35, rz: 1.05, hasArch: false },
    ];

    const petalGeo = new THREE.SphereGeometry(0.085, 8, 6);
    petalGeo.scale(1.35, 0.48, 0.85);
    const stemGeo = new THREE.CylinderGeometry(0.024, 0.03, 0.38, 6);
    const centerGeo = new THREE.SphereGeometry(0.065, 8, 6);
    const bushGeo = new THREE.DodecahedronGeometry(0.32, 1);
    bushGeo.scale(1.25, 0.72, 1.25);

    gardenBeds.forEach((bed, bedIdx) => {
      const bedCenterY = terrainHeightAt(bed.gx, bed.gz);

      // Decorative low stone border around the flower bed
      const stoneCount = 16;
      for (let s = 0; s < stoneCount; s++) {
        const ang = (s / stoneCount) * Math.PI * 2;
        const sx = bed.gx + Math.cos(ang) * bed.rx;
        const sz = bed.gz + Math.sin(ang) * bed.rz;
        const sy = terrainHeightAt(sx, sz);
        const stone = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.18, 0),
          stoneBorderMat,
        );
        stone.scale.set(1.2, 0.75, 1.1);
        stone.position.set(sx, sy + 0.06, sz);
        stone.rotation.y = ang;
        gardenGroup.add(stone);
      }

      // Lush green foliage cushions + 5-petal 3D blossoms inside the garden bed
      const rings = [
        { rScale: 0.0, count: 1 },
        { rScale: 0.42, count: 6 },
        { rScale: 0.76, count: 11 },
      ];

      let flowerIdx = bedIdx * 3;
      for (const ring of rings) {
        for (let c = 0; c < ring.count; c++) {
          const ang = (c / ring.count) * Math.PI * 2 + ring.rScale;
          const fx = bed.gx + Math.cos(ang) * (bed.rx * ring.rScale);
          const fz = bed.gz + Math.sin(ang) * (bed.rz * ring.rScale);
          const fy = terrainHeightAt(fx, fz);

          // Leafy cushion at base
          const bush = new THREE.Mesh(
            bushGeo,
            (flowerIdx % 2 === 0) ? foliageMat : brightLeafMat,
          );
          bush.position.set(fx, fy + 0.1, fz);
          bush.scale.setScalar(0.75 + (flowerIdx % 3) * 0.16);
          gardenGroup.add(bush);

          // Tall 3D Blossom with 5 radiating petals + golden center
          const blossomGroup = new THREE.Group();
          const stemH = 0.34 + (flowerIdx % 3) * 0.08;
          blossomGroup.position.set(fx, fy, fz);

          const stem = new THREE.Mesh(stemGeo, foliageMat);
          stem.position.y = stemH * 0.5;
          blossomGroup.add(stem);

          const headY = stemH;
          const pMat = petalMats[flowerIdx % petalMats.length];
          for (let p = 0; p < 5; p++) {
            const pAng = (p / 5) * Math.PI * 2;
            const petal = new THREE.Mesh(petalGeo, pMat);
            petal.position.set(
              Math.cos(pAng) * 0.085,
              headY,
              Math.sin(pAng) * 0.085,
            );
            petal.rotation.y = -pAng;
            petal.rotation.z = 0.22;
            blossomGroup.add(petal);
          }

          const center = new THREE.Mesh(centerGeo, centerGoldMat);
          center.position.y = headY + 0.02;
          blossomGroup.add(center);

          gardenGroup.add(blossomGroup);
          flowerIdx++;
        }
      }

      // Rose-Covered Wooden Garden Archway over the main Enchanted Garden
      if (bed.hasArch) {
        const archGroup = new THREE.Group();
        archGroup.position.set(bed.gx, bedCenterY, bed.gz);
        archGroup.rotation.y = -0.35;

        [-1.15, 1.15].forEach((px) => {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.09, 2.05, 8),
            archWoodMat,
          );
          post.position.set(px, 1.0, 0);
          archGroup.add(post);
        });

        const topArch = new THREE.Mesh(
          new THREE.TorusGeometry(1.15, 0.085, 8, 18, Math.PI),
          archWoodMat,
        );
        topArch.position.y = 2.0;
        archGroup.add(topArch);

        // Climbing vines & glowing roses along the archway
        for (let v = 0; v <= 8; v++) {
          const t = (v / 8) * Math.PI;
          const vx = Math.cos(t) * 1.15;
          const vy = 2.0 + Math.sin(t) * 1.15;
          const vineLeaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 8, 6),
            foliageMat,
          );
          vineLeaf.position.set(vx, vy, 0);
          const archRose = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.11, 1),
            petalMats[v % petalMats.length],
          );
          archRose.position.set(vx, vy + 0.06, 0.11);
          archGroup.add(vineLeaf, archRose);
        }

        gardenGroup.add(archGroup);
      }
    });

    this.add(gardenGroup);
  }

  /**
   * Builds realistic, vividly colored 3D spotted toadstool mushroom clusters
   * ("beri warna pada jamur2 agar terlihat nyata") and glowing magical crystals.
   */
  private buildMushroomsAndCrystals(): void {
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.62,
    });
    const gillMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.78,
    });
    const spotDotMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
    });

    // 4 Realistic Colorful Mushroom Cap Varieties with procedural spotted textures
    const mushroomVarieties = [
      new THREE.MeshStandardMaterial({
        map: this.createMushroomCapTexture('#ef4444', '#b91c1c', '#fef2f2'),
        color: 0xff4d4d,
        emissive: 0x991b1b,
        emissiveIntensity: 0.28,
        roughness: 0.32,
      }), // Classic Scarlet Red Toadstool
      new THREE.MeshStandardMaterial({
        map: this.createMushroomCapTexture('#fbbf24', '#d97706', '#fef9c3'),
        color: 0xfbbf24,
        emissive: 0xb45309,
        emissiveIntensity: 0.3,
        roughness: 0.32,
      }), // Golden Sun-Chanterelle
      new THREE.MeshStandardMaterial({
        map: this.createMushroomCapTexture('#22d3ee', '#0284c7', '#e0f2fe'),
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.45,
        roughness: 0.26,
      }), // Bioluminescent Aqua-Cyan Shroom
      new THREE.MeshStandardMaterial({
        map: this.createMushroomCapTexture('#c084fc', '#7e22ce', '#f3e8ff'),
        color: 0xc084fc,
        emissive: 0x9333ea,
        emissiveIntensity: 0.42,
        roughness: 0.28,
      }), // Royal Amethyst Fairy Cap
    ];

    // Clusters placed around the foreground sanctuary, bridge approach, pet house, and garden
    const mushroomClusters: { x: number; z: number; scale: number; variety: number }[] = [
      // Foreground right by flower garden & sanctuary
      { x: 1.55, z: -1.65, scale: 1.25, variety: 0 },
      { x: 1.92, z: -1.45, scale: 0.85, variety: 1 },
      { x: 1.32, z: -1.35, scale: 0.68, variety: 0 },
      // Foreground left near river bridge approach
      { x: -1.95, z: -1.85, scale: 1.3, variety: 2 },
      { x: -2.35, z: -1.6, scale: 0.92, variety: 3 },
      { x: -1.68, z: -1.5, scale: 0.72, variety: 0 },
      // By the Pet Sanctuary House
      { x: 3.35, z: -6.2, scale: 1.35, variety: 0 },
      { x: 3.78, z: -5.9, scale: 0.95, variety: 1 },
      // Original scenic spots around the island
      { x: -4.2, z: 6.8, scale: 1.2, variety: 0 },
      { x: -4.8, z: 7.3, scale: 0.88, variety: 3 },
      { x: -11.5, z: -5.2, scale: 1.3, variety: 2 },
      { x: -12.1, z: -4.6, scale: 0.9, variety: 0 },
      { x: 9.4, z: 2.2, scale: 1.25, variety: 1 },
      { x: 10.0, z: 2.8, scale: 0.85, variety: 3 },
      { x: -2.5, z: -11.0, scale: 1.35, variety: 0 },
    ];

    const spotAngles = [
      [0.35, 0.5],
      [0.52, 1.8],
      [0.48, 3.1],
      [0.55, 4.4],
      [0.38, 5.5],
    ];

    for (const m of mushroomClusters) {
      const mGroup = new THREE.Group();
      const my = terrainHeightAt(m.x, m.z);
      mGroup.position.set(m.x, my, m.z);
      mGroup.scale.setScalar(m.scale);

      // 1. Bulbous realistic stem base + upper stem
      const stemBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 8),
        stemMat,
      );
      stemBase.scale.set(1.0, 1.25, 1.0);
      stemBase.position.y = 0.12;

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.125, 0.46, 12),
        stemMat,
      );
      stem.position.y = 0.25;

      // Delicate ring skirt (annulus) on the upper stem
      const skirt = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.1, 12, 1, true),
        gillMat,
      );
      skirt.position.y = 0.34;

      // 2. Under-cap radially ribbed gill plate
      const gills = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.11, 0.08, 16),
        gillMat,
      );
      gills.position.y = 0.44;

      // 3. Domed colorful spotted mushroom cap
      const capRadius = 0.35;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(capRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
        mushroomVarieties[m.variety % mushroomVarieties.length],
      );
      cap.position.y = 0.42;
      cap.castShadow = true;

      // 4. Raised 3D white wart spots on the mushroom cap for extra realism
      for (const [polar, azim] of spotAngles) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 8, 6),
          spotDotMat,
        );
        dot.scale.set(1.15, 0.55, 1.15);
        const r = capRadius * 0.98;
        dot.position.set(
          r * Math.sin(polar) * Math.cos(azim),
          0.42 + r * Math.cos(polar),
          r * Math.sin(polar) * Math.sin(azim),
        );
        mGroup.add(dot);
      }

      mGroup.add(stemBase, stem, skirt, gills, cap);
      this.add(mGroup);
    }

    // Multi-Spire Glowing Magical Crystal Clusters (matching Reference Panel 2)
    const crystalCoords = [
      { x: -13.5, z: 3.5, color: 0x38bdf8, emissive: 0x0284c7 },
      { x: 4.5, z: -7.5, color: 0xc084fc, emissive: 0x7e22ce },
      { x: -2.4, z: -3.2, color: 0x38bdf8, emissive: 0x0ea5e9 },
      { x: 4.8, z: 2.2, color: 0xf472b6, emissive: 0xdb2777 },
      { x: 12.2, z: -1.8, color: 0xfbbf24, emissive: 0xd97706 },
    ];

    crystalCoords.forEach((c, idx) => {
      const cGroup = new THREE.Group();
      const cy = groundHeightAt(c.x, c.z);
      cGroup.position.set(c.x, cy, c.z);

      const crystalMat = new THREE.MeshStandardMaterial({
        color: c.color,
        emissive: c.emissive,
        emissiveIntensity: 0.72,
        roughness: 0.12,
        metalness: 0.45,
      });

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.75, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 }),
      );
      pedestal.position.y = 0.15;
      cGroup.add(pedestal);

      // Central main levitating spire
      const crystalMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.48, 0),
        crystalMat,
      );
      crystalMesh.scale.set(0.75, 1.55, 0.75);
      crystalMesh.position.y = 1.25;
      cGroup.add(crystalMesh);
      this.crystals.push(crystalMesh);

      // 3 Angled side crystal shards at base
      for (let s = 0; s < 3; s++) {
        const sa = (s / 3) * Math.PI * 2 + 0.5;
        const sideShard = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.28, 0),
          crystalMat,
        );
        sideShard.scale.set(0.65, 1.4, 0.65);
        sideShard.position.set(Math.cos(sa) * 0.38, 0.48, Math.sin(sa) * 0.38);
        sideShard.rotation.z = -Math.cos(sa) * 0.42;
        sideShard.rotation.x = Math.sin(sa) * 0.42;
        cGroup.add(sideShard);
      }

      this.add(cGroup);

      if (idx === 0) {
        this.interactiveZones.push({
          id: 'mana_crystal',
          label: 'Harmonic Mana Crystal',
          actionHint: 'Resonate with Crystal (Play / Dance with EMBER)',
          position: cGroup.position.clone(),
          radius: 3.2,
          meshGroup: cGroup,
        });
      }
    });
  }

  private buildDistantMountains(): void {
    // Use fog: false on distant horizon mountains so scene FogExp2 doesn't bleach them into pale blue-grey triangles
    const rockMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0x475569, // Rich alpine slate rock
        emissive: 0x1e293b,
        emissiveIntensity: 0.14,
        roughness: 0.82,
        metalness: 0.06,
        fog: false,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x57534e, // Warm sunlit granite ridge
        emissive: 0x292524,
        emissiveIntensity: 0.14,
        roughness: 0.84,
        metalness: 0.05,
        fog: false,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x3b4f66, // Deep mountain indigo-slate
        emissive: 0x1e293b,
        emissiveIntensity: 0.14,
        roughness: 0.82,
        metalness: 0.06,
        fog: false,
      }),
    ];
    const foothillGreenMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Lush emerald pine foothills
      emissive: 0x064e3b,
      emissiveIntensity: 0.12,
      roughness: 0.78,
      metalness: 0.04,
      fog: false,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.18,
      roughness: 0.42,
      metalness: 0.05,
      fog: false,
    });

    const peakCount = 16;
    for (let i = 0; i < peakCount; i++) {
      const a = (i / peakCount) * Math.PI * 2;
      const dist = 78 + (i % 3) * 10;
      const h = 19 + (i % 4) * 6;
      const r = 12 + (i % 3) * 4;
      const rockMat = rockMaterials[i % rockMaterials.length];

      const peakGroup = new THREE.Group();
      peakGroup.position.set(Math.cos(a) * dist, -1.5, Math.sin(a) * dist);
      peakGroup.rotation.y = a + (i % 2 === 0 ? 0.35 : -0.25);

      // 1. Lush emerald forested foothills base skirt
      const foothillH = h * 0.42;
      const foothill = new THREE.Mesh(
        new THREE.ConeGeometry(r * 1.06, foothillH, 9),
        foothillGreenMat,
      );
      foothill.position.y = foothillH / 2;

      // 2. Main rocky alpine peak
      const base = new THREE.Mesh(
        new THREE.ConeGeometry(r * 0.92, h, 9),
        rockMat,
      );
      base.position.y = h / 2;

      // 3. Sunlit snow-capped summit
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(r * 0.35, h * 0.36, 9),
        snowMat,
      );
      cap.position.y = h * 0.82;

      // 4. Secondary shoulder ridge peak for natural mountain silhouette
      const sideH = h * 0.68;
      const sideR = r * 0.62;
      const sidePeak = new THREE.Mesh(
        new THREE.ConeGeometry(sideR, sideH, 8),
        rockMaterials[(i + 1) % rockMaterials.length],
      );
      sidePeak.position.set(r * 0.42, sideH / 2, r * 0.18);

      const sideCap = new THREE.Mesh(
        new THREE.ConeGeometry(sideR * 0.34, sideH * 0.32, 8),
        snowMat,
      );
      sideCap.position.set(r * 0.42, sideH * 0.84, r * 0.18);

      peakGroup.add(foothill, base, cap, sidePeak, sideCap);
      this.add(peakGroup);
    }
  }

  private buildSkyClouds(): void {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
    });

    const cloudLocations = [
      [-22, 16, -36],
      [18, 17.5, -34],
      [-8, 19, -42],
      [26, 15, -26],
      [-28, 14.5, -22],
    ];

    for (const [cx, cy, cz] of cloudLocations) {
      const cGroup = new THREE.Group();
      cGroup.position.set(cx, cy, cz);
      [-1.4, 0, 1.4].forEach((ox, idx) => {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(idx === 1 ? 2.2 : 1.6, 12, 10),
          cloudMat,
        );
        puff.scale.set(1.3, 0.68, 0.9);
        puff.position.set(ox, idx === 1 ? 0.35 : 0, 0);
        cGroup.add(puff);
      });
      this.add(cGroup);
      this.skyClouds.push({
        group: cGroup,
        baseX: cx,
        speed: 0.25 + Math.random() * 0.2,
      });
    }
  }

  private buildFloatingParticles(quality: GraphicsQuality): void {
    const count = quality === 'low' ? 30 : quality === 'medium' ? 55 : 85;
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
    });
    this.firefliesMesh = new THREE.InstancedMesh(geo, mat, count);
    this.firefliesMesh.frustumCulled = false;

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 28;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = groundHeightAt(x, z) + 0.5 + Math.random() * 2.8;
      this.fireflyData.push({
        basePos: new THREE.Vector3(x, y, z),
        speed: 0.8 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.add(this.firefliesMesh);

    // Ambient Magical Sparkles across the Fantasy Island using THREE.Points
    this.buildAmbientSparklePoints(quality);
  }

  private ambientSparklePoints!: THREE.Points;
  private ambientSparkleCount = 0;
  private ambientPositions!: Float32Array;
  private ambientBasePositions!: Float32Array;
  private ambientColors!: Float32Array;
  private ambientBaseColors!: Float32Array;
  private ambientSpeeds!: Float32Array;
  private ambientPhases!: Float32Array;
  private ambientDriftRadii!: Float32Array;

  private createSparkleSpriteTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const cx = 32;
      const cy = 32;
      // Soft glowing radial aura
      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 30);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.25, 'rgba(255, 250, 220, 0.92)');
      grad.addColorStop(0.58, 'rgba(255, 220, 130, 0.38)');
      grad.addColorStop(1.0, 'rgba(255, 200, 80, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      // Crisp 4-point diamond star flare
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(cx, 3);
      ctx.quadraticCurveTo(cx + 3, cy - 3, 61, cy);
      ctx.quadraticCurveTo(cx + 3, cy + 3, cx, 61);
      ctx.quadraticCurveTo(cx - 3, cy + 3, 3, cy);
      ctx.quadraticCurveTo(cx - 3, cy - 3, cx, 3);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildAmbientSparklePoints(quality: GraphicsQuality): void {
    const count = quality === 'low' ? 160 : quality === 'medium' ? 260 : 380;
    this.ambientSparkleCount = count;
    this.ambientPositions = new Float32Array(count * 3);
    this.ambientBasePositions = new Float32Array(count * 3);
    this.ambientColors = new Float32Array(count * 3);
    this.ambientBaseColors = new Float32Array(count * 3);
    this.ambientSpeeds = new Float32Array(count);
    this.ambientPhases = new Float32Array(count);
    this.ambientDriftRadii = new Float32Array(count);

    const sparklePalette = [
      new THREE.Color(0xfef08a), // Warm starlight gold
      new THREE.Color(0xfbbf24), // Royal amber gold
      new THREE.Color(0x38bdf8), // Celestial mana cyan
      new THREE.Color(0xf472b6), // Enchanted lotus rose
      new THREE.Color(0xc084fc), // Bioluminescent amethyst
      new THREE.Color(0x6ee7b7), // Emerald fairy mint
      new THREE.Color(0xe0f2fe), // Waterfall diamond mist
    ];

    const crystalAnchors = [
      [-13.5, 3.5],
      [4.5, -7.5],
      [-2.4, -3.2],
      [4.8, 2.2],
      [12.2, -1.8],
    ];

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let z = 0;
      let color: THREE.Color;

      if (i < count * 0.32) {
        // Zone 1: Central Sanctuary Rim & Foreground Meadow (outside close-up camera lens)
        const a = (i * 2.39996) % (Math.PI * 2);
        const r = 2.65 + ((i * 0.45) % 7.5);
        x = Math.cos(a) * r;
        z = Math.sin(a) * r - 1.5;
        y = groundHeightAt(x, z) + 0.4 + ((i * 0.29) % 2.6);
        color = sparklePalette[i % 4];
      } else if (i < count * 0.58) {
        // Zone 2: Glowing Crystal Clusters & Floating Sky Islands
        if (i % 2 === 0) {
          const anchor = crystalAnchors[i % crystalAnchors.length];
          const a = i * 1.7;
          const r = 0.5 + (i % 5) * 0.45;
          x = anchor[0] + Math.cos(a) * r;
          z = anchor[1] + Math.sin(a) * r;
          y = groundHeightAt(x, z) + 0.4 + (i % 6) * 0.48;
          color = sparklePalette[2 + (i % 3)];
        } else {
          // Floating sky islands & northern castle vista
          const islIdx = i % 3;
          const islX = islIdx === 0 ? 7.4 : islIdx === 1 ? 10.2 : -8.8;
          const islY = islIdx === 0 ? 4.5 : islIdx === 1 ? 2.1 : 5.6;
          const islZ = islIdx === 0 ? -16.0 : islIdx === 1 ? -13.2 : -18.5;
          const a = i * 2.1;
          const r = 1.2 + (i % 6) * 0.55;
          x = islX + Math.cos(a) * r;
          z = islZ + Math.sin(a) * r;
          y = islY - 1.2 + (i % 8) * 0.65;
          color = sparklePalette[i % 5];
        }
      } else if (i < count * 0.76) {
        // Zone 3: Twin-Tier Waterfall & Winding River Shimmer
        const isFall = i % 2 === 0;
        if (isFall) {
          x = -6.5 + ((i % 9) - 4) * 0.68;
          z = -20.8 + ((i % 5) - 2) * 0.55;
          y = 0.5 + (i % 10) * 0.62;
          color = sparklePalette[6];
        } else {
          z = -18 + (i % 34);
          const riverCenterX = Math.sin(z * 0.14) * 2.8 - 6.5;
          x = riverCenterX + ((i % 7) - 3) * 0.85;
          y = 0.55 + (i % 5) * 0.35;
          color = sparklePalette[i % 2 === 0 ? 2 : 5];
        }
      } else {
        // Zone 4: Island-wide Enchanted Forest & Bridge Canopy Sparkles
        const a = (i * 2.39996) % (Math.PI * 2);
        const r = 6.0 + ((i * 1.13) % 24.0);
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = groundHeightAt(x, z) + 0.45 + ((i * 0.53) % 3.6);
        color = sparklePalette[i % sparklePalette.length];
      }

      const idx3 = i * 3;
      this.ambientPositions[idx3] = x;
      this.ambientPositions[idx3 + 1] = y;
      this.ambientPositions[idx3 + 2] = z;
      this.ambientBasePositions[idx3] = x;
      this.ambientBasePositions[idx3 + 1] = y;
      this.ambientBasePositions[idx3 + 2] = z;

      this.ambientBaseColors[idx3] = color.r;
      this.ambientBaseColors[idx3 + 1] = color.g;
      this.ambientBaseColors[idx3 + 2] = color.b;
      this.ambientColors[idx3] = color.r;
      this.ambientColors[idx3 + 1] = color.g;
      this.ambientColors[idx3 + 2] = color.b;

      this.ambientSpeeds[i] = 0.65 + (i % 9) * 0.18;
      this.ambientPhases[i] = (i * 0.83) % (Math.PI * 2);
      this.ambientDriftRadii[i] = 0.22 + (i % 5) * 0.11;
    }

    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.ambientPositions, 3),
    );
    sparkleGeo.setAttribute(
      'color',
      new THREE.BufferAttribute(this.ambientColors, 3),
    );

    const sparkleMat = new THREE.PointsMaterial({
      size: 0.21,
      map: this.createSparkleSpriteTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.ambientSparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
    this.ambientSparklePoints.name = 'IslandAmbientSparkles';
    this.ambientSparklePoints.frustumCulled = false;
    this.ambientSparklePoints.raycast = () => {};
    this.add(this.ambientSparklePoints);
  }

  /**
   * Builds a lively school of 10 cute, colorful 3D fish swimming in the crystal river
   * and periodically leaping gracefully out of the water ("tambahkan ikan warna warni lucu
   * di dalam air sungai. dan sesekali melompat keatas").
   */
  private buildRiverFish(): void {
    const fishPalette = [
      { body: 0xff5722, emissive: 0xc2410c, fin: 0xfde047, stripe: 0xffffff }, // Coral Tangerine Koi
      { body: 0xfacc15, emissive: 0xb45309, fin: 0xfb7185, stripe: 0xfef9c3 }, // Sunny Lemon Goldfish
      { body: 0x06b6d4, emissive: 0x0369a1, fin: 0xf472b6, stripe: 0xe0f2fe }, // Electric Turquoise Tetra
      { body: 0xf43f5e, emissive: 0x9f1239, fin: 0xfef08a, stripe: 0xffe4e6 }, // Sakura Rose Angel
      { body: 0xa855f7, emissive: 0x581c87, fin: 0x38bdf8, stripe: 0xf3e8ff }, // Starlight Amethyst Guppy
      { body: 0x10b981, emissive: 0x047857, fin: 0xfde047, stripe: 0xd1fae5 }, // Emerald Mint Danio
    ];

    const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    const fishConfigs = [
      { zMin: -14.8, zMax: -7.5, startZ: -11.2, lane: -0.45, speed: 1.65, initialJumpWait: 0.1 },
      { zMin: -12.5, zMax: -4.8, startZ: -8.2, lane: 0.52, speed: 1.78, initialJumpWait: 0.55 },
      { zMin: -9.5, zMax: -2.4, startZ: -5.4, lane: -0.32, speed: 1.7, initialJumpWait: 0.25 },
      { zMin: -7.8, zMax: -2.1, startZ: -3.6, lane: 0.44, speed: 1.85, initialJumpWait: 0.85 },
      { zMin: 2.0, zMax: 5.8, startZ: 3.1, lane: 0.55, speed: 1.6, initialJumpWait: 0.15 }, // Foreground left river!
      { zMin: 2.2, zMax: 6.6, startZ: 4.4, lane: -0.35, speed: 1.75, initialJumpWait: 0.65 }, // Foreground left river!
      { zMin: 3.5, zMax: 9.2, startZ: 5.8, lane: 0.38, speed: 1.55, initialJumpWait: 1.15 },
      { zMin: 6.0, zMax: 13.5, startZ: 8.8, lane: -0.42, speed: 1.68, initialJumpWait: 0.45 },
      { zMin: -16.8, zMax: -10.2, startZ: -13.8, lane: 0.28, speed: 1.52, initialJumpWait: 0.95 },
      { zMin: 9.5, zMax: 17.5, startZ: 12.8, lane: 0.35, speed: 1.62, initialJumpWait: 1.35 },
    ];

    fishConfigs.forEach((cfg, idx) => {
      const colors = fishPalette[idx % fishPalette.length];
      const bodyMat = new THREE.MeshStandardMaterial({
        color: colors.body,
        emissive: colors.emissive,
        emissiveIntensity: 0.35,
        roughness: 0.22,
        metalness: 0.12,
      });
      const finMat = new THREE.MeshStandardMaterial({
        color: colors.fin,
        emissive: colors.fin,
        emissiveIntensity: 0.4,
        roughness: 0.28,
        side: THREE.DoubleSide,
      });
      const stripeMat = new THREE.MeshStandardMaterial({
        color: colors.stripe,
        roughness: 0.3,
      });

      const fishGroup = new THREE.Group();
      const scale = 1.38 + (idx % 3) * 0.16;
      fishGroup.scale.setScalar(scale);

      // 1. Chubby Cute 3D Fish Body (aligned along +Z nose, -Z tail)
      const bodyGeo = new THREE.SphereGeometry(0.16, 14, 12);
      bodyGeo.scale(0.72, 0.92, 1.45);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      fishGroup.add(bodyMesh);

      // Cute contrasting decorative body band / belly stripe
      const stripeRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.118, 0.112, 0.065, 12),
        stripeMat,
      );
      stripeRing.rotation.x = Math.PI / 2;
      stripeRing.scale.set(0.98, 1.0, 1.22);
      stripeRing.position.set(0, 0, 0.02);
      fishGroup.add(stripeRing);

      // Cute plump cheeks & pouting fish lips at the front (+Z)
      const lipMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.036, 0.016, 8, 12),
        finMat,
      );
      lipMesh.position.set(0, -0.015, 0.225);
      fishGroup.add(lipMesh);

      // 2. Big Expressive Cartoon Eyes on Left & Right Sides
      [-1, 1].forEach((side) => {
        const eyeWhite = new THREE.Mesh(
          new THREE.SphereGeometry(0.038, 10, 8),
          scleraMat,
        );
        eyeWhite.position.set(side * 0.095, 0.035, 0.13);
        const pupil = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 8, 8),
          pupilMat,
        );
        pupil.position.set(side * 0.118, 0.038, 0.142);
        const catchlight = new THREE.Mesh(
          new THREE.SphereGeometry(0.009, 6, 6),
          scleraMat,
        );
        catchlight.position.set(side * 0.128, 0.048, 0.15);
        fishGroup.add(eyeWhite, pupil, catchlight);
      });

      // 3. Cute Top Dorsal Fin
      const dorsalFin = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.15, 6),
        finMat,
      );
      dorsalFin.scale.set(0.32, 1.0, 1.35);
      dorsalFin.rotation.x = -0.45;
      dorsalFin.position.set(0, 0.165, -0.02);
      fishGroup.add(dorsalFin);

      // 4. Fluttering Side Pectoral Fins
      const finGeo = new THREE.ConeGeometry(0.048, 0.13, 6);
      finGeo.scale(0.28, 1.0, 1.15);
      const leftFin = new THREE.Mesh(finGeo, finMat);
      leftFin.position.set(-0.11, -0.02, 0.04);
      leftFin.rotation.set(0.25, 0.35, 1.15);
      const rightFin = new THREE.Mesh(finGeo, finMat);
      rightFin.position.set(0.11, -0.02, 0.04);
      rightFin.rotation.set(0.25, -0.35, -1.15);
      fishGroup.add(leftFin, rightFin);

      // 5. Articulated Wagging Heart-Shaped Caudal Tail Fin at -Z
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0, -0.21);
      fishGroup.add(tailPivot);

      const upperTailLobe = new THREE.Mesh(
        new THREE.ConeGeometry(0.065, 0.18, 8),
        finMat,
      );
      upperTailLobe.scale.set(0.28, 1.0, 1.15);
      upperTailLobe.rotation.x = -Math.PI / 2 + 0.52;
      upperTailLobe.position.set(0, 0.055, -0.075);

      const lowerTailLobe = new THREE.Mesh(
        new THREE.ConeGeometry(0.058, 0.16, 8),
        finMat,
      );
      lowerTailLobe.scale.set(0.28, 1.0, 1.15);
      lowerTailLobe.rotation.x = -Math.PI / 2 - 0.52;
      lowerTailLobe.position.set(0, -0.05, -0.07);

      tailPivot.add(upperTailLobe, lowerTailLobe);

      // 6. Water Surface Splash Ripple Ring when leaping / diving
      const splashRing = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.26, 20),
        new THREE.MeshBasicMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        }),
      );
      splashRing.rotation.x = -Math.PI / 2;
      splashRing.position.set(
        riverCenterXAt(cfg.startZ) + cfg.lane,
        WATER_SURFACE_Y + 0.025,
        cfg.startZ,
      );
      this.add(splashRing);

      const startX = riverCenterXAt(cfg.startZ) + cfg.lane;
      fishGroup.position.set(startX, WATER_SURFACE_Y + 0.02, cfg.startZ);
      this.add(fishGroup);

      this.riverFish.push({
        group: fishGroup,
        tailPivot,
        leftFin,
        rightFin,
        splashRing,
        zMin: cfg.zMin,
        zMax: cfg.zMax,
        zPos: cfg.startZ,
        zDir: idx % 2 === 0 ? 1 : -1,
        swimSpeed: cfg.speed,
        laneOffset: cfg.lane,
        wigglePhase: idx * 1.35,
        jumpCooldown: cfg.initialJumpWait,
        jumpProgress: idx % 3 === 0 ? 0.38 : -1, // Start 4 fish already mid-leap so they are immediately visible!
        jumpDuration: 1.15 + (idx % 3) * 0.12,
        jumpHeight: 1.35 + (idx % 3) * 0.25,
      });
    });
  }

  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.05);
    this.elapsed += clampedDt;

    // Bob and spin magical crystals
    for (let i = 0; i < this.crystals.length; i++) {
      const crystal = this.crystals[i];
      crystal.rotation.y += clampedDt * 1.2;
      crystal.position.y = 1.25 + Math.sin(this.elapsed * 2.2 + i) * 0.16;
    }

    // Gentle levitation for floating sky islands
    for (const isl of this.floatingIslands) {
      isl.group.position.y =
        isl.baseY + Math.sin(this.elapsed * 0.9 + isl.phase) * 0.28;
    }

    // Drift sky clouds gently
    for (const c of this.skyClouds) {
      c.group.position.x =
        c.baseX + Math.sin(this.elapsed * c.speed) * 2.5;
    }

    // Animate waterfall splash droplets
    for (const drop of this.waterfallDrops) {
      drop.mesh.position.y -= drop.vy * clampedDt;
      if (drop.mesh.position.y < drop.minY) {
        drop.mesh.position.y = drop.baseY;
      }
    }

    // Scroll river & waterfall textures so water visibly flows from the waterfall underneath the bridge
    if (this.riverTexture) {
      this.riverTexture.offset.y -= clampedDt * 0.52;
    }
    if (this.waterfallTexture) {
      this.waterfallTexture.offset.y += clampedDt * 1.55;
    }

    // Pulse concentric foam rings at the waterfall plunge pool and under the bridge
    for (const fRing of this.foamRings) {
      const s =
        fRing.baseScale + Math.sin(this.elapsed * 2.6 + fRing.phase) * 0.12;
      fRing.mesh.scale.set(s, s, 1);
    }

    // Animate cute colorful river fish swimming along the winding stream & periodically leaping up!
    for (const fish of this.riverFish) {
      const prevZ = fish.zPos;
      const prevX = fish.group.position.x;

      const speedBoost = fish.jumpProgress >= 0 ? 1.32 : 1.0;
      fish.zPos += fish.zDir * fish.swimSpeed * speedBoost * clampedDt;
      if (fish.zPos > fish.zMax) {
        fish.zPos = fish.zMax;
        fish.zDir = -1;
      } else if (fish.zPos < fish.zMin) {
        fish.zPos = fish.zMin;
        fish.zDir = 1;
      }

      const slalom =
        Math.sin(this.elapsed * 2.2 + fish.wigglePhase) * 0.26;
      const nextX = riverCenterXAt(fish.zPos) + fish.laneOffset + slalom;

      const dx = nextX - prevX;
      const dz = fish.zPos - prevZ;
      if (Math.hypot(dx, dz) > 0.0001) {
        fish.group.rotation.y = Math.atan2(dx, dz);
      }

      // Handle periodic jumping into the air ("sesekali melompat keatas")
      const splashMat = fish.splashRing.material as THREE.MeshBasicMaterial;
      if (fish.jumpProgress >= 0) {
        fish.jumpProgress += clampedDt / fish.jumpDuration;
        if (fish.jumpProgress >= 1) {
          fish.jumpProgress = -1;
          fish.jumpCooldown = 1.4 + ((fish.wigglePhase * 1.3) % 2.1);
          fish.group.position.y = WATER_SURFACE_Y + 0.02;
          fish.group.rotation.x = 0;
          fish.group.rotation.z = 0;
          splashMat.opacity = 0;
        } else {
          // Graceful parabolic jump arc above the river surface!
          const arc = Math.sin(fish.jumpProgress * Math.PI);
          fish.group.position.y =
            WATER_SURFACE_Y + 0.02 + arc * fish.jumpHeight;
          // Pitch nose upward on takeoff, level at apex, and nose-down when diving back in!
          fish.group.rotation.x =
            -Math.cos(fish.jumpProgress * Math.PI) * 0.82;
          fish.group.rotation.z =
            Math.sin(fish.jumpProgress * Math.PI * 2) * 0.18;

          // Expand water splash ring at takeoff (0..0.28) and splash reentry (0.72..1.0)
          if (fish.jumpProgress < 0.28) {
            const p = fish.jumpProgress / 0.28;
            fish.splashRing.position.set(
              nextX,
              WATER_SURFACE_Y + 0.03,
              fish.zPos,
            );
            fish.splashRing.scale.setScalar(0.6 + p * 1.9);
            splashMat.opacity = (1 - p) * 0.85;
          } else if (fish.jumpProgress > 0.72) {
            const p = (fish.jumpProgress - 0.72) / 0.28;
            fish.splashRing.position.set(
              nextX,
              WATER_SURFACE_Y + 0.03,
              fish.zPos,
            );
            fish.splashRing.scale.setScalar(0.5 + p * 2.1);
            splashMat.opacity = (1 - p) * 0.9;
          } else {
            splashMat.opacity = 0;
          }
        }
      } else {
        // Skimming at the crystal river surface so colorful bodies & dorsal fins shine clearly!
        fish.group.position.y =
          WATER_SURFACE_Y +
          0.02 +
          Math.sin(this.elapsed * 3.4 + fish.wigglePhase) * 0.03;
        fish.group.rotation.x =
          Math.cos(this.elapsed * 3.4 + fish.wigglePhase) * 0.06;
        fish.group.rotation.z =
          Math.sin(this.elapsed * 5.0 + fish.wigglePhase) * 0.08;
        splashMat.opacity = 0;

        fish.jumpCooldown -= clampedDt;
        // Avoid jumping directly underneath the wooden bridge deck planks (z in [-1.8, 1.8])
        if (fish.jumpCooldown <= 0 && Math.abs(fish.zPos) > 1.95) {
          fish.jumpProgress = 0;
        }
      }

      fish.group.position.x = nextX;
      fish.group.position.z = fish.zPos;

      // Fast happy tail-fin wiggle & pectoral fin flutter
      const wagFreq = fish.jumpProgress >= 0 ? 26.0 : 14.5;
      const wagAmp = fish.jumpProgress >= 0 ? 0.65 : 0.45;
      const wag = Math.sin(this.elapsed * wagFreq + fish.wigglePhase) * wagAmp;
      fish.tailPivot.rotation.y = wag;
      fish.leftFin.rotation.z = 1.15 + wag * 0.45;
      fish.rightFin.rotation.z = -1.15 - wag * 0.45;
    }

    // Animate THREE.Points waterfall mist spray rising at the plunge lagoon
    if (this.waterfallMistPoints) {
      const mistPosAttr = this.waterfallMistPoints.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      for (let i = 0; i < this.waterfallMistCount; i++) {
        const idx3 = i * 3;
        this.waterfallMistPositions[idx3] +=
          this.waterfallMistVelocities[idx3] * clampedDt;
        this.waterfallMistPositions[idx3 + 1] +=
          this.waterfallMistVelocities[idx3 + 1] * clampedDt;
        this.waterfallMistPositions[idx3 + 2] +=
          this.waterfallMistVelocities[idx3 + 2] * clampedDt;

        if (this.waterfallMistPositions[idx3 + 1] > WATER_SURFACE_Y + 2.8) {
          this.resetWaterfallMistParticle(i, 0);
        }
      }
      mistPosAttr.needsUpdate = true;
    }

    // Animate floating firefly sparkles
    for (let i = 0; i < this.fireflyData.length; i++) {
      const f = this.fireflyData[i];
      const t = this.elapsed * f.speed + f.phase;
      this.dummy.position.set(
        f.basePos.x + Math.sin(t) * 0.5,
        f.basePos.y + Math.cos(t * 1.3) * 0.35,
        f.basePos.z + Math.cos(t * 0.8) * 0.5,
      );
      const pulse = 0.65 + Math.sin(t * 3) * 0.35;
      this.dummy.scale.setScalar(pulse);
      this.dummy.updateMatrix();
      this.firefliesMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.firefliesMesh.instanceMatrix.needsUpdate = true;

    // Animate THREE.Points ambient magical sparkles across the island
    if (this.ambientSparklePoints) {
      const geo = this.ambientSparklePoints.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < this.ambientSparkleCount; i++) {
        const idx3 = i * 3;
        const speed = this.ambientSpeeds[i];
        const phase = this.ambientPhases[i];
        const drift = this.ambientDriftRadii[i];
        const t = this.elapsed * speed + phase;

        // Smooth swirling horizontal drift + rising/bobbing vertical motion
        const riseOffset = ((this.elapsed * speed * 0.42 + phase) % 1.8) - 0.3;
        this.ambientPositions[idx3] =
          this.ambientBasePositions[idx3] + Math.sin(t) * drift;
        this.ambientPositions[idx3 + 1] =
          this.ambientBasePositions[idx3 + 1] +
          riseOffset * 0.55 +
          Math.cos(t * 1.4) * 0.18;
        this.ambientPositions[idx3 + 2] =
          this.ambientBasePositions[idx3 + 2] + Math.cos(t * 0.9) * drift;

        // Twinkling starlight brightness modulation
        const twinkle = 0.58 + 0.42 * Math.sin(t * 2.8);
        this.ambientColors[idx3] = Math.min(
          1,
          this.ambientBaseColors[idx3] * twinkle + 0.12 * twinkle,
        );
        this.ambientColors[idx3 + 1] = Math.min(
          1,
          this.ambientBaseColors[idx3 + 1] * twinkle + 0.1 * twinkle,
        );
        this.ambientColors[idx3 + 2] = Math.min(
          1,
          this.ambientBaseColors[idx3 + 2] * twinkle + 0.12 * twinkle,
        );
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  }
}
