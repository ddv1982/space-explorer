import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({ default: {} }));

const { withCanvasTexture, withGeneratedTexture } = await import('../src/utils/generatedTexture');

function fakeContext() {
  const calls: string[] = [];
  return {
    calls,
    context: {
      scale: (x: number, y: number) => calls.push(`scale ${x} ${y}`),
    },
  };
}

function fakeFrame() {
  const frame: { trim: number[] | null; setTrim: (...values: number[]) => void } = {
    trim: null,
    setTrim: (...values) => {
      frame.trim = values;
    },
  };
  return frame;
}

describe('withGeneratedTexture', () => {
  test('preserves a draw exception even when cleanup also throws', () => {
    const failure = new Error('draw failed');
    const graphics = {
      generateTexture: () => {},
      destroy: () => {
        throw new Error('cleanup failed');
      },
    };
    expect(() =>
      withGeneratedTexture(
        { textures: { exists: () => false }, add: { graphics: () => graphics } } as never,
        'broken',
        10,
        10,
        () => {
          throw failure;
        }
      )
    ).toThrow(failure);
  });

  test('is idempotent when the texture key already exists', () => {
    let drew = false;
    const result = withGeneratedTexture(
      { textures: { exists: () => true }, add: { graphics: () => ({}) } } as never,
      'existing',
      36,
      44,
      () => (drew = true)
    );
    expect(result).toBe('existing');
    expect(drew).toBe(false);
  });
});

describe('withCanvasTexture', () => {
  function stubCanvas() {
    const { context, calls } = fakeContext();
    const canvas = { width: 0, height: 0, getContext: () => context };
    const previous = globalThis.document;
    globalThis.document = { createElement: () => canvas } as never;
    return { canvas, calls, restore: () => (globalThis.document = previous) };
  }

  test('paints at density in logical units and registers a logical-size frame', () => {
    const { canvas, calls, restore } = stubCanvas();
    const frame = fakeFrame();
    const source = { resolution: 1 };
    let registered: unknown[] = [];
    let baseFrame: unknown[] = [];
    const drawnSize: number[] = [];
    const scene = {
      textures: {
        exists: () => false,
        create: (...args: unknown[]) => {
          registered = args;
          return { source: [source], dataSource: [], add: (...cut: unknown[]) => (baseFrame = cut), get: () => frame };
        },
      },
    };

    try {
      withCanvasTexture(scene as never, 'bolt', 14, 30, (_context, width, height) => drawnSize.push(width, height), 4);
    } finally {
      restore();
    }

    expect(registered).toEqual(['bolt', canvas, 56, 120]);
    expect(baseFrame).toEqual(['__BASE', 0, 0, 0, 56, 120]);
    expect(calls).toEqual(['scale 4 4']);
    expect(drawnSize).toEqual([14, 30]);
    expect(source.resolution).toBe(4);
    expect(frame.trim).toEqual([14, 30, 0, 0, 14, 30]);
  });

  test('throws when the texture cannot be registered', () => {
    const { restore } = stubCanvas();
    const scene = { textures: { exists: () => false, create: () => null } };
    try {
      expect(() => withCanvasTexture(scene as never, 'lost', 8, 8, () => {})).toThrow('Unable to register');
    } finally {
      restore();
    }
  });
});
