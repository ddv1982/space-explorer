import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } } } }));
const startScene = mock();
mock.module('../src/scenes/sceneRegistry', () => ({ startRegisteredScene: startScene }));
const { startFreshRun, startPreparedRun } = await import('../src/scenes/shared/startRun');
const { getPlayerState, setPlayerState, getRunSummary, setRunSummary } = await import('../src/systems/PlayerState');
const { AUTOSAVE_SLOT_ID, createSaveSlotRecord, readSaveSlot, writeSaveSlot } =
  await import('../src/systems/SaveSlotStorage');

function fixture() {
  const values = new Map<string, unknown>();
  const registry = {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => {
      values.set(key, value);
    },
  };
  const events = new EventEmitter();
  const scene = { registry, events } as unknown as Phaser.Scene;
  return { scene, registry, events };
}

beforeEach(() => {
  startScene.mockReset();
});

describe('canonical new run action', () => {
  test('resets all run state before starting level 1, without touching unrelated registry data', () => {
    const { scene, registry, events } = fixture();
    setPlayerState(registry, {
      level: 8,
      score: 16000,
      creditsSpent: 0,
      runSeed: 0,
      easiestDifficulty: null,
      currentHp: 0,
      remainingLives: 0,
      currentShields: 2,
      upgrades: { hp: 3, damage: 3, fireRate: 3, shield: 3, turrets: 3 },
      systems: { gun: null, support: null, late: null },
      helperWing: { grantedSlots: 1, slots: [{ remainingLives: 0, hp: 0 }] },
    });
    setRunSummary(registry, { finalScore: 16000, levelReached: 8 });
    registry.set('unrelated', 'preserved');
    startFreshRun(scene);
    const freshSeed = getPlayerState(registry).runSeed;
    expect(freshSeed).toBeGreaterThan(0);
    expect(getPlayerState(registry)).toEqual({
      level: 1,
      score: 0,
      creditsSpent: 0,
      runSeed: freshSeed,
      easiestDifficulty: null,
      currentHp: 5,
      currentShields: 0,
      remainingLives: 3,
      upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 },
      systems: { gun: null, support: null, late: null },
      helperWing: { grantedSlots: 0, slots: [] },
    });
    expect(getRunSummary(registry)).toMatchObject({ finalScore: 0, levelReached: 1 });
    expect(registry.get('unrelated')).toBe('preserved');
    expect(startScene).toHaveBeenCalledTimes(1);
    expect(startScene).toHaveBeenCalledWith(scene, 'Game');
    expect(events.eventNames()).toEqual([]);
  });

  test('prepared starts preserve the state loaded from a checkpoint', () => {
    const { scene, registry } = fixture();
    const loaded = { ...getPlayerState(registry), level: 6, score: 4300 };
    setPlayerState(registry, loaded);
    startPreparedRun(scene);
    expect(getPlayerState(registry)).toEqual(loaded);
    expect(startScene).toHaveBeenCalledTimes(1);
  });

  test('a retry keeps the lost run seed, and a new run gets a different one', () => {
    const { registry, scene } = fixture();
    startFreshRun(scene, 4242);
    expect(getPlayerState(registry).runSeed).toBe(4242);
    startFreshRun(scene);
    expect(getPlayerState(registry).runSeed).not.toBe(4242);
  });

  test('a new run clears the autosave so the menu never offers the run it replaced', () => {
    const values = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    };
    const globalScope = globalThis as unknown as { window?: unknown };
    globalScope.window = { localStorage };
    try {
      const { registry, scene } = fixture();
      const state = { ...getPlayerState(registry), level: 4 };
      writeSaveSlot(createSaveSlotRecord(AUTOSAVE_SLOT_ID, state, getRunSummary(registry)));
      expect(readSaveSlot(AUTOSAVE_SLOT_ID)?.playerState.level).toBe(4);

      startFreshRun(scene);

      expect(readSaveSlot(AUTOSAVE_SLOT_ID)).toBeNull();
    } finally {
      delete globalScope.window;
    }
  });
});
