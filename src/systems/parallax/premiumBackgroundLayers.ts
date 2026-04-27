import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { SCROLL_SPEED } from '../../utils/constants';
import { getPremiumBackgroundManifest, type PremiumBackgroundLayerConfig } from './premiumBackgroundManifest';
import {
  applyHeightCoverRepeatLayout,
  getHeightCoverRepeatTilePositionY,
} from './tileSpriteBackgroundLayout';

export interface PremiumBackgroundLayerState {
  sprite: Phaser.GameObjects.TileSprite;
  config: PremiumBackgroundLayerConfig;
  baseAlpha: number;
  scrollOffsetY: number;
}

export interface PremiumBackgroundScrollSnapshot {
  key: string;
  scrollOffsetY: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

export function createPremiumBackgroundLayers(
  scene: Phaser.Scene,
  config: LevelConfig,
  viewport: ViewportSize,
  premiumBackgroundLayers: PremiumBackgroundLayerState[]
): boolean {
  const manifest = getPremiumBackgroundManifest(config.name);

  if (!manifest || !manifest.layers.every((layer) => scene.textures.exists(layer.key))) {
    return false;
  }

  for (const layer of manifest.layers) {
    const sprite = scene.add.tileSprite(
      viewport.width / 2,
      viewport.height / 2,
      viewport.width,
      viewport.height,
      layer.key
    );
    sprite.setOrigin(0.5);
    sprite.setDepth(layer.depth);
    sprite.setAlpha(layer.alpha);

    if (layer.blendMode) {
      sprite.setBlendMode(layer.blendMode);
    }

    premiumBackgroundLayers.push({
      sprite,
      config: layer,
      baseAlpha: layer.alpha,
      scrollOffsetY: 0,
    });
  }

  return true;
}

export function destroyPremiumBackgroundLayers(premiumBackgroundLayers: PremiumBackgroundLayerState[]): void {
  for (const layer of premiumBackgroundLayers) {
    layer.sprite.destroy();
  }

  premiumBackgroundLayers.length = 0;
}

export function capturePremiumBackgroundScrollOffsets(
  premiumBackgroundLayers: PremiumBackgroundLayerState[]
): PremiumBackgroundScrollSnapshot[] {
  return premiumBackgroundLayers.map((layer) => ({
    key: layer.config.key,
    scrollOffsetY: layer.scrollOffsetY,
  }));
}

export function restorePremiumBackgroundScrollOffsets(
  premiumBackgroundLayers: PremiumBackgroundLayerState[],
  snapshots: PremiumBackgroundScrollSnapshot[]
): void {
  for (const layer of premiumBackgroundLayers) {
    const snapshot = snapshots.find((entry) => entry.key === layer.config.key);

    if (snapshot) {
      layer.scrollOffsetY = snapshot.scrollOffsetY;
    }
  }
}

export function rebuildPremiumBackgroundLayers(params: {
  scene: Phaser.Scene;
  config: LevelConfig;
  viewport: ViewportSize;
  premiumBackgroundLayers: PremiumBackgroundLayerState[];
  layoutPremiumBackgroundLayers: () => void;
}): void {
  const scrollOffsets = capturePremiumBackgroundScrollOffsets(params.premiumBackgroundLayers);

  destroyPremiumBackgroundLayers(params.premiumBackgroundLayers);
  createPremiumBackgroundLayers(params.scene, params.config, params.viewport, params.premiumBackgroundLayers);
  restorePremiumBackgroundScrollOffsets(params.premiumBackgroundLayers, scrollOffsets);
  params.layoutPremiumBackgroundLayers();
}

export function layoutPremiumBackgroundLayers(
  premiumBackgroundLayers: PremiumBackgroundLayerState[],
  viewport: ViewportSize
): void {
  for (const layer of premiumBackgroundLayers) {
    applyHeightCoverRepeatLayout(layer.sprite, viewport, {
      scrollOffsetY: layer.scrollOffsetY,
    });
  }
}

export function scrollPremiumBackgroundLayers(params: {
  premiumBackgroundLayers: PremiumBackgroundLayerState[];
  delta: number;
  currentHeight: number;
  atmosphereDrift: number;
  atmosphereAlpha: number;
  elapsed: number;
}): void {
  if (params.premiumBackgroundLayers.length === 0) {
    return;
  }

  for (const layer of params.premiumBackgroundLayers) {
    layer.scrollOffsetY += layer.config.scrollSpeed * SCROLL_SPEED * params.delta / 16 * params.atmosphereDrift;
    layer.sprite.tilePositionY = getHeightCoverRepeatTilePositionY(
      layer.sprite,
      params.currentHeight,
      layer.sprite.tileScaleY,
      layer.scrollOffsetY
    );

    if (layer.config.pulse) {
      const pulse = Math.sin(params.elapsed * layer.config.pulse.speed);
      layer.sprite.setAlpha(
        Phaser.Math.Clamp(
          layer.baseAlpha * params.atmosphereAlpha + pulse * layer.config.pulse.amplitude,
          0,
          1
        )
      );
    } else {
      layer.sprite.setAlpha(Phaser.Math.Clamp(layer.baseAlpha * params.atmosphereAlpha, 0, 1));
    }
  }
}
