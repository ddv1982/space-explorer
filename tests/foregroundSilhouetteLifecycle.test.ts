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
  test('createForegroundSilhouettes is a no-op', async () => {
    const silhouettes: Array<{
      sprite: SpriteStub;
      textureKey: string;
      ownsTexture: boolean;
    }> = [];
    const generated: string[] = [];
    let graphicsCalls = 0;
    let imageCalls = 0;

    const scene = {
      textures: {
        exists: () => false,
        remove: () => undefined,
      },
      add: {
        graphics: () => {
          graphicsCalls += 1;
          return {
            fillStyle: () => undefined,
            beginPath: () => undefined,
            moveTo: () => undefined,
            lineTo: () => undefined,
            closePath: () => undefined,
            fillPath: () => undefined,
            fillEllipse: () => undefined,
            generateTexture: (key: string) => {
              generated.push(key);
            },
            destroy: () => undefined,
          };
        },
        image: (_x: number, _y: number, key: string) => {
          imageCalls += 1;
          return createSpriteStub(key);
        },
      },
    } as unknown as Phaser.Scene;

    const { createForegroundSilhouettes } = await loadForegroundSilhouetteLifecycle();

    createForegroundSilhouettes(
      scene,
      { accentColor: 0x55aaff } as never,
      { width: 800, height: 600 },
      silhouettes as never
    );

    expect(silhouettes).toHaveLength(0);
    expect(generated).toHaveLength(0);
    expect(graphicsCalls).toBe(0);
    expect(imageCalls).toBe(0);
  });

  test('destroyForegroundSilhouettes removes only owned/generated textures', async () => {
    const borrowedSprite = createSpriteStub('borrowed');
    const ownedSprite = createSpriteStub('owned');
    const silhouettes = [
      {
        sprite: borrowedSprite,
        textureKey: 'borrowed',
        ownsTexture: false,
      },
      {
        sprite: ownedSprite,
        textureKey: 'owned',
        ownsTexture: true,
      },
    ];
    const removed: string[] = [];
    const existingNow = new Set(['borrowed', 'owned']);

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
          fillEllipse: () => undefined,
          generateTexture: () => undefined,
          destroy: () => undefined,
        }),
        image: (_x: number, _y: number, key: string) => createSpriteStub(key),
      },
    } as unknown as Phaser.Scene;

    const { destroyForegroundSilhouettes } = await loadForegroundSilhouetteLifecycle();

    destroyForegroundSilhouettes(scene, silhouettes as never);

    expect(borrowedSprite.destroyed).toBe(true);
    expect(ownedSprite.destroyed).toBe(true);
    expect(removed).toEqual(['owned']);
    expect(existingNow.has('borrowed')).toBe(true);
    expect(existingNow.has('owned')).toBe(false);
    expect(silhouettes).toHaveLength(0);
  });
});
