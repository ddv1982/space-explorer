import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({ default: {} }));
mock.module('../src/utils/layout', () => {
  const getViewportBounds = (scene: SceneLike) => {
    const viewport = scene.scale.getViewPort();
    return {
      left: viewport.x,
      top: viewport.y,
      width: viewport.width,
      height: viewport.height,
      right: viewport.x + viewport.width,
      bottom: viewport.y + viewport.height,
      centerX: viewport.x + viewport.width / 2,
      centerY: viewport.y + viewport.height / 2,
    };
  };

  return {
    getViewportBounds,
    getViewportLayout: getViewportBounds,
    centerHorizontally: (layout: { left: number; width: number }, width: number) => layout.left + (layout.width - width) / 2,
  };
});

const {
  getPauseOverlayLayout,
  getPauseSaveSlotRowControlLayout,
  PAUSE_OVERLAY_BUTTON_HEIGHT,
  PAUSE_OVERLAY_BUTTON_WIDTH,
  PAUSE_OVERLAY_SLIDER_SPACING,
  PAUSE_OVERLAY_SLIDER_WIDTH,
  PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
  PAUSE_OVERLAY_SLOT_BUTTON_GAP,
  PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
} = await import('../src/scenes/gameScene/pauseOverlay/view');
const { createMenuLayoutPlan } = await import('../src/scenes/menuScene/layout');

type SceneLike = {
  scale: {
    getViewPort: () => { x: number; y: number; width: number; height: number };
  };
};

function createScene(width: number, height: number): SceneLike {
  return {
    scale: {
      getViewPort: () => ({ x: 0, y: 0, width, height }),
    },
  };
}

type Rect = { x: number; y: number; width: number; height: number };

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function expectNoOverlap(a: Rect, b: Rect): void {
  expect(rectsOverlap(a, b)).toBe(false);
}

function getPauseFooterRects(layout: ReturnType<typeof getPauseOverlayLayout>): Rect[] {
  return [
    {
      x: layout.resumeButtonX,
      y: layout.resumeButtonY,
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
    },
    {
      x: layout.menuButtonX,
      y: layout.menuButtonY,
      width: PAUSE_OVERLAY_BUTTON_WIDTH,
      height: PAUSE_OVERLAY_BUTTON_HEIGHT,
    },
  ];
}

function assertPauseRequiredControlsDoNotOverlap(viewport: { width: number; height: number }): void {
  const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);
  const statusRect = {
    x: 0,
    y: layout.statusY - 10,
    width: viewport.width,
    height: 20,
  };
  const saveHeaderRect = {
    x: layout.saveHeaderX,
    y: layout.saveHeaderY - 8,
    width: layout.slotRows[0]?.width ?? viewport.width,
    height: 16,
  };
  const subtitleRect = {
    x: 0,
    y: layout.subtitleY - 10,
    width: viewport.width,
    height: 20,
  };
  const hintRect = {
    x: 0,
    y: layout.hintY - 10,
    width: viewport.width,
    height: 20,
  };
  const footerRects = getPauseFooterRects(layout);
  const sliderBand = layout.musicVisible
    ? {
        x: layout.sliderX,
        y: layout.sliderStartY,
        width: PAUSE_OVERLAY_SLIDER_WIDTH,
        height: PAUSE_OVERLAY_SLIDER_SPACING * 3 + 38,
      }
    : null;

  for (const row of layout.slotRows) {
    expectNoOverlap(row, statusRect);
    expectNoOverlap(row, saveHeaderRect);
    if (layout.subtitleVisible) {
      expectNoOverlap(row, subtitleRect);
    }
    if (layout.hintVisible) {
      expectNoOverlap(row, hintRect);
    }
    for (const footerRect of footerRects) {
      expectNoOverlap(row, footerRect);
    }
    if (sliderBand) {
      expectNoOverlap(row, sliderBand);
    }
  }

  for (const footerRect of footerRects) {
    expectNoOverlap(statusRect, footerRect);
    if (sliderBand) {
      expectNoOverlap(footerRect, sliderBand);
    }
  }
}

