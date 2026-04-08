import type { MusicLayerRhythmConfig } from '../../../config/LevelsConfig';

export interface RhythmMeterContext {
  barIndex: number;
  stepInBar: number;
  stepsPerBar: number;
}

export interface RhythmScheduleResolution {
  shouldTrigger: boolean;
  patternStepIndex: number;
  gainScale: number;
}

export interface RhythmSchedulingModulation {
  density?: number;
  gainMultiplier?: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function passesDistributedThreshold(ordinal: number, ratio: number): boolean {
  const clampedRatio = clamp01(ratio);

  if (clampedRatio <= 0) {
    return false;
  }

  if (clampedRatio >= 1) {
    return true;
  }

  const previousBucket = Math.floor(ordinal * clampedRatio);
  const currentBucket = Math.floor((ordinal + 1) * clampedRatio);
  return currentBucket > previousBucket;
}

export function resolveLayerRhythmScheduling(
  rhythm: MusicLayerRhythmConfig | undefined,
  meter: RhythmMeterContext,
  modulation?: RhythmSchedulingModulation
): RhythmScheduleResolution {
  const stepsPerBar = Math.max(1, Math.round(meter.stepsPerBar));
  const stepInBar = positiveModulo(Math.round(meter.stepInBar), stepsPerBar);
  const barIndex = Math.max(0, Math.floor(meter.barIndex));
  const division = Math.max(1, Math.round(rhythm?.division ?? stepsPerBar));
  const phase = Math.round(rhythm?.phase ?? 0);
  const gate = clamp01(rhythm?.gate ?? 1);
  const accentAmount = Math.max(0, rhythm?.accentAmount ?? 0);
  const absoluteStep = barIndex * stepsPerBar + stepInBar;
  const phaseOffsetSteps = (phase * stepsPerBar) / division;
  const shiftedStep = absoluteStep + phaseOffsetSteps;
  const pulsePosition = (shiftedStep * division) / stepsPerBar;
  const previousPulsePosition = ((shiftedStep - 1) * division) / stepsPerBar;
  const pulseOrdinal = Math.floor(pulsePosition);
  const patternStepIndex = stepInBar;
  const pulseStarted = pulseOrdinal !== Math.floor(previousPulsePosition);
  const gatePassed = passesDistributedThreshold(pulseOrdinal, gate);
  const density = clamp01(modulation?.density ?? 1);
  const densityPassed = passesDistributedThreshold(pulseOrdinal, density);

  let gainScale = 1;
  if (accentAmount > 0 && rhythm?.accentPattern && rhythm.accentPattern.length > 0) {
    const accentSteps = new Set(rhythm.accentPattern.map((step) => positiveModulo(Math.round(step), stepsPerBar)));
    const shiftedAccentStep = positiveModulo(stepInBar + Math.round(phaseOffsetSteps), stepsPerBar);
    const isAccentStep = accentSteps.has(shiftedAccentStep);
    gainScale = isAccentStep ? 1 + accentAmount : Math.max(0.05, 1 - accentAmount * 0.5);
  }

  gainScale *= 0.6 + density * 0.4;
  gainScale *= Math.max(0, modulation?.gainMultiplier ?? 1);

  return {
    shouldTrigger: pulseStarted && gatePassed && densityPassed,
    patternStepIndex,
    gainScale,
  };
}
