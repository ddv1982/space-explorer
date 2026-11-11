import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();
mock.module('../src/ui/dom', () => ({
  h: () => chainable(),
  mountUiLayer: () => chainable(),
  setStatus: () => undefined,
}));

const { finishShipyardLoading } = await import('../src/utils/shipyardAssets');
const { SHIPYARD_SPRITES, SPRITE_DENSITY, sheetLayout } = await import('../src/config/shipyardSprites');

interface FakeFrame {
  cutWidth: number;
  cutHeight: number;
  source: { resolution: number };
  trim: number[] | null;
  setTrim: (...values: number[]) => void;
}

function frame(cutWidth: number, cutHeight: number): FakeFrame {
  const result: FakeFrame = {
    cutWidth,
    cutHeight,
    source: { resolution: 1 },
    trim: null,
    setTrim: (...values: number[]) => {
      result.trim = values;
    },
  };
  return result;
}

function chainable(): Record<string, unknown> {
  const proxy: Record<string, unknown> = new Proxy({}, { get: () => () => proxy });
  return proxy;
}

function createScene(options: { shrinkPlayerFrames?: boolean; oversizedScoutSheet?: boolean } = {}) {
  const removed: string[] = [];
  const textures = new Map<string, Record<string, unknown>>();
  for (const ship of SHIPYARD_SPRITES) {
    const layout = sheetLayout(ship, SPRITE_DENSITY);
    const width = options.shrinkPlayerFrames && ship.file === 'player' ? layout.frameWidth / 2 : layout.frameWidth;
    const frames = Array.from({ length: ship.frames }, () => frame(width, layout.frameHeight));
    textures.set(ship.key, {
      frames,
      firstFrame: '0',
      source: [
        {
          resolution: 1,
          width: options.oversizedScoutSheet && ship.file === 'scout' ? layout.sheetWidth * 2 : layout.sheetWidth,
          height: layout.sheetHeight,
        },
      ],
      dataSource: [{ resolution: 1 }],
      has: (name: string) => Number(name) < frames.length,
      get: (index: number) => frames[index],
    });
  }
  const scene = {
    textures: {
      exists: (key: string) => textures.has(key) && !removed.includes(key),
      get: (key: string) => textures.get(key),
      remove: (key: string) => removed.push(key),
    },
    scale: { width: 390, height: 844 },
    input: { keyboard: { once: () => {}, off: () => {} } },
    events: { once: () => {}, off: () => {} },
    scene: { restart: () => {} },
  };
  return { scene, textures, removed };
}

describe('shipyard sheet loading', () => {
  test('registers 9 player bank frames at logical 36x44 and defaults to the level frame', () => {
    const { scene, textures } = createScene();
    expect(finishShipyardLoading(scene as never)).toBe(true);
    const player = textures.get('player-ship') as {
      frames: FakeFrame[];
      firstFrame: string;
      source: [{ resolution: number }];
      dataSource: [{ resolution: number }];
    };
    expect(player.frames).toHaveLength(9);
    expect(
      player.frames.every((candidate) => JSON.stringify(candidate.trim) === JSON.stringify([36, 44, 0, 0, 36, 44]))
    ).toBe(true);
    expect(player.firstFrame).toBe('4');
    expect(player.source[0].resolution).toBe(SPRITE_DENSITY);
    expect(player.dataSource[0].resolution).toBe(SPRITE_DENSITY);
  });

  test('registers asteroid variants at logical 44x44 resting on the first rock', () => {
    const { scene, textures } = createScene();
    expect(finishShipyardLoading(scene as never)).toBe(true);
    const asteroid = textures.get('asteroid-texture') as { frames: FakeFrame[]; firstFrame: string };
    expect(asteroid.frames).toHaveLength(4);
    expect(asteroid.frames[3]!.trim).toEqual([44, 44, 0, 0, 44, 44]);
    expect(asteroid.firstFrame).toBe('0');
  });

  test('rejects a sheet with the wrong frame size and shows the retry screen', () => {
    const { scene, removed } = createScene({ shrinkPlayerFrames: true });
    expect(finishShipyardLoading(scene as never)).toBe(false);
    expect(removed).toContain('player-ship');
  });

  test('rejects a wrong, larger image even though it slices into correctly sized frames', () => {
    const { scene, removed } = createScene({ oversizedScoutSheet: true });
    expect(finishShipyardLoading(scene as never)).toBe(false);
    expect(removed).toEqual(['scout-texture']);
  });
});
