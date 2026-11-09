import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));

const viewport = { width: 800, height: 600 };
mock.module('../src/utils/layout', () => {
  const bounds = () => ({
    left: 0,
    top: 0,
    width: viewport.width,
    height: viewport.height,
    right: viewport.width,
    bottom: viewport.height,
    centerX: viewport.width / 2,
    centerY: viewport.height / 2,
  });
  return {
    getViewportBounds: bounds,
    getViewportLayout: bounds,
    getGameplayBounds: bounds,
    centerHorizontally: (layout: { left: number; width: number }, width: number) =>
      layout.left + (layout.width - width) / 2,
  };
});

function layoutFor(width: number, height: number) {
  viewport.width = width;
  viewport.height = height;
  return getLayoutMetrics({} as Phaser.Scene);
}

const { getLayoutMetrics, shouldRenderMeterRatio } = await import('../src/systems/hud/statusBarLayout');

describe('HUD layout metrics', () => {
  test('wide viewports float two corner clusters with the flight-vector rail between them', () => {
    const layout = layoutFor(1280, 720);

    expect(layout.compact).toBe(false);
    expect(layout).toMatchObject({ hullX: 16, hullWidth: 210, scoreRight: 1264 });
    expect(layout).toMatchObject({ progressWidth: 360, progressX: 460, progressY: 28, progressHeight: 4 });
    // The rail must clear both clusters.
    expect(layout.progressX).toBeGreaterThan(layout.hullX + layout.hullWidth);
    expect(layout.progressX + layout.progressWidth).toBeLessThan(layout.scoreRight - 150);
    // Sector and level name caption the rail; the chain badge hangs under the score.
    expect(layout).toMatchObject({ sectorX: 460, sectorOriginX: 0, levelX: 820 });
    expect(layout).toMatchObject({ chainX: 1264, chainOriginX: 1 });
    expect(layout).toMatchObject({ bossBarWidth: 520, bossBarX: 380, bossBarY: 690, bossNameY: 677 });
    expect(layout).toMatchObject({ announcementY: 300, announcementExitY: 260, announcementMaxWidth: 1248 });
  });

  test('phone portrait runs the rail edge to edge and stacks sector, level and chain inside the clusters', () => {
    const layout = layoutFor(390, 844);

    expect(layout.compact).toBe(true);
    expect(layout).toMatchObject({ progressX: 16, progressWidth: 358, progressY: 9, progressHeight: 3 });
    expect(layout.hullLabelY).toBeGreaterThan(layout.progressY + layout.progressHeight);
    expect(layout).toMatchObject({ sectorX: 374, sectorOriginX: 1, levelX: 374 });
    expect(layout).toMatchObject({ chainX: 16, chainOriginX: 0 });
    expect(layout.chainY).toBeGreaterThan(layout.reserveY);
    // The right cluster ends above the touch pause button (top inset 84px).
    expect(layout.levelY + 16).toBeLessThan(84);
    // The clusters never meet in the middle.
    expect(layout.hullX + layout.hullWidth).toBeLessThan(layout.scoreRight - 126);
  });

  test('phone landscape keeps the wide arrangement without the rail touching either cluster', () => {
    const layout = layoutFor(844, 390);

    expect(layout.compact).toBe(false);
    expect(layout.progressX).toBeGreaterThan(layout.hullX + layout.hullWidth + 16);
    expect(layout.progressX + layout.progressWidth).toBeLessThan(layout.scoreRight - 148);
  });
});

describe('shouldRenderMeterRatio', () => {
  test('quantizes surge redraws to visible pixels', () => {
    expect(shouldRenderMeterRatio(0.5, 0.5, 0.01)).toBe(false);
    expect(shouldRenderMeterRatio(0.5, 0.504, 0.01)).toBe(false);
    expect(shouldRenderMeterRatio(0.5, 0.52, 0.01)).toBe(true);
  });

  test('always renders first draw and endpoints', () => {
    expect(shouldRenderMeterRatio(null, 0.4, 0.01)).toBe(true);
    expect(shouldRenderMeterRatio(0.004, 0, 0.01)).toBe(true);
    expect(shouldRenderMeterRatio(0.996, 1, 0.01)).toBe(true);
    expect(shouldRenderMeterRatio(0, 0, 0.01)).toBe(false);
  });
});
