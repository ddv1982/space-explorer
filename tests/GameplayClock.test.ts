import { describe, expect, test } from 'bun:test';

import { GameplayClock } from '../src/systems/GameplayClock';
import { runGameSceneUpdateFrame, type GameSceneFrameDelegate } from '../src/scenes/gameScene/updateFrame';
import { ScoreManager } from '../src/systems/ScoreManager';

describe('GameplayClock', () => {
  test('advances only when asked and ignores negative deltas', () => {
    const clock = new GameplayClock();
    clock.advance(16);
    clock.advance(-4);
    clock.advance(Number.NaN);
    expect(clock.now).toBe(16);
    expect(clock.delta).toBe(0);
    clock.reset();
    expect(clock.now).toBe(0);
  });

  test('paused frames do not expire a score chain window', () => {
    const clock = new GameplayClock();
    const scoreManager = new ScoreManager();
    let paused = false;
    const calls: string[] = [];
    const delegate: GameSceneFrameDelegate = {
      handlePauseInput: () => {},
      isPausedOrLockedFrame: () => paused,
      updatePausedFrame: () => {
        calls.push(`paused:${clock.now}`);
      },
      updateGameplayFrame: (time) => {
        calls.push(`play:${time}`);
      },
      updateHud: () => {},
    };

    runGameSceneUpdateFrame(delegate, 1000, 16, clock);
    scoreManager.registerKill(100, clock.now);
    expect(scoreManager.getChainState(clock.now).chain).toBe(1);

    paused = true;
    runGameSceneUpdateFrame(delegate, 50_000, 20_000, clock);
    expect(clock.now).toBe(16);
    expect(scoreManager.getChainState(clock.now).chain).toBe(1);

    paused = false;
    runGameSceneUpdateFrame(delegate, 50_016, 16, clock);
    expect(scoreManager.getChainState(clock.now).chain).toBe(1);
    expect(calls).toEqual(['play:16', 'paused:16', 'play:32']);
  });
});
