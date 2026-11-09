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
    getGameplayBounds: () => ({
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
      right: 1280,
      bottom: 720,
      centerX: 640,
      centerY: 360,
    }),
    centerHorizontally: (layout: { left: number; width: number }, width: number) =>
      layout.left + (layout.width - width) / 2,
  };
});

const {
  getPauseOverlayLayout,
  getPauseSaveSlotRowControlLayout,
  PAUSE_OVERLAY_BUTTON_HEIGHT,
  PAUSE_OVERLAY_BUTTON_WIDTH,
  PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
  PAUSE_OVERLAY_SLOT_BUTTON_GAP,
  PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
} = await import('../src/scenes/gameScene/pauseOverlay/view');
const { createMenuLayoutPlan } = await import('../src/scenes/menuScene/layout');
const { getIntermissionLayout } = await import('../src/scenes/planetIntermission/layout');

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

function expectNoOverlap(a: Rect, b: Rect, context = 'layout rectangles'): void {
  if (rectsOverlap(a, b)) {
    throw new Error(`${context} overlap: ${JSON.stringify({ a, b })}`);
  }
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
  const context = `${viewport.width}x${viewport.height}`;
  const statusRect = { x: 0, y: layout.statusY - 10, width: viewport.width, height: 20 };
  const tabRect = { x: layout.tabsX, y: layout.tabY, width: layout.tabWidth * 2, height: layout.tabHeight };
  const footerRects = getPauseFooterRects(layout);
  const panelBottom = layout.panelY + layout.panelHeight;

  expect(layout.panelY).toBeGreaterThanOrEqual(0);
  expect(panelBottom).toBeLessThanOrEqual(viewport.height);
  expect(tabRect.x).toBeGreaterThanOrEqual(layout.panelX);
  expect(tabRect.x + tabRect.width).toBeLessThanOrEqual(layout.panelX + layout.panelWidth);
  if (layout.titleCentered) {
    expect(layout.titleY + layout.titleFontSize / 2).toBeLessThanOrEqual(layout.tabY);
  }

  for (const row of layout.slotRows) {
    expectNoOverlap(row, statusRect, `${context} row/status`);
    expectNoOverlap(row, tabRect, `${context} row/tabs`);
    for (const footerRect of footerRects) {
      expectNoOverlap(row, footerRect, `${context} row/footer`);
    }
  }

  for (const footerRect of footerRects) {
    expectNoOverlap(statusRect, footerRect, `${context} status/footer`);
    expect(footerRect.y + footerRect.height).toBeLessThanOrEqual(panelBottom);
  }
  if (layout.keyHintVisible) {
    expect(layout.keyHintY - 8).toBeGreaterThanOrEqual(layout.menuButtonY + PAUSE_OVERLAY_BUTTON_HEIGHT);
    expect(layout.keyHintY + 8).toBeLessThanOrEqual(panelBottom);
  }
}

