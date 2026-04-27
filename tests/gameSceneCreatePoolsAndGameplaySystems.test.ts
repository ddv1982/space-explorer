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

const actualPlayerState = await import('../src/systems/PlayerState');
const getHelperWingState = mock(() => ({ grantedSlots: 0, slots: [] }));
mock.module('../src/systems/PlayerState', () => ({
  ...actualPlayerState,
  getHelperWingState,
  saveHelperWingState: () => undefined,
}));

mock.module('../src/entities/PowerUp', () => ({
  PowerUp: class {},
  resolvePowerUpOverlap: (...values: unknown[]) => {
    return values.find(
      (value): value is { active: boolean; powerUpType: string; kill: () => void } =>
        Boolean(value) && typeof value === 'object' && 'powerUpType' in value
    ) ?? null;
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
    };
    const effectsManager = {};
    const enemyPool = {
      create: () => { callLog.push('enemyPool.create'); },
    };
    const bulletPool = {
      create: () => { callLog.push('bulletPool.create'); },
    };
    const helperWing = {
      create: (args: { persistentState: unknown }) => {
        callLog.push('helperWing.create');
        expect(args.persistentState).toEqual({ grantedSlots: 0, slots: [] });
      },
    };
    const asteroidGroup = { id: 'asteroids' };
    const waveManager = {
      create: () => {
        callLog.push('waveManager.create');
        return asteroidGroup;
      },
      setLevelConfig: (level: number) => {
        callLog.push(`waveManager.setLevelConfig:${level}`);
      },
    };
    const collisionManager = {
      setup: (_scene: unknown, _player: unknown, _bulletPool: unknown, _enemyPool: unknown, group: unknown) => {
        callLog.push('collisionManager.setup');
        expect(group).toBe(asteroidGroup);
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
      state: { level: 4, score: 123, upgrades: [] } as never,
      isTerminalTransitionActive: () => false,
      applyPowerUp,
      createBulletPool: () => bulletPool as never,
      createEnemyPool: () => enemyPool as never,
      createLastLifeHelperWing: () => helperWing as never,
      createWaveManager: () => waveManager as never,
      createCollisionManager: () => collisionManager as never,
      createScoreManager: () => scoreManager as never,
    });

    expect(callLog).toEqual([
      'bulletPool.create',
      'enemyPool.create',
      'helperWing.create',
      'waveManager.create',
      'waveManager.setLevelConfig:4',
      'collisionManager.setup',
      'collisionManager.setEffectsManager',
      'collisionManager.setBulletDamage:9',
      'scoreManager.addScore:123',
      'physics.add.group',
      'physics.add.overlap',
    ]);

    expect(result.powerUpGroup).toBeDefined();
    expect(overlapCallback).not.toBeNull();

    const powerUp = {
      active: true,
      powerUpType: 'shield',
      kill: mock(),
    };
    overlapCallback?.(powerUp, player);
    expect(applyPowerUp).toHaveBeenCalledWith('shield');
    expect(powerUp.kill).toHaveBeenCalledTimes(1);
  });
});
