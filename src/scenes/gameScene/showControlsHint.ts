import Phaser from 'phaser';
import { centerHorizontally, getViewportLayout } from '@/utils/layout';
import { UI_FONT_MONO } from '@/utils/uiFonts';
import {
  isHardwareKeyboardDetected,
  onHardwareKeyboardDetected,
} from '@/systems/hardwareKeyboardDetection';

const MOBILE_TITLE = 'Use the joystick to move';
const MOBILE_FIRE_HINT = 'Tap the right side to shoot';
const KEYBOARD_TITLE = 'WASD / Arrows to Move';
const KEYBOARD_FIRE_HINT = 'SPACE / Click to Fire';

type ShowControlsHintOptions = {
  mobile?: boolean;
};

export function showControlsHint(scene: Phaser.Scene, options: ShowControlsHintOptions = {}): void {
  let mobile = options.mobile === true && !isHardwareKeyboardDetected();
  const hintWidth = 320;
  const hintHeight = 80;

  const bg = scene.add.graphics();
  bg.setDepth(200).setScrollFactor(0);

  const title = scene.add.text(0, 0, mobile ? MOBILE_TITLE : KEYBOARD_TITLE, {
    fontSize: '16px',
    color: '#88ccff',
    fontFamily: UI_FONT_MONO,
  }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

  const fireHint = scene.add.text(0, 0, mobile ? MOBILE_FIRE_HINT : KEYBOARD_FIRE_HINT, {
    fontSize: '16px',
    color: '#88ccff',
    fontFamily: UI_FONT_MONO,
  }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

  const stopKeyboardWatch = onHardwareKeyboardDetected(() => {
    if (!mobile) {
      return;
    }

    mobile = false;
    title.setText(KEYBOARD_TITLE);
    fireHint.setText(KEYBOARD_FIRE_HINT);
  });

  const relayout = (): void => {
    const layout = getViewportLayout(scene);
    const bgX = centerHorizontally(layout, hintWidth);
    const bgY = layout.centerY - hintHeight / 2;

    bg.clear();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(bgX, bgY, hintWidth, hintHeight, 8);
    title.setPosition(layout.centerX, layout.centerY - 20);
    fireHint.setPosition(layout.centerX, layout.centerY + 10);
  };

  const cleanup = (): void => {
    stopKeyboardWatch();
    scene.scale.off(Phaser.Scale.Events.RESIZE, relayout);
  };

  scene.scale.on(Phaser.Scale.Events.RESIZE, relayout);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  relayout();

  scene.tweens.add({
    targets: [bg, title, fireHint],
    alpha: { from: 1, to: 0 },
    duration: 1000,
    delay: 4000,
    ease: 'Power2',
    onComplete: () => {
      cleanup();
      bg.destroy();
      title.destroy();
      fireHint.destroy();
    },
  });
}
