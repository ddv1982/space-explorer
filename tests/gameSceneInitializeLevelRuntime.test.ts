import { beforeEach, describe, expect, mock, test } from 'bun:test';

const initMock = mock();
const getLevelConfigMock = mock();
const getTotalLevelsMock = mock(() => 42);
const createScaledBossConfigMock = mock(() => ({ maxHp: 999 }));

const { initializeLevelRuntime } = await import('../src/scenes/gameScene/initializeLevelRuntime');

describe('initializeLevelRuntime', () => {
  beforeEach(() => {
    initMock.mockClear();
    getLevelConfigMock.mockClear();
    getTotalLevelsMock.mockClear();
    createScaledBossConfigMock.mockClear();
    getLevelConfigMock.mockReset();
  });

  test('creates level manager, initializes level, and computes scaled boss config when boss exists', () => {
    const boss = { maxHp: 100 };
    const levelConfig = { boss };
    getLevelConfigMock.mockReturnValue(levelConfig);

    const state = {
      level: 3,
      upgrades: { hp: 1, damage: 2, fireRate: 3, shield: 4 },
    };

    const result = initializeLevelRuntime(state, {
      createLevelManager: () => ({
        init: initMock,
        getLevelConfig: getLevelConfigMock,
      }) as never,
      getTotalLevels: getTotalLevelsMock,
      createScaledBossConfig: createScaledBossConfigMock,
    });

    expect(initMock).toHaveBeenCalledWith(3);
    expect(getLevelConfigMock).toHaveBeenCalledTimes(1);
    expect(createScaledBossConfigMock).toHaveBeenCalledWith(boss, {
      levelNumber: 3,
      totalLevels: 42,
      upgrades: state.upgrades,
    });

    expect(result.levelConfig).toBe(levelConfig);
    expect(result.scaledBossConfig).toEqual({ maxHp: 999 });
    expect(result.levelManager).toBeDefined();
  });
});
