import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({ default: {} }));

const callLog: string[] = [];
const createScenicLayers = mock(() => {
  callLog.push('createScenicLayers');
});
const destroyScenicLayers = mock(() => {
  callLog.push('destroyScenicLayers');
});
mock.module('../src/systems/parallax/scenicLayerLifecycle', () => ({
  createScenicLayers,
  destroyScenicLayers,
  layoutScenicLayers: () => {
    callLog.push('layoutScenicLayers');
  },
}));

const createPassingPlanetLayers = mock(() => {
  callLog.push('createPassingPlanetLayers');
});
const destroyPassingPlanetLayers = mock((sprites: unknown[]) => {
  callLog.push('destroyPassingPlanetLayers');
  return sprites;
});
mock.module('../src/systems/parallax/passingPlanetLifecycle', () => ({
  createPassingPlanetLayers,
  destroyPassingPlanetLayers,
  getPassingPlanetOffscreenThreshold: () => -220,
  resetPassingPlanetPosition: () => {
    callLog.push('resetPassingPlanetPosition');
  },
}));

const createStarTwinkles = mock(() => {
  callLog.push('createStarTwinkles');
});
const destroyTwinkles = mock((twinkles: unknown[]) => {
  callLog.push('destroyTwinkles');
  return twinkles;
});
mock.module('../src/systems/parallax/starTwinkleLifecycle', () => ({
  createStarTwinkles,
  destroyTwinkles,
}));

const createForegroundSilhouettes = mock(() => {
  callLog.push('createForegroundSilhouettes');
});
let destroyForegroundSilhouettesSceneArg: unknown;
let destroyForegroundSilhouettesListArg: unknown;
const destroyForegroundSilhouettes = mock((scene: unknown, silhouettes: unknown) => {
  destroyForegroundSilhouettesSceneArg = scene;
  destroyForegroundSilhouettesListArg = silhouettes;
  callLog.push('destroyForegroundSilhouettes');
});
mock.module('../src/systems/parallax/foregroundSilhouetteLifecycle', () => ({
  createForegroundSilhouettes,
  destroyForegroundSilhouettes,
}));

const {
  createLevelVisualLayers,
  destroyLevelVisualLayers,
  rebuildLevelVisualLayers,
} = await import('../src/systems/parallax/levelVisualLayerLifecycle');


function createContext() {
  const scenicLayers: unknown[] = [];
  const passingPlanetSprites: unknown[] = [];
  const twinkles: unknown[] = [];
  const foregroundSilhouettes: unknown[] = [];

  return {
    scene: { id: 'scene' } as Phaser.Scene,
    currentWidth: 800,
    currentHeight: 600,
    scenicLayers: scenicLayers as never,
    passingPlanetSprites: passingPlanetSprites as never,
    twinkles: twinkles as never,
    foregroundSilhouettes: foregroundSilhouettes as never,
    passingPlanetRespawnMinX: 100,
    passingPlanetRespawnMaxX: 400,
    starfieldTileDepths: [-10, -8, -6, -4] as const,
    createMoonSurfaceLayer: (_scene: Phaser.Scene, _config: unknown) => {
      callLog.push('createMoonSurfaceLayer');
    },
    createPlanetLayer: (_scene: Phaser.Scene, _config: unknown) => {
      callLog.push('createPlanetLayer');
    },
    createDebrisMotes: (_scene: Phaser.Scene, _config: unknown) => {
      callLog.push('createDebrisMotes');
    },
    destroyMoonSurfaceLayer: () => {
      callLog.push('destroyMoonSurfaceLayer');
    },
    destroyPlanetLayer: () => {
      callLog.push('destroyPlanetLayer');
    },
    destroyDebrisMotes: () => {
      callLog.push('destroyDebrisMotes');
    },
    setPassingPlanetSprites: (_sprites: unknown[]) => {
      callLog.push('setPassingPlanetSprites');
    },
    setTwinkles: (_twinkles: unknown[]) => {
      callLog.push('setTwinkles');
    },
  } as const;
}

describe('levelVisualLayerLifecycle', () => {
  test('createLevelVisualLayers delegates in the expected order', () => {
    callLog.length = 0;
    const context = createContext();
    const levelConfig = { name: 'Test' };

    createLevelVisualLayers(context as never, context.scene, levelConfig as never);

    expect(callLog).toEqual([
      'createScenicLayers',
      'createMoonSurfaceLayer',
      'createPassingPlanetLayers',
      'createPlanetLayer',
      'createDebrisMotes',
      'createStarTwinkles',
      'createForegroundSilhouettes',
    ]);
  });

  test('destroyLevelVisualLayers delegates in the expected order', () => {
    callLog.length = 0;
    destroyForegroundSilhouettesSceneArg = undefined;
    destroyForegroundSilhouettesListArg = undefined;
    const context = createContext();

    destroyLevelVisualLayers(context as never);

    expect(callLog).toEqual([
      'destroyScenicLayers',
      'destroyMoonSurfaceLayer',
      'destroyPassingPlanetLayers',
      'setPassingPlanetSprites',
      'destroyPlanetLayer',
      'destroyDebrisMotes',
      'destroyTwinkles',
      'setTwinkles',
      'destroyForegroundSilhouettes',
    ]);
    expect(destroyForegroundSilhouettesSceneArg).toBe(context.scene);
    expect(destroyForegroundSilhouettesListArg).toBe(context.foregroundSilhouettes);
  });

  test('rebuildLevelVisualLayers destroys then recreates in order', () => {
    callLog.length = 0;
    const context = createContext();
    const levelConfig = { name: 'Test' };

    rebuildLevelVisualLayers(context as never, context.scene, levelConfig as never);

    expect(callLog).toEqual([
      'destroyScenicLayers',
      'destroyMoonSurfaceLayer',
      'destroyPassingPlanetLayers',
      'setPassingPlanetSprites',
      'destroyPlanetLayer',
      'destroyDebrisMotes',
      'destroyTwinkles',
      'setTwinkles',
      'destroyForegroundSilhouettes',
      'createScenicLayers',
      'createMoonSurfaceLayer',
      'createPassingPlanetLayers',
      'createPlanetLayer',
      'createDebrisMotes',
      'createStarTwinkles',
      'createForegroundSilhouettes',
    ]);
  });
});
