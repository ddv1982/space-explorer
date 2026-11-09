import { describe, expect, mock, test } from 'bun:test';

type MutableCanvasPool = {
  create2D: (parent: unknown, width?: number, height?: number) => HTMLCanvasElement;
  remove: (canvas: unknown) => void;
};

const canvasPool: MutableCanvasPool = {
  create2D: () => {
    throw new Error('Unexpected CanvasPool.create2D call');
  },
  remove: () => {
    throw new Error('Unexpected CanvasPool.remove call');
  },
};

mock.module('phaser', () => ({
  default: { Display: { Canvas: { CanvasPool: canvasPool } } },
}));

const { withCanvasTexture, withGeneratedTexture } = await import('../src/utils/generatedTexture');

function fakeContext() {
  const calls: string[] = [];
  return {
    calls,
    context: {
      clearRect: () => calls.push('clear'),
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
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
  test('bakes the graphics into the key at its size and destroys them', () => {
    const generated: Array<[string, number, number]> = [];
    let destroyed = false;
    const graphics = {
      generateTexture: (key: string, width: number, height: number) => generated.push([key, width, height]),
      destroy: () => (destroyed = true),
    };
    const result = withGeneratedTexture(
      { textures: { exists: () => false }, add: { graphics: () => graphics } } as never,
      'direct',
      36,
      44,
      () => {}
    );
    expect(result).toBe('direct');
    expect(generated).toEqual([['direct', 36, 44]]);
    expect(destroyed).toBe(true);
  });

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
  test('paints at density in logical units and registers a logical-size frame', () => {
    const { context, calls } = fakeContext();
    const canvas = { width: 0, height: 0, getContext: () => context };
    const frame = fakeFrame();
    const source = { resolution: 1 };
    let allocated: [number?, number?] = [];
    canvasPool.create2D = (_parent, width, height) => {
      allocated = [width, height];
      canvas.width = width ?? 0;
      canvas.height = height ?? 0;
      return canvas as never;
    };
    const drawnSize: number[] = [];
    const scene = {
      textures: {
        exists: () => false,
        addCanvas: () => ({ source: [source], dataSource: [], get: () => frame }),
      },
    };

    withCanvasTexture(scene as never, 'bolt', 14, 30, (_context, width, height) => drawnSize.push(width, height), 4);

    expect(allocated).toEqual([56, 120]);
    expect(calls).toEqual(['clear', 'save', 'scale 4 4', 'restore']);
    expect(drawnSize).toEqual([14, 30]);
    expect(source.resolution).toBe(4);
    expect(frame.trim).toEqual([14, 30, 0, 0, 14, 30]);
  });

  test('returns the canvas to the pool when registration fails', () => {
    const { context } = fakeContext();
    const canvas = { width: 8, height: 8, getContext: () => context };
    let removed: unknown = null;
    canvasPool.create2D = () => canvas as never;
    canvasPool.remove = (target) => (removed = target);
    const scene = { textures: { exists: () => false, addCanvas: () => null } };

    expect(() => withCanvasTexture(scene as never, 'lost', 8, 8, () => {})).toThrow('Unable to register');
    expect(removed).toBe(canvas);
  });

  test('is idempotent when the texture key already exists', () => {
    let drew = false;
    const scene = { textures: { exists: () => true } };
    expect(withCanvasTexture(scene as never, 'existing', 8, 8, () => (drew = true))).toBe('existing');
    expect(drew).toBe(false);
  });
});
