import { describe, expect, test } from 'bun:test';
import { advanceBossGuard, applyBossGuardHit } from '../src/entities/enemies/boss/BossGuardController';

const idle = { capacity: 4, value: 0, lastHitAt: Number.NEGATIVE_INFINITY, broken: false, brokenUntil: 0 };

describe('BossGuardController', () => {
  test('fills to capacity and requests one break', () => {
    expect(applyBossGuardHit({ ...idle, value: 2 }, 2, 100)).toMatchObject({ value: 4, lastHitAt: 100, shouldBreak: true });
    expect(applyBossGuardHit({ ...idle, broken: true }, 2, 100).shouldBreak).toBe(false);
  });

  test('freezes an active break then resets on recovery', () => {
    const broken = { ...idle, value: 4, broken: true, brokenUntil: 2500 };
    expect(advanceBossGuard(broken, { time: 2499, delta: 16, decayDelayMs: 1500, decayPerSecond: 10 })).toMatchObject({ frozen: true, recovered: false });
    expect(advanceBossGuard(broken, { time: 2500, delta: 16, decayDelayMs: 1500, decayPerSecond: 10 })).toMatchObject({ value: 0, broken: false, frozen: false, recovered: true });
  });
});
