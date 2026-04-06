import type { ProceduralMusicTrackConfig } from '../../config/LevelsConfig';
import { AudioContextManager } from './AudioContextManager';
import { disconnectMusicBus, recreateMusicBus, type MusicFXChain } from './procedural/bus';
import { getIntensityBlend } from './procedural/expression';
import { scheduleLayer, scheduleNoise } from './procedural/synthesis';

export const DEFAULT_TRACK: ProceduralMusicTrackConfig = {
  tempo: 112,
  rootHz: 110,
  stepsPerBeat: 4,
  masterGain: 0.95,
  bass: {
    waveform: 'triangle',
    pattern: [0, null, null, null, 7, null, null, null, 12, null, null, null, 7, null, null, null],
    gain: 0.18,
    durationSteps: 3,
  },
  pulse: {
    waveform: 'square',
    pattern: [12, null, 12, null, 7, null, 12, null, 14, null, 12, null, 7, null, 5, null],
    gain: 0.05,
    durationSteps: 1,
    octaveShift: 1,
    filterHz: 1900,
  },
  lead: {
    waveform: 'sine',
    pattern: [null, 12, null, 14, null, 12, null, 7, null, 12, null, 14, null, 19, null, 14],
    gain: 0.04,
    durationSteps: 2,
    octaveShift: 1,
  },
};

export class ProceduralMusicManager {
  private readonly musicScheduleLookaheadMs = 50;
  private readonly musicScheduleAheadSeconds = 0.18;
  private readonly minimumMusicIntensity = 0.2;
  private readonly maximumMusicIntensity = 1.2;

  private readonly contextManager: AudioContextManager;
  private musicGain: GainNode | null = null;
  private musicFX: MusicFXChain | null = null;
  private musicPlaying = false;
  private musicTimer: number | null = null;
  private activeTrack: ProceduralMusicTrackConfig | null = null;
  private musicStepIndex = 0;
  private musicNextStepTime = 0;
  private musicIntensity = 1;

  constructor(contextManager: AudioContextManager) {
    this.contextManager = contextManager;
  }

  ensureGains(): void {
    if (!this.contextManager.getCtx() || this.musicGain) {
      return;
    }

    this.recreateMusicBus();
  }

  resetNodes(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
    }

    this.disconnectMusicBus();
    this.resetPlaybackState();
  }

  playMusic(track: ProceduralMusicTrackConfig = DEFAULT_TRACK): void {
    if (!this.ensureContext()) {
      return;
    }

    this.stopMusic();
    this.ensureGains();
    if (!this.musicGain) {
      return;
    }

    const ctx = this.contextManager.getCtx();
    if (!ctx) {
      return;
    }

    this.activeTrack = track;
    this.musicPlaying = true;
    this.musicStepIndex = 0;
    this.musicNextStepTime = ctx.currentTime + 0.02;
    this.musicIntensity = 1;

    this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.08);

    this.scheduleMusic();
  }

  startMusic(track: ProceduralMusicTrackConfig = DEFAULT_TRACK): void {
    this.playMusic(track);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
    }

    this.disconnectMusicBus();
    this.resetPlaybackState();
  }

  setMusicIntensity(intensity: number): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.musicGain) {
      return;
    }

    const clampedIntensity = Math.min(this.maximumMusicIntensity, Math.max(this.minimumMusicIntensity, intensity));
    if (Math.abs(clampedIntensity - this.musicIntensity) < 0.01) {
      return;
    }

    this.musicIntensity = clampedIntensity;
    this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(clampedIntensity, ctx.currentTime + 0.08);
  }

  private recreateMusicBus(): void {
    const ctx = this.contextManager.getCtx();
    const masterGain = this.contextManager.getMasterGain();
    if (!ctx || !masterGain) {
      return;
    }

    const bus = recreateMusicBus(ctx, masterGain, this.musicGain, this.musicFX);
    this.musicGain = bus.musicGain;
    this.musicFX = bus.musicFX;
  }

  private disconnectMusicBus(): void {
    disconnectMusicBus(this.musicGain, this.musicFX);
    this.musicGain = null;
    this.musicFX = null;
  }

  private resetPlaybackState(): void {
    this.musicPlaying = false;
    this.musicTimer = null;
    this.activeTrack = null;
    this.musicStepIndex = 0;
    this.musicNextStepTime = 0;
    this.musicIntensity = 1;
  }

  private ensureContext(): boolean {
    const isReady = this.contextManager.ensureContext();
    if (!isReady) {
      this.resetNodes();
    }
    return isReady;
  }

  private scheduleMusic(): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.ensureContext() || !this.musicPlaying || !this.activeTrack) {
      return;
    }

    while (this.musicNextStepTime < ctx.currentTime + this.musicScheduleAheadSeconds) {
      this.scheduleTrackStep(this.activeTrack, this.musicStepIndex, this.musicNextStepTime);
      this.musicStepIndex += 1;
      this.musicNextStepTime += this.getStepDuration(this.activeTrack);
    }

    this.musicTimer = window.setTimeout(() => {
      this.scheduleMusic();
    }, this.musicScheduleLookaheadMs);
  }

  private scheduleTrackStep(track: ProceduralMusicTrackConfig, stepIndex: number, time: number): void {
    const ctx = this.contextManager.getCtx();
    if (!ctx || !this.musicGain) {
      return;
    }

    const stepDuration = this.getStepDuration(track);
    const intensityBlend = getIntensityBlend(this.musicIntensity, this.minimumMusicIntensity, this.maximumMusicIntensity);

    scheduleLayer({ ctx, musicGain: this.musicGain, track, layer: track.bass, stepIndex, time, stepDuration, intensityBlend });

    if (track.pulse) {
      scheduleLayer({ ctx, musicGain: this.musicGain, track, layer: track.pulse, stepIndex, time, stepDuration, intensityBlend });
    }

    if (track.lead) {
      scheduleLayer({ ctx, musicGain: this.musicGain, track, layer: track.lead, stepIndex, time, stepDuration, intensityBlend });
    }

    if (track.noise) {
      scheduleNoise({
        ctx,
        musicGain: this.musicGain,
        track,
        noiseLayer: track.noise,
        stepIndex,
        time,
        stepDuration,
        intensityBlend,
        getNoiseBuffer: (color) => this.contextManager.getNoiseBuffer(color),
        getExplosionBuffer: () => this.contextManager.getExplosionBuffer(),
      });
    }
  }

  private getStepDuration(track: ProceduralMusicTrackConfig): number {
    return 60 / track.tempo / track.stepsPerBeat;
  }
}
