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
  test('paused/locked path: pause input → gate → paused frame only', () => {
    const { calls, delegate } = createRecordingDelegate({ pausedOrLocked: true });

    runGameSceneUpdateFrame(delegate, 1000, 16);

    expect(calls).toEqual([
      'handlePauseInput',
      'isPausedOrLockedFrame',
      'updatePausedFrame:16',
    ]);
  });

  test('active path: pause input → gate → gameplay → HUD', () => {
    const { calls, delegate } = createRecordingDelegate({ pausedOrLocked: false });

    runGameSceneUpdateFrame(delegate, 2000, 16);

    expect(calls).toEqual([
      'handlePauseInput',
      'isPausedOrLockedFrame',
      'updateGameplayFrame:2000:16',
      'updateHud',
    ]);
  });

  test('preserves the scene-time contract after a paused wall-clock jump', () => {
    const calls: string[] = [];
    let paused = false;
    const delegate: GameSceneFrameDelegate = {
      handlePauseInput: () => {},
      isPausedOrLockedFrame: () => paused,
      updatePausedFrame: () => {},
      updateGameplayFrame: (time, delta) => calls.push(`${time}:${delta}`),
      updateHud: () => {},
    };

    runGameSceneUpdateFrame(delegate, 100, 40);
    paused = true;
    runGameSceneUpdateFrame(delegate, 50_000, 49_900);
    paused = false;
    runGameSceneUpdateFrame(delegate, 50_020, 20);
    runGameSceneUpdateFrame(delegate, 50_050, 30);

    expect(calls).toEqual(['100:40', '50020:20', '50050:30']);
  });
});
