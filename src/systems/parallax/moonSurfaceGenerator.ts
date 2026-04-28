import Phaser from 'phaser';
import type { MoonSurfaceConfig } from '../../config/levels/types';
import { mixColor } from '../../utils/colorUtils';
import { withGeneratedTexture } from '../../utils/generatedTexture';

export function generateMoonSurfaceTexture(
  scene: Phaser.Scene,
  textureKey: string,
  width: number,
  height: number,
  config: MoonSurfaceConfig
): void {
  withGeneratedTexture(scene, textureKey, width, height, (g) => {
    const surfaceColor = config.surfaceColor;
    const accent = config.accentColor;
    const horizonY = height * 0.12;

  // Horizon glow band
    for (let y = 0; y < horizonY; y++) {
    const t = 1 - y / horizonY;
    const alpha = t * t * config.horizonGlow * 0.45;
    g.fillStyle(surfaceColor, alpha);
    g.fillRect(0, y, width, 1);
  }

  // Base surface fill
    g.fillStyle(surfaceColor, 0.7);
    g.fillRect(0, horizonY, width, height - horizonY);

  // Terrain gradient
    for (let y = Math.ceil(horizonY); y < height; y++) {
    const t = (y - horizonY) / (height - horizonY);
    const darkColor = mixColor(surfaceColor, 0x000000, t * 0.35);
    g.fillStyle(darkColor, 0.6 + t * 0.3);
    g.fillRect(0, y, width, 1);
  }

  // Surface terrain bumps
    const bumpCount = Math.floor(width / 40);
    for (let i = 0; i < bumpCount; i++) {
    const bx = Phaser.Math.Between(0, width);
    const by = Phaser.Math.Between(Math.floor(horizonY), height);
    const bw = Phaser.Math.Between(20, 60);
    const bh = Phaser.Math.Between(3, 12);
    const bumpColor = mixColor(surfaceColor, 0x000000, Phaser.Math.FloatBetween(0.1, 0.35));
    g.fillStyle(bumpColor, 0.4);
    g.fillEllipse(bx, by, bw, bh);
  }

  // Craters
    for (let i = 0; i < config.craterCount; i++) {
    const cx = Phaser.Math.Between(Math.floor(width * 0.05), Math.floor(width * 0.95));
    const cy = Phaser.Math.Between(Math.floor(horizonY + 15), height - 5);
    const cr = Phaser.Math.Between(6, 20);

    // Crater shadow
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(cx, cy, cr);

    // Crater rim
    g.lineStyle(1.5, mixColor(surfaceColor, 0xffffff, 0.15), 0.3);
    g.strokeCircle(cx, cy, cr + 1);

    // Crater highlight (lit side)
    g.fillStyle(mixColor(surfaceColor, 0xffffff, 0.1), 0.15);
    g.fillCircle(cx - cr * 0.3, cy - cr * 0.3, cr * 0.6);
  }


  // Atmospheric scatter (faint dots above horizon)
    for (let i = 0; i < 20; i++) {
    const sx = Phaser.Math.Between(0, width);
    const sy = Phaser.Math.Between(0, Math.floor(horizonY + 30));
    g.fillStyle(mixColor(accent, 0xffffff, 0.3), Phaser.Math.FloatBetween(0.03, 0.1));
    g.fillCircle(sx, sy, Phaser.Math.FloatBetween(0.5, 1.5));
  }

  });
}
