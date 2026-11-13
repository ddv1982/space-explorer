import { describe, expect, mock, test } from 'bun:test';

import type { SaveSlotId, SaveSlotViewModel } from '../src/systems/SaveSlotStorage';
import type { PauseSaveSlotAdapter, PauseShipSystemsPort } from '../src/scenes/gameScene/PauseStateController';
import type { PauseOverlayHandlers, PauseOverlayState } from '../src/scenes/gameScene/pauseOverlay/types';

mock.module('phaser', () => ({ default: {} }));
const setGameplayDifficultyTier = mock(() => true);
const setVisualQualityTier = mock(() => true);
mock.module('../src/config/gameplayDifficulty', () => ({
  getGameplayDifficultyTier: () => 'normal',
  setGameplayDifficultyTier,
}));
mock.module('../src/config/visualQuality', () => ({
  getVisualQualityTier: () => 'auto',
  setVisualQualityTier,
  getVisualQualityProfile: () => ({
    tier: 'auto',
    uiGlowStrength: 0.8,
    particleBurstScale: 1,
    particleQuantityScale: 1,
    menuAtmosphere: 2,
  }),
}));

const { PauseStateController } = await import('../src/scenes/gameScene/PauseStateController');

type PauseHarness = {
  controller: InstanceType<typeof PauseStateController>;
  overlayStates: PauseOverlayState[];
  mobileControlBlocked: boolean[];
  physicsActions: Array<'pause' | 'resume'>;
  audioPauseStates: boolean[];
  handlers: PauseOverlayHandlers;
  playClickCalls: number;
  stopPlayerMotionCalls: number;
};

function createSlotViewModel(index: number, occupied = false): SaveSlotViewModel {
  return {
    id: `slot-${index}` as SaveSlotId,
    index,
    occupied,
    title: `SLOT ${index}`,
    subtitle: occupied ? `LVL ${index} • SCORE ${index * 1000} • 3 LIVES` : 'EMPTY',
    savedAtLabel: occupied ? '2026-04-27 10:00' : '',
  };
}

function createOverlayState(overrides: Partial<PauseOverlayState>): PauseOverlayState {
  return {
    visible: false,
    canResume: false,
    canSave: false,
    storageAvailable: false,
    saveSlots: [],
    systems: { gun: null, support: null, late: null },
    statusMessage: '',
    statusOk: true,
    ...overrides,
  };
}

function createPauseHarness(
  saveSlotAdapter?: Partial<PauseSaveSlotAdapter>,
  options: { worldPaused?: boolean; shipSystems?: PauseShipSystemsPort } = {}
): PauseHarness {
  const overlayStates: PauseOverlayState[] = [];
  const mobileControlBlocked: boolean[] = [];
  const physicsActions: Array<'pause' | 'resume'> = [];
  const audioPauseStates: boolean[] = [];

  let playClickCalls = 0;
  let stopPlayerMotionCalls = 0;
  let worldPaused = options.worldPaused ?? false;
  let handlers: PauseOverlayHandlers | null = null;

  const registryValues = new Map<string, unknown>();
  const scene = {
    registry: {
      get: (key: string) => registryValues.get(key),
      set: (key: string, value: unknown) => void registryValues.set(key, value),
    },
    physics: {
      world: {
        get isPaused() {
          return worldPaused;
        },
        pause: () => {
          physicsActions.push('pause');
          worldPaused = true;
        },
        resume: () => {
          physicsActions.push('resume');
          worldPaused = false;
        },
      },
    },
  } as unknown as { physics: { world: { isPaused: boolean; pause: () => void; resume: () => void } } };

  const adapter: PauseSaveSlotAdapter = {
    isAvailable: () => false,
    list: () => [],
    canSave: () => false,
    save: () => ({ ok: false, message: 'save unavailable' }),
    load: () => ({ ok: false, message: 'load unavailable' }),
    delete: () => ({ ok: false, message: 'delete unavailable' }),
    ...saveSlotAdapter,
  };

  const controller = PauseStateController.create({
    scene: scene as unknown as Phaser.Scene,
    stopPlayerMotion: () => {
      stopPlayerMotionCalls += 1;
    },
    setMobileControlsBlocked: (blocked) => {
      mobileControlBlocked.push(blocked);
    },
    onReturnToMenu: () => {
      // not needed for these tests
    },
    saveSlotAdapter: adapter,
    shipSystems: options.shipSystems,
    playClick: () => {
      playClickCalls += 1;
    },
    setAudioPaused: (paused) => audioPauseStates.push(paused),
    createOverlay: (_scene: unknown, overlayHandlers: PauseOverlayHandlers) => {
      handlers = overlayHandlers;
      return {
        setState: (nextState: Partial<PauseOverlayState>) => {
          overlayStates.push(createOverlayState(nextState));
        },
        relayout: () => {
          // not needed for these tests
        },
        destroy: () => {
          // not needed for these tests
        },
      };
    },
  });

  if (!handlers) {
    throw new Error('Pause overlay handlers were not captured');
  }

  return {
    controller,
    overlayStates,
    mobileControlBlocked,
    physicsActions,
    audioPauseStates,
    handlers,
    get playClickCalls() {
      return playClickCalls;
    },
    get stopPlayerMotionCalls() {
      return stopPlayerMotionCalls;
    },
  };
}

