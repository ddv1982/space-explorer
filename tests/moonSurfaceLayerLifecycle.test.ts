import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({ default: {} }));

let generatedTexture = false;
const generateMoonSurfaceTexture = mock(() => {
  generatedTexture = true;
});
mock.module('../src/systems/parallax/moonSurfaceGenerator', () => ({
  generateMoonSurfaceTexture,
}));

const {
  createMoonSurfaceLayer,
  layoutMoonSurfaceLayer,
  destroyMoonSurfaceLayer,
} = await import('../src/systems/parallax/moonSurfaceLayerLifecycle');

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

describe('moonSurfaceLayerLifecycle', () => {
  test('createMoonSurfaceLayer returns null when config lacks moonSurface', () => {
    const scene = {
      textures: { exists: () => false },
      add: { image: () => createImageStub() },
    };

    const result = createMoonSurfaceLayer(scene as never, {} as never, { width: 800, height: 600 });
    expect(result).toBeNull();
    expect(generateMoonSurfaceTexture).not.toHaveBeenCalled();
  });

  test('create/layout/destroy preserve moon surface lifecycle behavior', () => {
    generateMoonSurfaceTexture.mockClear();
    generatedTexture = false;
    const sprite = createImageStub();
    const removed: string[] = [];
    const scene = {
      textures: {
        exists: (key: string) => generatedTexture && key === 'moon-surface-223344-55aaff-1100x700-v1',
        remove: (key: string) => {
          removed.push(key);
        },
      },
      add: {
        image: (_x: number, _y: number, _key: string) => sprite,
      },
    };

    const moonSurface = createMoonSurfaceLayer(
      scene as never,
      {
        moonSurface: {
          scrollSpeed: 0.5,
          surfaceColor: 0x223344,
          accentColor: 0x55aaff,
          buildingCount: 2,
          craterCount: 3,
          horizonGlow: 0.4,
        },
      } as never,
      { width: 800, height: 600 }
    );

    expect(generateMoonSurfaceTexture).toHaveBeenCalledTimes(1);
    expect(moonSurface?.textureKey).toBe('moon-surface-223344-55aaff-1100x700-v1');
    expect(moonSurface?.baseX).toBe(400);
    expect(moonSurface?.baseY).toBe(450);
    expect(moonSurface?.baseAlpha).toBe(0.45);
    expect(moonSurface?.motionSpeed).toBeCloseTo(0.00075, 8);
    expect(moonSurface?.motionAmplitude).toBe(50);
    expect(sprite.depth).toBe(-3);
    expect(sprite.alpha).toBe(0.45);

    layoutMoonSurfaceLayer(moonSurface ?? null, { width: 1000, height: 500 });
    expect(moonSurface?.baseX).toBe(500);
    expect(moonSurface?.baseY).toBe(375);
    expect(sprite.position).toEqual({ x: 500, y: 375 });

    const result = destroyMoonSurfaceLayer(scene as never, moonSurface ?? null);
    expect(result).toBeNull();
    expect(sprite.destroyed).toBe(true);
    expect(removed).toEqual(['moon-surface-223344-55aaff-1100x700-v1']);
  });
});
