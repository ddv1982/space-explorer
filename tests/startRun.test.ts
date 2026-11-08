import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } } } }));
const prepareTextures = mock();
const startScene = mock();
mock.module('../src/systems/parallax/premiumBackgroundLoading', () => ({
  prepareLegacyBackgroundTextures: prepareTextures,
}));
mock.module('../src/scenes/sceneRegistry', () => ({ startRegisteredScene: startScene }));
const { startFreshRun, startPreparedRun } = await import('../src/scenes/shared/startRun');
const { getPlayerState, setPlayerState, getRunSummary, setRunSummary } = await import('../src/systems/PlayerState');

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
  prepareTextures.mockReset();
  startScene.mockReset();
});

describe('canonical new run action', () => {
  test('resets all run state before preparing and starting level 1, without touching unrelated registry data', () => {
    const { scene, registry, events } = fixture();
    setPlayerState(registry, {
      level: 8,
      score: 16000,
      currentHp: 0,
      remainingLives: 0,
      currentShields: 2,
      upgrades: { hp: 3, damage: 3, fireRate: 3, shield: 3, turrets: 3 },
      helperWing: { grantedSlots: 1, slots: [{ remainingLives: 0, hp: 0 }] },
    });
    setRunSummary(registry, { finalScore: 16000, levelReached: 8 });
    registry.set('unrelated', 'preserved');
    prepareTextures.mockImplementation((_scene, level) => {
      expect(level).toBe(1);
      expect(getPlayerState(registry)).toMatchObject({ score: 0, level: 1 });
    });
    startFreshRun(scene);
    expect(getPlayerState(registry)).toEqual({
      level: 1,
      score: 0,
      currentHp: 5,
      currentShields: 0,
      remainingLives: 3,
      upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 },
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
    expect(prepareTextures).toHaveBeenCalledWith(scene, 6);
    expect(getPlayerState(registry)).toEqual(loaded);
    expect(startScene).toHaveBeenCalledTimes(1);
  });
});
