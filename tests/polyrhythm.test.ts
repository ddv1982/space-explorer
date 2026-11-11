import { describe, expect, test } from 'bun:test';

import {
  resolveLayerRhythmScheduling,
  type RhythmMeterContext,
  type RhythmSchedulingModulation,
} from '../src/systems/audio/procedural/rhythm';
import type { MusicLayerRhythmConfig } from '../src/config/LevelsConfig';

function resolveStepsInBar(args: {
  rhythm?: MusicLayerRhythmConfig;
  stepsPerBar: number;
  barIndex?: number;
  modulation?: RhythmSchedulingModulation;
}): boolean[] {
  const meterBase: Omit<RhythmMeterContext, 'stepInBar'> = {
    barIndex: args.barIndex ?? 0,
    stepsPerBar: args.stepsPerBar,
  };

  return Array.from(
    { length: args.stepsPerBar },
    (_, stepInBar) =>
      resolveLayerRhythmScheduling(
        args.rhythm,
        {
          ...meterBase,
          stepInBar,
        },
        args.modulation
      ).shouldTrigger
  );
}

describe('resolveLayerRhythmScheduling quantization', () => {
  test('quantizes trigger starts for divisor and non-divisor divisions', () => {
    const division4 = resolveStepsInBar({ rhythm: { division: 4, gate: 1 }, stepsPerBar: 16 });
    const division5 = resolveStepsInBar({ rhythm: { division: 5, gate: 1 }, stepsPerBar: 16 });

    const triggerSteps = (flags: boolean[]) => flags.flatMap((flag, step) => (flag ? [step] : []));
    expect(triggerSteps(division4)).toEqual([0, 4, 8, 12]);
    expect(triggerSteps(division5)).toEqual([0, 4, 7, 10, 13]);
  });

  test('phase preserves quantization points when gate is fully open', () => {
    const noPhase = resolveStepsInBar({ rhythm: { division: 5, phase: 0, gate: 1 }, stepsPerBar: 16 });
    const phaseShifted = resolveStepsInBar({ rhythm: { division: 5, phase: 3, gate: 1 }, stepsPerBar: 16 });

    expect(phaseShifted).toEqual(noPhase);
  });
});

describe('resolveLayerRhythmScheduling deterministic gate and accents', () => {
  test('applies accent and non-accent gainScale semantics', () => {
    const accentRhythm: MusicLayerRhythmConfig = {
      division: 4,
      gate: 1,
      accentAmount: 0.6,
      accentPattern: [0, 4],
    };
    const accentStep = resolveLayerRhythmScheduling(accentRhythm, {
      barIndex: 0,
      stepInBar: 0,
      stepsPerBar: 16,
    });
    const nonAccentStep = resolveLayerRhythmScheduling(accentRhythm, {
      barIndex: 0,
      stepInBar: 1,
      stepsPerBar: 16,
    });
    const clampedNonAccent = resolveLayerRhythmScheduling(
      { ...accentRhythm, accentAmount: 3, accentPattern: [0] },
      {
        barIndex: 0,
        stepInBar: 1,
        stepsPerBar: 16,
      }
    );

    expect(accentStep.gainScale).toBe(1.6);
    expect(nonAccentStep.gainScale).toBe(0.7);
    expect(clampedNonAccent.gainScale).toBe(0.05);
  });

  test('applies gainMultiplier modulation on top of accent scaling', () => {
    const rhythm: MusicLayerRhythmConfig = {
      division: 4,
      gate: 1,
      accentAmount: 0.5,
      accentPattern: [0],
    };

    const accented = resolveLayerRhythmScheduling(
      rhythm,
      {
        barIndex: 0,
        stepInBar: 0,
        stepsPerBar: 16,
      },
      { gainMultiplier: 0.5 }
    );

    const nonAccentedMuted = resolveLayerRhythmScheduling(
      rhythm,
      {
        barIndex: 0,
        stepInBar: 1,
        stepsPerBar: 16,
      },
      { gainMultiplier: -1 }
    );

    expect(accented.gainScale).toBe(0.75);
    expect(nonAccentedMuted.gainScale).toBe(0);
  });
});

describe('resolveLayerRhythmScheduling modulation boundaries', () => {
  test('honors density boundaries of 0 and 1', () => {
    const rhythm: MusicLayerRhythmConfig = { division: 4, gate: 1 };
    const zeroDensity = resolveStepsInBar({
      rhythm,
      stepsPerBar: 16,
      modulation: { density: 0 },
    });
    const fullDensity = resolveStepsInBar({
      rhythm,
      stepsPerBar: 16,
      modulation: { density: 1 },
    });
    const unmodulated = resolveStepsInBar({ rhythm, stepsPerBar: 16 });

    expect(zeroDensity).toEqual(new Array(16).fill(false));
    expect(fullDensity).toEqual(unmodulated);
  });
});

describe('resolveLayerRhythmScheduling odd meter boundaries', () => {
  test('behaves deterministically around 7/8 bar boundaries', () => {
    const rhythm: MusicLayerRhythmConfig = { division: 4, gate: 1, phase: 0 };

    const lastStepBar0 = resolveLayerRhythmScheduling(rhythm, {
      barIndex: 0,
      stepInBar: 13,
      stepsPerBar: 14,
    });
    const firstStepBar1 = resolveLayerRhythmScheduling(rhythm, {
      barIndex: 1,
      stepInBar: 0,
      stepsPerBar: 14,
    });
    const secondStepBar1 = resolveLayerRhythmScheduling(rhythm, {
      barIndex: 1,
      stepInBar: 1,
      stepsPerBar: 14,
    });

    expect(lastStepBar0.shouldTrigger).toBe(false);
    expect(firstStepBar1.shouldTrigger).toBe(true);
    expect(secondStepBar1.shouldTrigger).toBe(false);
    expect(firstStepBar1.patternStepIndex).toBe(0);
  });
});
