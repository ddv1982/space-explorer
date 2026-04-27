import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { generatePlanetTexture } from './planetTextureGenerator';

export interface PlanetLayerState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  baseX: number;
  baseY: number;
  baseAlpha: number;
}

export function createPlanetLayer(
  scene: Phaser.Scene,
  config: LevelConfig,
  viewport: { width: number; height: number }
): PlanetLayerState {
  const width = Math.ceil(viewport.width + 400);
  const height = Math.ceil(viewport.height + 400);
  const textureKey = `planet-${config.accentColor.toString(16)}-${config.nebulaColor.toString(16)}-${width}x${height}`;

  if (!scene.textures.exists(textureKey)) {
    generatePlanetTexture(scene, textureKey, width, height, config);
  }

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const sprite = scene.add.image(centerX, centerY, textureKey);
  sprite.setDepth(-11);
  sprite.setAlpha(0.25);

  return {
    sprite,
    textureKey,
    baseX: centerX,
    baseY: centerY,
    baseAlpha: 0.25,
  };
}

export function layoutPlanetLayer(
  planetLayer: PlanetLayerState | null,
  viewport: { width: number; height: number }
): void {
  if (!planetLayer) {
    return;
  }

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  planetLayer.baseX = centerX;
  planetLayer.baseY = centerY;
  planetLayer.sprite.setPosition(centerX, centerY);
}

export function destroyPlanetLayer(
  scene: Phaser.Scene | null,
  planetLayer: PlanetLayerState | null
): PlanetLayerState | null {
  if (!planetLayer) {
    return null;
  }

  planetLayer.sprite.destroy();

  if (scene?.textures.exists(planetLayer.textureKey)) {
    scene.textures.remove(planetLayer.textureKey);
  }

  return null;
}
