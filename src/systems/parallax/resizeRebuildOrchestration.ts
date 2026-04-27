import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';

export type ResizeRebuildOrchestrationContext = {
  getScene: () => Phaser.Scene | null;
  getLevelConfig: () => LevelConfig | undefined;
  getCurrentWidth: () => number;
  getCurrentHeight: () => number;
  setCurrentSize: (width: number, height: number) => void;
  getPremiumBackgroundLayerCount: () => number;
  getPendingRebuildEvent: () => Phaser.Time.TimerEvent | null;
  setPendingRebuildEvent: (event: Phaser.Time.TimerEvent | null) => void;
  layoutTileSprites: () => void;
  layoutPremiumBackgroundLayers: () => void;
  layoutLevelVisualLayers: () => void;
  rebuildPremiumBackgroundLayers: (scene: Phaser.Scene, config: LevelConfig) => void;
  rebuildLevelVisualLayers: (scene: Phaser.Scene, config: LevelConfig) => void;
};

const RESIZE_REBUILD_DEBOUNCE_MS = 120;

export function resizeParallaxBackground(
  context: ResizeRebuildOrchestrationContext,
  width: number,
  height: number
): void {
  const scene = context.getScene();
  if (!scene || width <= 0 || height <= 0) {
    return;
  }

  const sizeChanged = context.getCurrentWidth() !== width || context.getCurrentHeight() !== height;
  context.setCurrentSize(width, height);

  context.layoutTileSprites();

  const levelConfig = context.getLevelConfig();
  if (!levelConfig) {
    context.layoutPremiumBackgroundLayers();
    return;
  }

  if (sizeChanged) {
    if (context.getPremiumBackgroundLayerCount() > 0) {
      context.rebuildPremiumBackgroundLayers(scene, levelConfig);
    } else {
      context.layoutPremiumBackgroundLayers();
    }

    scheduleLevelVisualRebuild(context);
    return;
  }

  context.layoutPremiumBackgroundLayers();
  context.layoutLevelVisualLayers();
}

export function scheduleLevelVisualRebuild(context: ResizeRebuildOrchestrationContext): void {
  const scene = context.getScene();
  const levelConfig = context.getLevelConfig();
  if (!scene || !levelConfig) {
    return;
  }

  const pendingRebuildEvent = context.getPendingRebuildEvent();
  if (pendingRebuildEvent) {
    pendingRebuildEvent.remove(false);
  }

  const targetWidth = context.getCurrentWidth();
  const targetHeight = context.getCurrentHeight();

  const timerEvent = scene.time.delayedCall(RESIZE_REBUILD_DEBOUNCE_MS, () => {
    context.setPendingRebuildEvent(null);

    const callbackScene = context.getScene();
    const callbackLevelConfig = context.getLevelConfig();
    if (!callbackScene || !callbackLevelConfig) {
      return;
    }

    if (context.getCurrentWidth() !== targetWidth || context.getCurrentHeight() !== targetHeight) {
      return;
    }

    context.rebuildPremiumBackgroundLayers(callbackScene, callbackLevelConfig);
    context.rebuildLevelVisualLayers(callbackScene, callbackLevelConfig);
  });

  context.setPendingRebuildEvent(timerEvent);
}
