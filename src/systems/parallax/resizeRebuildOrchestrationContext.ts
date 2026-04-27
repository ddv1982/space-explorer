import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import type { ResizeRebuildOrchestrationContext } from './resizeRebuildOrchestration';

export function getResizeRebuildOrchestrationContext(
  getScene: () => Phaser.Scene | null,
  getLevelConfig: () => LevelConfig | undefined,
  getCurrentWidth: () => number,
  getCurrentHeight: () => number,
  setCurrentSize: (width: number, height: number) => void,
  getPremiumBackgroundLayerCount: () => number,
  getPendingRebuildEvent: () => Phaser.Time.TimerEvent | null,
  setPendingRebuildEvent: (event: Phaser.Time.TimerEvent | null) => void,
  layoutTileSprites: () => void,
  layoutPremiumBackgroundLayers: () => void,
  layoutLevelVisualLayers: () => void,
  rebuildPremiumBackgroundLayers: (scene: Phaser.Scene, config: LevelConfig) => void,
  rebuildLevelVisualLayers: (scene: Phaser.Scene, config: LevelConfig) => void
): ResizeRebuildOrchestrationContext {
  return {
    getScene,
    getLevelConfig,
    getCurrentWidth,
    getCurrentHeight,
    setCurrentSize,
    getPremiumBackgroundLayerCount,
    getPendingRebuildEvent,
    setPendingRebuildEvent,
    layoutTileSprites,
    layoutPremiumBackgroundLayers,
    layoutLevelVisualLayers,
    rebuildPremiumBackgroundLayers,
    rebuildLevelVisualLayers,
  };
}
