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
const { resolveSectionAtmosphereTargets } = await import('../src/systems/parallax/atmosphereProfile');
type ParallaxBackgroundInstance = InstanceType<typeof ParallaxBackground>;

/**
 * Typed view of private ParallaxBackground fields/methods used by unit harnesses.
 * Prefer this over ad-hoc `Record<string, unknown>` casts so field names stay checked.
 */
type ParallaxTestState = {
  scene: {
    time: {
      delayedCall: (ms: number, callback: () => void) => { remove: (dispatchCallback: boolean) => void };
    };
  } | null;
  levelConfig?: { name: string };
  currentWidth: number;
  currentHeight: number;
  pendingRebuildEvent: { remove: (dispatchCallback: boolean) => void } | null;
  premiumBackgroundLayers: unknown[];
  tileSprites: unknown[];
  elapsed: number;
  hazardOverlayAlpha: number;
  atmosphereAlpha: number;
  atmosphereDrift: number;
  atmosphereTwinkle: number;
  landmarkAlpha: number;
  targetAtmosphereAlpha: number;
  targetAtmosphereDrift: number;
  targetAtmosphereTwinkle: number;
  targetLandmarkAlpha: number;
  targetHazardOverlayAlpha: number;
  activeHazards: ScriptedHazardConfig[];
  layoutTileSprites: () => void;
  layoutPremiumBackgroundLayers: () => void;
  rebuildPremiumBackgroundLayers: () => void;
  rebuildLevelVisualLayers: () => void;
  layoutPlanetLayer: () => void;
  createLevelVisualLayers: () => void;
  createSceneLayers: (
    scene: {
      textures: { exists: (key: string) => boolean };
      add: {
        tileSprite: (
          x: number,
          y: number,
          w: number,
          h: number,
          key: string
        ) => {
          setOrigin: () => unknown;
          setDepth: (value: number) => unknown;
          setAlpha: (value: number) => unknown;
          setBlendMode: (value: number | string) => unknown;
        };
      };
    },
    levelConfig: { name: string; accentColor?: number }
  ) => void;
  updateAtmosphereState: (delta: number) => void;
  updateVisualLayers: (delta: number) => void;
  updateHazardOverlay: (delta: number) => number;
};

function stateOf(parallax: ParallaxBackgroundInstance): ParallaxTestState {
  return parallax as unknown as ParallaxTestState;
}

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

  const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackgroundInstance;
  const state = stateOf(parallax);

  state.scene = scene;
  state.levelConfig = options?.withLevelConfig ? { name: 'Test Level' } : undefined;
  state.currentWidth = 800;
  state.currentHeight = 600;
  state.pendingRebuildEvent = null;
  state.premiumBackgroundLayers = options?.withPremiumLayers ? [{}] : [];

  state.layoutTileSprites = () => {
    calls.push('layoutTileSprites');
  };
  state.layoutPremiumBackgroundLayers = () => {
    calls.push('layoutPremiumBackgroundLayers');
  };
  state.rebuildPremiumBackgroundLayers = () => {
    calls.push('rebuildPremiumBackgroundLayers');
  };
  state.rebuildLevelVisualLayers = () => {
    calls.push('rebuildLevelVisualLayers');
  };
  state.layoutPlanetLayer = () => {
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

    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackgroundInstance;
    const state = stateOf(parallax);
    state.currentWidth = 800;
    state.currentHeight = 600;
    state.premiumBackgroundLayers = [];
    state.tileSprites = ['stale'];
    state.createLevelVisualLayers = () => undefined;

    state.createSceneLayers(scene, {
      name: 'Ember Monsoon',
      accentColor: 0x52f7a6,
    });

    expect(tileSpriteCalls).toEqual([
      'bg_level03',
      'bg_level03_nebula',
      'bg_level03_mid',
      'bg_level03_near',
      'bg_level03_overlay',
    ]);
    expect(state.tileSprites).toEqual([]);
    expect(state.premiumBackgroundLayers.length).toBe(5);
  });
});

