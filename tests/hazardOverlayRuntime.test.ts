import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { updateHazardOverlay } = await import('../src/systems/parallax/hazardOverlayRuntime');

function createOverlay(visible: boolean) {
  const overlay = {
    visible,
    clear: mock(),
    setVisible: mock((next: boolean) => {
      overlay.visible = next;
      return overlay;
    }),
  };
  return overlay;
}

function advance(frameCount: number, delta: number): number {
  const overlay = createOverlay(false);
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

  test('clears and hides the overlay once when it fades below the threshold', () => {
    const overlay = createOverlay(true);
    const fade = (overlayAlpha: number): number =>
      updateHazardOverlay({
        overlay: overlay as never,
        scene: null,
        width: 800,
        height: 600,
        time: 1000,
        delta: 60_000,
        overlayAlpha,
        targetOverlayAlpha: 0,
        activeHazards: [],
      });

    // A hidden overlay skips its glow filter passes, so a dormant one must not stay visible.
    fade(fade(0.006));

    expect(overlay.clear).toHaveBeenCalledTimes(1);
    expect(overlay.visible).toBe(false);
  });
});
