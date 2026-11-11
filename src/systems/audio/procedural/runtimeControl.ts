import type { MusicFXChain } from './bus';

/** Fixed performance character: how far expression is pushed and how brisk tracks play. */
export const MUSIC_CREATIVITY_DRIVE = 1.2;
export const MUSIC_TEMPO_SCALE = 1.08;

interface MusicRuntimeControlConfig {
  minimumMusicIntensity: number;
  maximumMusicIntensity: number;
  musicOutputGainBoost: number;
  minimumOutputIntensity: number;
  getCtx: () => AudioContext | null;
  getMusicGain: () => GainNode | null;
  getMusicFX: () => MusicFXChain | null;
}

/** Owns the music's loudness: the player's volume and the gameplay-driven intensity. */
export class MusicRuntimeControl {
  private musicIntensity = 1;
  private musicVolume = 1;

  constructor(private readonly config: MusicRuntimeControlConfig) {}

  getMusicIntensity(): number {
    return this.musicIntensity;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  setMusicVolume(volume: number): number {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    this.applyMusicGainFromState();
    return this.musicVolume;
  }

  setMusicIntensity(intensity: number): void {
    const clamped = Math.min(this.config.maximumMusicIntensity, Math.max(this.config.minimumMusicIntensity, intensity));
    if (Math.abs(clamped - this.musicIntensity) < 0.01) {
      return;
    }

    this.musicIntensity = clamped;
    this.applyMusicGainFromState();
  }

  resetPlaybackState(): void {
    this.musicIntensity = 1;
  }

  applyMusicGainFromState(rampSeconds = 0.08): void {
    const ctx = this.config.getCtx();
    const musicGain = this.config.getMusicGain();
    if (!ctx || !musicGain) {
      return;
    }

    const targetGain = this.resolveOutputGain();
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    if (rampSeconds <= 0) {
      musicGain.gain.setValueAtTime(targetGain, ctx.currentTime);
      return;
    }

    musicGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + rampSeconds);
  }

  resolveOutputGain(): number {
    const outputIntensity = Math.max(this.config.minimumOutputIntensity, this.musicIntensity);
    return Math.max(0, outputIntensity * this.musicVolume * this.config.musicOutputGainBoost);
  }
}
