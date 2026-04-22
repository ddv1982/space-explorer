import Phaser from 'phaser';
import { mixColor } from '../../utils/colorUtils';
import { withGeneratedTexture } from '../../utils/generatedTexture';

export interface StarLayerTextureConfig {
  starCount: number;
  starSize: { min: number; max: number };
  starAlpha: { min: number; max: number };
  baseColor: number;
  accentMix: number;
  sparkleFraction: number;
  colorStarCount: number;
}

const STAR_ACCENT_COLORS = [0xffddaa, 0xaaddff, 0xffaa88, 0xaaffcc, 0xddaaff];

export function ensureStarfieldTexture(
  scene: Phaser.Scene,
  textureKey: string,
  config: StarLayerTextureConfig,
  tileWidth: number,
  tileHeight: number,
  accentColor?: number
): void {
  withGeneratedTexture(scene, textureKey, tileWidth, tileHeight, (graphics) => {
    const starColor = accentColor !== undefined
      ? mixColor(config.baseColor, accentColor, config.accentMix)
      : config.baseColor;

    for (let i = 0; i < config.starCount; i++) {
      const x = Phaser.Math.Between(0, tileWidth);
      const y = Phaser.Math.Between(0, tileHeight);
      const size = Phaser.Math.FloatBetween(config.starSize.min, config.starSize.max);
      const alpha = Phaser.Math.FloatBetween(config.starAlpha.min, config.starAlpha.max);

      graphics.fillStyle(starColor, alpha);
      graphics.fillCircle(x, y, size);
    }

    if (config.sparkleFraction > 0) {
      const sparkleCount = Math.floor(config.starCount * config.sparkleFraction);
      for (let i = 0; i < sparkleCount; i++) {
        const x = Phaser.Math.Between(10, tileWidth - 10);
        const y = Phaser.Math.Between(10, tileHeight - 10);
        const crossSize = Phaser.Math.FloatBetween(3, 6);
        const alpha = Phaser.Math.FloatBetween(0.3, 0.6);

        graphics.fillStyle(0xffffff, alpha);
        graphics.fillRect(x - crossSize, y, crossSize * 2, 0.7);
        graphics.fillRect(x, y - crossSize, 0.7, crossSize * 2);

        graphics.fillStyle(0xffffff, alpha * 1.5);
        graphics.fillCircle(x, y, 0.8);
      }
    }

    for (let i = 0; i < config.colorStarCount; i++) {
      const x = Phaser.Math.Between(0, tileWidth);
      const y = Phaser.Math.Between(0, tileHeight);
      const accentIndex = Phaser.Math.Between(0, STAR_ACCENT_COLORS.length - 1);
      const colorStar = accentColor !== undefined
        ? mixColor(STAR_ACCENT_COLORS[accentIndex], accentColor, 0.3)
        : STAR_ACCENT_COLORS[accentIndex];
      const size = Phaser.Math.FloatBetween(config.starSize.min * 1.2, config.starSize.max * 1.5);
      const alpha = Phaser.Math.FloatBetween(0.4, 0.8);

      graphics.fillStyle(colorStar, alpha);
      graphics.fillCircle(x, y, size);
      graphics.fillStyle(colorStar, alpha * 0.3);
      graphics.fillCircle(x, y, size * 2);
    }
  });
}
