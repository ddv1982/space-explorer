export interface MusicRuntimeTuningValues {
  creativity: number;
  energy: number;
  ambience: number;
}

export interface ResolvedMusicRuntimeTuning {
  creativityDrive: number;
  tempoScale: number;
  reverbGain: number;
}

export const DEFAULT_MUSIC_RUNTIME_TUNING: MusicRuntimeTuningValues = {
  creativity: 0.64,
  energy: 0.56,
  ambience: 0.62,
};

const runtimeTuningProfile = {
  creativityDrive: { min: 0.55, max: 1.8, exponent: 1.45 },
  tempoScale: { min: 0.88, max: 1.28, exponent: 1.2 },
  reverbGain: { min: 0.07, max: 0.3, exponent: 0.85 },
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function curve01(value: number, exponent: number): number {
  return Math.pow(clamp01(value), exponent);
}

function interpolateRange(min: number, max: number, t: number): number {
  return min + (max - min) * clamp01(t);
}

export function resolveMusicRuntimeTuning(tuning: MusicRuntimeTuningValues): ResolvedMusicRuntimeTuning {
  const creativityDrive = interpolateRange(
    runtimeTuningProfile.creativityDrive.min,
    runtimeTuningProfile.creativityDrive.max,
    curve01(tuning.creativity, runtimeTuningProfile.creativityDrive.exponent)
  );
  const tempoScale = interpolateRange(
    runtimeTuningProfile.tempoScale.min,
    runtimeTuningProfile.tempoScale.max,
    curve01(tuning.energy, runtimeTuningProfile.tempoScale.exponent)
  );
  const reverbGain = interpolateRange(
    runtimeTuningProfile.reverbGain.min,
    runtimeTuningProfile.reverbGain.max,
    curve01(tuning.ambience, runtimeTuningProfile.reverbGain.exponent)
  );

  return {
    creativityDrive,
    tempoScale,
    reverbGain,
  };
}
