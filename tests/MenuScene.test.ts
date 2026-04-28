import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Scene: class {},
    GameObjects: {
      Image: class {},
      TileSprite: class {},
      Graphics: class {},
    },
  },
}));

const { MenuScene } = await import('../src/scenes/MenuScene');

describe('MenuScene', () => {
  test('loadFromSlot loads persisted state and starts Game exactly once', () => {
    const record = {
      playerState: { level: 4, score: 1200 },
      runSummary: { finalScore: 1200, levelReached: 4 },
    };

    const playMenuClick = mock(() => undefined);
    const isSaveStorageAvailable = mock(() => true);
    const readSaveSlotRecord = mock(() => record);
    const applyLoadedRunState = mock(() => undefined);
    const startGameScene = mock(() => undefined);

    const scene = Object.create(MenuScene.prototype) as MenuScene;
    (scene as unknown as Record<string, unknown>).gameTransitionQueued = false;
    (scene as unknown as Record<string, unknown>).playMenuClick = playMenuClick;
    (scene as unknown as Record<string, unknown>).isSaveStorageAvailable = isSaveStorageAvailable;
    (scene as unknown as Record<string, unknown>).readSaveSlotRecord = readSaveSlotRecord;
    (scene as unknown as Record<string, unknown>).applyLoadedRunState = applyLoadedRunState;
    (scene as unknown as Record<string, unknown>).startGameScene = startGameScene;

    (scene as unknown as Record<string, unknown>).loadFromSlot('slot-1');
    (scene as unknown as Record<string, unknown>).loadFromSlot('slot-1');

    expect(playMenuClick).toHaveBeenCalledTimes(2);
    expect(readSaveSlotRecord).toHaveBeenCalledWith('slot-1');
    expect(applyLoadedRunState).toHaveBeenCalledTimes(1);
    expect(applyLoadedRunState).toHaveBeenCalledWith(record.playerState, record.runSummary);
    expect(startGameScene).toHaveBeenCalledTimes(1);
  });

  test('loadFromSlot reports an error when save storage is unavailable', () => {
    const playMenuClick = mock(() => undefined);
    const isSaveStorageAvailable = mock(() => false);
    const showSaveSlotError = mock(() => undefined);
    const readSaveSlotRecord = mock(() => null);
    const startGameScene = mock(() => undefined);

    const scene = Object.create(MenuScene.prototype) as MenuScene;
    (scene as unknown as Record<string, unknown>).gameTransitionQueued = false;
    (scene as unknown as Record<string, unknown>).playMenuClick = playMenuClick;
    (scene as unknown as Record<string, unknown>).isSaveStorageAvailable = isSaveStorageAvailable;
    (scene as unknown as Record<string, unknown>).showSaveSlotError = showSaveSlotError;
    (scene as unknown as Record<string, unknown>).readSaveSlotRecord = readSaveSlotRecord;
    (scene as unknown as Record<string, unknown>).startGameScene = startGameScene;

    (scene as unknown as Record<string, unknown>).loadFromSlot('slot-2');

    expect(playMenuClick).toHaveBeenCalledTimes(1);
    expect(showSaveSlotError).toHaveBeenCalledWith('Save slots unavailable in this browser context.');
    expect(readSaveSlotRecord).not.toHaveBeenCalled();
    expect(startGameScene).not.toHaveBeenCalled();
  });
});
