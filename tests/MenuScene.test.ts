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

const ensurePremiumBackgroundAssets = mock();
const startRegisteredScene = mock();
let currentLevel = 1;

mock.module('../src/systems/parallax/premiumBackgroundLoading', () => ({
  ensurePremiumBackgroundAssets,
}));

mock.module('../src/scenes/sceneRegistry', () => ({
  startRegisteredScene,
}));

mock.module('../src/systems/PlayerState', () => ({
  getPlayerMaxHp: mock(() => 5),
  getPlayerState: () => ({ level: currentLevel }),
  normalizePersistedPlayerState: (value: unknown) => value,
  normalizePersistedScore: (value: unknown, fallback: number) =>
    typeof value === 'number' ? value : fallback,
  resetPlayerState: mock(),
  resetRunSummary: mock(),
  setPlayerState: mock(),
  setRunSummary: mock(),
}));

const { MenuScene } = await import('../src/scenes/MenuScene');
type MenuSceneInstance = InstanceType<typeof MenuScene>;

describe('MenuScene', () => {
  test('difficulty active clicks are no-ops and storage failures do not change selection', () => {
    const scene = Object.create(MenuScene.prototype) as MenuSceneInstance;
    const persist = mock(() => false);
    const showSaveSlotError = mock(() => undefined);
    const playMenuClick = mock(() => undefined);
    (scene as unknown as Record<string, unknown>).getCurrentGameplayDifficultyTier = () => 'normal';
    (scene as unknown as Record<string, unknown>).persistGameplayDifficultyTier = persist;
    (scene as unknown as Record<string, unknown>).showSaveSlotError = showSaveSlotError;
    (scene as unknown as Record<string, unknown>).playMenuClick = playMenuClick;

    expect((scene as unknown as { selectGameplayDifficultyTier: (tier: string) => boolean })
      .selectGameplayDifficultyTier('normal')).toBe(false);
    expect(persist).not.toHaveBeenCalled();
    expect((scene as unknown as { selectGameplayDifficultyTier: (tier: string) => boolean })
      .selectGameplayDifficultyTier('high')).toBe(false);
    expect(playMenuClick).toHaveBeenCalledTimes(1);
    expect(showSaveSlotError).toHaveBeenCalledWith('Unable to save difficulty in this browser context.');
  });

  test('selecting the active visual quality is a no-op', () => {
    const scene = Object.create(MenuScene.prototype) as MenuSceneInstance;
    const persistVisualQualityTier = mock(() => true);
    const reloadForVisualQualityChange = mock(() => undefined);
    const playMenuClick = mock(() => undefined);
    (scene as unknown as Record<string, unknown>).getCurrentVisualQualityTier = () => 'standard';
    (scene as unknown as Record<string, unknown>).persistVisualQualityTier = persistVisualQualityTier;
    (scene as unknown as Record<string, unknown>).reloadForVisualQualityChange = reloadForVisualQualityChange;
    (scene as unknown as Record<string, unknown>).playMenuClick = playMenuClick;

    (scene as unknown as { selectVisualQualityTier: (tier: string) => void })
      .selectVisualQualityTier('standard');

    expect(playMenuClick).not.toHaveBeenCalled();
    expect(persistVisualQualityTier).not.toHaveBeenCalled();
    expect(reloadForVisualQualityChange).not.toHaveBeenCalled();
  });

  test('persists a changed visual quality before reloading', () => {
    const events: string[] = [];
    const scene = Object.create(MenuScene.prototype) as MenuSceneInstance;
    (scene as unknown as Record<string, unknown>).getCurrentVisualQualityTier = () => 'standard';
    (scene as unknown as Record<string, unknown>).playMenuClick = () => events.push('click');
    (scene as unknown as Record<string, unknown>).persistVisualQualityTier = (tier: string) => {
      events.push(`persist:${tier}`);
      return true;
    };
    (scene as unknown as Record<string, unknown>).reloadForVisualQualityChange = () => events.push('reload');

    (scene as unknown as { selectVisualQualityTier: (tier: string) => void })
      .selectVisualQualityTier('high');

    expect(events).toEqual(['click', 'persist:high', 'reload']);
  });

  test('reports a storage failure without reloading', () => {
    const scene = Object.create(MenuScene.prototype) as MenuSceneInstance;
    const showSaveSlotError = mock(() => undefined);
    const reloadForVisualQualityChange = mock(() => undefined);
    (scene as unknown as Record<string, unknown>).getCurrentVisualQualityTier = () => 'standard';
    (scene as unknown as Record<string, unknown>).playMenuClick = (): void => {};
    (scene as unknown as Record<string, unknown>).persistVisualQualityTier = () => false;
    (scene as unknown as Record<string, unknown>).showSaveSlotError = showSaveSlotError;
    (scene as unknown as Record<string, unknown>).reloadForVisualQualityChange = reloadForVisualQualityChange;

    (scene as unknown as { selectVisualQualityTier: (tier: string) => void })
      .selectVisualQualityTier('low');

    expect(showSaveSlotError).toHaveBeenCalledWith(
      'Unable to save visual quality in this browser context.'
    );
    expect(reloadForVisualQualityChange).not.toHaveBeenCalled();
  });

  test('waits for the saved level premium background window before starting Game', () => {
    currentLevel = 7;
    ensurePremiumBackgroundAssets.mockClear();
    startRegisteredScene.mockClear();

    let onReady: (() => void) | undefined;
    ensurePremiumBackgroundAssets.mockImplementation((_scene, _level, callback) => {
      onReady = callback;
    });

    const scene = Object.create(MenuScene.prototype) as MenuSceneInstance;
    (scene as unknown as Record<string, unknown>).registry = {};

    (scene as unknown as { startGameScene: () => void }).startGameScene();

    expect(ensurePremiumBackgroundAssets).toHaveBeenCalledWith(scene, 7, expect.any(Function));
    expect(startRegisteredScene).not.toHaveBeenCalled();

    onReady?.();

    expect(startRegisteredScene).toHaveBeenCalledWith(scene, 'Game');
  });

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

    const scene = Object.create(MenuScene.prototype) as MenuSceneInstance;
    (scene as unknown as Record<string, unknown>).gameTransitionQueued = false;
    (scene as unknown as Record<string, unknown>).playMenuClick = playMenuClick;
    (scene as unknown as Record<string, unknown>).isSaveStorageAvailable = isSaveStorageAvailable;
    (scene as unknown as Record<string, unknown>).readSaveSlotRecord = readSaveSlotRecord;
    (scene as unknown as Record<string, unknown>).applyLoadedRunState = applyLoadedRunState;
    (scene as unknown as Record<string, unknown>).startGameScene = startGameScene;

    (scene as unknown as { loadFromSlot: (slotId: string) => void }).loadFromSlot('slot-1');
    (scene as unknown as { loadFromSlot: (slotId: string) => void }).loadFromSlot('slot-1');

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

    const scene = Object.create(MenuScene.prototype) as MenuSceneInstance;
    (scene as unknown as Record<string, unknown>).gameTransitionQueued = false;
    (scene as unknown as Record<string, unknown>).playMenuClick = playMenuClick;
    (scene as unknown as Record<string, unknown>).isSaveStorageAvailable = isSaveStorageAvailable;
    (scene as unknown as Record<string, unknown>).showSaveSlotError = showSaveSlotError;
    (scene as unknown as Record<string, unknown>).readSaveSlotRecord = readSaveSlotRecord;
    (scene as unknown as Record<string, unknown>).startGameScene = startGameScene;

    (scene as unknown as { loadFromSlot: (slotId: string) => void }).loadFromSlot('slot-2');

    expect(playMenuClick).toHaveBeenCalledTimes(1);
    expect(showSaveSlotError).toHaveBeenCalledWith('Save slots unavailable in this browser context.');
    expect(readSaveSlotRecord).not.toHaveBeenCalled();
    expect(startGameScene).not.toHaveBeenCalled();
  });
});
