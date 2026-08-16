import { describe, expect, test } from 'bun:test';
import { RuntimePerformanceBudget } from '../src/systems/RuntimePerformanceBudget';

function sampleWindow(budget: RuntimePerformanceBudget, delta: number): void {
  for (let index = 0; index < 120; index += 1) budget.sampleFrame(delta);
}

describe('RuntimePerformanceBudget', () => {
  test('stays inert when adaptive quality is not selected', () => {
    const budget = new RuntimePerformanceBudget(() => false);
    sampleWindow(budget, 40);
    expect(budget.getSnapshot()).toMatchObject({ enabled: false, pressureLevel: 0, particleScale: 1 });
  });

  test('degrades one stable step per pressured window and clamps at the floor', () => {
    const budget = new RuntimePerformanceBudget(() => true);
    for (let level = 0; level < 6; level += 1) sampleWindow(budget, 30);
    expect(budget.getSnapshot()).toMatchObject({
      pressureLevel: 3,
      particleScale: 0.42,
      trailIntervalScale: 2.25,
      backgroundLayerLimit: 2,
      glowEnabled: false,
    });
  });

  test('requires four healthy windows before restoring a single step', () => {
    const budget = new RuntimePerformanceBudget(() => true);
    sampleWindow(budget, 30);
    sampleWindow(budget, 30);
    for (let window = 0; window < 3; window += 1) sampleWindow(budget, 16);
    expect(budget.getSnapshot().pressureLevel).toBe(2);
    sampleWindow(budget, 16);
    expect(budget.getSnapshot().pressureLevel).toBe(1);
  });

  test('ignores invalid, paused, and debugger-sized deltas', () => {
    const budget = new RuntimePerformanceBudget(() => true);
    for (const delta of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 251, 1000]) {
      budget.sampleFrame(delta);
    }
    expect(budget.getSnapshot().sampleCount).toBe(0);
  });

  test('notifies subscribers only when the pressure level changes', () => {
    const budget = new RuntimePerformanceBudget(() => true);
    const levels: number[] = [];
    const unsubscribe = budget.subscribe((snapshot) => levels.push(snapshot.pressureLevel));
    sampleWindow(budget, 30);
    unsubscribe();
    sampleWindow(budget, 30);
    expect(levels).toEqual([1]);
  });

  test('primes large canvases and reduced-motion environments without user-agent detection', () => {
    const largeCanvas = new RuntimePerformanceBudget(() => true);
    largeCanvas.primeForEnvironment({ backingPixelCount: 2_000_001, reducedMotion: false });
    expect(largeCanvas.getSnapshot().pressureLevel).toBe(1);

    const reducedMotion = new RuntimePerformanceBudget(() => true);
    reducedMotion.primeForEnvironment({ backingPixelCount: 1, reducedMotion: true });
    expect(reducedMotion.getSnapshot().pressureLevel).toBe(1);
  });
});
