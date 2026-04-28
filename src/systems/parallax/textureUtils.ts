import Phaser from 'phaser';

export function drawSoftCircle(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  peakAlpha: number,
  step: number
): void {
  for (let r = radius; r > 0; r -= step) {
    const falloff = 1 - r / radius;
    const alpha = peakAlpha * (0.08 + falloff * falloff * 0.92);
    graphics.fillStyle(color, alpha);
    graphics.fillCircle(x, y, r);
  }
}

