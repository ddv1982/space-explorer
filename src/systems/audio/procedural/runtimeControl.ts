import { setMusicBusReverbGain, type MusicFXChain } from './bus';
import {
  DEFAULT_MUSIC_RUNTIME_TUNING,
  resolveMusicRuntimeTuning,
  type MusicRuntimeTuningValues,
} from './musicRuntimeTuningProfile';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function setMusicIntensity(args: {
  musicIntensity: number;
  intensity: number;
  minimumMusicIntensity: number;
  maximumMusicIntensity: number;
}): number | null {
  const clampedIntensity = Math.min(args.maximumMusicIntensity, Math.max(args.minimumMusicIntensity, args.intensity));
  if (Math.abs(clampedIntensity - args.musicIntensity) < 0.01) {
    return null;
  }

  return clampedIntensity;
}

function getMusicVolume(musicVolume: number): number {
  return musicVolume;
}

function setMusicVolume(volume: number): number {
  return clamp01(volume);
}

function getMusicRuntimeTuning(runtimeTuning: MusicRuntimeTuningValues): MusicRuntimeTuningValues {
  return { ...runtimeTuning };
}

function setMusicRuntimeTuning(args: {
  runtimeTuning: MusicRuntimeTuningValues;
  nextTuning: Partial<MusicRuntimeTuningValues>;
}): MusicRuntimeTuningValues {
  return {
    creativity: clamp01(args.nextTuning.creativity ?? args.runtimeTuning.creativity),
    energy: clamp01(args.nextTuning.energy ?? args.runtimeTuning.energy),
    ambience: clamp01(args.nextTuning.ambience ?? args.runtimeTuning.ambience),
  };
}

function resetMusicRuntimeTuning(): MusicRuntimeTuningValues {
  return { ...DEFAULT_MUSIC_RUNTIME_TUNING };
}

function applyAmbienceFromRuntimeTuning(args: {
  ctx: AudioContext | null;
  musicFX: MusicFXChain | null;
  runtimeTuning: MusicRuntimeTuningValues;
}): void {
  if (!args.ctx || !args.musicFX) {
    return;
  }

  setMusicBusReverbGain(args.ctx, args.musicFX, resolveMusicRuntimeTuning(args.runtimeTuning).reverbGain);
}

function resolveOutputGain(args: {
  musicIntensity: number;
  musicVolume: number;
  musicOutputGainBoost: number;
  minimumOutputIntensity: number;
}): number {
  const effectiveOutputIntensity = Math.max(args.minimumOutputIntensity, args.musicIntensity);
  return Math.max(0, effectiveOutputIntensity * args.musicVolume * args.musicOutputGainBoost);
}

function applyMusicGainFromState(args: {
  ctx: AudioContext | null;
  musicGain: GainNode | null;
  musicIntensity: number;
  musicVolume: number;
  musicOutputGainBoost: number;
  minimumOutputIntensity: number;
  rampSeconds?: number;
}): void {
  if (!args.ctx || !args.musicGain) {
    return;
  }

  const targetGain = resolveOutputGain({
    musicIntensity: args.musicIntensity,
    musicVolume: args.musicVolume,
    musicOutputGainBoost: args.musicOutputGainBoost,
    minimumOutputIntensity: args.minimumOutputIntensity,
  });

  const rampSeconds = args.rampSeconds ?? 0.08;
  args.musicGain.gain.cancelScheduledValues(args.ctx.currentTime);
  args.musicGain.gain.setValueAtTime(args.musicGain.gain.value, args.ctx.currentTime);

  if (rampSeconds <= 0) {
    args.musicGain.gain.setValueAtTime(targetGain, args.ctx.currentTime);
    return;
  }

  args.musicGain.gain.linearRampToValueAtTime(targetGain, args.ctx.currentTime + rampSeconds);
}

interface MusicRuntimeControlConfig {
  minimumMusicIntensity: number;
  maximumMusicIntensity: number;
  musicOutputGainBoost: number;
  minimumOutputIntensity: number;
  getCtx: () => AudioContext | null;
  getMusicGain: () => GainNode | null;
  getMusicFX: () => MusicFXChain | null;
}

export class MusicRuntimeControl {
  private musicIntensity = 1;
  private musicVolume = 1;
  private runtimeTuning: MusicRuntimeTuningValues = { ...DEFAULT_MUSIC_RUNTIME_TUNING };

  constructor(private readonly config: MusicRuntimeControlConfig) {}

  getMusicIntensity(): number {
    return this.musicIntensity;
  }

  getMusicVolume(): number {
    return getMusicVolume(this.musicVolume);
  }

  setMusicVolume(volume: number): number {
    this.musicVolume = setMusicVolume(volume);
    this.applyMusicGainFromState();
    return this.musicVolume;
  }

  setMusicIntensity(intensity: number): void {
    const nextIntensity = setMusicIntensity({
      musicIntensity: this.musicIntensity,
      intensity,
      minimumMusicIntensity: this.config.minimumMusicIntensity,
      maximumMusicIntensity: this.config.maximumMusicIntensity,
    });

    if (nextIntensity === null) {
      return;
    }

    this.musicIntensity = nextIntensity;
    this.applyMusicGainFromState();
  }

  getMusicRuntimeTuning(): MusicRuntimeTuningValues {
    return getMusicRuntimeTuning(this.runtimeTuning);
  }

  getResolvedRuntimeTuning(): ReturnType<typeof resolveMusicRuntimeTuning> {
    return resolveMusicRuntimeTuning(this.runtimeTuning);
  }

  setMusicRuntimeTuning(nextTuning: Partial<MusicRuntimeTuningValues>): MusicRuntimeTuningValues {
    this.runtimeTuning = setMusicRuntimeTuning({
      runtimeTuning: this.runtimeTuning,
      nextTuning,
    });

    this.applyAmbienceFromRuntimeTuning();

    return this.getMusicRuntimeTuning();
  }

  resetMusicRuntimeTuning(): MusicRuntimeTuningValues {
    this.runtimeTuning = resetMusicRuntimeTuning();
    this.applyAmbienceFromRuntimeTuning();
    return this.getMusicRuntimeTuning();
  }

  resetPlaybackState(): void {
    this.musicIntensity = 1;
  }

  applyAmbienceFromRuntimeTuning(): void {
    applyAmbienceFromRuntimeTuning({
      ctx: this.config.getCtx(),
      musicFX: this.config.getMusicFX(),
      runtimeTuning: this.runtimeTuning,
    });
  }

  applyMusicGainFromState(rampSeconds = 0.08): void {
    applyMusicGainFromState({
      ctx: this.config.getCtx(),
      musicGain: this.config.getMusicGain(),
      musicIntensity: this.musicIntensity,
      musicVolume: this.musicVolume,
      musicOutputGainBoost: this.config.musicOutputGainBoost,
      minimumOutputIntensity: this.config.minimumOutputIntensity,
      rampSeconds,
    });
  }

  resolveOutputGain(): number {
    return resolveOutputGain({
      musicIntensity: this.musicIntensity,
      musicVolume: this.musicVolume,
      musicOutputGainBoost: this.config.musicOutputGainBoost,
      minimumOutputIntensity: this.config.minimumOutputIntensity,
    });
  }
}
