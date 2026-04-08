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

function hash01(value: number): number {
  let hash = value ^ 0x9e3779b9;
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff;
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
  const patternStepIndex = stepInBar;
  const pulseStarted = Math.floor(pulsePosition) !== Math.floor(previousPulsePosition);
  const gateSeed = (barIndex + 1) * 131071 + (Math.floor(pulsePosition) + 17) * 8191 + phase * 911;
  const gatePassed = hash01(gateSeed) <= gate;
  const density = clamp01(modulation?.density ?? 1);
  const densitySeed =
    (barIndex + 1) * 524287 + (Math.floor(pulsePosition) + 31) * 65537 + phase * 8191 + division * 257;
  const densityPassed = hash01(densitySeed) <= density;

  let gainScale = 1;
  if (accentAmount > 0 && rhythm?.accentPattern && rhythm.accentPattern.length > 0) {
    const accentSteps = new Set(rhythm.accentPattern.map((step) => positiveModulo(Math.round(step), stepsPerBar)));
    const shiftedAccentStep = positiveModulo(stepInBar + Math.round(phaseOffsetSteps), stepsPerBar);
    const isAccentStep = accentSteps.has(shiftedAccentStep);
    gainScale = isAccentStep ? 1 + accentAmount : Math.max(0.05, 1 - accentAmount * 0.5);
  }

  gainScale *= Math.max(0, modulation?.gainMultiplier ?? 1);

  return {
    shouldTrigger: pulseStarted && gatePassed && densityPassed,
    patternStepIndex,
    gainScale,
  };
}
