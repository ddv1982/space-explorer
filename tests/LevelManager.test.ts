import { describe, expect, test } from 'bun:test';
import { LevelManager } from '../src/systems/LevelManager';
import { SCROLL_SPEED } from '../src/utils/constants';

describe('LevelManager frame delta', () => {
  test('preserves one nominal frame of campaign distance at 60fps', () => {
    const manager = new LevelManager();
    manager.init(1);

    manager.update(1000 / 60);

    expect(manager.distance).toBeCloseTo(SCROLL_SPEED, 10);
  });

  test('advances equivalent distance at 30fps and 120fps over equal elapsed time', () => {
    const at30 = new LevelManager();
    const at120 = new LevelManager();
    at30.init(1);
    at120.init(1);

    for (let i = 0; i < 30; i++) at30.update(1000 / 30);
    for (let i = 0; i < 120; i++) at120.update(1000 / 120);

    expect(at30.distance).toBeCloseTo(at120.distance, 10);
    expect(at30.distance).toBeCloseTo(SCROLL_SPEED * 60, 10);
  });

  test('does not move campaign progress for a non-positive paused delta', () => {
    const manager = new LevelManager();
    manager.init(1);

    manager.update(0);
    manager.update(-100);

    expect(manager.distance).toBe(0);
    expect(manager.progress).toBe(0);
  });
});
