import type {
  MusicEnergyProfileConfig,
  ProceduralMusicIntentConfig,
  ProceduralMusicTrackConfig,
} from '../../../config/LevelsConfig';

export interface MusicMeterStepContext {
  stepsPerBar: number;
  barIndex: number;
  stepInBar: number;
  barProgress: number;
  deterministicPulse: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toUInt32Hash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getDeterministicPulse(intent: ProceduralMusicIntentConfig, barIndex: number, stepInBar: number): number {
  const key = `${intent.deterministicSeed}:${barIndex}:${stepInBar}`;
  return toUInt32Hash(key) / 0xffffffff;
}

export function getTrackStepsPerBar(track: ProceduralMusicTrackConfig): number {
  const beatsPerBar = Math.max(1, Math.round(track.intent.timeSignature.beatsPerBar));
  const quarterNotesPerBar = beatsPerBar * (4 / track.intent.timeSignature.beatUnit);
  return Math.max(1, Math.round(track.stepsPerBeat * quarterNotesPerBar));
}

export function getMeterStepContext(track: ProceduralMusicTrackConfig, stepIndex: number): MusicMeterStepContext {
  const stepsPerBar = getTrackStepsPerBar(track);
  const barIndex = Math.floor(stepIndex / stepsPerBar);
  const stepInBar = ((stepIndex % stepsPerBar) + stepsPerBar) % stepsPerBar;

  return {
    stepsPerBar,
    barIndex,
    stepInBar,
    barProgress: stepInBar / stepsPerBar,
    deterministicPulse: getDeterministicPulse(track.intent, barIndex, stepInBar),
  };
}

export function resolveIntentEnergy(
  profile: MusicEnergyProfileConfig,
  barProgress: number,
  deterministicPulse: number
): number {
  const baseline = clamp01(profile.baseline);
  const peak = Math.max(baseline, clamp01(profile.peak));
  const delta = peak - baseline;
  const t = clamp01(barProgress);

  if (delta === 0) {
    return baseline;
  }

  switch (profile.curve) {
    case 'steady':
      return baseline;
    case 'build':
      return baseline + delta * t;
    case 'build-release': {
      const triangle = t < 0.5 ? t * 2 : (1 - t) * 2;
      return baseline + delta * triangle;
    }
    case 'surge':
      return baseline + delta * clamp01(t * 0.7 + deterministicPulse * 0.3);
    default:
      return baseline;
  }
}
