import { describe, expect, test } from 'bun:test';

import type { MusicArrangementConfig } from '../src/config/LevelsConfig';
import { getArrangementCycleBars, resolveArrangementForBar } from '../src/systems/audio/procedural/arrangement';

const TEST_ARRANGEMENT: MusicArrangementConfig = {
  loop: true,
  sections: [
    { phase: 'intro', barsDuration: 2, density: 0.3, energyLift: 0.1, layerGainMultipliers: { bass: 0.8 } },
    { phase: 'build', barsDuration: 1, density: 0.6, energyLift: 0.2, layerGainMultipliers: { pulse: 1.1 } },
  ],
};

describe('arrangement resolver determinism', () => {
  test('returns stable output for identical inputs', () => {
    const first = resolveArrangementForBar(TEST_ARRANGEMENT, 7);
    const second = resolveArrangementForBar(TEST_ARRANGEMENT, 7);

    expect(first).toEqual(second);
  });
});

describe('arrangement resolver loop boundaries', () => {
  test('loops back to the first section at cycle end', () => {
    const checkpoints = [0, 1, 2, 3, 4].map((barIndex) => {
      const context = resolveArrangementForBar(TEST_ARRANGEMENT, barIndex);
      return {
        barIndex,
        phase: context.phase,
        sectionIndex: context.sectionIndex,
        cycleBarIndex: context.cycleBarIndex,
      };
    });

    expect(checkpoints).toEqual([
      { barIndex: 0, phase: 'intro', sectionIndex: 0, cycleBarIndex: 0 },
      { barIndex: 1, phase: 'intro', sectionIndex: 0, cycleBarIndex: 1 },
      { barIndex: 2, phase: 'build', sectionIndex: 1, cycleBarIndex: 2 },
      { barIndex: 3, phase: 'intro', sectionIndex: 0, cycleBarIndex: 0 },
      { barIndex: 4, phase: 'intro', sectionIndex: 0, cycleBarIndex: 1 },
    ]);
  });

  test('clamps to final section when loop is disabled', () => {
    const nonLooping: MusicArrangementConfig = {
      ...TEST_ARRANGEMENT,
      loop: false,
    };

    const context = resolveArrangementForBar(nonLooping, 10);
    expect(context.phase).toBe('build');
    expect(context.sectionIndex).toBe(1);
    expect(context.cycleBarIndex).toBe(2);
  });

  test('normalizes malformed bar indexes before looping', () => {
    const negativeBar = resolveArrangementForBar(TEST_ARRANGEMENT, -3.8);
    const fractionalBar = resolveArrangementForBar(TEST_ARRANGEMENT, 3.9);
    const nonFiniteBar = resolveArrangementForBar(TEST_ARRANGEMENT, Number.POSITIVE_INFINITY);

    expect(negativeBar).toMatchObject({
      phase: 'intro',
      sectionIndex: 0,
      cycleBarIndex: 0,
    });
    expect(fractionalBar).toMatchObject({
      phase: 'intro',
      sectionIndex: 0,
      cycleBarIndex: 0,
    });
    expect(nonFiniteBar).toMatchObject({
      phase: 'intro',
      sectionIndex: 0,
      cycleBarIndex: 0,
    });
  });
});

describe('arrangement resolver fallbacks', () => {
  test('returns safe defaults when sections are missing', () => {
    const context = resolveArrangementForBar(undefined, 5);
    expect(context).toEqual({
      phase: 'intro',
      density: 1,
      energyLift: 0,
      sectionIndex: -1,
      cycleBarIndex: 5,
    });
  });

  test('reports total cycle bars for normalized sections', () => {
    expect(getArrangementCycleBars(TEST_ARRANGEMENT)).toBe(3);
    expect(getArrangementCycleBars(undefined)).toBe(0);
  });

  test('normalizes malformed numeric section values into safe defaults', () => {
    const malformed: MusicArrangementConfig = {
      loop: true,
      sections: [
        {
          phase: 'intro',
          barsDuration: Number.NaN,
          density: 0.25,
          energyLift: 0.1,
        },
        {
          phase: 'build',
          barsDuration: 0.49,
          density: Number.NaN,
          energyLift: Number.POSITIVE_INFINITY,
          layerGainMultipliers: {
            bass: Number.NaN,
            pulse: Number.NEGATIVE_INFINITY,
            lead: 1.25,
          },
        },
      ],
    };

    const context = resolveArrangementForBar(malformed, 0);

    expect(context).toEqual({
      phase: 'build',
      density: 1,
      energyLift: 0,
      layerGainMultipliers: { lead: 1.25 },
      sectionIndex: 0,
      cycleBarIndex: 0,
    });
    expect(getArrangementCycleBars(malformed)).toBe(1);
  });
});
