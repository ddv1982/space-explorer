import Phaser from 'phaser';
import type { LevelConfig } from '../../config/LevelsConfig';
import {
  createPassingPlanetLayers,
  destroyPassingPlanetLayers,
  type PassingPlanetState,
} from './passingPlanetLifecycle';
import { createStarTwinkles, destroyTwinkles, type TwinkleState } from './starTwinkleLifecycle';
import {
  createForegroundSilhouettes,
  destroyForegroundSilhouettes,
  type ForegroundSilhouetteState,
} from './foregroundSilhouetteLifecycle';

export type LevelVisualLayerLifecycleContext = {
  scene: Phaser.Scene | null;
  currentWidth: number;
  currentHeight: number;
  passingPlanetSprites: PassingPlanetState[];
  twinkles: TwinkleState[];
  foregroundSilhouettes: ForegroundSilhouetteState[];
  passingPlanetRespawnMinX: number;
  passingPlanetRespawnMaxX: number;
  starfieldTileDepths: readonly number[];
  createPlanetLayer: (scene: Phaser.Scene, config: LevelConfig) => void;
  createDebrisMotes: (scene: Phaser.Scene, config: LevelConfig) => void;
  destroyPlanetLayer: () => void;
  destroyDebrisMotes: () => void;
  setPassingPlanetSprites: (sprites: PassingPlanetState[]) => void;
  setTwinkles: (twinkles: TwinkleState[]) => void;
};

export function createLevelVisualLayers(
  context: LevelVisualLayerLifecycleContext,
  scene: Phaser.Scene,
  config: LevelConfig
): void {
  createPassingPlanetLayers(
    scene,
    config,
    context.currentWidth,
    context.currentHeight,
    context.passingPlanetSprites,
    context.passingPlanetRespawnMinX,
    context.passingPlanetRespawnMaxX
  );
  context.createPlanetLayer(scene, config);
  context.createDebrisMotes(scene, config);
  createStarTwinkles(scene, context.twinkles, {
    width: context.currentWidth,
    height: context.currentHeight,
    depths: context.starfieldTileDepths,
  });
  createForegroundSilhouettes(
    scene,
    config,
    {
      width: context.currentWidth,
      height: context.currentHeight,
    },
    context.foregroundSilhouettes
  );
}

export function destroyLevelVisualLayers(context: LevelVisualLayerLifecycleContext): void {
  context.setPassingPlanetSprites(destroyPassingPlanetLayers(context.passingPlanetSprites));
  context.destroyPlanetLayer();
  context.destroyDebrisMotes();
  context.setTwinkles(destroyTwinkles(context.twinkles));
  destroyForegroundSilhouettes(context.scene, context.foregroundSilhouettes);
}

export function rebuildLevelVisualLayers(
  context: LevelVisualLayerLifecycleContext,
  scene: Phaser.Scene,
  config: LevelConfig
): void {
  destroyLevelVisualLayers(context);
  createLevelVisualLayers(context, scene, config);
}
