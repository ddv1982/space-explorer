import { describe, expect, mock, test } from 'bun:test';

import type { PauseOverlayHandlers, PauseOverlayState } from '../src/scenes/gameScene/pauseOverlay/types';

mock.module('phaser', () => ({ default: {} }));

const { PauseStateController } = await import('../src/scenes/gameScene/PauseStateController');

type PauseHarness = {
  controller: PauseStateController;
  overlayStates: PauseOverlayState[];
  mobileControlBlocked: boolean[];
  physicsActions: Array<'pause' | 'resume'>;
  playClickCalls: number;
  stopPlayerMotionCalls: number;
};

function createPauseHarness(): PauseHarness {
  const overlayStates: PauseOverlayState[] = [];
  const mobileControlBlocked: boolean[] = [];
  const physicsActions: Array<'pause' | 'resume'> = [];

  let playClickCalls = 0;
  let stopPlayerMotionCalls = 0;
  let worldPaused = false;

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
    playClick: () => {
      playClickCalls += 1;
    },
    createOverlay: (_scene: unknown, _handlers: PauseOverlayHandlers) => ({
      setState: (nextState: Partial<PauseOverlayState>) => {
        overlayStates.push({
          visible: nextState.visible ?? false,
          orientationBlocked: nextState.orientationBlocked ?? false,
          canResume: nextState.canResume ?? false,
        });
      },
      relayout: () => {
        // not needed for these tests
      },
      destroy: () => {
        // not needed for these tests
      },
    }),
  });

  return {
    controller,
    overlayStates,
    mobileControlBlocked,
    physicsActions,
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
      { visible: false, orientationBlocked: false, canResume: false },
    ]);
    expect(harness.mobileControlBlocked).toEqual([false]);
    expect(harness.physicsActions).toEqual([]);
    expect(harness.stopPlayerMotionCalls).toBe(0);
    expect(harness.playClickCalls).toBe(0);
  });

  test('toggles manual pause/resume with expected physics and overlay updates', () => {
    const harness = createPauseHarness();

    harness.controller.togglePauseRequest(false);

    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.playClickCalls).toBe(1);
    expect(harness.stopPlayerMotionCalls).toBe(1);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toEqual({ visible: true, orientationBlocked: false, canResume: true });
    expect(harness.mobileControlBlocked).toEqual([false, true]);

    harness.controller.togglePauseRequest(false);

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.playClickCalls).toBe(2);
    expect(harness.stopPlayerMotionCalls).toBe(1);
    expect(harness.physicsActions).toEqual(['pause', 'resume']);
    expect(harness.overlayStates.at(-1)).toEqual({ visible: false, orientationBlocked: false, canResume: false });
    expect(harness.mobileControlBlocked).toEqual([false, true, false]);
  });

  test('orientation block forces pause and blocks manual toggle when no manual request exists', () => {
    const harness = createPauseHarness();

    harness.controller.setOrientationBlocked(true);

    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.stopPlayerMotionCalls).toBe(2);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toEqual({ visible: true, orientationBlocked: true, canResume: false });

    harness.controller.togglePauseRequest(false);

    expect(harness.playClickCalls).toBe(0);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toEqual({ visible: true, orientationBlocked: true, canResume: false });

    harness.controller.setOrientationBlocked(false);

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.physicsActions).toEqual(['pause', 'resume']);
    expect(harness.overlayStates.at(-1)).toEqual({ visible: false, orientationBlocked: false, canResume: false });
  });

  test('manual pause persists while orientation block toggles on/off', () => {
    const harness = createPauseHarness();

    harness.controller.togglePauseRequest(false);
    harness.controller.setOrientationBlocked(true);
    harness.controller.setOrientationBlocked(false);

    expect(harness.controller.isGameplayPaused()).toBe(true);
    expect(harness.physicsActions).toEqual(['pause']);
    expect(harness.overlayStates.at(-1)).toEqual({ visible: true, orientationBlocked: false, canResume: true });

    harness.controller.togglePauseRequest(false);

    expect(harness.controller.isGameplayPaused()).toBe(false);
    expect(harness.physicsActions).toEqual(['pause', 'resume']);
  });

  test('idempotent sync still republishes overlay and mobile-control state', () => {
    const harness = createPauseHarness();

    harness.controller.setOrientationBlocked(false);

    expect(harness.physicsActions).toEqual([]);
    expect(harness.overlayStates).toEqual([
      { visible: false, orientationBlocked: false, canResume: false },
      { visible: false, orientationBlocked: false, canResume: false },
    ]);
    expect(harness.mobileControlBlocked).toEqual([false, false]);
  });
});
