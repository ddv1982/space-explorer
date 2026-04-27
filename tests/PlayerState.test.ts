import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({ default: {} }));

const {
  advanceToNextLevel,
  getPlayerState,
  getRunSummary,
  resetRunSummary,
  saveCurrentShields,
  setPlayerState,
  setRunSummary,
} = await import('../src/systems/PlayerState');

type RegistryLike = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

function createRegistry(): RegistryLike {
  const values = new Map<string, unknown>();
  return {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => {
      values.set(key, value);
    },
  };
}

describe('PlayerState schema behavior', () => {
  test('defaults and normalizes missing currentShields from legacy state', () => {
    const registry = createRegistry();

    registry.set('playerState', {
      level: 2,
      score: 150,
      currentHp: 4,
      remainingLives: 2,
      upgrades: {
        hp: 0,
        damage: 0,
        fireRate: 0,
        shield: 3,
      },
      helperWing: {
        grantedSlots: 0,
        slots: [],
      },
    });

    const state = getPlayerState(registry as never);
    expect(state.currentShields).toBe(3);
  });

  test('clamps currentShields to upgrade max when setting state', () => {
    const registry = createRegistry();

    setPlayerState(registry as never, {
      level: 1,
      score: 0,
      currentHp: 5,
      currentShields: 99,
      remainingLives: 3,
      upgrades: {
        hp: 0,
        damage: 0,
        fireRate: 0,
        shield: 2,
      },
      helperWing: {
        grantedSlots: 0,
        slots: [],
      },
    });

    expect(getPlayerState(registry as never).currentShields).toBe(2);
  });

  test('saveCurrentShields clamps to valid range', () => {
    const registry = createRegistry();

    setPlayerState(registry as never, {
      level: 1,
      score: 0,
      currentHp: 5,
      currentShields: 0,
      remainingLives: 3,
      upgrades: {
        hp: 0,
        damage: 0,
        fireRate: 0,
        shield: 1,
      },
      helperWing: {
        grantedSlots: 0,
        slots: [],
      },
    });

    saveCurrentShields(registry as never, 4);
    expect(getPlayerState(registry as never).currentShields).toBe(1);

    saveCurrentShields(registry as never, -9);
    expect(getPlayerState(registry as never).currentShields).toBe(0);
  });

  test('advanceToNextLevel resets hp and shields for next run', () => {
    const registry = createRegistry();

    setPlayerState(registry as never, {
      level: 2,
      score: 250,
      currentHp: 1,
      currentShields: 0,
      remainingLives: 2,
      upgrades: {
        hp: 2,
        damage: 1,
        fireRate: 0,
        shield: 3,
      },
      helperWing: {
        grantedSlots: 0,
        slots: [],
      },
    });

    advanceToNextLevel(registry as never);

    const state = getPlayerState(registry as never);
    expect(state.level).toBe(3);
    expect(state.currentHp).toBe(9);
    expect(state.currentShields).toBe(3);
  });

  test('resetRunSummary restores default summary values', () => {
    const registry = createRegistry();

    setRunSummary(registry as never, { finalScore: 999, levelReached: 7 });
    expect(getRunSummary(registry as never)).toEqual({ finalScore: 999, levelReached: 7 });

    resetRunSummary(registry as never);
    expect(getRunSummary(registry as never)).toEqual({ finalScore: 0, levelReached: 1 });
  });
});
