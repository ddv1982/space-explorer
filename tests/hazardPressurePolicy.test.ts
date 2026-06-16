import { describe, expect, mock, test } from 'bun:test';
import type { ScriptedHazardConfig } from '../src/config/LevelsConfig';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      Linear: (start: number, end: number, t: number) => start + (end - start) * t,
    },
  },
}));

const {
  canTriggerHazard,
  consumeHazardPressure,
  decayHazardPressure,
  getEncounterCountPressureScale,
  getEncounterIntervalPressureScale,
  getHazardPressureCost,
  isHazardWithinDuration,
} = await import('../src/systems/wave/hazardPressurePolicy');
const { TERMINUS_BLACK_LEVEL } = await import('../src/config/levels/definitions/terminusBlack');

function simulateHazardTriggerCounts(hazards: ScriptedHazardConfig[]): number[] {
  const maxCadenceMs = Math.max(...hazards.map((hazard) => hazard.cadenceMs ?? 2000));
  const horizonMs = maxCadenceMs * 6;
  const stepMs = 100;
  const counts = hazards.map(() => 0);
  const lastTriggered = hazards.map(() => 0);
  let hazardPressure = 0;

  for (let time = stepMs; time <= horizonMs; time += stepMs) {
    hazardPressure = decayHazardPressure(hazardPressure, stepMs);

    hazards.forEach((hazard, index) => {
      const cadence = hazard.cadenceMs ?? 2000;

      if (!isHazardWithinDuration(hazard, time)) {
        return;
      }

      if (time <= lastTriggered[index] + cadence) {
        return;
      }

      if (!canTriggerHazard(hazardPressure, hazard)) {
        return;
      }

      hazardPressure = consumeHazardPressure(hazardPressure, hazard);
      lastTriggered[index] = time;
      counts[index] += 1;
    });
  }

  return counts;
}

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

  test('eventide convergence keeps every authored hazard pressure-reachable', () => {
    const convergenceSection = TERMINUS_BLACK_LEVEL.sections.find((section) => section.id === 'eventide-convergence');
    const hazards = convergenceSection?.hazardEvents ?? [];
    const triggerCounts = simulateHazardTriggerCounts(hazards);

    expect(hazards.map((hazard) => hazard.type)).toEqual([
      'gravity-well',
      'energy-storm',
      'ring-crossfire',
      'debris-surge',
    ]);
    expect(triggerCounts.every((count) => count > 0)).toBe(true);
  });
});
