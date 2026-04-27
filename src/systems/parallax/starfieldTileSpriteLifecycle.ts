import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { mixColor } from '../../utils/colorUtils';
import { ensureStarfieldTexture } from './starfieldTextureGenerator';
import { layoutViewportTileSprite } from './tileSpriteBackgroundLayout';

interface StarLayerConfig {
  name: string;
  scrollSpeed: number;
  starCount: number;
  starSize: { min: number; max: number };
  starAlpha: { min: number; max: number };
  baseColor: number;
  accentMix: number;
  /** Fraction of stars that get a bright cross-sparkle treatment */
  sparkleFraction: number;
  /** Number of colored accent stars to sprinkle in */
  colorStarCount: number;
}

export const STARFIELD_LAYER_CONFIGS: StarLayerConfig[] = [
  { name: 'far-stars', scrollSpeed: 0.15, starCount: 100, starSize: { min: 0.4, max: 1.2 }, starAlpha: { min: 0.15, max: 0.5 }, baseColor: 0x8888aa, accentMix: 0.08, sparkleFraction: 0.03, colorStarCount: 3 },
  { name: 'mid-stars', scrollSpeed: 0.35, starCount: 65, starSize: { min: 0.8, max: 1.8 }, starAlpha: { min: 0.3, max: 0.75 }, baseColor: 0xaaaacc, accentMix: 0.14, sparkleFraction: 0.06, colorStarCount: 5 },
  { name: 'near-stars', scrollSpeed: 0.6, starCount: 35, starSize: { min: 1.2, max: 2.8 }, starAlpha: { min: 0.5, max: 1.0 }, baseColor: 0xccccee, accentMix: 0.22, sparkleFraction: 0.1, colorStarCount: 4 },
  { name: 'dust', scrollSpeed: 0.85, starCount: 20, starSize: { min: 0.4, max: 1.2 }, starAlpha: { min: 0.08, max: 0.22 }, baseColor: 0x6666aa, accentMix: 0.32, sparkleFraction: 0, colorStarCount: 2 },
];

export const STARFIELD_TILE_DEPTHS = [-10, -8, -6, -4];

const STARFIELD_TILE_WIDTH = 512;
const STARFIELD_TILE_HEIGHT = 2048;

export function createStarfieldTileSprites(
  scene: Phaser.Scene,
  levelConfig: LevelConfig | undefined,
  width: number,
  height: number
): Phaser.GameObjects.TileSprite[] {
  const tileSprites: Phaser.GameObjects.TileSprite[] = [];

  for (let i = 0; i < STARFIELD_LAYER_CONFIGS.length; i++) {
    const config = STARFIELD_LAYER_CONFIGS[i];
    const starColor = levelConfig
      ? mixColor(config.baseColor, levelConfig.accentColor, config.accentMix)
      : config.baseColor;
    const textureKey = `${config.name}-${starColor.toString(16)}-v2`;

    ensureStarfieldTexture(
      scene,
      textureKey,
      config,
      STARFIELD_TILE_WIDTH,
      STARFIELD_TILE_HEIGHT,
      levelConfig?.accentColor
    );

    const tile = scene.add.tileSprite(width / 2, height / 2, width, height, textureKey);
    tile.setOrigin(0.5);
    tile.setDepth(STARFIELD_TILE_DEPTHS[i]);
    tileSprites.push(tile);
  }

  return tileSprites;
}

export function layoutStarfieldTileSprites(
  tileSprites: Phaser.GameObjects.TileSprite[],
  width: number,
  height: number
): void {
  for (let i = 0; i < tileSprites.length; i++) {
    layoutViewportTileSprite(tileSprites[i], { width, height });
  }
}

export function destroyStarfieldTileSprites(tileSprites: Phaser.GameObjects.TileSprite[]): Phaser.GameObjects.TileSprite[] {
  for (let i = 0; i < tileSprites.length; i++) {
    tileSprites[i].destroy();
  }

  return [];
}
