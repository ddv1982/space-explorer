import { describe, expect, mock, test } from 'bun:test';

type Listener = (...args: unknown[]) => void;

class MockEmitter {
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly oneShotListeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): this {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  once(event: string, listener: Listener): this {
    const listeners = this.oneShotListeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.oneShotListeners.set(event, listeners);
    return this;
  }

  off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    this.oneShotListeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      listener(...args);
    }

    const oneShot = [...(this.oneShotListeners.get(event) ?? [])];
    this.oneShotListeners.delete(event);
    for (const listener of oneShot) {
      listener(...args);
    }
  }

  listenerCount(event: string): number {
    return (this.listeners.get(event)?.size ?? 0) + (this.oneShotListeners.get(event)?.size ?? 0);
  }
}

mock.module('phaser', () => ({
  default: {
    Scene: class {},
    Loader: { Events: { PROGRESS: 'progress' } },
    Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
  },
}));

let ensuredLevels: number[] = [];
mock.module('../src/systems/parallax/premiumBackgroundLoading', () => ({
  ensurePremiumBackgroundAssets: (_scene: unknown, level: number, onReady: () => void) => {
    ensuredLevels.push(level);
    onReady();
  },
}));
mock.module('../src/utils/layout', () => ({
  getViewportLayout: () => ({ centerX: 400, centerY: 300 }),
}));
mock.module('../src/scenes/shared/registerRestartOnResize', () => ({
  registerRestartOnResize: mock(() => undefined),
}));

const { BootScene } = await import('../src/scenes/BootScene');
const { PreloadScene } = await import('../src/scenes/PreloadScene');
const { getTotalLevels } = await import('../src/config/LevelsConfig');

type PreloadHarness = {
  scene: InstanceType<typeof PreloadScene>;
  loadEvents: MockEmitter;
  lifecycleEvents: MockEmitter;
  displayedText: string[];
  startCalls: string[];
  queuedImages: Array<{ key: string; url: string }>;
  delayedCalls: Array<() => void>;
};

function createPreloadHarness(): PreloadHarness {
  const scene = Object.create(PreloadScene.prototype) as InstanceType<typeof PreloadScene>;
  const loadEvents = new MockEmitter();
  const lifecycleEvents = new MockEmitter();
  const displayedText: string[] = [];
  const startCalls: string[] = [];
  const queuedImages: Array<{ key: string; url: string }> = [];
  const delayedCalls: Array<() => void> = [];
  const text = {
    setOrigin: () => text,
    setText: (value: string) => {
      displayedText.push(value);
      return text;
    },
  };

  Object.assign(loadEvents, {
    list: new Set(),
    inflight: new Set(),
    queue: new Set(),
    image: (key: string, url: string) => {
      queuedImages.push({ key, url });
    },
  });

  Object.assign(scene, {
    lifecycleGeneration: 0,
    add: {
      text: (_x: number, _y: number, value: string) => {
        displayedText.push(value);
        return text;
      },
    },
    events: lifecycleEvents,
    load: loadEvents,
    textures: { exists: () => false },
    scene: { start: (key: string) => startCalls.push(key) },
    time: {
      delayedCall: (_delay: number, callback: () => void) => {
        delayedCalls.push(callback);
      },
    },
  });

  return { scene, loadEvents, lifecycleEvents, displayedText, startCalls, queuedImages, delayedCalls };
}

