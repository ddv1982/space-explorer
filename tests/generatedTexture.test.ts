import { describe, expect, test } from 'bun:test';

import { withGeneratedTexture } from '../src/utils/generatedTexture';

describe('generated texture supersampling', () => {
  test('raises source density while preserving logical frame metadata', () => {
    const calls: Array<[string, number, number]> = [];
    const frame = {
      source: { resolution: 1 },
      data: {
        sourceSize: { w: 72, h: 88 },
        spriteSourceSize: { w: 72, h: 88, r: 72, b: 88 },
        radius: 0,
      },
    };
    const graphics = {
      scale: 1,
      setScale(value: number) {
        this.scale = value;
        return this;
      },
      generateTexture(key: string, width: number, height: number) {
        calls.push([key, width, height]);
      },
      destroy() {},
    };
    const scene = {
      textures: {
        exists: () => false,
        get: () => ({ get: () => frame }),
      },
      add: { graphics: () => graphics },
    };

    withGeneratedTexture(scene as never, 'player', 36, 44, () => {}, { resolution: 2 });

    expect(graphics.scale).toBe(2);
    expect(calls).toEqual([['player', 72, 88]]);
    expect(frame.source.resolution).toBe(2);
    expect(frame.data.sourceSize).toEqual({ w: 36, h: 44 });
    expect(frame.data.spriteSourceSize).toEqual({ w: 36, h: 44, r: 36, b: 44 });
  });
});
