import { BACKGROUND_TRACKS, DANCE_TRACKS } from '../constants';
import type { BackgroundTrackId, DanceTrackId, GameSettings } from '../types';

interface StepNote {
  lead?: number;
  leadType?: OscillatorType;
  bass?: number;
  kick?: boolean;
  snare?: boolean;
  hat?: boolean;
}

interface RomanticBgmStep {
  pad?: number[];
  bass?: number;
  harp?: number;
  melody?: number;
  melodyDur?: number;
}

/**
 * 3 Soft, Romantic, 100% Copyright-Free (CC0 / Public Domain) Background Music
 * Arrangements tailored for Emberix World's magical fantasy island sanctuary:
 * 1. Solara Sunset Serenade (CC0 Original — Fmaj7 / C/E / Dm7 / Am7 / Bbmaj7 / F/A / Gm7 / Csus4)
 * 2. Starlight Sanctuary (Erik Satie 1888 Gymnopédie No. 1 — Public Domain Romantic Piano & Harp)
 * 3. Moonlit Blossom Nocturne (CC0 Original — Gentle Music Box & Warm Flute Lullaby)
 */
const BGM_PATTERNS: Record<
  BackgroundTrackId,
  { stepMs: number; steps: RomanticBgmStep[] }
> = {
  // 1. Solara Sunset Serenade (68 BPM — Soft Romantic Harp, Celesta & Warm Strings — CC0)
  solara_serenade: {
    stepMs: 440,
    steps: [
      // Bar 1: Fmaj7 (Warm & Tender)
      {
        pad: [174.61, 220.0, 261.63, 329.63],
        bass: 87.31,
        harp: 261.63,
        melody: 523.25,
        melodyDur: 1.15,
      },
      { harp: 329.63, melody: 659.25, melodyDur: 1.1 },
      { harp: 349.23, melody: 698.46, melodyDur: 1.3 },
      { harp: 440.0, melody: 523.25, melodyDur: 1.0 },
      // Bar 2: C/E (Floating Breeze)
      {
        pad: [164.81, 196.0, 261.63, 329.63],
        bass: 164.81,
        harp: 261.63,
        melody: 659.25,
        melodyDur: 1.2,
      },
      { harp: 329.63, melody: 587.33, melodyDur: 1.05 },
      { harp: 392.0, melody: 523.25, melodyDur: 1.45 },
      { harp: 329.63 },
      // Bar 3: Dm7 (Heartfelt Affection)
      {
        pad: [146.83, 174.61, 220.0, 261.63],
        bass: 146.83,
        harp: 220.0,
        melody: 587.33,
        melodyDur: 1.15,
      },
      { harp: 261.63, melody: 698.46, melodyDur: 1.15 },
      { harp: 349.23, melody: 880.0, melodyDur: 1.35 },
      { harp: 440.0, melody: 783.99, melodyDur: 1.05 },
      // Bar 4: Am7 (Dreamy Starlight)
      {
        pad: [110.0, 164.81, 196.0, 261.63],
        bass: 110.0,
        harp: 261.63,
        melody: 659.25,
        melodyDur: 1.2,
      },
      { harp: 329.63, melody: 523.25, melodyDur: 1.05 },
      { harp: 392.0, melody: 587.33, melodyDur: 1.4 },
      { harp: 329.63 },
      // Bar 5: Bbmaj7 (Romantic Swell)
      {
        pad: [116.54, 174.61, 220.0, 293.66],
        bass: 116.54,
        harp: 233.08,
        melody: 587.33,
        melodyDur: 1.15,
      },
      { harp: 293.66, melody: 698.46, melodyDur: 1.2 },
      { harp: 349.23, melody: 659.25, melodyDur: 1.15 },
      { harp: 440.0, melody: 587.33, melodyDur: 1.05 },
      // Bar 6: F/A (Gentle Embrace)
      {
        pad: [110.0, 174.61, 220.0, 261.63],
        bass: 110.0,
        harp: 261.63,
        melody: 523.25,
        melodyDur: 1.2,
      },
      { harp: 349.23, melody: 698.46, melodyDur: 1.2 },
      { harp: 440.0, melody: 523.25, melodyDur: 1.15 },
      { harp: 349.23, melody: 440.0, melodyDur: 1.05 },
      // Bar 7: Gm7 (Golden Sunset)
      {
        pad: [98.0, 146.83, 174.61, 233.08],
        bass: 98.0,
        harp: 196.0,
        melody: 466.16,
        melodyDur: 1.15,
      },
      { harp: 233.08, melody: 523.25, melodyDur: 1.15 },
      { harp: 293.66, melody: 587.33, melodyDur: 1.15 },
      { harp: 349.23, melody: 698.46, melodyDur: 1.25 },
      // Bar 8: Csus4 -> C7 (Tender Resolution)
      {
        pad: [130.81, 174.61, 196.0, 261.63],
        bass: 130.81,
        harp: 261.63,
        melody: 659.25,
        melodyDur: 1.2,
      },
      { harp: 349.23, melody: 587.33, melodyDur: 1.1 },
      {
        pad: [130.81, 164.81, 196.0, 233.08],
        harp: 329.63,
        melody: 523.25,
        melodyDur: 1.1,
      },
      { harp: 392.0, melody: 587.33, melodyDur: 1.25 },
    ],
  },

  // 2. Starlight Sanctuary — Erik Satie 1888 Gymnopédie No. 1 (Public Domain Romantic Piano & Harp)
  starlight_gymnopedie: {
    stepMs: 465,
    steps: [
      // Bar 1: Gmaj7 (3/4 Waltz)
      { bass: 98.0, harp: 196.0 },
      {
        pad: [196.0, 246.94, 293.66, 369.99],
        harp: 293.66,
        melody: 739.99,
        melodyDur: 1.25,
      },
      { harp: 369.99, melody: 880.0, melodyDur: 1.15 },
      // Bar 2: Dmaj7
      { bass: 73.42, harp: 146.83, melody: 783.99, melodyDur: 1.2 },
      {
        pad: [146.83, 220.0, 277.18, 369.99],
        harp: 277.18,
        melody: 739.99,
        melodyDur: 1.2,
      },
      { harp: 369.99, melody: 554.37, melodyDur: 1.15 },
      // Bar 3: Gmaj7
      { bass: 98.0, harp: 196.0, melody: 493.88, melodyDur: 1.2 },
      {
        pad: [196.0, 246.94, 293.66, 369.99],
        harp: 293.66,
        melody: 554.37,
        melodyDur: 1.2,
      },
      { harp: 369.99, melody: 587.33, melodyDur: 1.2 },
      // Bar 4: Dmaj7
      { bass: 73.42, harp: 146.83, melody: 440.0, melodyDur: 1.65 },
      {
        pad: [146.83, 220.0, 277.18, 369.99],
        harp: 220.0,
      },
      { harp: 369.99, melody: 369.99, melodyDur: 1.35 },
      // Bar 5: Gmaj7
      { bass: 98.0, harp: 196.0 },
      {
        pad: [196.0, 246.94, 293.66, 369.99],
        harp: 293.66,
        melody: 739.99,
        melodyDur: 1.25,
      },
      { harp: 369.99, melody: 880.0, melodyDur: 1.15 },
      // Bar 6: Dmaj7
      { bass: 73.42, harp: 146.83, melody: 783.99, melodyDur: 1.2 },
      {
        pad: [146.83, 220.0, 277.18, 369.99],
        harp: 277.18,
        melody: 739.99,
        melodyDur: 1.2,
      },
      { harp: 369.99, melody: 554.37, melodyDur: 1.15 },
      // Bar 7: Em7 -> Bm7 Romantic Turn
      {
        pad: [164.81, 196.0, 246.94, 293.66],
        bass: 82.41,
        harp: 246.94,
        melody: 493.88,
        melodyDur: 1.2,
      },
      { harp: 293.66, melody: 554.37, melodyDur: 1.2 },
      { harp: 369.99, melody: 587.33, melodyDur: 1.25 },
      // Bar 8: A7sus4 -> Dmaj7 Resolution
      {
        pad: [110.0, 164.81, 220.0, 293.66],
        bass: 110.0,
        harp: 220.0,
        melody: 659.25,
        melodyDur: 1.3,
      },
      { harp: 277.18, melody: 587.33, melodyDur: 1.2 },
      { harp: 369.99, melody: 554.37, melodyDur: 1.3 },
    ],
  },

  // 3. Moonlit Blossom Nocturne (72 BPM — Gentle Romantic Music Box & Flute — CC0)
  moonlit_romance: {
    stepMs: 415,
    steps: [
      // Bar 1: Cmaj7
      {
        pad: [130.81, 196.0, 246.94, 329.63],
        bass: 130.81,
        harp: 261.63,
        melody: 659.25,
        melodyDur: 1.1,
      },
      { harp: 329.63, melody: 783.99, melodyDur: 1.1 },
      { harp: 392.0, melody: 740.0, melodyDur: 0.9 },
      { harp: 493.88, melody: 659.25, melodyDur: 1.1 },
      // Bar 2: G/B
      {
        pad: [123.47, 196.0, 246.94, 293.66],
        bass: 123.47,
        harp: 246.94,
        melody: 587.33,
        melodyDur: 1.2,
      },
      { harp: 293.66, melody: 659.25, melodyDur: 1.0 },
      { harp: 392.0, melody: 493.88, melodyDur: 1.3 },
      { harp: 293.66 },
      // Bar 3: Am9
      {
        pad: [110.0, 164.81, 196.0, 246.94],
        bass: 110.0,
        harp: 220.0,
        melody: 523.25,
        melodyDur: 1.1,
      },
      { harp: 261.63, melody: 659.25, melodyDur: 1.1 },
      { harp: 329.63, melody: 880.0, melodyDur: 1.3 },
      { harp: 392.0, melody: 783.99, melodyDur: 1.0 },
      // Bar 4: Em7
      {
        pad: [82.41, 164.81, 196.0, 246.94],
        bass: 82.41,
        harp: 196.0,
        melody: 659.25,
        melodyDur: 1.25,
      },
      { harp: 246.94, melody: 587.33, melodyDur: 1.05 },
      { harp: 329.63, melody: 523.25, melodyDur: 1.3 },
      { harp: 246.94 },
      // Bar 5: Fmaj7
      {
        pad: [87.31, 174.61, 220.0, 261.63],
        bass: 87.31,
        harp: 220.0,
        melody: 698.46,
        melodyDur: 1.15,
      },
      { harp: 261.63, melody: 659.25, melodyDur: 1.1 },
      { harp: 329.63, melody: 587.33, melodyDur: 1.1 },
      { harp: 349.23, melody: 523.25, melodyDur: 1.1 },
      // Bar 6: C/E
      {
        pad: [82.41, 164.81, 196.0, 261.63],
        bass: 82.41,
        harp: 196.0,
        melody: 659.25,
        melodyDur: 1.2,
      },
      { harp: 261.63, melody: 523.25, melodyDur: 1.15 },
      { harp: 329.63, melody: 440.0, melodyDur: 1.25 },
      { harp: 261.63 },
      // Bar 7: Dm7
      {
        pad: [146.83, 174.61, 220.0, 261.63],
        bass: 146.83,
        harp: 220.0,
        melody: 587.33,
        melodyDur: 1.15,
      },
      { harp: 261.63, melody: 659.25, melodyDur: 1.1 },
      { harp: 349.23, melody: 698.46, melodyDur: 1.2 },
      { harp: 440.0, melody: 783.99, melodyDur: 1.1 },
      // Bar 8: G13 -> Cmaj7 Lead-in
      {
        pad: [98.0, 174.61, 246.94, 329.63],
        bass: 98.0,
        harp: 196.0,
        melody: 659.25,
        melodyDur: 1.2,
      },
      { harp: 246.94, melody: 587.33, melodyDur: 1.1 },
      { harp: 293.66, melody: 523.25, melodyDur: 1.15 },
      { harp: 392.0, melody: 587.33, melodyDur: 1.2 },
    ],
  },
};

