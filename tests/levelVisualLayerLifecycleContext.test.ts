import { describe, expect, test } from 'bun:test';
import { getLevelVisualLayerLifecycleContext } from '../src/systems/parallax/levelVisualLayerLifecycleContext';

describe('getLevelVisualLayerLifecycleContext', () => {
  test('forwards all references and callbacks unchanged', () => {
    const scene = { id: 'scene' };
    const scenicLayers = [{ id: 'scenic' }];
    const passingPlanetSprites = [{ id: 'planet' }];
    const twinkles = [{ id: 'twinkle' }];
    const foregroundSilhouettes = [{ id: 'silhouette' }];
    const createMoonSurfaceLayer = () => 'moon';
    const createPlanetLayer = () => 'planet';
    const createDebrisMotes = () => 'debris';
    const destroyMoonSurfaceLayer = () => 'destroyMoon';
    const destroyPlanetLayer = () => 'destroyPlanet';
    const destroyDebrisMotes = () => 'destroyDebris';
    const setPassingPlanetSprites = (value: unknown) => value;
    const setTwinkles = (value: unknown) => value;

    const context = getLevelVisualLayerLifecycleContext(
      scene as never,
      800,
      600,
      scenicLayers as never,
      passingPlanetSprites as never,
      twinkles as never,
      foregroundSilhouettes as never,
      100,
      400,
      [-10, -8, -6, -4],
      createMoonSurfaceLayer as never,
      createPlanetLayer as never,
      createDebrisMotes as never,
      destroyMoonSurfaceLayer,
      destroyPlanetLayer,
      destroyDebrisMotes,
      setPassingPlanetSprites as never,
      setTwinkles as never,
    );

    expect(context.scene).toBe(scene);
    expect(context.currentWidth).toBe(800);
    expect(context.currentHeight).toBe(600);
    expect(context.scenicLayers).toBe(scenicLayers);
    expect(context.passingPlanetSprites).toBe(passingPlanetSprites);
    expect(context.twinkles).toBe(twinkles);
    expect(context.foregroundSilhouettes).toBe(foregroundSilhouettes);
    expect(context.passingPlanetRespawnMinX).toBe(100);
    expect(context.passingPlanetRespawnMaxX).toBe(400);
    expect(context.starfieldTileDepths).toEqual([-10, -8, -6, -4]);
    expect(context.createMoonSurfaceLayer).toBe(createMoonSurfaceLayer);
    expect(context.createPlanetLayer).toBe(createPlanetLayer);
    expect(context.createDebrisMotes).toBe(createDebrisMotes);
    expect(context.destroyMoonSurfaceLayer).toBe(destroyMoonSurfaceLayer);
    expect(context.destroyPlanetLayer).toBe(destroyPlanetLayer);
    expect(context.destroyDebrisMotes).toBe(destroyDebrisMotes);
    expect(context.setPassingPlanetSprites).toBe(setPassingPlanetSprites);
    expect(context.setTwinkles).toBe(setTwinkles);
  });
});