function assertMenuBandsDoNotOverlap(viewport: { width: number; height: number }): void {
  const plan = createMenuLayoutPlan(createScene(viewport.width, viewport.height) as never);
  // Home view: title lockup on top; under it either one stack (hero, run selection, footer) or two
  // columns (hero over the settings button, beside the run selection).
  const columns = plan.sideBySide
    ? [
        [plan.titleBand, plan.heroBand, plan.footerBand],
        [plan.titleBand, plan.runSelectionBand],
      ]
    : [[plan.titleBand, plan.heroBand, plan.runSelectionBand, plan.footerBand]];
  for (const bands of columns) {
    for (let index = 1; index < bands.length; index += 1) {
      expect(bands[index]?.top ?? 0).toBeGreaterThanOrEqual(bands[index - 1]?.bottom ?? 0);
    }
  }
  expect(plan.titleBand.top).toBeGreaterThanOrEqual(0);
  expect(plan.footerBand.bottom).toBeLessThanOrEqual(viewport.height);
  expect(plan.runSelectionBand.bottom).toBeLessThanOrEqual(viewport.height);
  expect(plan.settingsButton.y).toBeGreaterThanOrEqual(plan.footerBand.top);
  expect(plan.statusY + plan.statusHeight / 2).toBeLessThanOrEqual(plan.footerBand.bottom);
  if (plan.hero) {
    expect(plan.hero.y - plan.hero.shipHeight / 2).toBeGreaterThanOrEqual(plan.heroBand.top);
    expect(plan.hero.y + plan.hero.shipHeight * 0.8).toBeLessThanOrEqual(plan.heroBand.bottom);
  }

  // Run selection: the launch button, then the slot cards, none overlapping and all on screen.
  const runRects = [plan.launchButton, ...plan.slotCards];
  for (const [index, rect] of runRects.entries()) {
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
    expect(rect.y).toBeGreaterThanOrEqual(plan.runSelectionBand.top);
    expect(rect.y + rect.height).toBeLessThanOrEqual(plan.runSelectionBand.bottom);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    for (const other of runRects.slice(index + 1)) expectNoOverlap(rect, other, 'menu run selection');
  }
  expectNoOverlap(plan.settingsButton, plan.launchButton, 'menu settings/launch');
  for (const card of plan.slotCards) expectNoOverlap(plan.settingsButton, card, 'menu settings/slot');

  if (plan.kickerVisible) {
    const kickerBottom = plan.kickerY + plan.kickerFontSize / 2;
    const titleTop = plan.titleY - plan.titleFontSize / 2;
    expect(titleTop - kickerBottom).toBeGreaterThanOrEqual(4);
  }

  const titleBottom = plan.titleY + plan.titleFontSize / 2;
  const taglineTop = plan.taglineY - plan.taglineFontSize / 2;
  expect(taglineTop).toBeGreaterThanOrEqual(titleBottom);

  // Settings sheet: heading, tier rows, sliders, then DONE, all inside the sheet and the viewport.
  const modal = plan.settingsModal;
  expect(modal.x).toBeGreaterThanOrEqual(0);
  expect(modal.x + modal.width).toBeLessThanOrEqual(viewport.width);
  expect(modal.y).toBeGreaterThanOrEqual(0);
  expect(modal.y + modal.height).toBeLessThanOrEqual(viewport.height);
  expect(modal.missionBand.top).toBeGreaterThanOrEqual(modal.titleY + modal.titleFontSize / 2);
  expect(modal.tuningBand.top).toBeGreaterThanOrEqual(modal.missionBand.bottom);
  expect(modal.doneButton.y).toBeGreaterThanOrEqual(modal.tuningBand.bottom);
  expect(modal.doneButton.y + modal.doneButton.height).toBeLessThanOrEqual(modal.y + modal.height);
  for (const position of plan.settingsLayout.sliderPositions) {
    expect(position.y).toBeGreaterThanOrEqual(modal.tuningBand.top);
    expect(position.y + 52).toBeLessThanOrEqual(modal.tuningBand.bottom);
    expect(position.x).toBeGreaterThanOrEqual(modal.x);
    expect(position.x + (plan.settingsLayout.sliderWidth ?? plan.settingsLayout.width)).toBeLessThanOrEqual(
      modal.x + modal.width
    );
  }
}

