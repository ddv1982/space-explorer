import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));

const ensureStarfieldTexture = mock();
mock.module('../src/systems/parallax/starfieldTextureGenerator', () => ({
  ensureStarfieldTexture,
}));

const { createStarfieldTileSprites, layoutStarfieldTileSprites, destroyStarfieldTileSprites, STARFIELD_TILE_DEPTHS } = await import(
  '../src/systems/parallax/starfieldTileSpriteLifecycle'
);

function createTileSprite() {
  return {
    origin: null as number | null,
    depth: null as number | null,
    destroyed: false,
    width: 0,
    height: 0,
    setOrigin(value: number) {
      this.origin = value;
      return this;
    },
    setDepth(value: number) {
      this.depth = value;
      return this;
    },
    setPosition(_x: number, _y: number) {
      return this;
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

describe('starfieldTileSpriteLifecycle', () => {
  test('createStarfieldTileSprites creates one tile per layer with expected depths', () => {
    ensureStarfieldTexture.mockClear();
    const created: ReturnType<typeof createTileSprite>[] = [];
    const scene = {
      add: {
        tileSprite: (_x: number, _y: number, width: number, height: number, _key: string) => {
          const tile = createTileSprite();
          tile.width = width;
          tile.height = height;
          created.push(tile);
          return tile as never;
        },
      },
    };

    const tiles = createStarfieldTileSprites(scene as never, { accentColor: 0x55aaff } as never, 800, 600);

    expect(tiles).toHaveLength(4);
    expect(created.map((tile) => tile.origin)).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(created.map((tile) => tile.depth)).toEqual(STARFIELD_TILE_DEPTHS);
    expect(created.map((tile) => [tile.width, tile.height])).toEqual([
      [800, 600],
      [800, 600],
      [800, 600],
      [800, 600],
    ]);
    expect(ensureStarfieldTexture).toHaveBeenCalledTimes(4);
  });

  test('destroyStarfieldTileSprites destroys all tiles and returns an empty array', () => {
    const tiles = [createTileSprite(), createTileSprite()];

    const result = destroyStarfieldTileSprites(tiles as never);

    expect(result).toEqual([]);
    expect(tiles[0]?.destroyed).toBe(true);
    expect(tiles[1]?.destroyed).toBe(true);
  });
});
