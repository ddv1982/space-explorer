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

const { withGeneratedTexture } = await import('../src/utils/generatedTexture');

function makeGraphics(generated: Array<[unknown, number, number]>) {
  return {
    scale: 1,
    destroyed: false,
    setScale(value: number) {
      this.scale = value;
      return this;
    },
    generateTexture(target: unknown, width: number, height: number) {
      generated.push([target, width, height]);
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

describe('generated texture supersampling', () => {
  test('resolves into an owned logical canvas and transfers ownership on registration', () => {
    const originalCreate2D = canvasPool.create2D;
    const originalRemove = canvasPool.remove;
    const generated: Array<[unknown, number, number]> = [];
    const graphics = makeGraphics(generated);
    const drawCanvas = {} as HTMLCanvasElement;
    const resolvedDraws: unknown[][] = [];
    const context = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low' as ImageSmoothingQuality,
      save() {},
      restore() {},
      clearRect() {},
      drawImage(...args: unknown[]) {
        resolvedDraws.push(args);
      },
    };
    const resolvedCanvas = {
      getContext: (type: string) => (type === '2d' ? context : null),
    } as unknown as HTMLCanvasElement;
    const poolCreates: Array<[unknown, number | undefined, number | undefined]> = [];
    const poolRemoves: unknown[] = [];
    const added: Array<[string, HTMLCanvasElement]> = [];
    const textures = {
      exists: () => false,
      addCanvas(key: string, canvas: HTMLCanvasElement) {
        added.push([key, canvas]);
        return {};
      },
    };
    const canvases = [drawCanvas, resolvedCanvas];
    canvasPool.create2D = (parent, width, height) => {
      poolCreates.push([parent, width, height]);
      return canvases.shift()!;
    };
    canvasPool.remove = (canvas) => poolRemoves.push(canvas);

    try {
      withGeneratedTexture({ textures, add: { graphics: () => graphics } } as never, 'player', 36, 44, () => {}, {
        resolution: 2,
      });
    } finally {
      canvasPool.create2D = originalCreate2D;
      canvasPool.remove = originalRemove;
    }

    expect(poolCreates).toEqual([
      [graphics, 72, 88],
      [textures, 36, 44],
    ]);
    expect(graphics.scale).toBe(2);
    expect(generated).toEqual([[drawCanvas, 72, 88]]);
    expect(resolvedDraws).toEqual([[drawCanvas, 0, 0, 72, 88, 0, 0, 36, 44]]);
    expect(context.imageSmoothingEnabled).toBe(true);
    expect(context.imageSmoothingQuality).toBe('high');
    expect(added).toEqual([['player', resolvedCanvas]]);
    expect(poolRemoves).toEqual([drawCanvas]);
    expect(graphics.destroyed).toBe(true);
  });

  test('directly releases the logical canvas when construction fails before registration', () => {
    const originalCreate2D = canvasPool.create2D;
    const originalRemove = canvasPool.remove;
    const generated: Array<[unknown, number, number]> = [];
    const graphics = makeGraphics(generated);
    const drawCanvas = {} as HTMLCanvasElement;
    const context = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low' as ImageSmoothingQuality,
      save() {},
      restore() {},
      clearRect() {},
      drawImage() {},
    };
    const logicalCanvas = { getContext: () => context } as unknown as HTMLCanvasElement;
    const failure = new Error('CanvasTexture constructor failed');
    const removed: unknown[] = [];
    const canvases = [drawCanvas, logicalCanvas];
    canvasPool.create2D = () => canvases.shift()!;
    canvasPool.remove = (canvas) => removed.push(canvas);
    const scene = {
      textures: {
        exists: () => false,
        addCanvas: () => {
          throw failure;
        },
      },
      add: { graphics: () => graphics },
    };

    try {
      expect(() => withGeneratedTexture(scene as never, 'failed', 20, 24, () => {}, { resolution: 2 })).toThrow(
        failure
      );
    } finally {
      canvasPool.create2D = originalCreate2D;
      canvasPool.remove = originalRemove;
    }

    expect(removed).toEqual([logicalCanvas, drawCanvas]);
    expect(graphics.destroyed).toBe(true);
  });

  test('removes by key after registration when an ADD listener throws', () => {
    const originalCreate2D = canvasPool.create2D;
    const originalRemove = canvasPool.remove;
    const graphics = makeGraphics([]);
    const drawCanvas = {} as HTMLCanvasElement;
    const context = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low' as ImageSmoothingQuality,
      save() {},
      restore() {},
      clearRect() {},
      drawImage() {},
    };
    const logicalCanvas = { getContext: () => context } as unknown as HTMLCanvasElement;
    const failure = new Error('ADD listener failed');
    const released: unknown[] = [];
    const removedKeys: unknown[] = [];
    const canvases = [drawCanvas, logicalCanvas];
    let registered = false;
    canvasPool.create2D = () => canvases.shift()!;
    canvasPool.remove = (canvas) => released.push(canvas);
    const scene = {
      textures: {
        exists: () => registered,
        addCanvas: () => {
          registered = true;
          throw failure;
        },
        remove(key: unknown) {
          removedKeys.push(key);
          registered = false;
          // CanvasTexture destruction, rather than this utility, returns its canvas.
          canvasPool.remove(logicalCanvas);
        },
      },
      add: { graphics: () => graphics },
    };

    try {
      expect(() => withGeneratedTexture(scene as never, 'listener', 20, 24, () => {}, { resolution: 2 })).toThrow(
        failure
      );
    } finally {
      canvasPool.create2D = originalCreate2D;
      canvasPool.remove = originalRemove;
    }

    expect(removedKeys).toEqual(['listener']);
    expect(released).toEqual([logicalCanvas, drawCanvas]);
    expect(registered).toBe(false);
    expect(graphics.destroyed).toBe(true);
  });

  test('preserves a generation exception while still attempting all cleanup', () => {
    const originalCreate2D = canvasPool.create2D;
    const originalRemove = canvasPool.remove;
    const failure = new Error('generation failed');
    const drawCanvas = {} as HTMLCanvasElement;
    let poolCleanupAttempted = false;
    let graphicsCleanupAttempted = false;
    const graphics = {
      setScale() {
        return this;
      },
      generateTexture() {
        throw failure;
      },
      destroy() {
        graphicsCleanupAttempted = true;
        throw new Error('graphics cleanup failed');
      },
    };
    canvasPool.create2D = () => drawCanvas;
    canvasPool.remove = () => {
      poolCleanupAttempted = true;
      throw new Error('pool cleanup failed');
    };

    try {
      expect(() =>
        withGeneratedTexture(
          { textures: { exists: () => false }, add: { graphics: () => graphics } } as never,
          'failed-generation',
          20,
          24,
          () => {},
          { resolution: 2 }
        )
      ).toThrow(failure);
    } finally {
      canvasPool.create2D = originalCreate2D;
      canvasPool.remove = originalRemove;
    }

    expect(poolCleanupAttempted).toBe(true);
    expect(graphicsCleanupAttempted).toBe(true);
  });

  test('uses the direct generateTexture path at resolution one', () => {
    const originalCreate2D = canvasPool.create2D;
    const generated: Array<[unknown, number, number]> = [];
    const graphics = makeGraphics(generated);
    let allocations = 0;
    let registrations = 0;
    canvasPool.create2D = () => {
      allocations += 1;
      return {} as HTMLCanvasElement;
    };
    const scene = {
      textures: {
        exists: () => false,
        addCanvas: () => {
          registrations += 1;
        },
      },
      add: { graphics: () => graphics },
    };

    try {
      withGeneratedTexture(scene as never, 'direct', 36, 44, () => {}, { resolution: 1 });
    } finally {
      canvasPool.create2D = originalCreate2D;
    }

    expect(generated).toEqual([['direct', 36, 44]]);
    expect(allocations).toBe(0);
    expect(registrations).toBe(0);
    expect(graphics.scale).toBe(1);
    expect(graphics.destroyed).toBe(true);
  });

  test('is idempotent when the texture key already exists', () => {
    let graphicsCreated = 0;
    let drew = false;
    const result = withGeneratedTexture(
      {
        textures: { exists: (key: string) => key === 'existing' },
        add: {
          graphics: () => {
            graphicsCreated += 1;
          },
        },
      } as never,
      'existing',
      36,
      44,
      () => {
        drew = true;
      },
      { resolution: 3 }
    );

    expect(result).toBe('existing');
    expect(graphicsCreated).toBe(0);
    expect(drew).toBe(false);
  });
});
