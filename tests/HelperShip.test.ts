import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
        Body: class {},
      },
    },
    Math: {
      Linear: (a: number, b: number, t: number) => a + (b - a) * t,
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
      DegToRad: (degrees: number) => (degrees * Math.PI) / 180,
      Between: (min: number) => min,
    },
  },
}));

const { HelperShip } = await import('../src/entities/HelperShip');

describe('HelperShip', () => {
  test('takeDamage enters respawn when lives remain after lethal damage', () => {
    const createExplosion = mock();
    const disableBody = mock();
    const deplete = mock();

    const helper = Object.create(HelperShip.prototype) as HelperShip;
    helper.hp = 1;
    helper.remainingLives = 2;
    (helper as unknown as Record<string, unknown>).active = true;
    (helper as unknown as Record<string, unknown>).depleted = false;
    helper.x = 40;
    helper.y = 60;
    helper.body = { enable: true } as never;
    (helper as unknown as Record<string, unknown>).disableBody = disableBody;
    (helper as unknown as Record<string, unknown>).clearTint = mock();
    (helper as unknown as Record<string, unknown>).deplete = deplete;

    const outcome = helper.takeDamage(1, 1234, { createExplosion } as never);

    expect(outcome).toBe('respawning');
    expect(helper.remainingLives).toBe(1);
    expect(createExplosion).toHaveBeenCalledWith(40, 60, 0.65);
    expect(disableBody).toHaveBeenCalledWith(true, true);
    expect((helper as unknown as Record<string, unknown>).respawnAt).toBe(1234 + (helper as unknown as Record<string, unknown>).respawnDelayMs);
    expect(deplete).not.toHaveBeenCalled();
  });

  test('updateWithPlayer respawns when timer elapses and otherwise follows and fires when active', () => {
    const spawn = mock();
    const fireShot = mock();
    const setPosition = mock();
    const player = { x: 100, y: 200, isAlive: true, rotation: 0.4 };
    const bulletPool = { id: 'bulletPool' };
    const effectsManager = { id: 'effectsManager' };

    const helper = Object.create(HelperShip.prototype) as HelperShip;
    (helper as unknown as Record<string, unknown>).depleted = false;
    (helper as unknown as Record<string, unknown>).active = false;
    (helper as unknown as Record<string, unknown>).respawnAt = 500;
    helper.remainingLives = 1;
    (helper as unknown as Record<string, unknown>).followOffsetX = 10;
    (helper as unknown as Record<string, unknown>).followOffsetY = 16;
    (helper as unknown as Record<string, unknown>).spawn = spawn;

    helper.updateWithPlayer(player as never, 500, bulletPool as never, effectsManager as never);
    expect(spawn).toHaveBeenCalledWith(110, 216, 500);

    (helper as unknown as Record<string, unknown>).active = true;
    (helper as unknown as Record<string, unknown>).respawnAt = -1;
    (helper as unknown as Record<string, unknown>).x = 0;
    (helper as unknown as Record<string, unknown>).y = 0;
    (helper as unknown as Record<string, unknown>).rotation = 0;
    (helper as unknown as Record<string, unknown>).followLerp = 0.5;
    (helper as unknown as Record<string, unknown>).lastFireTime = 0;
    (helper as unknown as Record<string, unknown>).fireRateMs = 100;
    (helper as unknown as Record<string, unknown>).fireShot = fireShot;
    (helper as unknown as Record<string, unknown>).setPosition = setPosition;
    helper.body = { updateFromGameObject: mock() } as never;

    helper.updateWithPlayer(player as never, 120, bulletPool as never, effectsManager as never);

    expect(setPosition).toHaveBeenCalledWith(55, 108);
    expect(fireShot).toHaveBeenCalledWith(bulletPool, effectsManager);
  });
});
