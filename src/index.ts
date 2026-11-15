import * as xb from 'xrblocks';
import { MindARTracker } from './ar/MindARTracker';
import { SoundManager } from './audio/SoundManager';
import { HUNGER_TICK_INTERVAL_MS } from './game/rules';
import { storageManager } from './storage/StorageManager';
import { GameUI } from './ui/GameUI';
import { IslandWorldEngine } from './world/IslandWorldEngine';
import { XRCreatureScript } from './xr/XRCreatureScript';

/**
 * Entry point for XR CREATURE WORLD.
 * Initializes:
 * 1. LocalStorage state & real-time stat decay timer.
 * 2. Web Audio SoundManager.
 * 3. 3D Solara Fantasy Island & EMBER Dragon engine (`IslandWorldEngine`).
 * 4. Real Camera MindAR Image Tracker (`MindARTracker`) anchored to `/assets/ar/ember-card.mind`.
 * 5. Responsive Desktop/Mobile Game Shell (`GameUI`).
 * 6. Native XR Blocks (`xb.Script`) spatial companion card for WebXR headsets.
 */
function bootstrapApplication(): void {
  const rootEl = document.getElementById('root');
  const uiEl = document.getElementById('game-ui');
  if (!rootEl || !uiEl) return;

  const initialState = storageManager.getState();
  const soundManager = new SoundManager(initialState.settings);

  let gameUI: GameUI | null = null;

  const worldEngine = new IslandWorldEngine(
    rootEl,
    initialState.settings.graphicsQuality,
    {
      onJump: () => soundManager.playJump(),
      onStep: () => soundManager.playFootstep(),
      onPetInteract: (action) => gameUI?.handlePetAction(action),
      onZoneProximityChange: (zone) => gameUI?.onNearbyZoneChanged(zone),
    },
  );
  worldEngine.setCosmetic(initialState.progression.equippedCosmetic);
  worldEngine.setFriendship(initialState.stats.friendship);
  worldEngine.setSleepingState(initialState.stats.isSleeping);
  worldEngine.player.cameraSensitivity = initialState.settings.cameraSensitivity;

  const arTracker = new MindARTracker({
    onStatusChange: (status) => gameUI?.onARStatusUpdated(status),
    onFirstMarkerFound: () => {
      const unlocked = storageManager.recordArTargetSummon();
      soundManager.playLevelUp();
      if (unlocked.length > 0) {
        gameUI?.showFeedback(
          'Dimensional Summoner Achievement Unlocked! (+120 XP)',
        );
      }
    },
  });

  // Preload the compiled MindAR `.mind` target file in background
  void arTracker.loadMindTarget();

  gameUI = new GameUI(uiEl, worldEngine, arTracker, soundManager);

  // Periodic background hunger & care timer (every 15 seconds)
  const tickSeconds = Math.round(HUNGER_TICK_INTERVAL_MS / 1000);
  window.setInterval(() => {
    storageManager.tickRealtimeDecay(tickSeconds);
  }, HUNGER_TICK_INTERVAL_MS);

  // Catch up background hunger decay if tab was hidden or backgrounded on mobile/desktop
  let hiddenAtMs: number | null = null;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAtMs = Date.now();
    } else if (document.visibilityState === 'visible' && hiddenAtMs !== null) {
      const elapsedSec = Math.floor((Date.now() - hiddenAtMs) / 1000);
      hiddenAtMs = null;
      if (elapsedSec >= tickSeconds) {
        storageManager.tickRealtimeDecay(elapsedSec);
      }
    }
  });

  // Expose deterministic timer & feed feedback helpers on window for automated verification
  const win = window as unknown as Record<string, unknown>;
  win.advanceHungerTimer = (seconds = tickSeconds) =>
    storageManager.tickRealtimeDecay(seconds);
  win.setPetHungerLevel = (hunger: number) =>
    storageManager.setHungerLevel(hunger);
  win.getEmberFeedState = () => ({
    animation: worldEngine.ember.getAnimationState(),
    activeGoldenSparks: worldEngine.ember.getActiveFeedSparkCount(),
    jumpOffset: worldEngine.ember.getFeedJumpOffset(),
    rootPivotY: Number(worldEngine.ember.rootPivot.position.y.toFixed(4)),
    celebrationTimer: Number(
      worldEngine.ember.getFeedCelebrationTimer().toFixed(3),
    ),
  });

  // Register XR Blocks script for Android XR headset support
  try {
    const xrScript = new XRCreatureScript((action) =>
      gameUI?.handlePetAction(action),
    );
    xb.add(xrScript);
    if (
      typeof navigator !== 'undefined' &&
      'xr' in navigator &&
      navigator.xr &&
      typeof navigator.xr.isSessionSupported === 'function'
    ) {
      void navigator.xr
        .isSessionSupported('immersive-ar')
        .then((supported) => {
          if (supported) {
            const options = new xb.Options();
            options.setAppTitle('Emberix World');
            options.setAppDescription(
              '3D Virtual Pet & AR Dragon Simulator with EMBER on Solara Island.',
            );
            return xb.init(options);
          }
        })
        .catch(() => {
          // Standard 3D/MindAR mode active
        });
    }
  } catch {
    // Graceful fallback if WebXR is unavailable
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApplication);
} else {
  bootstrapApplication();
}
