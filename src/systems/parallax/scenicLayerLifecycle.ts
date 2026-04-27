import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { generateScenicTexture } from './scenicTextureGenerator';

interface ScenicLayerConfig {
  name: string;
  depth: number;
  alpha: number;
  hazeCount: number;
  cloudCount: number;
  shadowCount: number;
  sparkleCount: number;
  /** Number of elongated filament shapes to draw */
  filamentCount: number;
  radius: { min: number; max: number };
  drift: { x: number; y: number };
  speed: number;
  accentMix: number;
}

export interface ScenicLayerState {
  sprite: Phaser.GameObjects.Image;
  textureKey: string;
  baseX: number;
  baseY: number;
  baseAlpha: number;
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
}

const SCENIC_LAYER_CONFIGS: ScenicLayerConfig[] = [
  {
    name: 'nebula-far',
    depth: -9,
    alpha: 0.82,
    hazeCount: 4,
    cloudCount: 8,
    shadowCount: 4,
    sparkleCount: 14,
    filamentCount: 3,
    radius: { min: 140, max: 280 },
    drift: { x: 18, y: 12 },
    speed: 0.00012,
    accentMix: 0.24,
  },
  {
    name: 'nebula-near',
    depth: -7,
    alpha: 0.52,
    hazeCount: 3,
    cloudCount: 7,
    shadowCount: 5,
    sparkleCount: 20,
    filamentCount: 4,
    radius: { min: 90, max: 200 },
    drift: { x: 32, y: 18 },
    speed: 0.00018,
    accentMix: 0.48,
  },
];

const SCENIC_PADDING_X = 220;
const SCENIC_PADDING_Y = 180;

export function createScenicLayers(
  scene: Phaser.Scene,
  config: LevelConfig,
  viewport: { width: number; height: number },
  scenicLayers: ScenicLayerState[]
): void {
  const scenicWidth = Math.ceil(viewport.width + SCENIC_PADDING_X * 2);
  const scenicHeight = Math.ceil(viewport.height + SCENIC_PADDING_Y * 2);
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const alphaKey = Math.round(config.nebulaAlpha * 1000);

  for (let i = 0; i < SCENIC_LAYER_CONFIGS.length; i++) {
    const layer = SCENIC_LAYER_CONFIGS[i];
    const textureKey = `${layer.name}-${config.nebulaColor.toString(16)}-${config.accentColor.toString(16)}-${alphaKey}-${scenicWidth}x${scenicHeight}-v2`;

    if (!scene.textures.exists(textureKey)) {
      generateScenicTexture(scene, textureKey, scenicWidth, scenicHeight, config, layer);
    }

    const sprite = scene.add.image(centerX, centerY, textureKey);
    sprite.setDepth(layer.depth);
    sprite.setAlpha(layer.alpha);

    scenicLayers.push({
      sprite,
      textureKey,
      baseX: centerX,
      baseY: centerY,
      baseAlpha: layer.alpha,
      driftX: layer.drift.x,
      driftY: layer.drift.y,
      speed: layer.speed,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
    });
  }

  layoutScenicLayers(scenicLayers, viewport);
}

export function layoutScenicLayers(
  scenicLayers: ScenicLayerState[],
  viewport: { width: number; height: number }
): void {
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  for (let i = 0; i < scenicLayers.length; i++) {
    scenicLayers[i].baseX = centerX;
    scenicLayers[i].baseY = centerY;
    scenicLayers[i].sprite.setPosition(centerX, centerY);
  }
}

export function destroyScenicLayers(
  scene: Phaser.Scene | null,
  scenicLayers: ScenicLayerState[]
): void {
  for (let i = 0; i < scenicLayers.length; i++) {
    scenicLayers[i].sprite.destroy();

    if (scene?.textures.exists(scenicLayers[i].textureKey)) {
      scene.textures.remove(scenicLayers[i].textureKey);
    }
  }

  scenicLayers.length = 0;
}
