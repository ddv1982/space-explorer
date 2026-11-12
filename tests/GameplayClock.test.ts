import { describe, expect, test } from 'bun:test';

import { GameplayClock } from '../src/systems/GameplayClock';
import { runGameSceneUpdateFrame, type GameSceneFrameDelegate } from '../src/scenes/gameScene/updateFrame';
import { ScoreManager } from '../src/systems/ScoreManager';
import { HitStop } from '../src/systems/HitStop';

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

  test('a hit-stop freezes the gameplay clock and gameplay frames, then real time resumes', () => {
    const clock = new GameplayClock();
    let paused = false;
    const hitStop = new HitStop({
      isPaused: () => paused,
      pause: () => (paused = true),
      resume: () => (paused = false),
      isHeldElsewhere: () => false,
    });
    const calls: string[] = [];
    const delegate: GameSceneFrameDelegate = {
      handlePauseInput: () => {},
      isPausedOrLockedFrame: () => false,
      updatePausedFrame: () => calls.push('frozen'),
      updateGameplayFrame: (time) => calls.push(`gameplay:${time}`),
      updateHud: () => {},
    };

    runGameSceneUpdateFrame(delegate, 0, 16, clock, hitStop);
    hitStop.trigger(40);
    runGameSceneUpdateFrame(delegate, 16, 16, clock, hitStop);
    runGameSceneUpdateFrame(delegate, 32, 16, clock, hitStop);
    runGameSceneUpdateFrame(delegate, 48, 16, clock, hitStop);
    runGameSceneUpdateFrame(delegate, 64, 16, clock, hitStop);

    expect(calls).toEqual(['gameplay:16', 'frozen', 'frozen', 'gameplay:32', 'gameplay:48']);
    expect(paused).toBe(false);
  });
});
