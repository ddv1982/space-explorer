import { describe, expect, test } from 'bun:test';

import {
  runGameSceneUpdateFrame,
  type GameSceneFrameDelegate,
} from '../src/scenes/gameScene/updateFrame';

function createRecordingDelegate(options?: {
  pausedOrLocked?: boolean;
}): { calls: string[]; delegate: GameSceneFrameDelegate } {
  const calls: string[] = [];
  const pausedOrLocked = options?.pausedOrLocked ?? false;

  const delegate: GameSceneFrameDelegate = {
    syncViewportIfNeeded: () => {
      calls.push('syncViewportIfNeeded');
    },
    handlePauseInput: () => {
      calls.push('handlePauseInput');
    },
    isPausedOrLockedFrame: () => {
      calls.push('isPausedOrLockedFrame');
      return pausedOrLocked;
    },
    updatePausedFrame: (delta) => {
      calls.push(`updatePausedFrame:${delta}`);
    },
    updateGameplayFrame: (time, delta) => {
      calls.push(`updateGameplayFrame:${time}:${delta}`);
    },
    updateHud: () => {
      calls.push('updateHud');
    },
  };

  return { calls, delegate };
}

describe('runGameSceneUpdateFrame', () => {
  test('paused/locked path: sync → pause input → gate → paused frame only', () => {
    const { calls, delegate } = createRecordingDelegate({ pausedOrLocked: true });

    runGameSceneUpdateFrame(delegate, 1000, 16);

    expect(calls).toEqual([
      'syncViewportIfNeeded',
      'handlePauseInput',
      'isPausedOrLockedFrame',
      'updatePausedFrame:16',
    ]);
  });

  test('active path: sync → pause input → gate → gameplay → HUD', () => {
    const { calls, delegate } = createRecordingDelegate({ pausedOrLocked: false });

    runGameSceneUpdateFrame(delegate, 2000, 16);

    expect(calls).toEqual([
      'syncViewportIfNeeded',
      'handlePauseInput',
      'isPausedOrLockedFrame',
      'updateGameplayFrame:2000:16',
      'updateHud',
    ]);
  });
});
