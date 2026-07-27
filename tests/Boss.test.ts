import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { Boss } = await import('../src/entities/enemies/Boss');
type BossInstance = InstanceType<typeof Boss>;

describe('Boss', () => {
  test('updateBehavior marks arrival when reaching target Y and stops descent', () => {
    const setVelocityY = mock();
    const updateMovement = mock();

    const boss = Object.create(Boss.prototype) as BossInstance;
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

    const boss = Object.create(Boss.prototype) as BossInstance;
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

  test('phase flash invalidates an ordinary hit restore and keeps its intentional tint', () => {
    const scheduled: Array<{ callback: (token: number) => void; args: [number]; scope: unknown }> = [];
    const setTint = mock();
    const setTintMode = mock();
    const clearTint = mock();

    const boss = Object.create(Boss.prototype) as BossInstance;
    boss.hp = 2;
    (boss as unknown as Record<string, unknown>).active = true;
    (boss as unknown as Record<string, unknown>).visualFlashToken = 0;
    (boss as unknown as Record<string, unknown>).bossFlashToken = 0;
    (boss as unknown as Record<string, unknown>).shieldActive = false;
    (boss as unknown as Record<string, unknown>).scene = {
      time: {
        delayedCall: (_delay: number, callback: (token: number) => void, args: [number], scope: unknown) => {
          scheduled.push({ callback, args, scope });
        },
      },
      cameras: { main: { shake: mock() } },
    };
    (boss as unknown as Record<string, unknown>).setTint = setTint;
    (boss as unknown as Record<string, unknown>).setTintMode = setTintMode;
    (boss as unknown as Record<string, unknown>).clearTint = clearTint;

    boss.takeDamage(1);
    (boss as unknown as { flashPhaseChange: () => void }).flashPhaseChange();
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(setTint).toHaveBeenCalledWith(0xffffff);
    expect(setTintMode).toHaveBeenCalledWith(1);
    expect(setTint).toHaveBeenCalledWith(0xff0000);
    expect(setTintMode).toHaveBeenCalledWith(0);
    expect(clearTint).not.toHaveBeenCalled();
  });

  test('shield impact uses fill tint and restores the shield status tint', () => {
    const scheduled: Array<{ callback: (token: number) => void; args: [number]; scope: unknown }> = [];
    const setTint = mock();
    const setTintMode = mock();

    const boss = Object.create(Boss.prototype) as BossInstance;
    boss.hp = 2;
    (boss as unknown as Record<string, unknown>).active = true;
    (boss as unknown as Record<string, unknown>).shieldActive = true;
    (boss as unknown as Record<string, unknown>).bossFlashToken = 0;
    (boss as unknown as Record<string, unknown>).scene = {
      time: {
        delayedCall: (_delay: number, callback: (token: number) => void, args: [number], scope: unknown) => {
          scheduled.push({ callback, args, scope });
        },
      },
    };
    (boss as unknown as Record<string, unknown>).setTint = setTint;
    (boss as unknown as Record<string, unknown>).setTintMode = setTintMode;

    boss.takeDamage(1);
    scheduled[0].callback.apply(scheduled[0].scope, scheduled[0].args);

    expect(boss.hp).toBe(2);
    expect(setTint).toHaveBeenCalledWith(0xddeeff);
    expect(setTintMode).toHaveBeenCalledWith(1);
    expect(setTintMode).toHaveBeenCalledWith(0);
    expect(setTint).toHaveBeenCalledWith(0x77ccff);
  });
});