function assertMenuBandsDoNotOverlap(viewport: { width: number; height: number }): void {
  const plan = createMenuLayoutPlan(createScene(viewport.width, viewport.height) as never);
  const titleRect = {
    x: 0,
    y: plan.titleY - (plan.veryShortCompact ? 28 : plan.compact ? 34 : 44),
    width: viewport.width,
    height: plan.veryShortCompact ? 56 : plan.compact ? 68 : 88,
  };
  const subtitleRect = {
    x: 0,
    y: plan.subtitleY - 10,
    width: viewport.width,
    height: 20,
  };
  const tileRect = {
    x: 0,
    y: plan.tileRowY,
    width: viewport.width,
    height: plan.tileBlockHeight,
  };
  const statusRect = {
    x: 0,
    y: plan.statusY - plan.statusHeight / 2,
    width: viewport.width,
    height: plan.statusHeight,
  };

  expectNoOverlap(titleRect, subtitleRect);
  expectNoOverlap(subtitleRect, tileRect);
  expectNoOverlap(tileRect, statusRect);

  if (plan.musicPanelHeight > 0) {
    const musicRect = {
      x: plan.sliderX,
      y: plan.musicPanelY,
      width: plan.musicPanelWidth,
      height: plan.musicPanelHeight,
    };
    expectNoOverlap(subtitleRect, musicRect);
    expectNoOverlap(musicRect, tileRect);
    expectNoOverlap(musicRect, statusRect);
  }

  expect(statusRect.y + statusRect.height).toBeLessThanOrEqual(plan.outerFrameY + plan.outerFrameHeight);
}

