import * as THREE from 'three';
import * as xb from 'xrblocks';
import { EmberModel } from '../creatures/EmberModel';
import { storageManager } from '../storage/StorageManager';
import type { PetActionType } from '../types';

/**
 * XR Blocks Spatial Scene & Spatial UI Controller (`xb.Script`)
 *
 * Provides a native XR Blocks spatial companion experience with `xb.UICard`,
 * `xb.UIPanel`, `xb.UIText`, `xb.UIButton`, and `xb.UISlider` when the user
 * enters WebXR / Android XR mode, synced in real time with `storageManager`.
 */
export class XRCreatureScript extends xb.Script {
  private spatialEmber?: EmberModel;
  private statusText?: xb.UIText;
  private statsText?: xb.UIText;
  private levelText?: xb.UIText;
  private onActionCallback?: (action: PetActionType) => void;
  private unsubscribe?: () => void;

  constructor(onAction?: (action: PetActionType) => void) {
    super();
    this.onActionCallback = onAction;
  }

  init() {
    this.add(new THREE.HemisphereLight(0xfffbeb, 0x3b82f6, 2.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(2, 5, 2);
    this.add(dirLight);

    // 3D EMBER Dragon positioned in comfortable XR viewing distance
    this.spatialEmber = new EmberModel();
    this.spatialEmber.position.set(0.38, 1.05, -1.25);
    this.spatialEmber.scale.setScalar(0.75);
    this.spatialEmber.xb = { manipulation: true };
    this.add(this.spatialEmber);

    // Spatial UI Card for interacting with EMBER in XR
    const state = storageManager.getState();
    this.levelText = new xb.UIText({
      text: `EMBER · Lv.${state.progression.creatureLevel} · Bond Lv.${state.progression.friendshipLevel}`,
      style: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    });

    this.statsText = new xb.UIText({
      text: this.formatStatsLine(),
      style: { fontSize: 16, textAlign: 'center', opacity: 0.9 },
    });

    this.statusText = new xb.UIText({
      text: 'Pinch or select an action to care for EMBER in XR.',
      style: { fontSize: 15, textAlign: 'center', opacity: 0.78 },
    });

    const actionRow1 = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 10 },
      children: [
        new xb.UIButton({
          label: 'Pet',
          icon: 'favorite',
          style: { flexGrow: 1 },
          onClick: () => this.triggerAction('pet'),
        }),
        new xb.UIButton({
          label: 'Feed',
          icon: 'restaurant',
          style: { flexGrow: 1 },
          onClick: () => this.triggerAction('feed'),
        }),
        new xb.UIButton({
          label: 'Play',
          icon: 'sports_esports',
          style: { flexGrow: 1 },
          onClick: () => this.triggerAction('play'),
        }),
      ],
    });

    const actionRow2 = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 10 },
      children: [
        new xb.UIButton({
          label: 'Dance',
          icon: 'music_note',
          style: { flexGrow: 1 },
          onClick: () => this.triggerAction('dance'),
        }),
        new xb.UIButton({
          label: 'Sleep',
          icon: 'bedtime',
          style: { flexGrow: 1 },
          onClick: () => this.triggerAction('sleep'),
        }),
      ],
    });

    const card = new xb.UICard({
      size: { width: 0.62, height: 'auto' },
      manipulation: true,
      edge: true,
      style: { flexDirection: 'column', gap: 14, padding: 20 },
      children: [
        new xb.UIText({
          text: 'XR CREATURE WORLD',
          style: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
        }),
        this.levelText,
        this.statsText,
        actionRow1,
        actionRow2,
        this.statusText,
      ],
    });
    card.position.set(-0.35, 1.42, -1.25);
    this.add(card);

    this.unsubscribe = storageManager.subscribe((next) => {
      if (this.levelText) {
        this.levelText.text = `EMBER · Lv.${next.progression.creatureLevel} · Bond Lv.${next.progression.friendshipLevel}`;
      }
      if (this.statsText) {
        this.statsText.text = this.formatStatsLine();
      }
      this.spatialEmber?.setCosmetic(next.progression.equippedCosmetic);
      this.spatialEmber?.setFriendshipLevel(next.stats.friendship);
    });
  }

  private formatStatsLine(): string {
    const s = storageManager.getState().stats;
    return `Hunger ${s.hunger}% · Happy ${s.happiness}% · Energy ${s.energy}% · Bond ${s.friendship}%`;
  }

  private triggerAction(action: PetActionType): void {
    if (this.onActionCallback) {
      this.onActionCallback(action);
    } else {
      const res = storageManager.dispatchPetAction(action);
      this.spatialEmber?.playAnimation(res.animation, 2.2);
      if (this.statusText) {
        this.statusText.text = res.feedbackText;
      }
    }
  }

  update() {
    const dt = xb.getDeltaTime ? xb.getDeltaTime() : 0.016;
    this.spatialEmber?.update(dt);
  }

  dispose() {
    this.unsubscribe?.();
    this.spatialEmber?.dispose();
  }
}
