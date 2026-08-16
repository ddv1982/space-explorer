import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { runtimePerformanceBudget } from '../RuntimePerformanceBudget';
import { SCROLL_SPEED } from '../../utils/constants';
import { getPremiumBackgroundManifest, type PremiumBackgroundLayerConfig } from './premiumBackgroundManifest';
import { applyHeightCoverRepeatLayout, getHeightCoverRepeatTilePositionY } from './tileSpriteBackgroundLayout';

export interface PremiumBackgroundLayerState {
  sprite: Phaser.GameObjects.TileSprite;
  config: PremiumBackgroundLayerConfig;
  baseAlpha: number;
  currentAlpha: number;
  scrollOffsetX: number;
  scrollOffsetY: number;
}

interface PremiumBackgroundScrollSnapshot {
  key: string;
  scrollOffsetX: number;
  scrollOffsetY: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

function getRuntimeLayerConfigs(config: LevelConfig): PremiumBackgroundLayerConfig[] | null {
  const manifest = getPremiumBackgroundManifest(config.name);
  if (!manifest) {
    return null;
  }

  const layerLimit = Math.min(
    getVisualQualityProfile().backgroundLayerCount,
    runtimePerformanceBudget.getSnapshot().backgroundLayerLimit
  );
  return manifest.runtimeLayers.slice(0, layerLimit);
}

function setAlphaIfChanged(sprite: Phaser.GameObjects.TileSprite, alpha: number): void {
  if (sprite.alpha !== alpha) {
    sprite.setAlpha(alpha);
  }
}

export function createPremiumBackgroundLayers(
  scene: Phaser.Scene,
  config: LevelConfig,
  viewport: ViewportSize,
  premiumBackgroundLayers: PremiumBackgroundLayerState[]
): boolean {
  const runtimeLayers = getRuntimeLayerConfigs(config);
  if (!runtimeLayers || !runtimeLayers.every((layer) => scene.textures.exists(layer.key))) {
    return false;
  }

  for (const layer of runtimeLayers) {
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
      currentAlpha: layer.alpha,
      scrollOffsetX: 0,
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

function capturePremiumBackgroundScrollOffsets(
  premiumBackgroundLayers: PremiumBackgroundLayerState[]
): PremiumBackgroundScrollSnapshot[] {
  return premiumBackgroundLayers.map((layer) => ({
    key: layer.config.key,
    scrollOffsetX: layer.scrollOffsetX,
    scrollOffsetY: layer.scrollOffsetY,
  }));
}

function restorePremiumBackgroundScrollOffsets(
  premiumBackgroundLayers: PremiumBackgroundLayerState[],
  snapshots: PremiumBackgroundScrollSnapshot[]
): void {
  for (const layer of premiumBackgroundLayers) {
    const snapshot = snapshots.find((entry) => entry.key === layer.config.key);

    if (snapshot) {
      layer.scrollOffsetY = snapshot.scrollOffsetY;
      layer.scrollOffsetX = snapshot.scrollOffsetX;
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
    layer.scrollOffsetY += ((layer.config.scrollSpeed * SCROLL_SPEED * params.delta) / 16) * params.atmosphereDrift;
    layer.sprite.tilePositionY = getHeightCoverRepeatTilePositionY(
      layer.sprite,
      params.currentHeight,
      layer.sprite.tileScaleY,
      layer.scrollOffsetY
    );
    const roleDrift = layer.config.role === 'far' ? 4 : layer.config.role === 'mid' ? 10 : 16;
    layer.scrollOffsetX = Math.sin(params.elapsed * (0.00008 + layer.config.scrollSpeed * 0.00012)) * roleDrift;
    layer.sprite.tilePositionX = layer.scrollOffsetX;

    const nextAlpha = layer.config.pulse
      ? Phaser.Math.Clamp(
          layer.baseAlpha * params.atmosphereAlpha +
            Math.sin(params.elapsed * layer.config.pulse.speed) * layer.config.pulse.amplitude,
          0,
          1
        )
      : Phaser.Math.Clamp(layer.baseAlpha * params.atmosphereAlpha, 0, 1);
    layer.currentAlpha = nextAlpha;
    setAlphaIfChanged(layer.sprite, nextAlpha);
  }
}
