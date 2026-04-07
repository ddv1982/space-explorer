import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { mixColor } from '../../utils/colorUtils';
import { drawSoftCircle } from './textureUtils';

export function generatePlanetTexture(
  scene: Phaser.Scene,
  textureKey: string,
  width: number,
  height: number,
  config: LevelConfig
): void {
  const graphics = scene.add.graphics();
  const palette = config.planetPalette;

  const planetX = width * Phaser.Math.FloatBetween(0.6, 0.85);
  const planetY = height * Phaser.Math.FloatBetween(0.08, 0.25);
  const planetRadius = Phaser.Math.Between(80, 160);

  const outerAtmosphereColor = mixColor(config.accentColor, 0xffffff, 0.15);
  drawSoftCircle(graphics, planetX, planetY, planetRadius + 40, outerAtmosphereColor, 0.025, 14);

  drawSoftCircle(graphics, planetX + 4, planetY + 4, planetRadius + 2, 0x000000, 0.15, 8);
  drawSoftCircle(graphics, planetX, planetY, planetRadius, palette[0], 0.3, 6);

  const bandCount = Phaser.Math.Between(3, 6);
  for (let b = 0; b < bandCount; b++) {
    const bandY = planetY - planetRadius + (b + 0.5) * (planetRadius * 2 / bandCount);
    const bandColor = mixColor(palette[0], palette[1], Phaser.Math.FloatBetween(0.2, 0.8));
    const bandAlpha = Phaser.Math.FloatBetween(0.04, 0.1);

    for (let bx = planetX - planetRadius; bx < planetX + planetRadius; bx += 8) {
      const distFromCenter = Math.abs(bx - planetX);
      const maxY = Math.sqrt(Math.max(0, planetRadius * planetRadius - distFromCenter * distFromCenter));
      if (Math.abs(bandY - planetY) < maxY) {
        const jitter = Phaser.Math.Between(-4, 4);
        drawSoftCircle(graphics, bx, bandY + jitter, Phaser.Math.Between(6, 14), bandColor, bandAlpha, 4);
      }
    }
  }

  drawSoftCircle(
    graphics,
    planetX - planetRadius * 0.2,
    planetY - planetRadius * 0.15,
    Math.floor(planetRadius * 0.7),
    palette[1],
    0.2,
    8
  );

  const specColor = mixColor(palette[1], 0xffffff, 0.4);
  drawSoftCircle(
    graphics,
    planetX - planetRadius * 0.3,
    planetY - planetRadius * 0.25,
    Math.floor(planetRadius * 0.25),
    specColor,
    0.12,
    10
  );

  const atmosphereColor = mixColor(config.accentColor, 0xffffff, 0.3);
  drawSoftCircle(graphics, planetX, planetY, planetRadius + 15, atmosphereColor, 0.06, 10);

  const limbColor = mixColor(palette[0], 0x000000, 0.4);
  drawSoftCircle(
    graphics,
    planetX + planetRadius * 0.35,
    planetY + planetRadius * 0.1,
    Math.floor(planetRadius * 0.65),
    limbColor,
    0.08,
    8
  );

  if (Phaser.Math.Between(0, 1) === 1) {
    const ringColor = mixColor(palette[0], palette[1], 0.5);
    const ringAccentColor = mixColor(ringColor, config.accentColor, 0.3);

    graphics.lineStyle(3, ringColor, 0.15);
    graphics.beginPath();
    graphics.arc(planetX, planetY, planetRadius * 1.5, -0.4, 0.4);
    graphics.strokePath();

    graphics.lineStyle(2, ringColor, 0.1);
    graphics.beginPath();
    graphics.arc(planetX, planetY, planetRadius * 1.6, -0.35, 0.35);
    graphics.strokePath();

    graphics.lineStyle(1.5, ringAccentColor, 0.18);
    graphics.beginPath();
    graphics.arc(planetX, planetY, planetRadius * 1.35, -0.45, 0.45);
    graphics.strokePath();

    const gapColor = mixColor(ringColor, 0x000000, 0.7);
    graphics.lineStyle(1, gapColor, 0.08);
    graphics.beginPath();
    graphics.arc(planetX, planetY, planetRadius * 1.42, -0.42, 0.42);
    graphics.strokePath();
  }

  const cloudWispCount = Phaser.Math.Between(2, 5);
  for (let w = 0; w < cloudWispCount; w++) {
    const wx = planetX + Phaser.Math.Between(-Math.floor(planetRadius * 0.6), Math.floor(planetRadius * 0.6));
    const wy = planetY + Phaser.Math.Between(-Math.floor(planetRadius * 0.5), Math.floor(planetRadius * 0.5));
    const dist = Math.sqrt((wx - planetX) ** 2 + (wy - planetY) ** 2);
    if (dist < planetRadius * 0.8) {
      const wispColor = mixColor(palette[1], 0xffffff, 0.5);
      drawSoftCircle(graphics, wx, wy, Phaser.Math.Between(8, 20), wispColor, 0.05, 6);
    }
  }

  graphics.generateTexture(textureKey, width, height);
  graphics.destroy();
}
