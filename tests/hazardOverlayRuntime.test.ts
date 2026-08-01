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

  test('does not repeatedly clear an overlay that remains below the visibility threshold', () => {
    const overlay = { clear: mock() };

    const alpha = updateHazardOverlay({
      overlay: overlay as never,
      scene: null,
      width: 800,
      height: 600,
      time: 1000,
      delta: 16,
      overlayAlpha: 0,
      targetOverlayAlpha: 0,
      activeHazards: [],
    });

    expect(alpha).toBe(0);
    expect(overlay.clear).not.toHaveBeenCalled();
  });

  test('clears the final visible geometry once when fading below the threshold', () => {
    const overlay = { clear: mock() };

    updateHazardOverlay({
      overlay: overlay as never,
      scene: null,
      width: 800,
      height: 600,
      time: 1000,
      delta: 60_000,
      overlayAlpha: 0.006,
      targetOverlayAlpha: 0,
      activeHazards: [],
    });

    expect(overlay.clear).toHaveBeenCalledTimes(1);
  });

  test('aggregates and clamps repeated hazard intensities before drawing', () => {
    const lineStyles: number[][] = [];
    const overlay = {
      clear: mock(),
      lineStyle: (...args: number[]) => { lineStyles.push(args); },
      lineBetween: mock(),
      strokeEllipse: mock(),
      fillStyle: mock(),
      fillEllipse: mock(),
      beginPath: mock(),
      arc: mock(),
      strokePath: mock(),
      fillCircle: mock(),
    };

    updateHazardOverlay({
      overlay: overlay as never,
      scene: {} as never,
      width: 800,
      height: 600,
      time: 1000,
      delta: 16,
      overlayAlpha: 1,
      targetOverlayAlpha: 1,
      activeHazards: [
        { type: 'debris-surge', intensity: 0.8 },
        { type: 'debris-surge', intensity: 0.7 },
        { type: 'debris-surge', intensity: 0.6 },
      ],
    });

    expect(overlay.clear).toHaveBeenCalledTimes(1);
    expect(lineStyles).toHaveLength(1);
    expect(lineStyles[0]?.[2]).toBeCloseTo(0.18 * 1.8, 10);
  });
});
