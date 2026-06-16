import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
    Math: {
      FloatBetween: (min: number) => min,
    },
  },
}));

const { Asteroid } = await import('../src/entities/Asteroid');
const { EnemyBase } = await import('../src/entities/enemies/EnemyBase');
const { HelperShip } = await import('../src/entities/HelperShip');
type AsteroidInstance = InstanceType<typeof Asteroid>;
type EnemyBaseInstance = InstanceType<typeof EnemyBase>;
type HelperShipInstance = InstanceType<typeof HelperShip>;

type ScheduledTintCallback = {
  callback: (token: number) => void;
  args: [number];
  scope: unknown;
};

function createDelayedCallHarness() {
  const scheduled: ScheduledTintCallback[] = [];

  return {
    scheduled,
    scene: {
      time: {
        delayedCall: (_delay: number, callback: (token: number) => void, args: [number], scope: unknown) => {
          scheduled.push({ callback, args, scope });
        },
      },
    },
  };
}

describe('pooled visual callback guards', () => {
  test('enemy hit flash callback ignores an enemy reused after the flash was scheduled', () => {
    const { scene, scheduled } = createDelayedCallHarness();
    const clearTint = mock();

    const enemy = Object.create(EnemyBase.prototype) as EnemyBaseInstance;
    enemy.hp = 2;
    (enemy as unknown as Record<string, unknown>).active = true;
    (enemy as unknown as Record<string, unknown>).scene = scene;
    (enemy as unknown as Record<string, unknown>).setTint = mock();
    (enemy as unknown as Record<string, unknown>).clearTint = clearTint;

    enemy.takeDamage(1);

    (enemy as unknown as Record<string, number>).visualFlashToken = scheduled[0].args[0] + 1;
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(clearTint).not.toHaveBeenCalled();
  });

  test('asteroid collision flash callback ignores an asteroid reused with a new tint', () => {
    const { scene, scheduled } = createDelayedCallHarness();
    const setTint = mock();
    const clearTint = mock();

    const asteroid = Object.create(Asteroid.prototype) as AsteroidInstance;
    (asteroid as unknown as Record<string, unknown>).active = true;
    (asteroid as unknown as Record<string, unknown>).scene = scene;
    (asteroid as unknown as Record<string, unknown>).destroyOnPlayerImpact = false;
    (asteroid as unknown as Record<string, unknown>).baseTint = 0x446688;
    (asteroid as unknown as Record<string, unknown>).setTint = setTint;
    (asteroid as unknown as Record<string, unknown>).clearTint = clearTint;

    asteroid.onPlayerCollision();

    (asteroid as unknown as Record<string, number>).visualFlashToken = scheduled[0].args[0] + 1;
    (asteroid as unknown as Record<string, unknown>).baseTint = 0x99ccff;
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(setTint).toHaveBeenCalledTimes(1);
    expect(setTint).toHaveBeenCalledWith(0xffaa66);
    expect(clearTint).not.toHaveBeenCalled();
  });

  test('helper hit flash callback ignores a helper that entered a later lifecycle', () => {
    const { scene, scheduled } = createDelayedCallHarness();
    const clearTint = mock();

    const helper = Object.create(HelperShip.prototype) as HelperShipInstance;
    helper.hp = 2;
    helper.remainingLives = 1;
    (helper as unknown as Record<string, unknown>).active = true;
    (helper as unknown as Record<string, unknown>).depleted = false;
    (helper as unknown as Record<string, unknown>).scene = scene;
    (helper as unknown as Record<string, unknown>).setTint = mock();
    (helper as unknown as Record<string, unknown>).clearTint = clearTint;

    helper.takeDamage(1, 1000, { createSparkBurst: mock(), createExplosion: mock() } as never);

    (helper as unknown as Record<string, number>).visualFlashToken = scheduled[0].args[0] + 1;
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(clearTint).not.toHaveBeenCalled();
  });
});
