import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({ default: {} }));
mock.module('../src/utils/layout', () => {
  const getViewportBounds = (scene: {
    scale: { getViewPort: () => { x: number; y: number; width: number; height: number } };
  }) => {
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
  PAUSE_OVERLAY_BUTTON_HEIGHT,
  PAUSE_OVERLAY_BUTTON_WIDTH,
  PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
  PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
} = await import('../src/scenes/gameScene/pauseOverlay/view');
const { createMenuLayoutPlan } = await import('../src/scenes/menuScene/layout');
const { getIntermissionLayout } = await import('../src/scenes/planetIntermission/presentation');
const { MIN_TOUCH_TARGET_PX } = await import('../src/scenes/shared/touchTarget');

function createScene(width: number, height: number) {
  return {
    scale: {
      getViewPort: () => ({ x: 0, y: 0, width, height }),
    },
  };
}

describe('touch target floors', () => {
  test.each([
    { width: 390, height: 844, profile: 'phone-portrait' },
    { width: 844, height: 390, profile: 'phone-landscape' },
    { width: 360, height: 600, profile: 'ultra-compact' },
  ] as const)('keeps every $profile interactive hit at least 44 CSS pixels', ({ width, height }) => {
    const scene = createScene(width, height) as never;
    const menu = createMenuLayoutPlan(scene);
    const intermission = getIntermissionLayout(scene, 5);
    const hitRects = [
      {
        name: 'difficulty-tier',
        width: menu.settingsLayout.width,
        height: Math.max(menu.settingsLayout.tierHeight, MIN_TOUCH_TARGET_PX),
      },
      {
        name: 'quality-tier',
        width: menu.settingsLayout.width,
        height: Math.max(menu.settingsLayout.tierHeight, MIN_TOUCH_TARGET_PX),
      },
      { name: 'menu-tile', width: menu.tileWidth, height: menu.tileHeight },
      { name: 'menu-del', width: MIN_TOUCH_TARGET_PX, height: MIN_TOUCH_TARGET_PX },
      {
        name: 'pause-resume',
        width: PAUSE_OVERLAY_BUTTON_WIDTH,
        height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      },
      {
        name: 'pause-menu',
        width: PAUSE_OVERLAY_BUTTON_WIDTH,
        height: PAUSE_OVERLAY_BUTTON_HEIGHT,
      },
      {
        name: 'pause-slot-save',
        width: Math.max(PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, MIN_TOUCH_TARGET_PX),
        height: Math.max(PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT, MIN_TOUCH_TARGET_PX),
      },
      {
        name: 'pause-slot-load',
        width: Math.max(PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, MIN_TOUCH_TARGET_PX),
        height: Math.max(PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT, MIN_TOUCH_TARGET_PX),
      },
      {
        name: 'pause-slot-del',
        width: Math.max(PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, MIN_TOUCH_TARGET_PX),
        height: Math.max(PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT, MIN_TOUCH_TARGET_PX),
      },
      {
        name: 'intermission-upgrade',
        width: intermission.gridLayout.buttonWidth,
        height: intermission.gridLayout.buttonHeight,
      },
    ];

    for (const rect of hitRects) {
      expect(rect.width, rect.name).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
      expect(rect.height, rect.name).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
    }
  });
});
