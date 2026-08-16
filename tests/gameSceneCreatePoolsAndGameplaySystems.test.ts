import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
  },
}));

const actualPlayerState = await import('@/systems/PlayerState');
const getHelperWingState = mock(() => ({ grantedSlots: 0, slots: [] }));
mock.module('@/systems/PlayerState', () => ({
  ...actualPlayerState,
  getHelperWingState,
  saveHelperWingState: (): void => undefined,
}));

mock.module('@/entities/PowerUp', () => ({
  PowerUp: class {},
  resolvePowerUpOverlap: (...values: unknown[]) => {
    return (
      values.find(
        (value): value is { active: boolean; powerUpType: string; kill: () => void } =>
          value !== null && typeof value === 'object' && 'powerUpType' in value
      ) ?? null
    );
  },
}));

const { createPoolsAndGameplaySystems } = await import('../src/scenes/gameScene/createPoolsAndGameplaySystems');

describe('createPoolsAndGameplaySystems', () => {
  beforeEach(() => {
    getHelperWingState.mockClear();
  });

  test('initializes gameplay systems in order and wires power-up overlap behavior', () => {
    const callLog: string[] = [];
    let overlapCallback: ((a: unknown, b: unknown) => void) | null = null;
    let capturedTargetProvider: (() => { x: number; y: number } | null) | null = null;

    const scene = {
      registry: { id: 'registry' },
      physics: {
        add: {
          group: (config: unknown) => {
            callLog.push('physics.add.group');
            return { config };
          },
          overlap: (_group: unknown, _player: unknown, callback: (a: unknown, b: unknown) => void) => {
            callLog.push('physics.add.overlap');
            overlapCallback = callback;
          },
        },
      },
    } as unknown as Phaser.Scene;

    const player = {
      damage: 9,
      isAlive: true,
      x: 111,
      y: 222,
    };
    const effectsManager = {};
    const enemyPool = {
      create: () => {
        callLog.push('enemyPool.create');
      },
      setTargetProvider: (provider: () => { x: number; y: number } | null) => {
        callLog.push('enemyPool.setTargetProvider');
        capturedTargetProvider = provider;
      },
    };
    const bulletPool = {
      create: () => {
        callLog.push('bulletPool.create');
      },
    };
    const helperWing = {
      create: (args: { persistentState: unknown }) => {
        callLog.push('helperWing.create');
        expect(args.persistentState).toEqual({ grantedSlots: 0, slots: [] });
      },
    };
    const picketTurrets = {
      create: (args: { tier: number; enemyPool: unknown; effectsManager: unknown }) => {
        callLog.push('picketTurrets.create');
        expect(args.tier).toBe(2);
        expect(args.enemyPool).toBe(enemyPool);
        expect(args.effectsManager).toBe(effectsManager);
      },
    };
    const asteroidGroup = { id: 'asteroids' };
    const hazardBeamSystem = {
      create: () => {
        callLog.push('hazardBeamSystem.create');
      },
    };
    const waveManager = {
      create: () => {
        callLog.push('waveManager.create');
        return asteroidGroup;
      },
      setLevelConfig: (level: number) => {
        callLog.push(`waveManager.setLevelConfig:${level}`);
      },
      setHazardBeamSystem: (system: unknown) => {
        callLog.push('waveManager.setHazardBeamSystem');
        expect(system).toBe(hazardBeamSystem);
      },
    };
    const collisionManager = {
      setup: (
        _scene: unknown,
        _player: unknown,
        _bulletPool: unknown,
        _enemyPool: unknown,
        group: unknown,
        beams: unknown
      ) => {
        callLog.push('collisionManager.setup');
        expect(group).toBe(asteroidGroup);
        expect(beams).toBe(hazardBeamSystem);
      },
      setEffectsManager: (_effectsManager: unknown) => {
        callLog.push('collisionManager.setEffectsManager');
      },
      setBulletDamage: (damage: number) => {
        callLog.push(`collisionManager.setBulletDamage:${damage}`);
      },
    };
    const scoreManager = {
      addScore: (score: number) => {
        callLog.push(`scoreManager.addScore:${score}`);
      },
    };

    const applyPowerUp = mock();

    const result = createPoolsAndGameplaySystems({
      scene,
      player: player as never,
      effectsManager: effectsManager as never,
      levelConfig: { lastLifeHelperWing: { shipCount: 1 } } as never,
      state: { level: 4, score: 123, upgrades: { turrets: 2 } } as never,
      isTerminalTransitionActive: () => false,
      applyPowerUp,
      createBulletPool: () => bulletPool as never,
      createEnemyPool: () => enemyPool as never,
      createLastLifeHelperWing: () => helperWing as never,
      createPicketTurretSystem: () => picketTurrets as never,
      createWaveManager: () => waveManager as never,
      createCollisionManager: () => collisionManager as never,
      createScoreManager: () => scoreManager as never,
      createHazardBeamSystem: () => hazardBeamSystem as never,
    });

    expect(callLog).toEqual([
      'bulletPool.create',
      'enemyPool.create',
      'enemyPool.setTargetProvider',
      'helperWing.create',
      'picketTurrets.create',
      'hazardBeamSystem.create',
      'waveManager.create',
      'waveManager.setLevelConfig:4',
      'waveManager.setHazardBeamSystem',
      'collisionManager.setup',
      'collisionManager.setEffectsManager',
      'collisionManager.setBulletDamage:9',
      'scoreManager.addScore:123',
      'physics.add.group',
      'physics.add.overlap',
    ]);

    expect(result.powerUpGroup).toBeDefined();
    expect(result.picketTurrets).toBe(picketTurrets as never);
    expect(overlapCallback).not.toBeNull();

    const powerUp = {
      active: true,
      powerUpType: 'shield',
      kill: mock(),
    };
    (overlapCallback as ((a: unknown, b: unknown) => void) | null)?.(powerUp, player);
    expect(applyPowerUp).toHaveBeenCalledWith('shield');
    expect(powerUp.kill).toHaveBeenCalledTimes(1);

    expect((capturedTargetProvider as (() => { x: number; y: number } | null) | null)?.()).toEqual({ x: 111, y: 222 });
    player.isAlive = false;
    expect((capturedTargetProvider as (() => { x: number; y: number } | null) | null)?.()).toBeNull();
  });
});
