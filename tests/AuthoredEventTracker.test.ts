import { describe, expect, test } from 'bun:test';
import { AuthoredEventTracker } from '../src/systems/wave/AuthoredEventTracker';

describe('AuthoredEventTracker', () => {
  test('claims a ready event exactly once', () => {
    const tracker = new AuthoredEventTracker();
    expect(tracker.claim('opening', 'wave', 'picket', 0.4, 0.39)).toBe(false);
    expect(tracker.claim('opening', 'wave', 'picket', 0.4, 0.4)).toBe(true);
    expect(tracker.claim('opening', 'wave', 'picket', 0.4, 0.9)).toBe(false);
  });

  test('keeps event kinds and sections independent and can reset', () => {
    const tracker = new AuthoredEventTracker();
    expect(tracker.claim('opening', 'wave', 'signal', 0, 0)).toBe(true);
    expect(tracker.claim('opening', 'drop', 'signal', 0, 0)).toBe(true);
    expect(tracker.claim('finale', 'wave', 'signal', 0, 0)).toBe(true);
    tracker.reset();
    expect(tracker.claim('opening', 'wave', 'signal', 0, 0)).toBe(true);
  });
});