describe('ParallaxBackground atmosphere wiring regression coverage', () => {
  test('setSectionAtmosphere(null) applies neutral targets from the atmosphere profile', () => {
    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackgroundInstance;
    const state = stateOf(parallax);
    const expected = resolveSectionAtmosphereTargets(null, 0.5);

    state.targetAtmosphereAlpha = 0;
    state.targetAtmosphereDrift = 0;
    state.targetAtmosphereTwinkle = 0;
    state.targetLandmarkAlpha = 0;
    state.targetHazardOverlayAlpha = 1;
    state.activeHazards = [{ type: 'debris-surge' }];

    parallax.setSectionAtmosphere(null, 0.5);

    expect(state.targetAtmosphereAlpha).toBe(expected.atmosphereAlpha);
    expect(state.targetAtmosphereDrift).toBe(expected.atmosphereDrift);
    expect(state.targetAtmosphereTwinkle).toBe(expected.atmosphereTwinkle);
    expect(state.targetLandmarkAlpha).toBe(expected.landmarkAlpha);
    expect(state.targetHazardOverlayAlpha).toBe(expected.hazardOverlayAlpha);
    expect(state.activeHazards).toEqual(expected.activeHazards);
  });

  test('setSectionAtmosphere(section, progress) wires profile targets onto instance state', () => {
    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackgroundInstance;
    const state = stateOf(parallax);
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
    const expected = resolveSectionAtmosphereTargets(section, 0.5);

    parallax.setSectionAtmosphere(section, 0.5);

    expect(state.targetAtmosphereAlpha).toBe(expected.atmosphereAlpha);
    expect(state.targetAtmosphereDrift).toBe(expected.atmosphereDrift);
    expect(state.targetAtmosphereTwinkle).toBe(expected.atmosphereTwinkle);
    expect(state.targetLandmarkAlpha).toBe(expected.landmarkAlpha);
    expect(state.targetHazardOverlayAlpha).toBe(expected.hazardOverlayAlpha);
    expect(state.activeHazards).toBe(expected.activeHazards);
  });
});

describe('ParallaxBackground update orchestration regression coverage', () => {
  test('update advances elapsed time and delegates to the named update phases in order', () => {
    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackgroundInstance;
    const state = stateOf(parallax);
    const calls: string[] = [];

    state.elapsed = 10;
    state.hazardOverlayAlpha = 0.2;
    state.updateAtmosphereState = () => {
      calls.push(`updateAtmosphereState:${String(state.elapsed)}`);
    };
    state.updateVisualLayers = (delta: number) => {
      calls.push(`updateVisualLayers:${delta}:${String(state.elapsed)}`);
    };
    state.updateHazardOverlay = () => {
      calls.push(`updateHazardOverlay:${String(state.elapsed)}`);
      return 0.75;
    };

    parallax.update(16);

    expect(state.elapsed).toBe(26);
    expect(state.hazardOverlayAlpha).toBe(0.75);
    expect(calls).toEqual([
      'updateAtmosphereState:26',
      'updateVisualLayers:16:26',
      'updateHazardOverlay:26',
    ]);
  });

  test('atmosphere damping is elapsed-time equivalent and bounded after a long frame', () => {
    const createParallax = () => {
      const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackgroundInstance;
      const state = stateOf(parallax);
      state.atmosphereAlpha = 0;
      state.atmosphereDrift = 0;
      state.atmosphereTwinkle = 0;
      state.landmarkAlpha = 0;
      state.targetAtmosphereAlpha = 1;
      state.targetAtmosphereDrift = 1;
      state.targetAtmosphereTwinkle = 1;
      state.targetLandmarkAlpha = 1;
      return { parallax, state };
    };
    const at30 = createParallax();
    const at120 = createParallax();

    for (let i = 0; i < 30; i++) at30.state.updateAtmosphereState(1000 / 30);
    for (let i = 0; i < 120; i++) at120.state.updateAtmosphereState(1000 / 120);

    expect(at30.state.atmosphereAlpha).toBeCloseTo(at120.state.atmosphereAlpha, 10);
    expect(at30.state.atmosphereDrift).toBeCloseTo(at120.state.atmosphereDrift, 10);

    const throttled = createParallax();
    throttled.state.updateAtmosphereState(60_000);
    expect(throttled.state.atmosphereAlpha).toBeGreaterThanOrEqual(0);
    expect(throttled.state.atmosphereAlpha).toBeLessThanOrEqual(1);
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
    stateOf(parallax).currentWidth = 901;
    delayedCalls[0]?.callback();

    expect(calls).not.toContain('rebuildPremiumBackgroundLayers');
    expect(calls).not.toContain('rebuildLevelVisualLayers');
  });
});
