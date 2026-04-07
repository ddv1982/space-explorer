import Phaser from 'phaser';
import type { PassingPlanetConfig } from '../../config/levels/types';
import { mixColor } from '../../utils/colorUtils';
import { drawSoftCircle } from './textureUtils';

export function generatePassingPlanetTextures(
  scene: Phaser.Scene,
  configs: PassingPlanetConfig[]
): string[] {
  const textureKeys: string[] = [];

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    const textureKey = `passing-planet-${i}-${cfg.planetPalette[0].toString(16)}-${cfg.size}`;

    if (!scene.textures.exists(textureKey)) {
      generateSinglePassingPlanet(scene, textureKey, cfg);
    }

    textureKeys.push(textureKey);
  }

  return textureKeys;
}

function generateSinglePassingPlanet(
  scene: Phaser.Scene,
  textureKey: string,
  config: PassingPlanetConfig
): void {
  const padding = 40;
  const size = config.size;
  const textureSize = size + padding * 2;
  const g = scene.add.graphics();
  const cx = textureSize / 2;
  const cy = textureSize / 2;
  const r = size / 2;
  const palette = config.planetPalette;

  // Deep space black background (transparent)
  g.clear();

  // Outer atmospheric halo
  const haloColor = mixColor(palette[1], 0xffffff, 0.2);
  drawSoftCircle(g, cx, cy, r + 20, haloColor, 0.04, 6);
  drawSoftCircle(g, cx, cy, r + 12, haloColor, 0.06, 6);

  // Planet body shadow
  drawSoftCircle(g, cx + 3, cy + 3, r + 1, 0x000000, 0.12, 6);

  // Planet body
  drawSoftCircle(g, cx, cy, r, palette[0], 0.85, 4);

  // Surface bands (gas giant feel)
  const bandCount = Phaser.Math.Between(3, 7);
  for (let b = 0; b < bandCount; b++) {
    const bandY = cy - r + (b + 0.5) * (r * 2 / bandCount);
    const bandColor = mixColor(palette[0], palette[1], Phaser.Math.FloatBetween(0.15, 0.85));
    const bandAlpha = Phaser.Math.FloatBetween(0.06, 0.15);

    for (let bx = cx - r; bx < cx + r; bx += 6) {
      const distFromCenter = Math.abs(bx - cx);
      const maxY = Math.sqrt(Math.max(0, r * r - distFromCenter * distFromCenter));
      if (Math.abs(bandY - cy) < maxY) {
        const jitter = Phaser.Math.Between(-3, 3);
        drawSoftCircle(g, bx, bandY + jitter, Phaser.Math.Between(4, 10), bandColor, bandAlpha, 3);
      }
    }
  }

  // Lit side highlight
  drawSoftCircle(
    g,
    cx - r * 0.25,
    cy - r * 0.2,
    Math.floor(r * 0.6),
    palette[1],
    0.2,
    6
  );

  // Specular spot
  const specColor = mixColor(palette[1], 0xffffff, 0.5);
  drawSoftCircle(g, cx - r * 0.35, cy - r * 0.3, Math.floor(r * 0.2), specColor, 0.15, 5);

  // Atmosphere glow
  const atmosphereColor = mixColor(palette[1], 0xffffff, 0.25);
  drawSoftCircle(g, cx, cy, r + 8, atmosphereColor, 0.05, 6);

  // Limb darkening
  const limbColor = mixColor(palette[0], 0x000000, 0.5);
  drawSoftCircle(g, cx + r * 0.4, cy + r * 0.1, Math.floor(r * 0.55), limbColor, 0.1, 5);

  // Ring system
  if (Math.random() < config.ringChance) {
    const ringColor = mixColor(palette[0], palette[1], 0.5);
    const ringAccent = mixColor(ringColor, 0xffffff, 0.2);

    // Outer ring
    g.lineStyle(3, ringColor, 0.2);
    g.beginPath();
    g.arc(cx, cy, r * 1.4, -0.35, 0.35);
    g.strokePath();

    g.lineStyle(2, ringColor, 0.12);
    g.beginPath();
    g.arc(cx, cy, r * 1.5, -0.3, 0.3);
    g.strokePath();

    // Inner ring
    g.lineStyle(1.5, ringAccent, 0.22);
    g.beginPath();
    g.arc(cx, cy, r * 1.25, -0.4, 0.4);
    g.strokePath();

    // Ring gap
    g.lineStyle(1, 0x000000, 0.1);
    g.beginPath();
    g.arc(cx, cy, r * 1.33, -0.38, 0.38);
    g.strokePath();
  }

  g.generateTexture(textureKey, textureSize, textureSize);
  g.destroy();
}
