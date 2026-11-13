import { DANCE_TRACKS } from '../constants';
import type { DanceTrackId, GameSettings } from '../types';

interface StepNote {
  lead?: number;
  leadType?: OscillatorType;
  bass?: number;
  kick?: boolean;
  snare?: boolean;
  hat?: boolean;
}

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
 * Procedural Web Audio API sound synthesizer & copyright-free Dance Music Jukebox
 * for XR Creature World.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private ambienceTimer: number | null = null;
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
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    if (settings.selectedDanceTrack) {
      this.activeDanceTrack = settings.selectedDanceTrack;
    }
    if (this.settings.muted || this.settings.musicVolume <= 0) {
      this.stopAmbience();
      this.stopDanceMusic();
    }
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
    return Math.max(0, Math.min(1, this.settings.musicVolume / 100)) * 0.08;
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

  public startAmbience(): void {
    if (this.ambienceTimer !== null) return;
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25];
    this.ambienceTimer = window.setInterval(() => {
      if (this.settings.muted || this.settings.musicVolume <= 0) return;
      if (this.danceTimer !== null) return; // Pause background chime while dance music grooves!
      const ctx = this.ensureContext();
      const vol = this.getMusicGain();
      if (!ctx || vol <= 0) return;

      const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.5);
    }, 2200);
  }

  public stopAmbience(): void {
    if (this.ambienceTimer !== null) {
      window.clearInterval(this.ambienceTimer);
      this.ambienceTimer = null;
    }
  }
}
