import { describe, expect, test } from 'bun:test';
import { HitStop } from '../src/systems/HitStop';

function createPhysics(paused = false) {
  const physics = {
    paused,
    heldElsewhere: false,
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
    isHeldElsewhere: () => physics.heldElsewhere,
  };
  return physics;
}

describe('HitStop', () => {
  test('does nothing until triggered', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    expect(hitStop.advance(16)).toBe(false);
    expect(physics.pauses).toBe(0);
  });

  test('freezes physics and gameplay for its duration, then resumes', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(40);
    expect(physics.paused).toBe(true);
    expect(hitStop.advance(16)).toBe(true);
    expect(hitStop.advance(16)).toBe(true);
    expect(hitStop.advance(16)).toBe(false);
    expect(physics.paused).toBe(false);
    expect(hitStop.isActive()).toBe(false);
  });

  test('overlapping stops extend to the longest instead of adding up', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(60);
    hitStop.advance(20);
    hitStop.trigger(30);
    expect(hitStop.advance(20)).toBe(true);
    expect(hitStop.advance(20)).toBe(false);
    expect(physics.pauses).toBe(1);
    expect(physics.resumes).toBe(1);
  });

  test('never takes physics that is already paused by the pause menu or a transition', () => {
    const physics = createPhysics(true);
    const hitStop = new HitStop(physics);
    hitStop.trigger(50);
    expect(hitStop.isActive()).toBe(false);
    expect(hitStop.advance(16)).toBe(false);
    expect(physics.paused).toBe(true);
    expect(physics.resumes).toBe(0);
  });

  test('a lock that keeps physics running (level complete) does not delay the resume', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(100); // boss defeat, then the level-complete transition locks gameplay
    expect(hitStop.advance(60)).toBe(true);
    expect(hitStop.advance(60)).toBe(false);
    expect(physics.paused).toBe(false);
  });

  test('ending while the pause menu or respawn pause holds physics leaves resuming to that owner', () => {
    const physics = createPhysics();
    const hitStop = new HitStop(physics);
    hitStop.trigger(20);
    physics.heldElsewhere = true; // the player paused mid-freeze
    expect(hitStop.advance(30)).toBe(false);
    expect(physics.paused).toBe(true);
    expect(physics.resumes).toBe(0);
    // Unpausing resumes physics through the pause menu; the stop then just lets go.
    physics.heldElsewhere = false;
    physics.resume();
    expect(hitStop.advance(16)).toBe(false);
    expect(hitStop.isActive()).toBe(false);
    expect(physics.resumes).toBe(1);
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
