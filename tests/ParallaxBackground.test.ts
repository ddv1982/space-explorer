import { describe, expect, mock, test } from 'bun:test';

import type { LevelSectionConfig, ScriptedHazardConfig } from '../src/config/LevelsConfig';
mock.module('../src/systems/parallax/LivingBackground', () => ({ createLivingBackground: () => null }));

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

type ParallaxTestState = {
  elapsed: number;
  hazardOverlayAlpha: number;
  atmosphereAlpha: number;
  atmosphereDrift: number;
  landmarkAlpha: number;
  targetAtmosphereAlpha: number;
  targetAtmosphereDrift: number;
  targetLandmarkAlpha: number;
  targetHazardOverlayAlpha: number;
  activeHazards: ScriptedHazardConfig[];
  updateAtmosphereState: (delta: number) => void;
  updateVisualLayers: (delta: number) => void;
  updateHazardOverlay: (delta: number) => number;
};

function stateOf(parallax: ParallaxBackgroundInstance): ParallaxTestState {
  return parallax as unknown as ParallaxTestState;
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

describe('ParallaxBackground atmosphere wiring regression coverage', () => {
  test('setSectionAtmosphere(null) applies neutral targets from the atmosphere profile', () => {
    const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackgroundInstance;
    const state = stateOf(parallax);
    const expected = resolveSectionAtmosphereTargets(null, 0.5);

    state.targetAtmosphereAlpha = 0;
    state.targetAtmosphereDrift = 0;
    state.targetLandmarkAlpha = 0;
    state.targetHazardOverlayAlpha = 1;
    state.activeHazards = [{ type: 'debris-surge' }];

    parallax.setSectionAtmosphere(null, 0.5);

    expect(state.targetAtmosphereAlpha).toBe(expected.atmosphereAlpha);
    expect(state.targetAtmosphereDrift).toBe(expected.atmosphereDrift);
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
        landmarkAlpha: 0.95,
        hazardResponseScale: 1.2,
      },
    });
    const expected = resolveSectionAtmosphereTargets(section, 0.5);

    parallax.setSectionAtmosphere(section, 0.5);

    expect(state.targetAtmosphereAlpha).toBe(expected.atmosphereAlpha);
    expect(state.targetAtmosphereDrift).toBe(expected.atmosphereDrift);
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
    expect(calls).toEqual(['updateAtmosphereState:26', 'updateVisualLayers:16:26', 'updateHazardOverlay:26']);
  });

  test('atmosphere damping is elapsed-time equivalent and bounded after a long frame', () => {
    const createParallax = () => {
      const parallax = Object.create(ParallaxBackground.prototype) as ParallaxBackgroundInstance;
      const state = stateOf(parallax);
      state.atmosphereAlpha = 0;
      state.atmosphereDrift = 0;
      state.landmarkAlpha = 0;
      state.targetAtmosphereAlpha = 1;
      state.targetAtmosphereDrift = 1;
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