describe('responsive save-slot layouts', () => {
  test.each([
    { width: 480, height: 360 },
    { width: 480, height: 320 },
    { width: 640, height: 360 },
    { width: 320, height: 360 },
    { width: 280, height: 360 },
  ])('pause overlay keeps slot controls and action buttons inside a short landscape viewport', (viewport) => {
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);

    for (const row of layout.slotRows) {
      const deleteButtonRight = row.x + row.width - 10;
      const saveButtonLeft = deleteButtonRight - PAUSE_OVERLAY_SLOT_BUTTON_WIDTH * 3 - PAUSE_OVERLAY_SLOT_BUTTON_GAP * 2;

      expect(row.x).toBeGreaterThanOrEqual(0);
      expect(row.x + row.width).toBeLessThanOrEqual(viewport.width);
      expect(row.y).toBeGreaterThanOrEqual(0);
      expect(row.y + row.height).toBeLessThanOrEqual(layout.buttonY);
      expect(saveButtonLeft).toBeGreaterThanOrEqual(0);
      expect(deleteButtonRight).toBeLessThanOrEqual(viewport.width);
    }

    expect(layout.resumeButtonX).toBeGreaterThanOrEqual(0);
    expect(layout.resumeButtonX + PAUSE_OVERLAY_BUTTON_WIDTH).toBeLessThanOrEqual(viewport.width);
    expect(layout.menuButtonX).toBeGreaterThanOrEqual(0);
    expect(layout.menuButtonX + PAUSE_OVERLAY_BUTTON_WIDTH).toBeLessThanOrEqual(viewport.width);
    expect(layout.menuButtonY + PAUSE_OVERLAY_BUTTON_HEIGHT).toBeLessThanOrEqual(viewport.height);
    assertPauseRequiredControlsDoNotOverlap(viewport);
  });

  test('pause overlay stacks footer actions on narrow viewports instead of pushing them off-screen', () => {
    const viewport = { width: 360, height: 640 };
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);

    expect(layout.resumeButtonX).toBeGreaterThanOrEqual(0);
    expect(layout.resumeButtonX + PAUSE_OVERLAY_BUTTON_WIDTH).toBeLessThanOrEqual(viewport.width);
    expect(layout.menuButtonX).toBeGreaterThanOrEqual(0);
    expect(layout.menuButtonX + PAUSE_OVERLAY_BUTTON_WIDTH).toBeLessThanOrEqual(viewport.width);
    expect(layout.menuButtonY).toBeGreaterThan(layout.resumeButtonY);
    expect(layout.menuButtonY + PAUSE_OVERLAY_BUTTON_HEIGHT).toBeLessThanOrEqual(viewport.height);
    assertPauseRequiredControlsDoNotOverlap(viewport);
  });

  test.each([
    { width: 360, height: 640 },
    { width: 320, height: 360 },
    { width: 280, height: 360 },
  ])('pause overlay compact save-slot rows keep text bands clear of SAVE/LOAD/DEL buttons', (viewport) => {
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);

    for (const row of layout.slotRows) {
      const controlLayout = getPauseSaveSlotRowControlLayout(row);
      const buttonRects = [controlLayout.saveButton, controlLayout.loadButton, controlLayout.deleteButton];
      const textRects = [controlLayout.title, controlLayout.subtitle, controlLayout.savedAt].filter((rect) => rect.visible);

      for (const buttonRect of buttonRects) {
        expect(buttonRect.width).toBe(PAUSE_OVERLAY_SLOT_BUTTON_WIDTH);
        expect(buttonRect.height).toBe(PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT);
        expect(buttonRect.x).toBeGreaterThanOrEqual(row.x);
        expect(buttonRect.x + buttonRect.width).toBeLessThanOrEqual(row.x + row.width);
        expect(buttonRect.y).toBeGreaterThanOrEqual(row.y);
        expect(buttonRect.y + buttonRect.height).toBeLessThanOrEqual(row.y + row.height);

        for (const textRect of textRects) {
          expectNoOverlap(textRect, buttonRect);
        }
      }
    }
  });

  test.each([
    { width: 360, height: 640 },
    { width: 360, height: 360 },
    { width: 320, height: 360 },
    { width: 280, height: 360 },
    { width: 480, height: 520 },
    { width: 640, height: 480 },
  ])('pause overlay reserves separate vertical bands for compact controls, status, and footer', (viewport) => {
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);

    expect(layout.musicVisible).toBe(false);
    assertPauseRequiredControlsDoNotOverlap(viewport);
  });

  test.each([
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 360, height: 360 },
    { width: 360, height: 640 },
    { width: 320, height: 640 },
    { width: 480, height: 320 },
  ])('menu layout keeps save-slot tiles reachable and horizontally inside the viewport', (viewport) => {
    const plan = createMenuLayoutPlan(createScene(viewport.width, viewport.height) as never);
    const left = Math.min(...plan.tilePositions.map((tile) => tile.x));
    const right = Math.max(...plan.tilePositions.map((tile) => tile.x + plan.tileWidth));
    const bottom = Math.max(...plan.tilePositions.map((tile) => tile.y + plan.tileHeight));

    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(viewport.width);
    expect(plan.tileRowY).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeLessThanOrEqual(viewport.height);
  });

  test.each([
    { width: 360, height: 600 },
    { width: 480, height: 500 },
  ])('menu layout hides the music panel when screens are too short', (viewport) => {
    const plan = createMenuLayoutPlan(createScene(viewport.width, viewport.height) as never);

    expect(plan.musicPanelHeight).toBe(0);
  });

  test('menu music visibility stays pinned to the 600px height threshold', () => {
    const hiddenPlan = createMenuLayoutPlan(createScene(1024, 600) as never);
    const visiblePlan = createMenuLayoutPlan(createScene(1024, 601) as never);

    expect(hiddenPlan.musicPanelHeight).toBe(0);
    expect(visiblePlan.musicPanelHeight).toBeGreaterThan(0);
  });

  test('menu compact mode stays pinned to 720h/800w breakpoints', () => {
    const nonCompactByHeight = createMenuLayoutPlan(createScene(800, 720) as never);
    const compactByHeight = createMenuLayoutPlan(createScene(800, 719) as never);
    const nonCompactByWidth = createMenuLayoutPlan(createScene(800, 900) as never);
    const compactByWidth = createMenuLayoutPlan(createScene(799, 900) as never);

    expect(nonCompactByHeight.compact).toBe(false);
    expect(compactByHeight.compact).toBe(true);
    expect(nonCompactByWidth.compact).toBe(false);
    expect(compactByWidth.compact).toBe(true);
  });

  test('pause overlay hides wide music sliders when the frame cannot fit them', () => {
    const layout = getPauseOverlayLayout(createScene(720, 720) as never);

    expect(layout.musicVisible).toBe(false);
    expect(layout.slotRows[0]?.width).toBeGreaterThan(400);
  });

  test.each([
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
  ])('pause overlay keeps save-slot rows reachable when wide action buttons are visible', (viewport) => {
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);

    expect(layout.actionButtonsVisible).toBe(true);
    expect(layout.musicVisible).toBe(true);
    expect(layout.saveSlotsVisible).toBe(true);
    expect(layout.saveHeaderY).toBeGreaterThan(layout.hintY + 20);
    expect((layout.slotRows[0]?.y ?? 0) - layout.saveHeaderY).toBeGreaterThanOrEqual(28);
    assertPauseRequiredControlsDoNotOverlap(viewport);
  });

  test.each([
    { width: 1366, height: 768 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 480, height: 320 },
    { width: 320, height: 360 },
    { width: 280, height: 360 },
  ])('pause overlay keeps save header and text bands above save-slot rows across desktop and ultra-compact heights', (viewport) => {
    assertPauseRequiredControlsDoNotOverlap(viewport);
  });

  test.each([
    { width: 812, height: 375 },
    { width: 360, height: 640 },
    { width: 360, height: 360 },
    { width: 480, height: 320 },
    { width: 480, height: 500 },
    { width: 640, height: 360 },
  ])('menu layout keeps title, music band, tile block, and status in separate vertical bands on compact/mobile viewports', (viewport) => {
    assertMenuBandsDoNotOverlap(viewport);
  });

  test.each([
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
  ])('menu layout keeps the music panel inside common desktop viewports', (viewport) => {
    const plan = createMenuLayoutPlan(createScene(viewport.width, viewport.height) as never);

    expect(plan.musicPanelY).toBeGreaterThanOrEqual(0);
    expect(plan.musicPanelY + plan.musicPanelHeight).toBeLessThanOrEqual(viewport.height);
    expect(plan.sliderStartY + plan.sliderSpacing * 3 + 32).toBeLessThanOrEqual(viewport.height);
  });
});
