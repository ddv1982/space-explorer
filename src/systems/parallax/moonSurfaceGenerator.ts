import Phaser from 'phaser';
import type { MoonSurfaceConfig } from '../../config/levels/types';
import { mixColor } from '../../utils/colorUtils';

export function generateMoonSurfaceTexture(
  scene: Phaser.Scene,
  textureKey: string,
  width: number,
  height: number,
  config: MoonSurfaceConfig
): void {
  const g = scene.add.graphics();
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

  // Base structures (buildings)
  const buildingWidth = Phaser.Math.Between(25, 60);
  const buildingSpacing = Math.floor(width / (config.buildingCount + 1));
  for (let i = 0; i < config.buildingCount; i++) {
    const bx = buildingSpacing * (i + 1) + Phaser.Math.Between(-buildingSpacing / 3, buildingSpacing / 3);
    const bw = Phaser.Math.Between(18, buildingWidth);
    const bh = Phaser.Math.Between(12, 35);
    const by = Phaser.Math.Between(Math.floor(height * 0.3), height - bh - 5);
    const buildingColor = mixColor(surfaceColor, 0x000000, 0.45);

    // Building body
    g.fillStyle(buildingColor, 0.8);
    g.fillRect(bx - bw / 2, by - bh, bw, bh);

    // Building edge highlight
    g.lineStyle(1, mixColor(accent, 0xffffff, 0.3), 0.25);
    g.strokeRect(bx - bw / 2, by - bh, bw, bh);

    // Roof accent
    g.fillStyle(mixColor(surfaceColor, accent, 0.3), 0.5);
    g.fillRect(bx - bw / 2 - 2, by - bh, bw + 4, 2);

    // Lit windows
    const windowCols = Math.max(1, Math.floor(bw / 8));
    const windowRows = Math.max(1, Math.floor(bh / 8));
    for (let wr = 0; wr < windowRows; wr++) {
      for (let wc = 0; wc < windowCols; wc++) {
        if (Phaser.Math.Between(0, 100) < 40) {
          const wx = bx - bw / 2 + 4 + wc * (bw / windowCols);
          const wy = by - bh + 4 + wr * (bh / windowRows);
          const windowColor = Phaser.Math.Between(0, 100) < 60
            ? mixColor(accent, 0xffffff, 0.4)
            : mixColor(accent, 0xffaa00, 0.5);
          g.fillStyle(windowColor, Phaser.Math.FloatBetween(0.3, 0.7));
          g.fillRect(wx, wy, 3, 3);
        }
      }
    }

    // Antenna on taller buildings
    if (bh > 20) {
      const antennaX = bx + Phaser.Math.Between(-bw / 4, bw / 4);
      const antennaH = Phaser.Math.Between(8, 18);
      g.lineStyle(1, mixColor(surfaceColor, 0xffffff, 0.15), 0.4);
      g.lineBetween(antennaX, by - bh, antennaX, by - bh - antennaH);

      // Antenna light
      const lightColor = Phaser.Math.Between(0, 1) === 1 ? 0xff2222 : mixColor(accent, 0xffffff, 0.5);
      g.fillStyle(lightColor, 0.7);
      g.fillCircle(antennaX, by - bh - antennaH, 2);
      g.fillStyle(lightColor, 0.2);
      g.fillCircle(antennaX, by - bh - antennaH, 5);
    }
  }

  // Surface light strips (runways / landing pads)
  const stripCount = Phaser.Math.Between(1, 3);
  for (let s = 0; s < stripCount; s++) {
    const sx = Phaser.Math.Between(Math.floor(width * 0.1), Math.floor(width * 0.9));
    const sy = Phaser.Math.Between(Math.floor(height * 0.5), height - 10);
    const sw = Phaser.Math.Between(30, 80);
    const stripLight = mixColor(accent, 0xffffff, 0.3);

    g.fillStyle(stripLight, 0.15);
    g.fillRect(sx, sy, sw, 2);
    g.fillStyle(stripLight, 0.08);
    g.fillRect(sx - 3, sy - 3, sw + 6, 8);
  }

  // Atmospheric scatter (faint dots above horizon)
  for (let i = 0; i < 20; i++) {
    const sx = Phaser.Math.Between(0, width);
    const sy = Phaser.Math.Between(0, Math.floor(horizonY + 30));
    g.fillStyle(mixColor(accent, 0xffffff, 0.3), Phaser.Math.FloatBetween(0.03, 0.1));
    g.fillCircle(sx, sy, Phaser.Math.FloatBetween(0.5, 1.5));
  }

  g.generateTexture(textureKey, width, height);
  g.destroy();
}