/**
 * 4 Copyright-Free / Public-Domain Dance Music Arrangements (16-step patterns)
 * synthesized in real time via Web Audio API so they work offline & on mobile
 * with zero external MP3 copyright claims or 404s.
 */
const TRACK_PATTERNS: Record<
  DanceTrackId,
  { stepMs: number; steps: StepNote[] }
> = {
  // 1. Dino Bounce Party (128 BPM Tropical Marimba & Bounce Bass — Original CC0)
  dino_bounce: {
    stepMs: 117,
    steps: [
      { lead: 523.25, bass: 130.81, kick: true, hat: true, leadType: 'triangle' },
      { hat: true },
      { lead: 659.25, bass: 130.81, hat: true, leadType: 'triangle' },
      { lead: 783.99, hat: true, leadType: 'triangle' },
      { lead: 1046.5, bass: 164.81, snare: true, hat: true, leadType: 'triangle' },
      { hat: true },
      { lead: 783.99, bass: 196.0, kick: true, hat: true, leadType: 'triangle' },
      { lead: 659.25, hat: true, leadType: 'triangle' },
      { lead: 587.33, bass: 146.83, kick: true, hat: true, leadType: 'triangle' },
      { lead: 659.25, hat: true, leadType: 'triangle' },
      { lead: 783.99, bass: 146.83, hat: true, leadType: 'triangle' },
      { lead: 880.0, hat: true, leadType: 'triangle' },
      { lead: 783.99, bass: 196.0, snare: true, hat: true, leadType: 'triangle' },
      { lead: 659.25, hat: true, leadType: 'triangle' },
      { lead: 523.25, bass: 130.81, kick: true, hat: true, leadType: 'triangle' },
      { lead: 783.99, snare: true, hat: true, leadType: 'triangle' },
    ],
  },

  // 2. Dragon Disco Fever (124 BPM Funky Octave Bass & Synth Brass — Original CC0)
  dragon_disco: {
    stepMs: 121,
    steps: [
      { lead: 440.0, bass: 110.0, kick: true, hat: true, leadType: 'sawtooth' },
      { bass: 220.0, hat: true },
      { lead: 523.25, bass: 110.0, hat: true, leadType: 'sawtooth' },
      { lead: 659.25, bass: 220.0, hat: true, leadType: 'sawtooth' },
      { lead: 880.0, bass: 130.81, kick: true, snare: true, hat: true, leadType: 'sawtooth' },
      { bass: 261.63, hat: true },
      { lead: 783.99, bass: 130.81, hat: true, leadType: 'sawtooth' },
      { lead: 659.25, bass: 261.63, hat: true, leadType: 'sawtooth' },
      { lead: 587.33, bass: 146.83, kick: true, hat: true, leadType: 'sawtooth' },
      { bass: 293.66, hat: true },
      { lead: 659.25, bass: 146.83, hat: true, leadType: 'sawtooth' },
      { lead: 783.99, bass: 293.66, hat: true, leadType: 'sawtooth' },
      { lead: 659.25, bass: 164.81, kick: true, snare: true, hat: true, leadType: 'sawtooth' },
      { lead: 587.33, bass: 329.63, hat: true, leadType: 'sawtooth' },
      { lead: 523.25, bass: 110.0, hat: true, leadType: 'sawtooth' },
      { lead: 659.25, bass: 220.0, snare: true, hat: true, leadType: 'sawtooth' },
    ],
  },

  // 3. Can-Can Dino Polka (142 BPM Jacques Offenbach 1858 Galop Infernal — Public Domain)
  cancan_polka: {
    stepMs: 105,
    steps: [
      { lead: 587.33, bass: 196.0, kick: true, hat: true, leadType: 'square' },
      { hat: true },
      { lead: 587.33, bass: 293.66, snare: true, hat: true, leadType: 'square' },
      { hat: true },
      { lead: 659.25, bass: 196.0, kick: true, hat: true, leadType: 'square' },
      { lead: 783.99, bass: 293.66, snare: true, hat: true, leadType: 'square' },
      { lead: 739.99, bass: 196.0, kick: true, hat: true, leadType: 'square' },
      { lead: 659.25, bass: 293.66, snare: true, hat: true, leadType: 'square' },
      { lead: 880.0, bass: 146.83, kick: true, hat: true, leadType: 'square' },
      { hat: true },
      { lead: 880.0, bass: 220.0, snare: true, hat: true, leadType: 'square' },
      { hat: true },
      { lead: 880.0, bass: 146.83, kick: true, hat: true, leadType: 'square' },
      { lead: 987.77, bass: 220.0, snare: true, hat: true, leadType: 'square' },
      { lead: 739.99, bass: 146.83, kick: true, hat: true, leadType: 'square' },
      { lead: 783.99, bass: 196.0, snare: true, hat: true, leadType: 'square' },
    ],
  },

  // 4. Ember Electro Fiesta (132 BPM Upbeat Latin Chiptune Party — Original CC0)
  electro_fiesta: {
    stepMs: 113,
    steps: [
      { lead: 659.25, bass: 164.81, kick: true, hat: true, leadType: 'square' },
      { lead: 783.99, hat: true, leadType: 'square' },
      { lead: 987.77, bass: 164.81, hat: true, leadType: 'square' },
      { lead: 880.0, snare: true, hat: true, leadType: 'square' },
      { lead: 783.99, bass: 196.0, kick: true, hat: true, leadType: 'square' },
      { hat: true },
      { lead: 659.25, bass: 196.0, snare: true, hat: true, leadType: 'square' },
      { lead: 587.33, hat: true, leadType: 'square' },
      { lead: 523.25, bass: 130.81, kick: true, hat: true, leadType: 'square' },
      { lead: 659.25, hat: true, leadType: 'square' },
      { lead: 783.99, bass: 130.81, hat: true, leadType: 'square' },
      { lead: 880.0, snare: true, hat: true, leadType: 'square' },
      { lead: 987.77, bass: 146.83, kick: true, hat: true, leadType: 'square' },
      { lead: 880.0, hat: true, leadType: 'square' },
      { lead: 783.99, bass: 196.0, snare: true, hat: true, leadType: 'square' },
      { lead: 1046.5, kick: true, hat: true, leadType: 'square' },
    ],
  },
};

