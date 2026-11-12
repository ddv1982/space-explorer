import { describe, expect, test } from 'bun:test';

import { GameplayClock } from '../src/systems/GameplayClock';
import { runGameSceneUpdateFrame, type GameSceneFrameDelegate } from '../src/scenes/gameScene/updateFrame';
import { ScoreManager } from '../src/systems/ScoreManager';
import { HIT_STOP_TIME_SCALE, HitStop } from '../src/systems/HitStop';

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

  test('a hit-stop slows the gameplay clock, and a locked frame ends it at once', () => {
    const clock = new GameplayClock();
    const timeScales: number[] = [];
    const hitStop = new HitStop((scale) => timeScales.push(scale));
    let locked = false;
    const delegate: GameSceneFrameDelegate = {
      handlePauseInput: () => {},
      isPausedOrLockedFrame: () => locked,
      updatePausedFrame: () => {},
      updateGameplayFrame: () => {},
      updateHud: () => {},
    };

    hitStop.trigger(100);
    runGameSceneUpdateFrame(delegate, 0, 20, clock, hitStop);
    expect(clock.now).toBeCloseTo(20 * HIT_STOP_TIME_SCALE);

    // A fatal hit starts the death transition: physics must not stay slowed through it.
    locked = true;
    runGameSceneUpdateFrame(delegate, 20, 20, clock, hitStop);
    expect(hitStop.isActive()).toBe(false);
    expect(timeScales.at(-1)).toBe(1);

    locked = false;
    runGameSceneUpdateFrame(delegate, 40, 20, clock, hitStop);
    expect(clock.now).toBeCloseTo(20 * HIT_STOP_TIME_SCALE + 20);
  });
});
