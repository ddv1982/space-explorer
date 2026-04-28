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
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
      DegToRad: (degrees: number) => degrees * (Math.PI / 180),
      RadToDeg: (radians: number) => radians * (180 / Math.PI),
      Angle: {
        Between: (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1),
      },
    },
  },
}));

const { Boss } = await import('../src/entities/enemies/Boss');

describe('Boss', () => {
  test('updateBehavior marks arrival when reaching target Y and stops descent', () => {
    const setVelocityY = mock();
    const updateMovement = mock();

    const boss = Object.create(Boss.prototype) as Boss;
    (boss as unknown as Record<string, unknown>).arrived = false;
    (boss as unknown as Record<string, unknown>).y = 80;
    (boss as unknown as Record<string, unknown>).targetY = 80;
    (boss as unknown as Record<string, unknown>).phaseStartedAt = 0;
    (boss as unknown as Record<string, unknown>).setVelocityY = setVelocityY;
    (boss as unknown as Record<string, unknown>).updateMovement = updateMovement;

    boss.updateBehavior(500, 16);

    expect((boss as unknown as Record<string, unknown>).arrived).toBe(true);
    expect((boss as unknown as Record<string, unknown>).phaseStartedAt).toBe(500);
    expect(setVelocityY).toHaveBeenCalledWith(0);
    expect(updateMovement).not.toHaveBeenCalled();
  });

  test('updateBehavior transitions to phase two and emits the phase-change event', () => {
    const emit = mock();
    const flashPhaseChange = mock();
    const updateMovement = mock();
    const updateShieldState = mock();
    const firePattern = mock();

    const boss = Object.create(Boss.prototype) as Boss;
    (boss as unknown as Record<string, unknown>).arrived = true;
    (boss as unknown as Record<string, unknown>).phase = 1;
    (boss as unknown as Record<string, unknown>).hp = 20;
    (boss as unknown as Record<string, unknown>).maxHp = 40;
    (boss as unknown as Record<string, unknown>).moveSpeed = 80;
    (boss as unknown as Record<string, unknown>).phase2MoveSpeed = 150;
    (boss as unknown as Record<string, unknown>).phaseTransitionPauseMs = 320;
    (boss as unknown as Record<string, unknown>).lastFireTime = 100;
    (boss as unknown as Record<string, unknown>).bulletGroup = null;
    (boss as unknown as Record<string, unknown>).scene = {
      events: { emit },
    };
    (boss as unknown as Record<string, unknown>).updateMovement = updateMovement;
    (boss as unknown as Record<string, unknown>).updateShieldState = updateShieldState;
    (boss as unknown as Record<string, unknown>).flashPhaseChange = flashPhaseChange;
    (boss as unknown as Record<string, unknown>).firePattern = firePattern;

    boss.updateBehavior(1000, 16);

    expect((boss as unknown as Record<string, unknown>).phase).toBe(2);
    expect((boss as unknown as Record<string, unknown>).moveSpeed).toBe(150);
    expect((boss as unknown as Record<string, unknown>).phaseStartedAt).toBe(1000);
    expect((boss as unknown as Record<string, unknown>).lastFireTime).toBe(1320);
    expect(updateMovement).toHaveBeenCalledWith(1000, 16);
    expect(updateShieldState).toHaveBeenCalledWith(1000);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0]?.[1]).toBe(2);
    expect(flashPhaseChange).toHaveBeenCalledTimes(1);
    expect(firePattern).not.toHaveBeenCalled();
  });
});
