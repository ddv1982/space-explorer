import { describe, expect, test } from 'bun:test';
import { beginDrag, dragDesiredVelocity, dragTarget } from '../src/systems/input/relativeDrag';

const WIDE = { left: 0, top: 0, right: 1280, bottom: 720 };

describe('relativeDrag', () => {
  test('dragTarget moves the ship by the finger delta, not to the finger', () => {
    const drag = beginDrag(300, 600, 200, 700);
    expect(dragTarget(drag, 320, 580, WIDE)).toEqual({ x: 220, y: 680 });
  });

  test('a new touch re-anchors without the ship jumping toward the finger', () => {
    const retouch = beginDrag(50, 50, 220, 680);
    expect(dragTarget(retouch, 50, 50, WIDE)).toEqual({ x: 220, y: 680 });
  });

  test('target is clamped to bounds after a resize', () => {
    const drag = beginDrag(100, 100, 500, 300);
    expect(dragTarget(drag, 200, 100, { left: 0, top: 0, right: 390, bottom: 844 })).toEqual({ x: 390, y: 300 });
  });

  test('dragDesiredVelocity clamps to maxSpeed and is zero within 1px', () => {
    const far = dragDesiredVelocity(0, 0, 1000, 0, 480);
    expect(far).toEqual({ vx: 480, vy: 0 });
    expect(dragDesiredVelocity(10, 10, 10.5, 10.5, 480)).toEqual({ vx: 0, vy: 0 });
    // Close in, speed is limited by what the brakes can shed over the gap...
    expect(dragDesiredVelocity(0, 0, 0, 12, 480, 600, 60).vy).toBeCloseTo(120, 6);
    // ...and by the settle time over the last few pixels.
    expect(dragDesiredVelocity(0, 0, 0, 3, 480, 600, 60).vy).toBeCloseTo(50, 6);
  });
});
