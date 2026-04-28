import { describe, expect, mock, test } from 'bun:test';

import type { LevelSectionConfig, ScriptedHazardConfig } from '../src/config/LevelsConfig';

mock.module('phaser', () => ({
  default: {
    Scene: class {},
    GameObjects: {
      Image: class {},
      TileSprite: class {},
      Graphics: class {},
    },
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
      Linear: (start: number, end: number, t: number) => start + (end - start) * t,
      Between: (min: number, _max: number) => min,
      FloatBetween: (min: number, _max: number) => min,
    },
  },
}));

const { ParallaxBackground } = await import('../src/systems/ParallaxBackground');

type DelayedCall = {
  ms: number;
  callback: () => void;
  removeCalls: boolean[];
};

function createResizeHarness(options?: { withLevelConfig?: boolean; withPremiumLayers?: boolean }) {
  const calls: string[] = [];
  const delayedCalls: DelayedCall[] = [];

  const scene = {
    time: {
      delayedCall: (ms: number, callback: () => void) => {
        const call: DelayedCall = {
          ms,
          callback,
          removeCalls: [],
        };
        delayedCalls.push(call);
        return {
          remove: (dispatchCallback: boolean) => {
            call.removeCalls.push(dispatchCallback);
          },
        };
      },
    },
  };

  const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackground;

  (parallax as unknown as Record<string, unknown>).scene = scene;
  (parallax as unknown as Record<string, unknown>).levelConfig = options?.withLevelConfig
    ? ({ name: 'Test Level' } as unknown)
    : undefined;
  (parallax as unknown as Record<string, unknown>).currentWidth = 800;
  (parallax as unknown as Record<string, unknown>).currentHeight = 600;
  (parallax as unknown as Record<string, unknown>).pendingRebuildEvent = null;
  (parallax as unknown as Record<string, unknown>).premiumBackgroundLayers = options?.withPremiumLayers
    ? [{}]
    : [];

  (parallax as unknown as Record<string, unknown>).layoutTileSprites = () => {
    calls.push('layoutTileSprites');
  };
  (parallax as unknown as Record<string, unknown>).layoutPremiumBackgroundLayers = () => {
    calls.push('layoutPremiumBackgroundLayers');
  };
  (parallax as unknown as Record<string, unknown>).rebuildPremiumBackgroundLayers = () => {
    calls.push('rebuildPremiumBackgroundLayers');
  };
  (parallax as unknown as Record<string, unknown>).rebuildLevelVisualLayers = () => {
    calls.push('rebuildLevelVisualLayers');
  };
  (parallax as unknown as Record<string, unknown>).layoutMoonSurfaceLayer = () => {
    calls.push('layoutMoonSurfaceLayer');
  };
  (parallax as unknown as Record<string, unknown>).layoutPlanetLayer = () => {
    calls.push('layoutPlanetLayer');
  };

  return { parallax, calls, delayedCalls };
}

function createSection(overrides?: Partial<LevelSectionConfig>): LevelSectionConfig {
  return {
    id: 'section-1',
    label: 'Section 1',
    startProgress: 0,
    endProgress: 1,
    phase: 'climax',
    summary: 'test section',
    ...overrides,
  };
}

describe('ParallaxBackground premium-background presentation regression coverage', () => {
  test('createSceneLayers skips procedural starfield when premium background art is available', () => {
    const tileSpriteCalls: string[] = [];
    const tileSpriteStub = {
      setOrigin: () => tileSpriteStub,
      setDepth: (_value: number) => tileSpriteStub,
      setAlpha: (_value: number) => tileSpriteStub,
      setBlendMode: (_value: number | string) => tileSpriteStub,
    };

    const scene = {
      textures: {
        exists: (_key: string) => true,
      },
      add: {
        tileSprite: (_x: number, _y: number, _w: number, _h: number, key: string) => {
          tileSpriteCalls.push(key);
          return tileSpriteStub;
        },
      },
    };

    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackground;
    (parallax as unknown as Record<string, unknown>).currentWidth = 800;
    (parallax as unknown as Record<string, unknown>).currentHeight = 600;
    (parallax as unknown as Record<string, unknown>).premiumBackgroundLayers = [];
    (parallax as unknown as Record<string, unknown>).tileSprites = ['stale'];
    (parallax as unknown as Record<string, unknown>).createLevelVisualLayers = () => undefined;

    (parallax as unknown as { createSceneLayers: (scene: unknown, levelConfig: unknown) => void }).createSceneLayers(
      scene,
      { name: 'Magnetar Foundry', accentColor: 0x52f7a6 } as never
    );

    expect(tileSpriteCalls).toEqual(['bg_level03']);
    expect((parallax as unknown as Record<string, unknown>).tileSprites).toEqual([]);
    expect(((parallax as unknown as Record<string, unknown>).premiumBackgroundLayers as unknown[]).length).toBe(1);
  });
});

