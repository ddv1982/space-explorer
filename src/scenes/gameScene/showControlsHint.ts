import Phaser from 'phaser';
import { centerHorizontally, getViewportLayout } from '../../utils/layout';

export function showControlsHint(scene: Phaser.Scene): void {
  const layout = getViewportLayout(scene);
  const hintWidth = 320;
  const hintHeight = 80;
  const bgX = centerHorizontally(layout, hintWidth);
  const bgY = layout.centerY - hintHeight / 2;

  const bg = scene.add.graphics();
  bg.fillStyle(0x000000, 0.6);
  bg.fillRoundedRect(bgX, bgY, hintWidth, hintHeight, 8);
  bg.setDepth(200).setScrollFactor(0);

  const title = scene.add.text(layout.centerX, layout.centerY - 20, 'WASD / Arrows to Move', {
    fontSize: '16px',
    color: '#88ccff',
    fontFamily: 'monospace',
  }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

  const fireHint = scene.add.text(layout.centerX, layout.centerY + 10, 'SPACE / Click to Fire', {
    fontSize: '16px',
    color: '#88ccff',
    fontFamily: 'monospace',
  }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

  scene.tweens.add({
    targets: [bg, title, fireHint],
    alpha: { from: 1, to: 0 },
    duration: 1000,
    delay: 4000,
    ease: 'Power2',
    onComplete: () => {
      bg.destroy();
      title.destroy();
      fireHint.destroy();
    },
  });
}
