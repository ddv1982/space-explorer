import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({ default: {} }));

const generatePlanetTexture = mock();
mock.module('../src/systems/parallax/planetTextureGenerator', () => ({
  generatePlanetTexture,
}));

const {
  createPlanetLayer,
  destroyPlanetLayer,
  layoutPlanetLayer,
} = await import('../src/systems/parallax/distantPlanetLayerLifecycle');

function createImageStub() {
  return {
    depth: null as number | null,
    alpha: null as number | null,
    position: null as { x: number; y: number } | null,
    destroyed: false,
    setDepth(value: number) {
      this.depth = value;
      return this;
    },
    setAlpha(value: number) {
      this.alpha = value;
      return this;
    },
    setPosition(x: number, y: number) {
      this.position = { x, y };
      return this;
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

describe('distantPlanetLayerLifecycle', () => {
  test('createPlanetLayer generates texture when missing and initializes state', () => {
    generatePlanetTexture.mockClear();
    const sprite = createImageStub();
    const removed: string[] = [];
    const scene = {
      textures: {
        exists: (_key: string) => false,
        remove: (key: string) => {
          removed.push(key);
        },
      },
      add: {
        image: (_x: number, _y: number, _key: string) => sprite,
      },
    };

    const state = createPlanetLayer(scene as never, { accentColor: 0x55aaff, nebulaColor: 0x112233 } as never, {
      width: 800,
      height: 600,
    });

    expect(generatePlanetTexture).toHaveBeenCalledTimes(1);
    expect(state.textureKey).toBe('planet-55aaff-112233-1200x1000');
    expect(state.baseX).toBe(400);
    expect(state.baseY).toBe(300);
    expect(state.baseAlpha).toBe(0.25);
    expect(sprite.depth).toBe(-11);
    expect(sprite.alpha).toBe(0.25);
    expect(removed).toEqual([]);
  });

  test('layoutPlanetLayer and destroyPlanetLayer update position and cleanup texture', () => {
    const sprite = createImageStub();
    const removed: string[] = [];
    const state = {
      sprite: sprite as never,
      textureKey: 'planet-key',
      baseX: 1,
      baseY: 2,
      baseAlpha: 0.25,
    };
    const scene = {
      textures: {
        exists: (key: string) => key === 'planet-key',
        remove: (key: string) => {
          removed.push(key);
        },
      },
    };

    layoutPlanetLayer(state as never, { width: 1000, height: 500 });
    expect(state.baseX).toBe(500);
    expect(state.baseY).toBe(250);
    expect(sprite.position).toEqual({ x: 500, y: 250 });

    const result = destroyPlanetLayer(scene as never, state as never);
    expect(result).toBeNull();
    expect(sprite.destroyed).toBe(true);
    expect(removed).toEqual(['planet-key']);
  });
});
