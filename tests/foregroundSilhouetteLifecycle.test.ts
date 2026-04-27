import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Math: {
      FloatBetween: () => 0.5,
      Clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
    },
  },
}));

async function loadForegroundSilhouetteLifecycle() {
  return await import(
    `../src/systems/parallax/foregroundSilhouetteLifecycle?isolation=${Math.random()}`
  );
}

type SpriteStub = {
  texture: { key: string };
  depth: number | null;
  alpha: number | null;
  destroyed: boolean;
  setDepth: (value: number) => SpriteStub;
  setAlpha: (value: number) => SpriteStub;
  destroy: () => void;
};

function createSpriteStub(textureKey: string): SpriteStub {
  return {
    texture: { key: textureKey },
    depth: null,
    alpha: null,
    destroyed: false,
    setDepth(value: number) {
      this.depth = value;
      return this;
    },
    setAlpha(value: number) {
      this.alpha = value;
      return this;
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

describe('foregroundSilhouetteLifecycle', () => {
  test('create records texture ownership and destroy removes only owned/generated textures', async () => {
    const silhouettes: Array<{
      sprite: SpriteStub;
      textureKey: string;
      ownsTexture: boolean;
    }> = [];
    const generated: string[] = [];
    const removed: string[] = [];
    const existingAtCreate = new Set<string>();
    const existingNow = new Set<string>();

    const scene = {
      textures: {
        exists: (key: string) => existingNow.has(key),
        remove: (key: string) => {
          removed.push(key);
          existingNow.delete(key);
        },
      },
      add: {
        graphics: () => ({
          fillStyle: () => undefined,
          beginPath: () => undefined,
          moveTo: () => undefined,
          lineTo: () => undefined,
          closePath: () => undefined,
          fillPath: () => undefined,
          generateTexture: (key: string) => {
            generated.push(key);
            existingNow.add(key);
          },
          destroy: () => undefined,
        }),
        image: (_x: number, _y: number, key: string) => createSpriteStub(key),
      },
    } as unknown as Phaser.Scene;

    const leftKey = 'foreground-silhouette-left-110x372-55aaff';
    existingAtCreate.add(leftKey);
    existingNow.add(leftKey);

    const { createForegroundSilhouettes, destroyForegroundSilhouettes } =
      await loadForegroundSilhouetteLifecycle();

    createForegroundSilhouettes(
      scene,
      { accentColor: 0x55aaff } as never,
      { width: 800, height: 600 },
      silhouettes as never
    );

    expect(silhouettes).toHaveLength(2);
    expect(silhouettes[0].textureKey).toBe(leftKey);
    expect(silhouettes[0].ownsTexture).toBe(false);
    expect(silhouettes[1].textureKey).toBe('foreground-silhouette-right-128x408-55aaff');
    expect(silhouettes[1].ownsTexture).toBe(true);
    expect(generated).toEqual(['foreground-silhouette-right-128x408-55aaff']);

    destroyForegroundSilhouettes(scene, silhouettes as never);

    expect(removed).toEqual(['foreground-silhouette-right-128x408-55aaff']);
    expect(existingNow.has(leftKey)).toBe(true);
    expect(existingNow.has('foreground-silhouette-right-128x408-55aaff')).toBe(false);
    expect(silhouettes).toHaveLength(0);
  });
});
