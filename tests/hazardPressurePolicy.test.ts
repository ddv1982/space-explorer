import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      Linear: (start: number, end: number, t: number) => start + (end - start) * t,
    },
  },
}));

import {
  canTriggerHazard,
  consumeHazardPressure,
  decayHazardPressure,
  getEncounterCountPressureScale,
  getEncounterIntervalPressureScale,
  getHazardPressureCost,
  isHazardWithinDuration,
} from '../src/systems/wave/hazardPressurePolicy';

describe('hazardPressurePolicy', () => {
  test('duration gating treats undefined as infinite and clamps negative durations', () => {
    expect(isHazardWithinDuration({ type: 'minefield' }, 5000)).toBe(true);
    expect(isHazardWithinDuration({ type: 'minefield', durationMs: -10 }, 0)).toBe(true);
    expect(isHazardWithinDuration({ type: 'minefield', durationMs: -10 }, 1)).toBe(false);
  });

  test('pressure math decays, costs, clamps, and scales as expected', () => {
    const hazard = { type: 'gravity-well', intensity: 1.25 } as const;

    expect(decayHazardPressure(1, 1800)).toBeCloseTo(0, 6);
    expect(getHazardPressureCost(hazard)).toBeCloseTo(1.63625, 6);
    expect(canTriggerHazard(0.75, hazard)).toBe(true);
    expect(canTriggerHazard(0.8, hazard)).toBe(false);
    expect(consumeHazardPressure(1.0, hazard)).toBeCloseTo(2.4, 6);
    expect(getEncounterCountPressureScale(2.4)).toBeCloseTo(0.6, 6);
    expect(getEncounterIntervalPressureScale(2.4)).toBeCloseTo(1.45, 6);
  });
});