describe('ParallaxBackground atmosphere regression coverage', () => {
  test('setSectionAtmosphere(null) resets targets and clears hazards', () => {
    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackground;

    (parallax as unknown as Record<string, unknown>).targetAtmosphereAlpha = 0;
    (parallax as unknown as Record<string, unknown>).targetAtmosphereDrift = 0;
    (parallax as unknown as Record<string, unknown>).targetAtmosphereTwinkle = 0;
    (parallax as unknown as Record<string, unknown>).targetLandmarkAlpha = 0;
    (parallax as unknown as Record<string, unknown>).targetHazardOverlayAlpha = 1;
    (parallax as unknown as Record<string, unknown>).hazardResponseScale = 5;
    (parallax as unknown as Record<string, unknown>).activeHazards = [{ type: 'debris-surge' }];

    parallax.setSectionAtmosphere(null, 0.5);

    expect((parallax as unknown as Record<string, unknown>).targetAtmosphereAlpha).toBe(1);
    expect((parallax as unknown as Record<string, unknown>).targetAtmosphereDrift).toBe(1);
    expect((parallax as unknown as Record<string, unknown>).targetAtmosphereTwinkle).toBe(1);
    expect((parallax as unknown as Record<string, unknown>).targetLandmarkAlpha).toBe(1);
    expect((parallax as unknown as Record<string, unknown>).targetHazardOverlayAlpha).toBe(0);
    expect((parallax as unknown as Record<string, unknown>).hazardResponseScale).toBe(1);
    expect((parallax as unknown as Record<string, unknown>).activeHazards).toEqual([]);
  });

  test('setSectionAtmosphere(section, progress) computes stable target fields', () => {
    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackground;
    const hazards: ScriptedHazardConfig[] = [
      { type: 'energy-storm', intensity: 1 },
      { type: 'debris-surge', intensity: 0.8 },
    ];
    const section = createSection({
      phase: 'climax',
      musicIntensity: 0.8,
      vatTarget: { valence: 0, arousal: 0.7, tension: 0.6 },
      hazardEvents: hazards,
      visualModifiers: {
        atmosphereAlpha: 1.1,
        driftScale: 0.9,
        twinkleScale: 1.05,
        landmarkAlpha: 0.95,
        hazardResponseScale: 1.2,
      },
    });

    parallax.setSectionAtmosphere(section, 0.5);

    expect((parallax as unknown as Record<string, unknown>).targetAtmosphereAlpha).toBeCloseTo(1.18, 6);
    expect((parallax as unknown as Record<string, unknown>).targetAtmosphereDrift).toBeCloseTo(1.0278, 6);
    expect((parallax as unknown as Record<string, unknown>).targetAtmosphereTwinkle).toBeCloseTo(1.1508, 6);
    expect((parallax as unknown as Record<string, unknown>).targetLandmarkAlpha).toBeCloseTo(0.98515, 6);
    expect((parallax as unknown as Record<string, unknown>).targetHazardOverlayAlpha).toBeCloseTo(0.1944, 6);
    expect((parallax as unknown as Record<string, unknown>).hazardResponseScale).toBeCloseTo(1.2, 6);
    expect((parallax as unknown as Record<string, unknown>).activeHazards).toEqual(hazards);
  });
});

describe('ParallaxBackground update orchestration regression coverage', () => {
  test('update advances elapsed time and delegates to the named update phases in order', () => {
    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackground;
    const calls: string[] = [];

    (parallax as unknown as Record<string, unknown>).elapsed = 10;
    (parallax as unknown as Record<string, unknown>).hazardOverlayAlpha = 0.2;
    (parallax as unknown as Record<string, unknown>).updateAtmosphereState = () => {
      calls.push(`updateAtmosphereState:${String((parallax as unknown as Record<string, unknown>).elapsed)}`);
    };
    (parallax as unknown as Record<string, unknown>).updateVisualLayers = (delta: number) => {
      calls.push(`updateVisualLayers:${delta}:${String((parallax as unknown as Record<string, unknown>).elapsed)}`);
    };
    (parallax as unknown as Record<string, unknown>).updateHazardOverlay = () => {
      calls.push(`updateHazardOverlay:${String((parallax as unknown as Record<string, unknown>).elapsed)}`);
      return 0.75;
    };

    parallax.update(16);

    expect((parallax as unknown as Record<string, unknown>).elapsed).toBe(26);
    expect((parallax as unknown as Record<string, unknown>).hazardOverlayAlpha).toBe(0.75);
    expect(calls).toEqual([
      'updateAtmosphereState:26',
      'updateVisualLayers:16:26',
      'updateHazardOverlay:26',
    ]);
  });
});

describe('ParallaxBackground resize debounce regression coverage', () => {
  test('resize schedules a debounced rebuild on size changes when level config exists', () => {
    const { parallax, calls, delayedCalls } = createResizeHarness({ withLevelConfig: true, withPremiumLayers: false });

    parallax.resize(900, 700);

    expect(calls).toEqual(['layoutTileSprites', 'layoutPremiumBackgroundLayers']);
    expect(delayedCalls).toHaveLength(1);
    expect(delayedCalls[0]?.ms).toBe(120);
  });

  test('resize replaces pending debounced rebuild when called repeatedly', () => {
    const { parallax, delayedCalls } = createResizeHarness({ withLevelConfig: true, withPremiumLayers: false });

    parallax.resize(900, 700);
    parallax.resize(920, 700);

    expect(delayedCalls).toHaveLength(2);
    expect(delayedCalls[0]?.removeCalls).toEqual([false]);
    expect(delayedCalls[1]?.removeCalls).toEqual([]);
  });

  test('debounced callback rebuilds only when dimensions still match target', () => {
    const { parallax, calls, delayedCalls } = createResizeHarness({ withLevelConfig: true, withPremiumLayers: true });

    parallax.resize(900, 700);
    delayedCalls[0]?.callback();

    expect(calls).toContain('rebuildPremiumBackgroundLayers');
    expect(calls).toContain('rebuildLevelVisualLayers');
  });

  test('debounced callback no-ops if dimensions changed again before callback', () => {
    const { parallax, calls, delayedCalls } = createResizeHarness({ withLevelConfig: true, withPremiumLayers: false });

    parallax.resize(900, 700);
    (parallax as unknown as Record<string, unknown>).currentWidth = 901;
    delayedCalls[0]?.callback();

    expect(calls).not.toContain('rebuildPremiumBackgroundLayers');
    expect(calls).not.toContain('rebuildLevelVisualLayers');
  });
});
