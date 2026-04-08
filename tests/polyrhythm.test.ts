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

  return Array.from({ length: args.stepsPerBar }, (_, stepInBar) =>
    resolveLayerRhythmScheduling(args.rhythm, {
      ...meterBase,
      stepInBar,
    }, args.modulation).shouldTrigger
  );
}

describe('resolveLayerRhythmScheduling quantization', () => {
  test('quantizes trigger starts for divisor and non-divisor divisions', () => {
    const division4 = resolveStepsInBar({ rhythm: { division: 4, gate: 1 }, stepsPerBar: 16 });
    const division5 = resolveStepsInBar({ rhythm: { division: 5, gate: 1 }, stepsPerBar: 16 });

    expect(division4).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);

    expect(division5).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  test('phase preserves quantization points when gate is fully open', () => {
    const noPhase = resolveStepsInBar({ rhythm: { division: 5, phase: 0, gate: 1 }, stepsPerBar: 16 });
    const phaseShifted = resolveStepsInBar({ rhythm: { division: 5, phase: 3, gate: 1 }, stepsPerBar: 16 });

    expect(phaseShifted).toEqual(noPhase);
  });
});

describe('resolveLayerRhythmScheduling deterministic gate and accents', () => {
  test('returns deterministic gate decisions for identical input', () => {
    const rhythm: MusicLayerRhythmConfig = { division: 7, phase: 2, gate: 0.42 };
    const meter: RhythmMeterContext = { barIndex: 3, stepInBar: 11, stepsPerBar: 16 };

    const first = resolveLayerRhythmScheduling(rhythm, meter);
    const second = resolveLayerRhythmScheduling(rhythm, meter);

    expect(first.shouldTrigger).toBe(second.shouldTrigger);
    expect(first.patternStepIndex).toBe(second.patternStepIndex);
    expect(first.gainScale).toBe(second.gainScale);
  });

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

  test('returns deterministic outcomes when modulation is present', () => {
    const rhythm: MusicLayerRhythmConfig = { division: 7, phase: 2, gate: 0.42, accentAmount: 0.2, accentPattern: [3] };
    const meter: RhythmMeterContext = { barIndex: 3, stepInBar: 11, stepsPerBar: 16 };
    const modulation: RhythmSchedulingModulation = { density: 0.35, gainMultiplier: 0.9 };

    const first = resolveLayerRhythmScheduling(rhythm, meter, modulation);
    const second = resolveLayerRhythmScheduling(rhythm, meter, modulation);

    expect(first).toEqual(second);
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
