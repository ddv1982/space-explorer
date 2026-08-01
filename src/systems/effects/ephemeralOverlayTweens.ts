import Phaser from 'phaser';

function destroyTweenTargets(_tween: Phaser.Tweens.Tween, targets: unknown[]): void {
  for (const target of targets) {
    if (target instanceof Phaser.GameObjects.GameObject) {
      target.destroy();
    }
  }
}

export function createSpawnWarning(scene: Phaser.Scene, x: number): void {
  // Small downward-pointing triangle at top edge
  const arrow = scene.add.graphics();
  arrow.setDepth(150);
  arrow.setScrollFactor(0);

  const ay = 30;
  // Neon hazard chevron: wide glow pass, bright core, hot tip.
  arrow.lineStyle(4, 0xff756f, 0.2);
  arrow.strokeTriangle(x - 7, ay - 7, x + 7, ay - 7, x, ay + 7);
  arrow.fillStyle(0x3d0a0a, 0.9);
  arrow.fillTriangle(x - 6, ay - 6, x + 6, ay - 6, x, ay + 6);
  arrow.lineStyle(1.5, 0xff756f, 0.95);
  arrow.strokeTriangle(x - 6, ay - 6, x + 6, ay - 6, x, ay + 6);
  arrow.fillStyle(0xffd7d4, 0.9);
  arrow.fillTriangle(x - 2.5, ay - 3, x + 2.5, ay - 3, x, ay + 3);

  // Flash and fade
  scene.tweens.add({
    targets: arrow,
    alpha: { from: 1, to: 0 },
    duration: 600,
    ease: 'Power2',
    onComplete: destroyTweenTargets,
  });
}

export function createScorePopup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  score: number,
  style: Phaser.Types.GameObjects.Text.TextStyle
): void {
  const text = scene.add
    .text(x, y, `+${score}`, style)
    .setOrigin(0.5)
    .setDepth(50);

  scene.tweens.add({
    targets: text,
    y: y - 40,
    alpha: { from: 1, to: 0 },
    duration: 800,
    ease: 'Power2',
    onComplete: destroyTweenTargets,
  });
}
