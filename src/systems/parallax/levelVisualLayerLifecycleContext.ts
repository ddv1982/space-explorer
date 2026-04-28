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
  createMoonSurfaceLayer: LevelVisualLayerLifecycleContext['createMoonSurfaceLayer'],
  createPlanetLayer: LevelVisualLayerLifecycleContext['createPlanetLayer'],
  createDebrisMotes: LevelVisualLayerLifecycleContext['createDebrisMotes'],
  destroyMoonSurfaceLayer: LevelVisualLayerLifecycleContext['destroyMoonSurfaceLayer'],
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
    createMoonSurfaceLayer,
    createPlanetLayer,
    createDebrisMotes,
    destroyMoonSurfaceLayer,
    destroyPlanetLayer,
    destroyDebrisMotes,
    setPassingPlanetSprites,
    setTwinkles,
  };
}
