import Phaser from 'phaser';
import { centerHorizontally, getViewportLayout } from '@/utils/layout';
import { drawAngledRectPath, drawNeonFrame, NEON, NEON_TEXT, neonLabelStyle } from '@/scenes/shared/neonUiTheme';
import { getAutoFireSettings } from '@/config/autoFireSettings';
import { isHardwareKeyboardDetected, onHardwareKeyboardDetected } from '@/systems/hardwareKeyboardDetection';

const MOBILE_TITLE = 'Drag anywhere to fly';
const AUTO_FIRE_HINT = 'Guns fire automatically';
const MOBILE_FIRE_HINT = 'Guns fire while you touch';
const KEYBOARD_TITLE = 'WASD / Arrows to Move';
const KEYBOARD_FIRE_HINT = 'SPACE / Click to Fire';
const KEYBOARD_SWAP_HINT = 'Q for a Special Gun';

/** The fire line follows the autofire setting for the input in use. */
function fireHintFor(mobile: boolean): string {
  const autoFire = getAutoFireSettings();
  if (mobile) return autoFire.touch ? AUTO_FIRE_HINT : MOBILE_FIRE_HINT;
  return autoFire.keyboard ? AUTO_FIRE_HINT : KEYBOARD_FIRE_HINT;
}

type ShowControlsHintOptions = {
  mobile?: boolean;
  /** Sector 3 on: the keyboard card adds the special-gun key (touch has its own button). */
  gunSwap?: boolean;
};

type SceneWithControlsHint = Phaser.Scene & { __controlsHintCleanup?: () => void };

const CARD_WIDTH = 332;
const CARD_HEIGHT = 78;
const SWAP_LINE_HEIGHT = 22;
/** The card sits below centre so it clears the sector title card that opens every level. */
const CARD_DROP = 64;
const ICON_COLUMN = 84;
const HINT_DEPTH = 200;

/** Inverted-T cluster of key caps, the arrow / WASD block. */
function drawKeyCluster(graphics: Phaser.GameObjects.Graphics, centerX: number, centerY: number): void {
  const key = 15;
  const gap = 3;
  const caps: Array<[number, number]> = [
    [0, -(key + gap) / 2],
    [-(key + gap), (key + gap) / 2],
    [0, (key + gap) / 2],
    [key + gap, (key + gap) / 2],
  ];
  for (const [offsetX, offsetY] of caps) {
    const x = centerX + offsetX - key / 2;
    const y = centerY + offsetY - key / 2;
    drawAngledRectPath(graphics, x, y, key, key, 4);
    graphics.fillStyle(NEON.glass, 0.9);
    graphics.fillPath();
    drawAngledRectPath(graphics, x, y, key, key, 4);
    graphics.lineStyle(1, NEON.cyan, 0.85);
    graphics.strokePath();
  }
  graphics.fillStyle(NEON.cyanBright, 0.95);
  graphics.fillTriangle(centerX, centerY - 13, centerX - 3.5, centerY - 7, centerX + 3.5, centerY - 7);
}

/** Fingertip with a swipe trail. */
function drawDragGlyph(graphics: Phaser.GameObjects.Graphics, centerX: number, centerY: number): void {
  graphics.lineStyle(2, NEON.cyan, 0.35);
  graphics.lineBetween(centerX - 22, centerY + 10, centerX - 10, centerY + 4);
  graphics.lineStyle(2, NEON.cyan, 0.65);
  graphics.lineBetween(centerX - 10, centerY + 4, centerX + 2, centerY - 2);
  graphics.fillStyle(NEON.cyan, 0.22);
  graphics.fillCircle(centerX + 8, centerY - 5, 13);
  graphics.lineStyle(1.5, NEON.cyanBright, 0.95);
  graphics.strokeCircle(centerX + 8, centerY - 5, 9);
  graphics.fillStyle(NEON.cyanBright, 1);
  graphics.fillCircle(centerX + 8, centerY - 5, 3);
}

/** Opening control card: a glass panel with an input glyph, shown for the first seconds of a run. */
export function showControlsHint(scene: Phaser.Scene, options: ShowControlsHintOptions = {}): void {
  const tracked = scene as SceneWithControlsHint;
  tracked.__controlsHintCleanup?.();

  let mobile = options.mobile === true && !isHardwareKeyboardDetected();

  const bg = scene.add.graphics();
  bg.setDepth(HINT_DEPTH).setScrollFactor(0);

  const title = scene.add
    .text(0, 0, mobile ? MOBILE_TITLE : KEYBOARD_TITLE, neonLabelStyle(18, NEON_TEXT.primary, 1))
    .setOrigin(0, 0.5)
    .setDepth(HINT_DEPTH + 1)
    .setScrollFactor(0);

  const fireHint = scene.add
    .text(0, 0, fireHintFor(mobile), neonLabelStyle(15, NEON_TEXT.cyan, 1))
    .setOrigin(0, 0.5)
    .setDepth(HINT_DEPTH + 1)
    .setScrollFactor(0);

  const swapHint = scene.add
    .text(0, 0, KEYBOARD_SWAP_HINT, neonLabelStyle(15, NEON_TEXT.cyan, 1))
    .setOrigin(0, 0.5)
    .setDepth(HINT_DEPTH + 1)
    .setScrollFactor(0);

  const relayout = (): void => {
    const showSwap = options.gunSwap === true && !mobile;
    const cardHeight = CARD_HEIGHT + (showSwap ? SWAP_LINE_HEIGHT : 0);
    const layout = getViewportLayout(scene);
    const cardX = centerHorizontally(layout, CARD_WIDTH);
    const cardCenterY = layout.centerY + CARD_DROP;
    const cardY = cardCenterY - cardHeight / 2;
    const textTop = cardCenterY - (showSwap ? SWAP_LINE_HEIGHT / 2 : 0);

    bg.clear();
    drawNeonFrame(bg, cardX, cardY, CARD_WIDTH, cardHeight, { fillAlpha: 0.78, cornerCut: 14 });
    (mobile ? drawDragGlyph : drawKeyCluster)(bg, cardX + ICON_COLUMN / 2 + 4, cardCenterY);
    title.setPosition(cardX + ICON_COLUMN, textTop - 12);
    fireHint.setPosition(cardX + ICON_COLUMN, textTop + 12);
    swapHint.setPosition(cardX + ICON_COLUMN, textTop + 12 + SWAP_LINE_HEIGHT).setVisible(showSwap);
  };

  const stopKeyboardWatch = onHardwareKeyboardDetected(() => {
    if (!mobile) {
      return;
    }

    mobile = false;
    title.setText(KEYBOARD_TITLE);
    fireHint.setText(fireHintFor(false));
    relayout();
  });

  const cleanup = (): void => {
    stopKeyboardWatch();
    scene.scale.off(Phaser.Scale.Events.RESIZE, relayout);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    if (tracked.__controlsHintCleanup === cleanup) {
      tracked.__controlsHintCleanup = undefined;
    }
  };
  tracked.__controlsHintCleanup = cleanup;

  scene.scale.on(Phaser.Scale.Events.RESIZE, relayout);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  relayout();

  scene.tweens.add({
    targets: [bg, title, fireHint, swapHint],
    alpha: { from: 1, to: 0 },
    duration: 1000,
    delay: 4000,
    ease: 'Power2',
    onComplete: () => {
      cleanup();
      bg.destroy();
      title.destroy();
      fireHint.destroy();
      swapHint.destroy();
    },
  });
}
