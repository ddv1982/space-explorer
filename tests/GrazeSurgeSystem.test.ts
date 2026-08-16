import { describe, expect, test } from 'bun:test';

import type { GrazeSurgeBullet } from '../src/systems/GrazeSurgeSystem';

const { GrazeSurgeSystem } = await import('../src/systems/GrazeSurgeSystem');

type FakeBullet = GrazeSurgeBullet & { killCalls: number };

function createHarness(options: { playerAlive?: boolean; bullets?: Array<{ x: number; y: number }> } = {}) {
  const bullets: FakeBullet[] = (options.bullets ?? []).map((bullet) => ({
    active: true as boolean,
    x: bullet.x,
    y: bullet.y,
    killCalls: 0,
    kill() {
      this.killCalls += 1;
      this.active = false;
    },
  }));
  const grazes: Array<{ x: number; y: number }> = [];
  const pulses: Array<{ x: number; y: number; clearedBullets: number }> = [];

  const system = new GrazeSurgeSystem({
    getPlayerPosition: () => (options.playerAlive === false ? null : { x: 100, y: 100 }),
    getEnemyBullets: () => bullets,
    onGraze: (x, y) => {
      grazes.push({ x, y });
    },
    onSurgePulse: (x, y, clearedBullets) => {
      pulses.push({ x, y, clearedBullets });
    },
  });

  return { system, bullets, grazes, pulses };
}

describe('GrazeSurgeSystem', () => {
  test('grazes a bullet inside the radius only once while it stays active', () => {
    const harness = createHarness({ bullets: [{ x: 110, y: 100 }] });

    harness.system.update();
    harness.system.update();

    expect(harness.grazes).toEqual([{ x: 110, y: 100 }]);
    expect(harness.system.getGaugeRatio()).toBeCloseTo(1 / 40);
  });

  test('ignores bullets outside the graze radius', () => {
    const harness = createHarness({ bullets: [{ x: 200, y: 100 }] });

    harness.system.update();

    expect(harness.grazes).toEqual([]);
    expect(harness.system.getGaugeRatio()).toBe(0);
  });

  test('allows a recycled bullet to graze again after it goes inactive', () => {
    const harness = createHarness({ bullets: [{ x: 110, y: 100 }] });
    const bullet = harness.bullets[0];

    harness.system.update();
    bullet.active = false;
    harness.system.update();
    bullet.active = true;
    harness.system.update();

    expect(harness.grazes).toHaveLength(2);
  });

  test('does nothing while the player is dead', () => {
    const harness = createHarness({ playerAlive: false, bullets: [{ x: 100, y: 100 }] });

    harness.system.update();

    expect(harness.grazes).toEqual([]);
    expect(harness.system.getGaugeRatio()).toBe(0);
  });

  test('fires the surge pulse at full gauge, clearing nearby bullets and resetting the gauge', () => {
    const nearBullets = Array.from({ length: 40 }, (_, index) => ({ x: 110 + index * 0.1, y: 100 }));
    const harness = createHarness({ bullets: [...nearBullets, { x: 500, y: 500 }] });

    harness.system.update();

    expect(harness.pulses).toEqual([{ x: 100, y: 100, clearedBullets: 40 }]);
    expect(harness.system.getGaugeRatio()).toBe(0);
    expect(harness.bullets[39].active).toBe(false);
    expect(harness.bullets[40].active).toBe(true);
  });

  test('counts double gauge while the boss is active', () => {
    const harness = createHarness({ bullets: [{ x: 110, y: 100 }] });

    harness.system.setBossActive(true);
    harness.system.update();

    expect(harness.system.getGaugeRatio()).toBeCloseTo(2 / 40);
  });

  test('reset clears the gauge and boss state', () => {
    const harness = createHarness({ bullets: [{ x: 110, y: 100 }] });

    harness.system.setBossActive(true);
    harness.system.update();
    harness.system.reset();

    expect(harness.system.getGaugeRatio()).toBe(0);
  });
});
