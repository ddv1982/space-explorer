import { describe, expect, mock, test } from 'bun:test';
import { HIT_STOP_TIME_SCALE, HitStop } from '../src/systems/HitStop';

describe('HitStop', () => {
  test('passes real time through until triggered', () => {
    const setPhysicsTimeScale = mock();
    const hitStop = new HitStop(setPhysicsTimeScale);
    expect(hitStop.scaleDelta(16)).toBe(16);
    expect(setPhysicsTimeScale).not.toHaveBeenCalled();
  });

  test('slows gameplay and physics for its duration, then restores both', () => {
    const setPhysicsTimeScale = mock();
    const hitStop = new HitStop(setPhysicsTimeScale);
    hitStop.trigger(40);
    expect(setPhysicsTimeScale).toHaveBeenLastCalledWith(1 / HIT_STOP_TIME_SCALE);
    expect(hitStop.scaleDelta(16)).toBeCloseTo(16 * HIT_STOP_TIME_SCALE);
    expect(hitStop.scaleDelta(16)).toBeCloseTo(16 * HIT_STOP_TIME_SCALE);
    // The last 8 ms of the stop are slowed; the rest of the frame runs at full speed.
    expect(hitStop.scaleDelta(16)).toBeCloseTo(8 * HIT_STOP_TIME_SCALE + 8);
    expect(hitStop.isActive()).toBe(false);
    expect(setPhysicsTimeScale).toHaveBeenLastCalledWith(1);
    expect(hitStop.scaleDelta(16)).toBe(16);
  });

  test('overlapping stops extend to the longest instead of adding up', () => {
    const hitStop = new HitStop(mock());
    hitStop.trigger(60);
    hitStop.scaleDelta(20);
    hitStop.trigger(30);
    hitStop.scaleDelta(20);
    expect(hitStop.isActive()).toBe(true);
    hitStop.scaleDelta(20);
    expect(hitStop.isActive()).toBe(false);
  });

  test('ignores empty triggers and resets cleanly', () => {
    const setPhysicsTimeScale = mock();
    const hitStop = new HitStop(setPhysicsTimeScale);
    hitStop.trigger(0);
    expect(hitStop.isActive()).toBe(false);
    hitStop.trigger(100);
    hitStop.reset();
    expect(hitStop.isActive()).toBe(false);
    expect(setPhysicsTimeScale).toHaveBeenLastCalledWith(1);
  });
});
