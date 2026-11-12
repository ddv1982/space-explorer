import { describe, expect, test } from 'bun:test';
import { HitStop } from '../src/systems/HitStop';

function createPhysics(paused = false) {
  const physics = {
    paused,
    pauses: 0,
    resumes: 0,
    isPaused: () => physics.paused,
    pause: () => {
      physics.paused = true;
      physics.pauses += 1;
    },
    resume: () => {
      physics.paused = false;
      physics.resumes += 1;
    },
  };
  return physics;
}

describe('HitStop', () => {
  test('does nothing until triggered', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    expect(hitStop.advance(16, false)).toBe(false);
    expect(physics.pauses).toBe(0);
  });

  test('freezes physics and gameplay for its duration, then resumes', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(40);
    expect(physics.paused).toBe(true);
    expect(hitStop.advance(16, false)).toBe(true);
    expect(hitStop.advance(16, false)).toBe(true);
    expect(hitStop.advance(16, false)).toBe(false);
    expect(physics.paused).toBe(false);
    expect(hitStop.isActive()).toBe(false);
  });

  test('overlapping stops extend to the longest instead of adding up', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(60);
    hitStop.advance(20, false);
    hitStop.trigger(30);
    expect(hitStop.advance(20, false)).toBe(true);
    expect(hitStop.advance(20, false)).toBe(false);
    expect(physics.pauses).toBe(1);
    expect(physics.resumes).toBe(1);
  });

  test('never takes physics that is already paused by the pause menu or a transition', () => {
    const physics = createPhysics(true);
    const hitStop = new HitStop(physics);
    hitStop.trigger(50);
    expect(hitStop.isActive()).toBe(false);
    expect(hitStop.advance(16, true)).toBe(false);
    expect(physics.paused).toBe(true);
    expect(physics.resumes).toBe(0);
  });

  test('ending during a pause or lock leaves resuming to that owner', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(20);
    // A fatal hit locks gameplay for the death transition before the stop runs out.
    expect(hitStop.advance(30, true)).toBe(false);
    expect(physics.paused).toBe(true);
    expect(hitStop.isActive()).toBe(true);
    // The respawn flow resumes physics itself when its lock ends; the stop then just lets go.
    physics.resume();
    expect(hitStop.advance(16, false)).toBe(false);
    expect(hitStop.isActive()).toBe(false);
    expect(physics.resumes).toBe(1);
  });

  test('resumes after a lock that left physics paused', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(20);
    hitStop.advance(30, true);
    expect(hitStop.advance(16, false)).toBe(false);
    expect(physics.paused).toBe(false);
  });

  test('ignores empty triggers and forgets state on reset', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(0);
    expect(hitStop.isActive()).toBe(false);
    hitStop.trigger(100);
    hitStop.reset();
    expect(hitStop.isActive()).toBe(false);
  });
});
