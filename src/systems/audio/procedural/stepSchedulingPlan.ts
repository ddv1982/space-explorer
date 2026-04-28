import type { ProceduralMusicTrackConfig } from '@/config/LevelsConfig';
import { resolveArrangementForBar } from './arrangement';
import { getIntensityBlend } from './expression';
import { resolveHarmonicContext } from './harmony';
import { getMeterStepContext, resolveIntentEnergy } from './musicIntent';

export interface SchedulingStepPlan {
  readonly meterStepContext: ReturnType<typeof getMeterStepContext>;
  readonly harmonicRootHz: number;
  readonly stepDuration: number;
  readonly density: number;
  readonly intensityBlend: number;
  readonly creativityDrive: number;
  readonly gainMultipliers: {
    readonly bass: number;
    readonly pulse: number;
    readonly lead: number;
    readonly noise: number;
  };
}

interface SchedulingStepPlanParams {
  readonly track: ProceduralMusicTrackConfig;
  readonly stepIndex: number;
  readonly tempoScale: number;
  readonly creativityDrive: number;
  readonly musicIntensity: number;
  readonly minimumMusicIntensity: number;
  readonly maximumMusicIntensity: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getStepDuration(track: ProceduralMusicTrackConfig, tempoScale: number): number {
  return 60 / (track.tempo * tempoScale) / track.stepsPerBeat;
}

export function buildSchedulingStepPlan(params: SchedulingStepPlanParams): SchedulingStepPlan {
  const meterStepContext = getMeterStepContext(params.track, params.stepIndex);
  const harmonicContext = resolveHarmonicContext(params.track, meterStepContext.barIndex);
  const arrangement = resolveArrangementForBar(params.track.intent.descriptors.arrangement, meterStepContext.barIndex);
  const stepDuration = getStepDuration(params.track, params.tempoScale);

  const intentEnergy = resolveIntentEnergy(
    params.track.intent.descriptors.energyProfile,
    meterStepContext.barProgress,
    meterStepContext.deterministicPulse
  );

  const arrangementEnergy = clamp01(intentEnergy * (1 + (arrangement.density - 1) * 0.35) + arrangement.energyLift);
  const shapedIntensity = Math.min(
    params.maximumMusicIntensity,
    Math.max(params.minimumMusicIntensity, params.musicIntensity * (0.78 + arrangementEnergy * 0.44))
  );

  const gainMultipliers = Object.freeze({
    bass: arrangement.layerGainMultipliers?.bass ?? 1,
    pulse: arrangement.layerGainMultipliers?.pulse ?? 1,
    lead: arrangement.layerGainMultipliers?.lead ?? 1,
    noise: arrangement.layerGainMultipliers?.noise ?? 1,
  });

  return Object.freeze({
    meterStepContext,
    harmonicRootHz: harmonicContext.harmonicRootHz,
    stepDuration,
    density: clamp01(arrangement.density),
    intensityBlend: getIntensityBlend(shapedIntensity, params.minimumMusicIntensity, params.maximumMusicIntensity),
    creativityDrive: params.creativityDrive * (0.9 + meterStepContext.deterministicPulse * 0.2),
    gainMultipliers,
  });
}
