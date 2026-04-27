import { describe, expect, mock, test } from 'bun:test';

import type { SaveSlotId, SaveSlotViewModel } from '../src/systems/SaveSlotStorage';
import type { PauseSaveSlotAdapter } from '../src/scenes/gameScene/PauseStateController';
import type { PauseOverlayHandlers, PauseOverlayState } from '../src/scenes/gameScene/pauseOverlay/types';

mock.module('phaser', () => ({ default: {} }));

const { PauseStateController } = await import('../src/scenes/gameScene/PauseStateController');

type PauseHarness = {
  controller: InstanceType<typeof PauseStateController>;
  overlayStates: PauseOverlayState[];
  mobileControlBlocked: boolean[];
  physicsActions: Array<'pause' | 'resume'>;
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
    orientationBlocked: false,
    canResume: false,
    canSave: false,
    storageAvailable: false,
    saveSlots: [],
    statusMessage: '',
    statusOk: true,
    ...overrides,
  };
}

function createPauseHarness(
  saveSlotAdapter?: Partial<PauseSaveSlotAdapter>,
  options: { worldPaused?: boolean } = {}
): PauseHarness {
  const overlayStates: PauseOverlayState[] = [];
  const mobileControlBlocked: boolean[] = [];
  const physicsActions: Array<'pause' | 'resume'> = [];

  let playClickCalls = 0;
  let stopPlayerMotionCalls = 0;
  let worldPaused = options.worldPaused ?? false;
  let handlers: PauseOverlayHandlers | null = null;

  const scene = {
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
    scene,
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
    playClick: () => {
      playClickCalls += 1;
    },
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
  test('creates in unpaused state and publishes initial overlay/mobile state', () => {
    const harness = createPauseHarness();

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.overlayStates).toEqual([
      createOverlayState({ visible: false, orientationBlocked: false, canResume: false }),
    ]);
    expect(harness.mobileControlBlocked).toEqual([false]);
    expect(harness.physicsActions).toEqual([]);
    expect(harness.stopPlayerMotionCalls).toBe(0);
    expect(harness.playClickCalls).toBe(0);
  });

  test('initial sync resumes a previously paused physics world when gameplay should run', () => {
    const harness = createPauseHarness(undefined, { worldPaused: true });

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.physicsActions).toEqual(['resume']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: false, orientationBlocked: false, canResume: false }));
  });

  test('toggles manual pause/resume with expected physics and overlay updates', () => {
    const harness = createPauseHarness();

    harness.controller.togglePauseRequest(false);

    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.playClickCalls).toBe(1);
    expect(harness.stopPlayerMotionCalls).toBe(1);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: true, orientationBlocked: false, canResume: true }));
    expect(harness.mobileControlBlocked).toEqual([false, true]);

    harness.controller.togglePauseRequest(false);

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.playClickCalls).toBe(2);
    expect(harness.stopPlayerMotionCalls).toBe(1);
    expect(harness.physicsActions).toEqual(['pause', 'resume']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: false, orientationBlocked: false, canResume: false }));
    expect(harness.mobileControlBlocked).toEqual([false, true, false]);
  });

  test('orientation block forces pause and blocks manual toggle when no manual request exists', () => {
    const harness = createPauseHarness();

    harness.controller.setOrientationBlocked(true);

    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.stopPlayerMotionCalls).toBe(2);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: true, orientationBlocked: true, canResume: false }));

    harness.controller.togglePauseRequest(false);

    expect(harness.playClickCalls).toBe(0);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: true, orientationBlocked: true, canResume: false }));

    harness.controller.setOrientationBlocked(false);

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.physicsActions).toEqual(['pause', 'resume']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: false, orientationBlocked: false, canResume: false }));
  });

  test('manual pause persists while orientation block toggles on/off', () => {
    const harness = createPauseHarness();

    harness.controller.togglePauseRequest(false);
    harness.controller.setOrientationBlocked(true);
    harness.controller.setOrientationBlocked(false);

    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({ visible: true, orientationBlocked: false, canResume: true }));

    harness.controller.togglePauseRequest(false);

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.physicsActions).toEqual(['pause', 'resume']);
  });

  test('idempotent sync still republishes overlay and mobile-control state', () => {
    const harness = createPauseHarness();

    harness.controller.setOrientationBlocked(false);

    expect(harness.physicsActions).toEqual([]);
    expect(harness.overlayStates).toEqual([
      createOverlayState({ visible: false, orientationBlocked: false, canResume: false }),
      createOverlayState({ visible: false, orientationBlocked: false, canResume: false }),
    ]);
    expect(harness.mobileControlBlocked).toEqual([false, false]);
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

    expect(savedSlot).toBe('slot-1');
    expect(harness.playClickCalls).toBe(2);
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({
      visible: true,
      canResume: true,
      canSave: true,
      storageAvailable: true,
      saveSlots: slots,
      statusMessage: 'Saved checkpoint to slot 1.',
    }));
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

    expect(loadedSlot).toBe('slot-1');
    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toMatchObject({
      statusMessage: 'No checkpoint stored in that slot.',
      statusOk: false,
    });
  });

  test('status error styling clears after a later successful slot action', () => {
    let loadOk = false;
    const slots = [createSlotViewModel(1, true), createSlotViewModel(2), createSlotViewModel(3)];
    const harness = createPauseHarness({
      isAvailable: () => true,
      canSave: () => true,
      list: () => slots,
      load: () => ({
        ok: loadOk,
        message: loadOk ? 'Loaded checkpoint from slot 1.' : 'No checkpoint stored in that slot.',
      }),
    });

    harness.controller.togglePauseRequest(false);
    harness.handlers.onLoadSlot('slot-1');
    loadOk = true;
    harness.handlers.onLoadSlot('slot-1');

    expect(harness.overlayStates.at(-2)).toMatchObject({
      statusMessage: 'No checkpoint stored in that slot.',
      statusOk: false,
    });
    expect(harness.overlayStates.at(-1)).toMatchObject({
      statusMessage: 'Loaded checkpoint from slot 1.',
      statusOk: true,
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

    expect(deletedSlot).toBe('slot-1');
    expect(harness.overlayStates.at(-1)).toEqual(createOverlayState({
      visible: true,
      canResume: true,
      canSave: true,
      storageAvailable: true,
      saveSlots: slots,
      statusMessage: 'Slot 1 checkpoint cleared.',
    }));
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
});
