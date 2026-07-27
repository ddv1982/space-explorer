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
  test('normalizes missing and non-object registry states to deterministic defaults', () => {
    const malformedStates: unknown[] = [undefined, null, 7, 'invalid', [], [{ level: 9 }]];

    for (const malformedState of malformedStates) {
      const registry = createRegistry();
      registry.set('playerState', malformedState);

      const state = getPlayerState(registry);
      expect(state).toEqual({
        level: 1,
        score: 0,
        currentHp: 5,
        currentShields: 0,
        remainingLives: 3,
        upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0 },
        helperWing: { slots: [], grantedSlots: 0 },
      });
      expect(registry.get('playerState')).toEqual(state);
    }
  });

  test('runtime-normalizes malformed nested state without throwing', () => {
    const registry = createRegistry();
    registry.set('playerState', {
      level: Number.POSITIVE_INFINITY,
      score: 'lots',
      currentHp: Number.NaN,
      currentShields: 99,
      remainingLives: -2,
      upgrades: {
        hp: -1.5,
        damage: Number.POSITIVE_INFINITY,
        fireRate: '3',
        shield: 2.9,
      },
      helperWing: {
        grantedSlots: Number.POSITIVE_INFINITY,
        slots: [null, { remainingLives: -3, hp: 2.6 }, []],
      },
    });

    expect(getPlayerState(registry)).toEqual({
      level: 1,
      score: 0,
      currentHp: 5,
      currentShields: 2,
      remainingLives: 0,
      upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 2 },
      helperWing: {
        grantedSlots: 3,
        slots: [
          { remainingLives: 0, hp: 0 },
          { remainingLives: 0, hp: 3 },
          { remainingLives: 0, hp: 0 },
        ],
      },
    });
  });

  test('malformed upgrades and helperWing containers use nested defaults', () => {
    const registry = createRegistry();
    registry.set('playerState', {
      level: 2,
      upgrades: [],
      helperWing: [],
    });

    const state = getPlayerState(registry);
    expect(state.upgrades).toEqual({ hp: 0, damage: 0, fireRate: 0, shield: 0 });
    expect(state.helperWing).toEqual({ slots: [], grantedSlots: 0 });
  });

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

    const state = getPlayerState(registry);
    expect(state.currentShields).toBe(3);
  });

  test('retains legacy defaults when currentShields and helperWing are both missing', () => {
    const registry = createRegistry();
    registry.set('playerState', {
      level: 2,
      score: 150,
      currentHp: 4,
      remainingLives: 2,
      upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 2 },
    });

    expect(getPlayerState(registry)).toMatchObject({
      currentShields: 2,
      helperWing: { slots: [], grantedSlots: 0 },
    });
  });

  test('registry normalization is idempotent across repeated reads', () => {
    const registry = createRegistry();
    registry.set('playerState', {
      level: 3,
      upgrades: { shield: 1.8 },
      currentShields: 9,
      helperWing: { slots: [{}] },
    });

    const first = getPlayerState(registry);
    const second = getPlayerState(registry);

    expect(second).toEqual(first);
    expect(registry.get('playerState')).toEqual(first);
  });

  test('clamps currentShields to upgrade max when setting state', () => {
    const registry = createRegistry();

    setPlayerState(registry, {
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

    expect(getPlayerState(registry).currentShields).toBe(2);
  });

  test('saveCurrentShields clamps to valid range', () => {
    const registry = createRegistry();

    setPlayerState(registry, {
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

    saveCurrentShields(registry, 4);
    expect(getPlayerState(registry).currentShields).toBe(1);

    saveCurrentShields(registry, -9);
    expect(getPlayerState(registry).currentShields).toBe(0);
  });

  test('advanceToNextLevel resets hp and shields for next run', () => {
    const registry = createRegistry();

    setPlayerState(registry, {
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

    advanceToNextLevel(registry);

    const state = getPlayerState(registry);
    expect(state.level).toBe(3);
    expect(state.currentHp).toBe(9);
    expect(state.currentShields).toBe(3);
  });

  test('resetRunSummary restores default summary values', () => {
    const registry = createRegistry();

    setRunSummary(registry, { finalScore: 999, levelReached: 7 });
    expect(getRunSummary(registry)).toEqual({ finalScore: 999, levelReached: 7 });

    resetRunSummary(registry);
    expect(getRunSummary(registry)).toEqual({ finalScore: 0, levelReached: 1 });
  });

  test('run summary never returns non-finite or wrong-type registry values', () => {
    const registry = createRegistry();
    registry.set('finalScore', Number.NaN);
    registry.set('levelReached', Number.POSITIVE_INFINITY);
    expect(getRunSummary(registry)).toEqual({ finalScore: 0, levelReached: 1 });

    registry.set('finalScore', '999');
    registry.set('levelReached', null);
    expect(getRunSummary(registry)).toEqual({ finalScore: 0, levelReached: 1 });
  });

  test('setRunSummary rejects non-finite numeric inputs', () => {
    const registry = createRegistry();
    setRunSummary(registry, { finalScore: 20, levelReached: 3 });

    expect(
      setRunSummary(registry, {
        finalScore: Number.NaN,
        levelReached: Number.NEGATIVE_INFINITY,
      })
    ).toEqual({ finalScore: 20, levelReached: 3 });
    expect(getRunSummary(registry)).toEqual({ finalScore: 20, levelReached: 3 });
  });
});
