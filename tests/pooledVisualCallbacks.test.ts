import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { Asteroid } = await import('../src/entities/Asteroid');
const { EnemyBase } = await import('../src/entities/enemies/EnemyBase');
const { HelperShip } = await import('../src/entities/HelperShip');
const { Player } = await import('../src/entities/Player');
type AsteroidInstance = InstanceType<typeof Asteroid>;
type EnemyBaseInstance = InstanceType<typeof EnemyBase>;
type HelperShipInstance = InstanceType<typeof HelperShip>;
type PlayerInstance = InstanceType<typeof Player>;

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
    const setTint = mock();
    const setTintMode = mock();

    const enemy = Object.create(EnemyBase.prototype) as EnemyBaseInstance;
    enemy.hp = 2;
    (enemy as unknown as Record<string, unknown>).active = true;
    (enemy as unknown as Record<string, unknown>).visualFlashToken = 0;
    (enemy as unknown as Record<string, unknown>).scene = scene;
    (enemy as unknown as Record<string, unknown>).setTint = setTint;
    (enemy as unknown as Record<string, unknown>).setTintMode = setTintMode;
    (enemy as unknown as Record<string, unknown>).clearTint = clearTint;

    enemy.takeDamage(1);

    expect(setTint).toHaveBeenCalledWith(0xffffff);
    expect(setTintMode).toHaveBeenCalledWith(1);

    (enemy as unknown as Record<string, number>).visualFlashToken = scheduled[0].args[0] + 1;
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(clearTint).not.toHaveBeenCalled();
  });

  test('asteroid collision flash callback ignores an asteroid reused with a new tint', () => {
    const { scene, scheduled } = createDelayedCallHarness();
    const setTint = mock();
    const setTintMode = mock();
    const clearTint = mock();

    const asteroid = Object.create(Asteroid.prototype) as AsteroidInstance;
    (asteroid as unknown as Record<string, unknown>).active = true;
    (asteroid as unknown as Record<string, unknown>).visualFlashToken = 0;
    (asteroid as unknown as Record<string, unknown>).scene = scene;
    (asteroid as unknown as Record<string, unknown>).destroyOnPlayerImpact = false;
    (asteroid as unknown as Record<string, unknown>).baseTint = 0x446688;
    (asteroid as unknown as Record<string, unknown>).setTint = setTint;
    (asteroid as unknown as Record<string, unknown>).setTintMode = setTintMode;
    (asteroid as unknown as Record<string, unknown>).clearTint = clearTint;

    asteroid.onPlayerCollision();

    (asteroid as unknown as Record<string, number>).visualFlashToken = scheduled[0].args[0] + 1;
    (asteroid as unknown as Record<string, unknown>).baseTint = 0x99ccff;
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(setTint).toHaveBeenCalledTimes(1);
    expect(setTint).toHaveBeenCalledWith(0xffaa66);
    expect(setTintMode).toHaveBeenCalledWith(1);
    expect(clearTint).not.toHaveBeenCalled();
  });

  test('asteroid hit uses fill tint and restores its configured base tint', () => {
    const { scene, scheduled } = createDelayedCallHarness();
    const setTint = mock();
    const setTintMode = mock();
    const clearTint = mock();

    const asteroid = Object.create(Asteroid.prototype) as AsteroidInstance;
    asteroid.hp = 2;
    (asteroid as unknown as Record<string, unknown>).active = true;
    (asteroid as unknown as Record<string, unknown>).visualFlashToken = 0;
    (asteroid as unknown as Record<string, unknown>).scene = scene;
    (asteroid as unknown as Record<string, unknown>).indestructible = false;
    (asteroid as unknown as Record<string, unknown>).baseTint = 0x446688;
    (asteroid as unknown as Record<string, unknown>).setTint = setTint;
    (asteroid as unknown as Record<string, unknown>).setTintMode = setTintMode;
    (asteroid as unknown as Record<string, unknown>).clearTint = clearTint;

    asteroid.takeDamage(1);
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(asteroid.hp).toBe(1);
    expect(setTint).toHaveBeenCalledWith(0xffffff);
    expect(setTintMode).toHaveBeenCalledWith(1);
    expect(setTint).toHaveBeenCalledWith(0x446688);
    expect(setTintMode).toHaveBeenCalledWith(0);
    expect(clearTint).not.toHaveBeenCalled();
  });

  test('asteroid hit callback ignores a pooled reuse with a different base tint', () => {
    const { scene, scheduled } = createDelayedCallHarness();
    const setTint = mock();
    const setTintMode = mock();

    const asteroid = Object.create(Asteroid.prototype) as AsteroidInstance;
    asteroid.hp = 2;
    (asteroid as unknown as Record<string, unknown>).active = true;
    (asteroid as unknown as Record<string, unknown>).visualFlashToken = 0;
    (asteroid as unknown as Record<string, unknown>).scene = scene;
    (asteroid as unknown as Record<string, unknown>).indestructible = false;
    (asteroid as unknown as Record<string, unknown>).baseTint = 0x446688;
    (asteroid as unknown as Record<string, unknown>).setTint = setTint;
    (asteroid as unknown as Record<string, unknown>).setTintMode = setTintMode;
    (asteroid as unknown as Record<string, unknown>).clearTint = mock();

    asteroid.takeDamage(1);
    (asteroid as unknown as Record<string, number>).visualFlashToken = scheduled[0].args[0] + 1;
    (asteroid as unknown as Record<string, unknown>).baseTint = 0x99ccff;
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(setTint).toHaveBeenCalledTimes(1);
    expect(setTint).toHaveBeenCalledWith(0xffffff);
    expect(setTint).not.toHaveBeenCalledWith(0x99ccff);
    expect(setTintMode).toHaveBeenCalledWith(1);
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
    (helper as unknown as Record<string, unknown>).setTintMode = mock();
    (helper as unknown as Record<string, unknown>).clearTint = clearTint;

    helper.takeDamage(1, 1000, { createSparkBurst: mock(), createExplosion: mock() } as never);

    (helper as unknown as Record<string, number>).visualFlashToken = scheduled[0].args[0] + 1;
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(clearTint).not.toHaveBeenCalled();
  });

  test('player shield flash callback ignores a later damage flash on the same player', () => {
    const { scene, scheduled } = createDelayedCallHarness();
    const setTint = mock();
    const clearTint = mock();

    const player = Object.create(Player.prototype) as PlayerInstance;
    player.isAlive = true;
    (player as unknown as Record<string, unknown>).visualFlashToken = 0;
    (player as unknown as Record<string, unknown>).scene = scene;
    (player as unknown as Record<string, unknown>).setTint = setTint;
    (player as unknown as Record<string, unknown>).setTintMode = mock();
    (player as unknown as Record<string, unknown>).clearTint = clearTint;

    (player as unknown as { flashShield: () => void }).flashShield();
    const shieldFlash = scheduled[0];

    (player as unknown as { flashWhite: () => void }).flashWhite();
    const damageFlash = scheduled[1];

    shieldFlash.callback.apply(shieldFlash.scope, shieldFlash.args);
    expect(clearTint).not.toHaveBeenCalled();

    damageFlash.callback.apply(damageFlash.scope, damageFlash.args);
    expect(clearTint).toHaveBeenCalledTimes(1);
    expect(setTint).toHaveBeenCalledWith(0x44aaff);
    expect(setTint).toHaveBeenCalledWith(0xffffff);
  });

  test('player hit flash callback ignores a player that died after the flash was scheduled', () => {
    const { scene, scheduled } = createDelayedCallHarness();
    const clearTint = mock();

    const player = Object.create(Player.prototype) as PlayerInstance;
    player.isAlive = true;
    (player as unknown as Record<string, unknown>).visualFlashToken = 0;
    (player as unknown as Record<string, unknown>).scene = scene;
    (player as unknown as Record<string, unknown>).setTint = mock();
    (player as unknown as Record<string, unknown>).setTintMode = mock();
    (player as unknown as Record<string, unknown>).clearTint = clearTint;

    (player as unknown as { flashWhite: () => void }).flashWhite();

    player.isAlive = false;
    (player as unknown as Record<string, number>).visualFlashToken = scheduled[0].args[0] + 1;
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(clearTint).not.toHaveBeenCalled();
  });
});
