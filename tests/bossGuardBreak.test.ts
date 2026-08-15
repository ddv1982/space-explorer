import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { Boss } = await import('../src/entities/enemies/Boss');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');
const { LEVELS } = await import('../src/config/levels/registry');
const { createScaledBossConfig } = await import('../src/systems/balance/bossScaling');

type BossInstance = InstanceType<typeof Boss>;
type BossInternals = Record<string, unknown> & BossInstance;

function createGuardBoss(): {
  boss: BossInstance;
  emit: ReturnType<typeof mock>;
  setVelocity: ReturnType<typeof mock>;
  updateMovement: ReturnType<typeof mock>;
  tryFirePattern: ReturnType<typeof mock>;
} {
  const emit = mock();
  const setVelocity = mock();
  const updateMovement = mock();
  const tryFirePattern = mock();
  const boss = Object.create(Boss.prototype) as BossInternals;

  Object.assign(boss, {
    active: true,
    arrived: true,
    hp: 100,
    maxHp: 100,
    shieldActive: false,
    guardCapacity: 4,
    guardValue: 0,
    guardDecayDelayMs: 1500,
    guardDecayPerSecond: 10,
    guardBreakDurationMs: 2500,
    guardLastHitAt: Number.NEGATIVE_INFINITY,
    guardBrokenUntil: 0,
    guardBroken: false,
    lastFireTime: 0,
    phaseStartedAt: 0,
    bossFlashToken: 0,
    visualFlashToken: 0,
    phase: 1,
    scene: {
      physics: { world: { isPaused: false } },
      time: {
        now: 0,
        delayedCall: () => {},
      },
      events: { emit },
    },
    setTint: mock(),
    setTintMode: mock(),
    clearTint: mock(),
    setVelocity,
    setVelocityY: mock(),
    updateMovement,
    updatePhaseState: mock(),
    updateShieldState: mock(),
    tryFirePattern,
    visualRig: { update: mock() },
    gameplayTime: 0,
    die: mock(),
  });

  return { boss, emit, setVelocity, updateMovement, tryFirePattern };
}

describe('Boss Guard Break', () => {
  test('main-player damage fills guard, breaks once, and receives the 2x damage window', () => {
    const { boss, emit } = createGuardBoss();

    boss.takePlayerDamage(2, 100);
    expect(boss.hp).toBe(98);
    expect(boss.getGuardState()).toEqual({ enabled: true, ratio: 0.5, broken: false });

    boss.takePlayerDamage(2, 200);
    expect(boss.hp).toBe(96);
    expect(boss.getGuardState()).toEqual({ enabled: true, ratio: 1, broken: true });
    expect(emit).toHaveBeenCalledWith(GAME_SCENE_EVENTS.bossGuardBreak);

    boss.takePlayerDamage(3, 300);
    expect(boss.hp).toBe(90);
    expect(emit).toHaveBeenCalledTimes(1);

    // Generic support damage stays flat and never participates in Guard Break.
    boss.takeDamage(1);
    expect(boss.hp).toBe(89);
    expect(boss.getGuardState().ratio).toBe(1);
  });

  test('freezes attacks during the break and resets timers on recovery', () => {
    const { boss, setVelocity, updateMovement, tryFirePattern } = createGuardBoss();
    (boss as unknown as Record<string, unknown>).gameplayTime = 100;
    boss.takePlayerDamage(4, 100);

    boss.updateBehavior(2599, 16);
    expect(setVelocity).toHaveBeenCalledWith(0, 0);
    expect(updateMovement).not.toHaveBeenCalled();
    expect(tryFirePattern).not.toHaveBeenCalled();

    boss.updateBehavior(2600, 16);
    expect(boss.getGuardState()).toEqual({ enabled: true, ratio: 0, broken: false });
    const state = boss as unknown as Record<string, unknown>;
    expect(state.lastFireTime).toBe(2600);
    expect(state.phaseStartedAt).toBe(2600);
    expect(updateMovement).toHaveBeenCalledWith(2600, 16);
  });

  test('waits 1.5 seconds before guard starts decaying', () => {
    const { boss } = createGuardBoss();
    boss.takePlayerDamage(2, 0);

    (boss as unknown as { updateGuardState(time: number, delta: number): boolean })
      .updateGuardState(1500, 100);
    expect(boss.getGuardState().ratio).toBe(0.5);

    (boss as unknown as { updateGuardState(time: number, delta: number): boolean })
      .updateGuardState(1600, 100);
    expect(boss.getGuardState().ratio).toBe(0.25);
  });

  test('preserves the remaining Guard Break window across a physics-only pause', () => {
    const { boss, updateMovement } = createGuardBoss();
    const state = boss as unknown as Record<string, unknown>;

    boss.preUpdate(1000, 100);
    boss.takePlayerDamage(2, 1000);

    const world = (state.scene as { physics: { world: { isPaused: boolean } } }).physics.world;
    world.isPaused = true;
    boss.preUpdate(50_000, 49_000);
    world.isPaused = false;

    // Collision processing may precede the first resumed preUpdate. The wall
    // timestamp must not leak into the Guard Break deadline.
    boss.takePlayerDamage(2, 50_000);
    expect(boss.getGuardState().broken).toBe(true);

    boss.preUpdate(52_499, 2499);
    expect(boss.getGuardState().broken).toBe(true);

    boss.preUpdate(52_500, 1);
    expect(boss.getGuardState().broken).toBe(false);
    expect(updateMovement).toHaveBeenLastCalledWith(2600, 1);
  });

  test('is absent from levels 1-4 and configured for every boss from level 5 onward', () => {
    expect(LEVELS.slice(0, 4).every((level) => level.boss?.guardCapacity === undefined)).toBe(true);
    expect(LEVELS.slice(4).every((level) => (level.boss?.guardCapacity ?? 0) > 0)).toBe(true);
  });

  test('keeps late-game breaks demanding, brief, and progressively tougher', () => {
    const guardBosses = LEVELS.slice(4).map((level) => level.boss!);

    expect(guardBosses.map((boss) => boss.guardCapacity)).toEqual([30, 35, 40, 45, 50, 60]);
    expect(guardBosses.every((boss) => boss.guardDecayDelayMs === 1200)).toBe(true);
    expect(guardBosses.map((boss) => boss.guardDecayPerSecond)).toEqual([10, 12, 14, 16, 18, 21]);
    expect(guardBosses.every((boss) => boss.guardBreakDurationMs === 1800)).toBe(true);
  });

  test('scales guard capacity sublinearly while preserving disabled bosses', () => {
    const upgrades = { hp: 3, damage: 3, fireRate: 3, shield: 2, turrets: 2 };
    const enabled = createScaledBossConfig(LEVELS[4].boss!, {
      levelNumber: 5,
      totalLevels: LEVELS.length,
      upgrades,
    });
    const disabled = createScaledBossConfig(LEVELS[2].boss!, {
      levelNumber: 3,
      totalLevels: LEVELS.length,
      upgrades,
    });

    expect(enabled.guardCapacity).toBeGreaterThan(LEVELS[4].boss!.guardCapacity!);
    expect(enabled.guardCapacity).toBeLessThan(LEVELS[4].boss!.guardCapacity! * 2.2);
    expect(disabled.guardCapacity).toBeUndefined();
  });
});
