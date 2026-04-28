import type { LevelVisualLayerLifecycleContext } from './levelVisualLayerLifecycle';

export function getLevelVisualLayerLifecycleContext(
  scene: LevelVisualLayerLifecycleContext['scene'],
  currentWidth: LevelVisualLayerLifecycleContext['currentWidth'],
  currentHeight: LevelVisualLayerLifecycleContext['currentHeight'],
  passingPlanetSprites: LevelVisualLayerLifecycleContext['passingPlanetSprites'],
  twinkles: LevelVisualLayerLifecycleContext['twinkles'],
  foregroundSilhouettes: LevelVisualLayerLifecycleContext['foregroundSilhouettes'],
  passingPlanetRespawnMinX: LevelVisualLayerLifecycleContext['passingPlanetRespawnMinX'],
  passingPlanetRespawnMaxX: LevelVisualLayerLifecycleContext['passingPlanetRespawnMaxX'],
  starfieldTileDepths: LevelVisualLayerLifecycleContext['starfieldTileDepths'],
  createPlanetLayer: LevelVisualLayerLifecycleContext['createPlanetLayer'],
  createDebrisMotes: LevelVisualLayerLifecycleContext['createDebrisMotes'],
  destroyPlanetLayer: LevelVisualLayerLifecycleContext['destroyPlanetLayer'],
  destroyDebrisMotes: LevelVisualLayerLifecycleContext['destroyDebrisMotes'],
  setPassingPlanetSprites: LevelVisualLayerLifecycleContext['setPassingPlanetSprites'],
  setTwinkles: LevelVisualLayerLifecycleContext['setTwinkles']
): LevelVisualLayerLifecycleContext {
  return {
    scene,
    currentWidth,
    currentHeight,
    passingPlanetSprites,
    twinkles,
    foregroundSilhouettes,
    passingPlanetRespawnMinX,
    passingPlanetRespawnMaxX,
    starfieldTileDepths,
    createPlanetLayer,
    createDebrisMotes,
    destroyPlanetLayer,
    destroyDebrisMotes,
    setPassingPlanetSprites,
    setTwinkles,
  };
}