function assertIntermissionUpgradeButtonsFit(viewport: { width: number; height: number }, buttonCount: number): void {
  const scene = createScene(viewport.width, viewport.height) as never;
  const layout = getIntermissionLayout(scene, buttonCount);
  const startX = layout.gridLeft;
  const rows = Math.ceil(buttonCount / layout.gridLayout.columns);
  const gridHeight = rows * layout.gridLayout.buttonHeight + Math.max(0, rows - 1) * layout.gridLayout.spacingY;
  const gridWidth =
    layout.gridLayout.buttonWidth * layout.gridLayout.columns +
    layout.gridLayout.spacingX * (layout.gridLayout.columns - 1);

  expect(startX).toBeGreaterThanOrEqual(0);
  expect(startX + gridWidth).toBeLessThanOrEqual(viewport.width);
  expect(layout.gridTop).toBeGreaterThanOrEqual(0);
  expect(layout.gridTop + gridHeight).toBeLessThanOrEqual(layout.promptY - 12);
  expect(layout.gridLayout.buttonHeight).toBeGreaterThanOrEqual(44);

  for (let i = 0; i < buttonCount; i++) {
    const col = i % layout.gridLayout.columns;
    const row = Math.floor(i / layout.gridLayout.columns);
    const x = startX + col * (layout.gridLayout.buttonWidth + layout.gridLayout.spacingX);
    const y = layout.gridTop + row * (layout.gridLayout.buttonHeight + layout.gridLayout.spacingY);

    expect(x).toBeGreaterThanOrEqual(0);
    expect(x + layout.gridLayout.buttonWidth).toBeLessThanOrEqual(viewport.width);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y + layout.gridLayout.buttonHeight).toBeLessThanOrEqual(viewport.height);
  }
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
      const saveButtonLeft =
        deleteButtonRight - PAUSE_OVERLAY_SLOT_BUTTON_WIDTH * 3 - PAUSE_OVERLAY_SLOT_BUTTON_GAP * 2;

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

  test('pause overlay keeps footer actions side by side when a narrow frame can contain them', () => {
    const viewport = { width: 360, height: 640 };
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);

    expect(layout.resumeButtonX).toBeGreaterThanOrEqual(0);
    expect(layout.resumeButtonX + PAUSE_OVERLAY_BUTTON_WIDTH).toBeLessThanOrEqual(viewport.width);
    expect(layout.menuButtonX).toBeGreaterThanOrEqual(0);
    expect(layout.menuButtonX + PAUSE_OVERLAY_BUTTON_WIDTH).toBeLessThanOrEqual(viewport.width);
    expect(layout.menuButtonY).toBe(layout.resumeButtonY);
    expect(layout.menuButtonX).toBeGreaterThan(layout.resumeButtonX);
    expect(layout.menuButtonY + PAUSE_OVERLAY_BUTTON_HEIGHT).toBeLessThanOrEqual(viewport.height);
    assertPauseRequiredControlsDoNotOverlap(viewport);
  });

  test.each([
    { width: 360, height: 640 },
    { width: 360, height: 360 },
    { width: 320, height: 360 },
    { width: 280, height: 360 },
  ])('pause overlay compact save-slot rows keep text bands clear of SAVE/LOAD/DEL buttons', (viewport) => {
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);

    for (const row of layout.slotRows) {
      const controlLayout = getPauseSaveSlotRowControlLayout(row);
      const buttonRects = [controlLayout.saveButton, controlLayout.loadButton, controlLayout.deleteButton];
      const textRects = [controlLayout.title, controlLayout.subtitle, controlLayout.savedAt].filter(
        (rect) => rect.visible
      );

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
    { width: 320, height: 360 },
    { width: 280, height: 360 },
    { width: 480, height: 520 },
    { width: 640, height: 480 },
  ])('pause overlay reserves separate vertical bands for compact controls, status, and footer', (viewport) => {
    assertPauseRequiredControlsDoNotOverlap(viewport);
  });

  test.each([
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 360, height: 640 },
    { width: 320, height: 640 },
    { width: 480, height: 320 },
  ])('menu layout keeps the launch button and save-slot cards reachable inside the viewport', (viewport) => {
    assertMenuBandsDoNotOverlap(viewport);
  });

  test.each([
    { width: 360, height: 600 },
    { width: 480, height: 500 },
    { width: 1024, height: 600 },
  ])('menu layout keeps the shared settings sheet available when screens are short', (viewport) => {
    const plan = createMenuLayoutPlan(createScene(viewport.width, viewport.height) as never);

    expect(plan.settingsModal.height).toBeGreaterThan(0);
    expect(plan.settingsLayout.sliderPositions).toHaveLength(4);
    assertMenuBandsDoNotOverlap(viewport);
  });

  test('the hero ship shows on roomy screens and steps aside when the home view is too short', () => {
    expect(createMenuLayoutPlan(createScene(1280, 720) as never).hero?.shipHeight).toBeGreaterThan(120);
    expect(createMenuLayoutPlan(createScene(390, 844) as never).hero?.shipHeight).toBeGreaterThan(100);
    expect(createMenuLayoutPlan(createScene(480, 320) as never).hero?.shipHeight).toBeGreaterThanOrEqual(64);
    expect(createMenuLayoutPlan(createScene(480, 220) as never).hero).toBeNull();
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

  test.each([
    { viewport: { width: 1366, height: 768 }, profile: 'desktop' },
    { viewport: { width: 768, height: 1024 }, profile: 'tablet' },
    { viewport: { width: 390, height: 844 }, profile: 'phone-portrait' },
    { viewport: { width: 844, height: 390 }, profile: 'phone-landscape' },
    { viewport: { width: 360, height: 600 }, profile: 'ultra-compact' },
  ] as const)('menu selects the $profile layout as one coherent policy', ({ viewport, profile }) => {
    const plan = createMenuLayoutPlan(createScene(viewport.width, viewport.height) as never);

    expect(plan.profile).toBe(profile);
    expect(plan.kickerVisible).toBe(profile === 'desktop' || profile === 'tablet' || profile === 'phone-portrait');
    expect(plan.sideBySide).toBe(profile === 'phone-landscape');
    assertMenuBandsDoNotOverlap(viewport);
  });

  test('pause overlay centers checkpoint slots when the frame narrows', () => {
    const layout = getPauseOverlayLayout(createScene(720, 720) as never);
    const row = layout.slotRows[0];

    expect(row?.width).toBeGreaterThan(400);
    expect((row?.x ?? 0) + (row?.width ?? 0) / 2).toBe(layout.centerX);
  });

  test('pause overlay puts the title beside the tabs on phone landscape viewports', () => {
    const layout = getPauseOverlayLayout(createScene(812, 375) as never);

    expect(layout.titleCentered).toBe(false);
    expect(layout.titleY).toBe(layout.tabY + layout.tabHeight / 2);
    expect(layout.keyHintVisible).toBe(false);
    assertPauseRequiredControlsDoNotOverlap({ width: 812, height: 375 });
  });

  test.each([
    { width: 1280, height: 720 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ])('pause overlay fits the settings subview inside its panel', (viewport) => {
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);
    const sliderBottom = Math.max(...layout.settingsLayout.sliderPositions.map((position) => position.y)) + 52;

    expect(layout.settingsLayout.difficultyY).toBeGreaterThanOrEqual(layout.tabY + layout.tabHeight);
    expect(sliderBottom).toBeLessThanOrEqual(layout.statusY - 10);
  });

  test.each([
    { width: 984, height: 768 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
  ])('pause overlay keeps a centered checkpoint stack clear of the footer', (viewport) => {
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);
    const row = layout.slotRows[0];

    expect(row?.width).toBe(624);
    expect((row?.x ?? 0) + (row?.width ?? 0) / 2).toBe(layout.centerX);
    expect(layout.resumeButtonX + PAUSE_OVERLAY_BUTTON_WIDTH + 16).toBe(layout.menuButtonX);
    expect(layout.menuButtonY).toBe(layout.resumeButtonY);
    expect(row?.y ?? 0).toBeGreaterThanOrEqual(layout.tabY + layout.tabHeight + 8);
    assertPauseRequiredControlsDoNotOverlap(viewport);
  });

  test.each([
    { width: 1366, height: 768 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 480, height: 320 },
    { width: 320, height: 360 },
    { width: 280, height: 360 },
  ])(
    'pause overlay keeps tabs, checkpoint cards, status and footer apart across desktop and ultra-compact heights',
    (viewport) => {
      assertPauseRequiredControlsDoNotOverlap(viewport);
    }
  );

  test.each([
    { width: 812, height: 375 },
    { width: 360, height: 640 },
    { width: 480, height: 320 },
    { width: 480, height: 500 },
    { width: 640, height: 360 },
  ])(
    'menu layout keeps title, hero, run selection and footer in separate bands on compact/mobile viewports',
    (viewport) => {
      assertMenuBandsDoNotOverlap(viewport);
    }
  );

  test.each([
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
  ])('menu layout keeps the settings sheet inside common desktop viewports', (viewport) => {
    assertMenuBandsDoNotOverlap(viewport);
  });

  test.each([
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ])('pause settings controls fit portrait and landscape phone viewports', (viewport) => {
    const layout = getPauseOverlayLayout(createScene(viewport.width, viewport.height) as never);
    const settings = layout.settingsLayout;
    const sliderWidth = settings.sliderWidth ?? settings.width;
    expect(settings.x).toBeGreaterThanOrEqual(0);
    expect(settings.x + settings.width).toBeLessThanOrEqual(viewport.width);
    for (const position of settings.sliderPositions) {
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x + sliderWidth).toBeLessThanOrEqual(viewport.width);
      expect(position.y).toBeGreaterThanOrEqual(layout.panelY);
      expect(position.y + 52).toBeLessThanOrEqual(layout.statusY - 10);
    }
  });

  test.each([
    { width: 1280, height: 800 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
    { width: 320, height: 640 },
    { width: 280, height: 360 },
    { width: 480, height: 320 },
  ])('planet intermission keeps touch-sized upgrade buttons inside responsive viewports', (viewport) => {
    assertIntermissionUpgradeButtonsFit(viewport, 4);
  });

  test.each([
    { width: 1280, height: 800 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
    { width: 320, height: 640 },
    { width: 280, height: 360 },
    { width: 480, height: 320 },
  ])('planet intermission keeps five upgrade buttons inside responsive viewports', (viewport) => {
    assertIntermissionUpgradeButtonsFit(viewport, 5);
  });

  test('planet intermission compresses the five-card grid on short landscape viewports', () => {
    const landscape = getIntermissionLayout(createScene(844, 390) as never, 5);
    const portrait = getIntermissionLayout(createScene(360, 640) as never, 5);
    const desktop = getIntermissionLayout(createScene(1280, 800) as never, 5);

    expect(landscape.mode).toBe('landscape');
    expect(landscape.gridLayout.buttonHeight).toBe(48);
    expect(landscape.showJourneyNote).toBe(false);

    expect(portrait.mode).toBe('portrait');
    expect(portrait.gridLayout.buttonHeight).toBe(48);
    expect(portrait.showJourneyNote).toBe(false);

    expect(desktop.mode).toBe('desktop');
    expect(desktop.gridLayout.buttonHeight).toBe(72);
    expect(desktop.showJourneyNote).toBe(true);
  });

  test('planet intermission reflows instead of shrinking the desktop composition', () => {
    const desktop = getIntermissionLayout(createScene(1280, 800) as never, 4);
    const landscape = getIntermissionLayout(createScene(844, 390) as never, 4);
    const portrait = getIntermissionLayout(createScene(390, 844) as never, 4);

    expect(desktop.mode).toBe('desktop');
    expect(desktop.contentX).toBeGreaterThan(desktop.planetX);
    expect(desktop.gridLayout.columns).toBe(2);

    expect(landscape.mode).toBe('landscape');
    expect(landscape.contentX).toBeGreaterThan(landscape.planetX);
    expect(landscape.gridLayout.columns).toBe(2);

    expect(portrait.mode).toBe('portrait');
    expect(portrait.planetX).toBe(195);
    expect(portrait.gridLayout.columns).toBe(1);
    expect(portrait.gridTop).toBeGreaterThan(portrait.planetY);
  });
});