describe('PauseStateController regression coverage', () => {
  test('initial sync resumes a previously paused physics world when gameplay should run', () => {
    const harness = createPauseHarness(undefined, { worldPaused: true });

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.physicsActions).toEqual(['resume']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: false, canResume: false }));
  });

  test('toggles manual pause/resume with expected physics and overlay updates', () => {
    const harness = createPauseHarness();

    harness.controller.togglePauseRequest(false);

    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.playClickCalls).toBe(1);
    expect(harness.stopPlayerMotionCalls).toBe(1);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.audioPauseStates).toEqual([true]);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: true, canResume: true }));
    expect(harness.mobileControlBlocked).toEqual([false, true]);

    harness.controller.togglePauseRequest(false);

    expect(harness.audioPauseStates).toEqual([true, false]);

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.playClickCalls).toBe(2);
    expect(harness.stopPlayerMotionCalls).toBe(1);
    expect(harness.physicsActions).toEqual(['pause', 'resume']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: false, canResume: false }));
    expect(harness.mobileControlBlocked).toEqual([false, true, false]);
  });

  test('save slot action delegates, reports status, and refreshes slots', () => {
    let savedSlot: SaveSlotId | null = null;
    let slots = [createSlotViewModel(1), createSlotViewModel(2), createSlotViewModel(3)];
    const harness = createPauseHarness({
      isAvailable: () => true,
      canSave: () => true,
      list: () => slots,
      save: (slotId) => {
        savedSlot = slotId;
        slots = [createSlotViewModel(1, true), createSlotViewModel(2), createSlotViewModel(3)];
        return { ok: true, message: 'Saved checkpoint to slot 1.' };
      },
    });

    harness.controller.togglePauseRequest(false);
    harness.handlers.onSaveSlot('slot-1');

    expect(String(savedSlot)).toBe('slot-1');
    expect(harness.playClickCalls).toBe(2);
    expect(harness.overlayStates.at(-1)).toEqual(
      createOverlayState({
        visible: true,
        canResume: true,
        canSave: true,
        storageAvailable: true,
        saveSlots: slots,
        statusMessage: 'Saved checkpoint to slot 1.',
      })
    );
  });

  test('load slot action reports adapter status without resuming physics', () => {
    let loadedSlot: SaveSlotId | null = null;
    const slots = [createSlotViewModel(1), createSlotViewModel(2), createSlotViewModel(3)];
    const harness = createPauseHarness({
      isAvailable: () => true,
      canSave: () => true,
      list: () => slots,
      load: (slotId) => {
        loadedSlot = slotId;
        return { ok: false, message: 'No checkpoint stored in that slot.' };
      },
    });

    harness.controller.togglePauseRequest(false);
    harness.handlers.onLoadSlot('slot-1');

    expect(String(loadedSlot)).toBe('slot-1');
    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toMatchObject({
      statusMessage: 'No checkpoint stored in that slot.',
      statusOk: false,
    });
  });

  test('delete slot action delegates and refreshes slot list', () => {
    let deletedSlot: SaveSlotId | null = null;
    let slots = [createSlotViewModel(1, true), createSlotViewModel(2), createSlotViewModel(3)];
    const harness = createPauseHarness({
      isAvailable: () => true,
      canSave: () => true,
      list: () => slots,
      delete: (slotId) => {
        deletedSlot = slotId;
        slots = [createSlotViewModel(1), createSlotViewModel(2), createSlotViewModel(3)];
        return { ok: true, message: 'Slot 1 checkpoint cleared.' };
      },
    });

    harness.controller.togglePauseRequest(false);
    harness.handlers.onDeleteSlot('slot-1');
    expect(deletedSlot).toBeNull();
    expect(harness.overlayStates.at(-1)?.statusMessage).toBe('Tap DEL again to confirm slot 1.');

    harness.handlers.onDeleteSlot('slot-1');

    expect(String(deletedSlot)).toBe('slot-1');
    expect(harness.overlayStates.at(-1)).toEqual(
      createOverlayState({
        visible: true,
        canResume: true,
        canSave: true,
        storageAvailable: true,
        saveSlots: slots,
        statusMessage: 'Slot 1 checkpoint cleared.',
      })
    );
  });

  test('save slot action is blocked while runtime cannot save', () => {
    let saveCalls = 0;
    const harness = createPauseHarness({
      isAvailable: () => true,
      canSave: () => false,
      list: () => [createSlotViewModel(1), createSlotViewModel(2), createSlotViewModel(3)],
      save: () => {
        saveCalls += 1;
        return { ok: true, message: 'unexpected' };
      },
    });

    harness.controller.togglePauseRequest(false);
    harness.handlers.onSaveSlot('slot-1');

    expect(saveCalls).toBe(0);
    expect(harness.overlayStates.at(-1)).toMatchObject({
      visible: true,
      canSave: false,
      storageAvailable: true,
      statusMessage: 'Cannot save during transitions or while the ship is offline.',
    });
  });

  test('pause settings persist without changing pause state or reloading', () => {
    setGameplayDifficultyTier.mockClear();
    setVisualQualityTier.mockClear();
    const harness = createPauseHarness();
    harness.controller.togglePauseRequest(false);

    expect(harness.handlers.onSelectDifficulty('high')).toBe(true);
    expect(harness.handlers.onSelectQuality('low')).toBe(true);

    expect(setGameplayDifficultyTier).toHaveBeenCalledWith('high');
    expect(setVisualQualityTier).toHaveBeenCalledWith('low');
    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.audioPauseStates).toEqual([true]);
    expect(harness.overlayStates.at(-1)).toMatchObject({
      visible: true,
      statusMessage: expect.stringContaining('Restart required'),
      statusOk: true,
    });
  });

  test('pause setting persistence failure reports an error and remains paused', () => {
    setGameplayDifficultyTier.mockImplementationOnce(() => false);
    const harness = createPauseHarness();
    harness.controller.togglePauseRequest(false);

    expect(harness.handlers.onSelectDifficulty('low')).toBe(false);
    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.audioPauseStates).toEqual([true]);
    expect(harness.overlayStates.at(-1)).toMatchObject({
      statusMessage: 'Unable to save difficulty in this browser context.',
      statusOk: false,
    });
  });

  test('the SYSTEMS tab cycles a slot through the ship-systems port, only while paused', () => {
    let systems = { gun: 'lance', support: 'magnet', late: null } as PauseOverlayState['systems'];
    const cycled: string[] = [];
    const harness = createPauseHarness(undefined, {
      shipSystems: {
        getSystems: () => systems,
        cycleSystem: (slot) => {
          cycled.push(slot);
          systems = { ...systems, support: 'surgeCore' };
        },
      },
    });

    harness.handlers.onCycleSystem('support');
    expect(cycled).toEqual([]);

    harness.controller.togglePauseRequest(false);
    expect(harness.overlayStates.at(-1)?.systems.support).toBe('magnet');
    harness.handlers.onCycleSystem('support');
    expect(cycled).toEqual(['support']);
    expect(harness.playClickCalls).toBe(2);
    expect(harness.overlayStates.at(-1)?.systems.support).toBe('surgeCore');
    expect(harness.controller.isGameplayPaused()).toBe(true);
  });
});
