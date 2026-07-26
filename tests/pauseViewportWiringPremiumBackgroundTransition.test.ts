import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const record = {
  playerState: { level: 8, score: 4200 },
  runSummary: { finalScore: 4200, levelReached: 8 },
  label: { levelName: 'Halo Cartography' },
};
const ensurePremiumBackgroundAssets = mock();
const setPlayerState = mock();
const setRunSummary = mock();
const callLog: string[] = [];
let capturedSaveSlotAdapter: { load: (slotId: string) => { ok: boolean; message: string } } | undefined;

mock.module('@/systems/parallax/premiumBackgroundLoading', () => ({
  ensurePremiumBackgroundAssets,
}));

mock.module('@/systems/PlayerState', () => ({
  getRunSummary: mock(() => record.runSummary),
  setPlayerState: (...args: unknown[]) => {
    callLog.push('setPlayerState');
    setPlayerState(...args);
  },
  setRunSummary: (...args: unknown[]) => {
    callLog.push('setRunSummary');
    setRunSummary(...args);
  },
}));

mock.module('@/systems/SaveSlotStorage', () => ({
  createSaveSlotRecord: mock(),
  deleteSaveSlot: mock(() => true),
  isSaveStorageAvailable: mock(() => true),
  listSaveSlots: mock(() => []),
  readSaveSlot: mock(() => record),
  writeSaveSlot: mock(),
}));

mock.module('../src/scenes/gameScene/PauseStateController', () => ({
  PauseStateController: {
    create: (config: { saveSlotAdapter: typeof capturedSaveSlotAdapter }) => {
      capturedSaveSlotAdapter = config.saveSlotAdapter;
      return {
        setOrientationBlocked: mock(),
      };
    },
  },
}));

mock.module('@/systems/MobileViewportGuard', () => ({
  MobileViewportGuard: {
    create: () => ({ isBlocked: () => false }),
  },
}));

mock.module('../src/scenes/sceneRegistry', () => ({
  startRegisteredScene: (_scene: unknown, key: string) => {
    callLog.push(`startRegisteredScene:${key}`);
  },
}));

const { createPauseViewportWiring } = await import('../src/scenes/gameScene/pauseViewportWiring');

describe('pause viewport wiring premium background transition', () => {
  test('waits for the checkpoint level window and applies state during Game shutdown handoff', () => {
    callLog.length = 0;
    ensurePremiumBackgroundAssets.mockClear();
    setPlayerState.mockClear();
    setRunSummary.mockClear();

    let onReady: (() => void) | undefined;
    let shutdownHandler: (() => void) | undefined;
    ensurePremiumBackgroundAssets.mockImplementation((_scene, _level, callback) => {
      onReady = callback;
    });

    const registry = {};
    const scene = {
      registry,
      events: {
        once: (_event: string, handler: () => void) => {
          shutdownHandler = handler;
        },
      },
    };

    createPauseViewportWiring({
      scene: scene as never,
      stopPlayerMotion: mock(),
      getMobileControls: () => null,
      captureCurrentRunStateForSave: mock(() => record.playerState) as never,
      canSaveCurrentRun: () => true,
    });

    const result = capturedSaveSlotAdapter?.load('slot-1');

    expect(result?.ok).toBe(true);
    expect(ensurePremiumBackgroundAssets).toHaveBeenCalledWith(scene, 8, expect.any(Function));
    expect(callLog).toEqual([]);
    expect(setPlayerState).not.toHaveBeenCalled();

    onReady?.();
    expect(callLog).toEqual(['startRegisteredScene:Game']);

    shutdownHandler?.();
    expect(callLog).toEqual([
      'startRegisteredScene:Game',
      'setPlayerState',
      'setRunSummary',
    ]);
    expect(setPlayerState).toHaveBeenCalledWith(registry, record.playerState);
    expect(setRunSummary).toHaveBeenCalledWith(registry, record.runSummary);
  });
});