describe('boot and preload loader lifecycle', () => {
  test('Boot advances immediately at Phaser create and only once per run', () => {
    const scene = Object.create(BootScene.prototype) as InstanceType<typeof BootScene>;
    const startCalls: string[] = [];
    Object.assign(scene, { scene: { start: (key: string) => startCalls.push(key) } });

    scene.init();
    scene.create();
    scene.create();

    expect(startCalls).toEqual(['Preload']);
  });

  test('warms the first level window via procedural generation and transitions at create', () => {
    ensuredLevels = [];
    const harness = createPreloadHarness();

    harness.scene.init();
    harness.scene.preload();
    expect(ensuredLevels).toEqual([1]);
    expect(harness.startCalls).toEqual([]);

    harness.loadEvents.emit('progress', -0.2);
    harness.loadEvents.emit('progress', 0.425);
    harness.loadEvents.emit('progress', 1.2);
    expect(harness.displayedText).toEqual([
      'LOADING... 0%',
      'LOADING... 0%',
      'LOADING... 43%',
      'LOADING... 100%',
    ]);
    expect(harness.startCalls).toEqual([]);

    harness.scene.create();
    harness.scene.create();
    expect(harness.startCalls).toEqual(['Menu']);
    expect(harness.loadEvents.listenerCount('progress')).toBe(0);
  });

  test('queues the authored planet portrait set for intermissions', () => {
    const harness = createPreloadHarness();

    harness.scene.init();
    harness.scene.preload();

    const totalLevels = getTotalLevels();
    expect(harness.queuedImages).toHaveLength(totalLevels);
    expect(harness.queuedImages.map((image) => image.key)).toEqual(
      Array.from(
        { length: totalLevels },
        (_, index) => `planet-portrait-${String(index + 1).padStart(2, '0')}`
      )
    );
    expect(harness.queuedImages[0].url).toBe('/assets/planets/planet-01.webp');
    expect(harness.queuedImages.at(-1)?.url).toBe(
      `/assets/planets/planet-${String(totalLevels).padStart(2, '0')}.webp`
    );
  });

  test('create completes the transition without requiring loader progress', () => {
    ensuredLevels = [];
    const harness = createPreloadHarness();

    harness.scene.init();
    harness.scene.preload();
    harness.scene.create();

    expect(ensuredLevels).toEqual([1]);
    expect(harness.startCalls).toEqual(['Menu']);
    expect(harness.displayedText).toEqual(['LOADING... 0%']);
  });

  test('shutdown removes old-run progress callbacks before recreate', () => {
    ensuredLevels = [];
    const harness = createPreloadHarness();

    harness.scene.init();
    harness.scene.preload();
    harness.loadEvents.emit('progress', 0.25);
    harness.lifecycleEvents.emit('shutdown');
    harness.loadEvents.emit('progress', 0.75);
    expect(harness.displayedText).toEqual(['LOADING... 0%', 'LOADING... 25%']);

    harness.scene.init();
    harness.scene.preload();
    expect(harness.loadEvents.listenerCount('progress')).toBe(1);
    harness.loadEvents.emit('progress', 0.5);
    expect(harness.displayedText.at(-1)).toBe('LOADING... 50%');
  });

  test('ignores font completion from an obsolete preload lifecycle', async () => {
    const harness = createPreloadHarness();
    let resolveFirstFonts!: () => void;
    const firstFonts = new Promise<void>((resolve) => {
      resolveFirstFonts = resolve;
    });

    harness.scene.init();
    Object.assign(harness.scene, { fontsReady: firstFonts });
    harness.scene.create();
    harness.lifecycleEvents.emit('shutdown');

    harness.scene.init();
    Object.assign(harness.scene, { fontsReady: null });
    harness.scene.create();
    resolveFirstFonts();
    await firstFonts;
    await Promise.resolve();

    expect(harness.startCalls).toEqual(['Menu']);
  });

  test('ignores timeout completion from an obsolete preload lifecycle', () => {
    const harness = createPreloadHarness();

    harness.scene.init();
    Object.assign(harness.scene, { fontsReady: new Promise<void>(() => {}) });
    harness.scene.create();
    const staleTimeout = harness.delayedCalls[0];
    harness.lifecycleEvents.emit('shutdown');

    harness.scene.init();
    Object.assign(harness.scene, { fontsReady: null });
    harness.scene.create();
    staleTimeout();

    expect(harness.startCalls).toEqual(['Menu']);
  });

  test('starts Menu exactly once whether timeout or font completion wins', async () => {
    for (const winner of ['timeout', 'fonts'] as const) {
      const harness = createPreloadHarness();
      let resolveFonts!: () => void;
      const fontsReady = new Promise<void>((resolve) => {
        resolveFonts = resolve;
      });

      harness.scene.init();
      Object.assign(harness.scene, { fontsReady });
      harness.scene.create();

      if (winner === 'timeout') {
        harness.delayedCalls[0]();
        resolveFonts();
        await fontsReady;
        await Promise.resolve();
      } else {
        resolveFonts();
        await fontsReady;
        await Promise.resolve();
        harness.delayedCalls[0]();
      }

      expect(harness.startCalls).toEqual(['Menu']);
    }
  });
});
