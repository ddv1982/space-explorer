import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { updateHazardOverlay } = await import('../src/systems/parallax/hazardOverlayRuntime');

function advance(frameCount: number, delta: number): number {
  const overlay = { clear: mock() };
  let alpha = 0;

  for (let i = 0; i < frameCount; i++) {
    alpha = updateHazardOverlay({
      overlay: overlay as never,
      scene: null,
      width: 800,
      height: 600,
      time: i * delta,
      delta,
      overlayAlpha: alpha,
      targetOverlayAlpha: 1,
      activeHazards: [],
    });
  }

  return alpha;
}

describe('hazard overlay runtime damping', () => {
  test('is elapsed-time equivalent across frame rates', () => {
    expect(advance(30, 1000 / 30)).toBeCloseTo(advance(120, 1000 / 120), 10);
  });

  test('is bounded for long deltas and unchanged for a paused delta', () => {
    expect(advance(1, 60_000)).toBeGreaterThanOrEqual(0);
    expect(advance(1, 60_000)).toBeLessThanOrEqual(1);
    expect(advance(1, 0)).toBe(0);
  });
});