/**
 * Procedural Web Audio API sound synthesizer, Soft Romantic Copyright-Free
 * Background Music Engine & Dance Music Jukebox for Emberix World.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private ambienceTimer: number | null = null;
  private bgmStepIndex = 0;
  private activeBgmTrack: BackgroundTrackId = 'solara_serenade';
  private danceTimer: number | null = null;
  private danceStopTimeout: number | null = null;
  private danceStepIndex = 0;
  private activeDanceTrack: DanceTrackId = 'dino_bounce';
  private settings: GameSettings;
  private lastFootstepAt = 0;

  constructor(initialSettings: GameSettings) {
    this.settings = { ...initialSettings };
    if (initialSettings.selectedDanceTrack) {
      this.activeDanceTrack = initialSettings.selectedDanceTrack;
    }
    if (initialSettings.selectedBgmTrack) {
      this.activeBgmTrack = initialSettings.selectedBgmTrack;
    }
    this.setupAutoUnlockAmbience();
  }

  private setupAutoUnlockAmbience(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (!this.settings.muted && this.settings.musicVolume > 0) {
        this.ensureContext();
        this.startAmbience();
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
  }

  public updateSettings(settings: GameSettings): void {
    const prevBgm = this.activeBgmTrack;
    this.settings = { ...settings };
    if (settings.selectedDanceTrack) {
      this.activeDanceTrack = settings.selectedDanceTrack;
    }
    if (settings.selectedBgmTrack) {
      this.activeBgmTrack = settings.selectedBgmTrack;
    }
    if (this.settings.muted || this.settings.musicVolume <= 0) {
      this.stopAmbience();
      this.stopDanceMusic();
    } else if (prevBgm !== this.activeBgmTrack) {
      this.stopAmbience();
      this.startAmbience();
    } else if (this.ambienceTimer === null) {
      this.startAmbience();
    }
  }

  public getActiveBgmTrack(): BackgroundTrackId {
    return this.settings.selectedBgmTrack || this.activeBgmTrack || 'solara_serenade';
  }

  public setBackgroundTrack(trackId: BackgroundTrackId): void {
    this.activeBgmTrack = trackId;
    this.settings.selectedBgmTrack = trackId;
    this.stopAmbience();
    this.startAmbience();
  }

  public isAmbiencePlaying(): boolean {
    return (
      this.ambienceTimer !== null &&
      !this.settings.muted &&
      this.settings.musicVolume > 0
    );
  }

  public getActiveDanceTrack(): DanceTrackId {
    return this.settings.selectedDanceTrack || this.activeDanceTrack;
  }

  public isDanceMusicPlaying(): boolean {
    return this.danceTimer !== null;
  }

  private ensureContext(): AudioContext | null {
    if (this.settings.muted) return null;
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private getSfxGain(): number {
    if (this.settings.muted) return 0;
    return Math.max(0, Math.min(1, this.settings.sfxVolume / 100)) * 0.28;
  }

  private getMusicGain(): number {
    if (this.settings.muted) return 0;
    return Math.max(0, Math.min(1, this.settings.musicVolume / 100)) * 0.16;
  }

  private getDanceMusicGain(): number {
    if (this.settings.muted) return 0;
    const base = Math.max(
      this.settings.musicVolume / 100,
      this.settings.sfxVolume / 100,
    );
    return Math.max(0, Math.min(1, base)) * 0.24;
  }

  public playClick(): void {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.055);
    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playFootstep(): void {
    const nowMs = performance.now();
    if (nowMs - this.lastFootstepAt < 260) return;
    this.lastFootstepAt = nowMs;

    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const pitch = 115 + (Math.random() - 0.5) * 18;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.05);
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);
    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playHappyChirp(): void {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, start + 0.06);
      gain.gain.setValueAtTime(vol * 0.65, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.095);
    });
  }

  public playEating(): void {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0) return;

    [0, 0.14, 0.28].forEach((offset, i) => {
      const start = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280 + i * 65, start);
      osc.frequency.exponentialRampToValueAtTime(420 + i * 70, start + 0.08);
      gain.gain.setValueAtTime(vol * 0.45, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  }

  public playSleepChime(): void {
    this.stopDanceMusic();
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0) return;

    const notes = [659.25, 587.33, 523.25, 392.0];
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol * 0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  /**
   * Starts playing the selected copyright-free multi-instrument dance track
   * (melody + bassline + kick/snare/hi-hat percussion) while EMBER dances!
   */
  public playDanceRhythm(
    trackOverride?: DanceTrackId,
    durationSeconds = 5.5,
  ): void {
    const trackId =
      trackOverride ||
      this.settings.selectedDanceTrack ||
      this.activeDanceTrack ||
      DANCE_TRACKS[0].id;
    this.activeDanceTrack = trackId;
    this.stopDanceMusic();

    const ctx = this.ensureContext();
    const vol = this.getDanceMusicGain();
    if (!ctx || vol <= 0) return;

    const pattern = TRACK_PATTERNS[trackId] || TRACK_PATTERNS.dino_bounce;
    this.danceStepIndex = 0;

    const triggerStep = () => {
      if (this.settings.muted) {
        this.stopDanceMusic();
        return;
      }
      const activeCtx = this.ensureContext();
      const stepVol = this.getDanceMusicGain();
      if (!activeCtx || stepVol <= 0) return;

      const step = pattern.steps[this.danceStepIndex % pattern.steps.length];
      this.danceStepIndex += 1;
      const now = activeCtx.currentTime;

      // 1. Melodic Lead Synth
      if (step.lead) {
        const osc = activeCtx.createOscillator();
        const gain = activeCtx.createGain();
        osc.type = step.leadType || 'triangle';
        osc.frequency.setValueAtTime(step.lead, now);
        osc.frequency.exponentialRampToValueAtTime(
          step.lead * 1.008,
          now + 0.11,
        );
        gain.gain.setValueAtTime(
          stepVol * (step.leadType === 'triangle' ? 0.85 : 0.48),
          now,
        );
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);
        osc.connect(gain);
        gain.connect(activeCtx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      }

      // 2. Funky / Bouncy Sub-Bassline
      if (step.bass) {
        const bassOsc = activeCtx.createOscillator();
        const bassGain = activeCtx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(step.bass, now);
        bassGain.gain.setValueAtTime(stepVol * 0.72, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        bassOsc.connect(bassGain);
        bassGain.connect(activeCtx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.135);
      }

      // 3. Punchy Kick Drum
      if (step.kick) {
        const kickOsc = activeCtx.createOscillator();
        const kickGain = activeCtx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(145, now);
        kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.085);
        kickGain.gain.setValueAtTime(stepVol * 0.95, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
        kickOsc.connect(kickGain);
        kickGain.connect(activeCtx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.1);
      }

      // 4. Snare / Clap Burst
      if (step.snare) {
        const snareOsc = activeCtx.createOscillator();
        const snareGain = activeCtx.createGain();
        snareOsc.type = 'sawtooth';
        snareOsc.frequency.setValueAtTime(320, now);
        snareOsc.frequency.exponentialRampToValueAtTime(140, now + 0.065);
        snareGain.gain.setValueAtTime(stepVol * 0.42, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        snareOsc.connect(snareGain);
        snareGain.connect(activeCtx.destination);
        snareOsc.start(now);
        snareOsc.stop(now + 0.075);
      }

      // 5. Crisp Hi-Hat Tick
      if (step.hat) {
        const hatOsc = activeCtx.createOscillator();
        const hatGain = activeCtx.createGain();
        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(3800, now);
        hatGain.gain.setValueAtTime(stepVol * 0.12, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        hatOsc.connect(hatGain);
        hatGain.connect(activeCtx.destination);
        hatOsc.start(now);
        hatOsc.stop(now + 0.03);
      }
    };

    triggerStep();
    this.danceTimer = window.setInterval(triggerStep, pattern.stepMs);
    this.danceStopTimeout = window.setTimeout(() => {
      this.stopDanceMusic();
    }, durationSeconds * 1000);
  }

  public stopDanceMusic(): void {
    if (this.danceTimer !== null) {
      window.clearInterval(this.danceTimer);
      this.danceTimer = null;
    }
    if (this.danceStopTimeout !== null) {
      window.clearTimeout(this.danceStopTimeout);
      this.danceStopTimeout = null;
    }
  }

  public playLevelUp(): void {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0) return;

    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol * 0.75, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  /**
   * Plays the soft, romantic, copyright-free background music arrangement
   * (warm velvet strings pad + soft cello bass + delicate plucked harp arpeggios
   * + lyrical celesta/music-box romantic melody).
   */
  public startAmbience(): void {
    if (this.ambienceTimer !== null) return;
    if (this.settings.muted || this.settings.musicVolume <= 0) return;

    const trackId =
      this.settings.selectedBgmTrack ||
      this.activeBgmTrack ||
      BACKGROUND_TRACKS[0].id;
    this.activeBgmTrack = trackId;
    const pattern = BGM_PATTERNS[trackId] || BGM_PATTERNS.solara_serenade;

    const playBgmStep = () => {
      if (this.settings.muted || this.settings.musicVolume <= 0) return;
      if (this.danceTimer !== null) return; // Pause romantic BGM while dance music grooves!
      const ctx = this.ensureContext();
      const vol = this.getMusicGain();
      if (!ctx || vol <= 0) return;

      const step = pattern.steps[this.bgmStepIndex % pattern.steps.length];
      this.bgmStepIndex += 1;
      const now = ctx.currentTime;

      // 1. Warm Velvet String / Rhodes Pad Chord
      if (step.pad && step.pad.length > 0) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(920, now);
        filter.connect(ctx.destination);

        for (const freq of step.pad) {
          const padOsc = ctx.createOscillator();
          const padGain = ctx.createGain();
          padOsc.type = 'sine';
          padOsc.frequency.setValueAtTime(freq, now);
          padGain.gain.setValueAtTime(0.0005, now);
          padGain.gain.linearRampToValueAtTime(vol * 0.22, now + 0.42);
          padGain.gain.exponentialRampToValueAtTime(0.0005, now + 2.15);
          padOsc.connect(padGain);
          padGain.connect(filter);
          padOsc.start(now);
          padOsc.stop(now + 2.2);
        }
      }

      // 2. Warm Cello / Sub-Bass Foundation
      if (step.bass) {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(step.bass, now);
        bassGain.gain.setValueAtTime(0.0005, now);
        bassGain.gain.linearRampToValueAtTime(vol * 0.38, now + 0.28);
        bassGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.85);
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 1.9);
      }

      // 3. Delicate Plucked Harp Arpeggio
      if (step.harp) {
        const harpFilter = ctx.createBiquadFilter();
        harpFilter.type = 'lowpass';
        harpFilter.frequency.setValueAtTime(1380, now);
        harpFilter.connect(ctx.destination);

        const harpOsc = ctx.createOscillator();
        const harpGain = ctx.createGain();
        harpOsc.type = 'triangle';
        harpOsc.frequency.setValueAtTime(step.harp, now);
        harpGain.gain.setValueAtTime(0.0005, now);
        harpGain.gain.linearRampToValueAtTime(vol * 0.34, now + 0.035);
        harpGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.95);
        harpOsc.connect(harpGain);
        harpGain.connect(harpFilter);
        harpOsc.start(now);
        harpOsc.stop(now + 1.0);
      }

      // 4. Lyrical Romantic Celesta / Music-Box & Flute Melody
      if (step.melody) {
        const dur = step.melodyDur || 1.15;
        const melOsc = ctx.createOscillator();
        const melGain = ctx.createGain();
        melOsc.type = 'sine';
        melOsc.frequency.setValueAtTime(step.melody, now);
        melGain.gain.setValueAtTime(0.0005, now);
        melGain.gain.linearRampToValueAtTime(vol * 0.56, now + 0.03);
        melGain.gain.exponentialRampToValueAtTime(0.0005, now + dur);
        melOsc.connect(melGain);
        melGain.connect(ctx.destination);
        melOsc.start(now);
        melOsc.stop(now + dur + 0.04);

        // Soft bell overtone shimmer
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(step.melody * 2, now);
        bellGain.gain.setValueAtTime(0.0003, now);
        bellGain.gain.linearRampToValueAtTime(vol * 0.11, now + 0.02);
        bellGain.gain.exponentialRampToValueAtTime(0.0003, now + Math.min(0.55, dur));
        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);
        bellOsc.start(now);
        bellOsc.stop(now + Math.min(0.58, dur + 0.02));
      }
    };

    playBgmStep();
    this.ambienceTimer = window.setInterval(playBgmStep, pattern.stepMs);
  }

  public stopAmbience(): void {
    if (this.ambienceTimer !== null) {
      window.clearInterval(this.ambienceTimer);
      this.ambienceTimer = null;
    }
  }
}
