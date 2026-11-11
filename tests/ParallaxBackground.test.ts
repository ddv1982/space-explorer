import { describe, expect, mock, test } from 'bun:test';

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
type ParallaxBackgroundInstance = InstanceType<typeof ParallaxBackground>;

type ParallaxTestState = {
  atmosphereAlpha: number;
  atmosphereDrift: number;
  landmarkAlpha: number;
  targetAtmosphereAlpha: number;
  targetAtmosphereDrift: number;
  targetLandmarkAlpha: number;
  updateAtmosphereState: (delta: number) => void;
};

function stateOf(parallax: ParallaxBackgroundInstance): ParallaxTestState {
  return parallax as unknown as ParallaxTestState;
}

describe('ParallaxBackground atmosphere damping', () => {
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
