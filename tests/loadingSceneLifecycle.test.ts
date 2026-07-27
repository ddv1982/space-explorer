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

let startupQueue: Array<{ key: string; url: string }> = [];
mock.module('../src/systems/parallax/premiumBackgroundManifest', () => ({
  getStartupPremiumBackgroundPreloadQueue: () => startupQueue,
}));
mock.module('../src/utils/layout', () => ({
  getViewportLayout: () => ({ centerX: 400, centerY: 300 }),
}));
mock.module('../src/scenes/shared/registerRestartOnResize', () => ({
  registerRestartOnResize: mock(() => undefined),
}));

const { BootScene } = await import('../src/scenes/BootScene');
const { PreloadScene } = await import('../src/scenes/PreloadScene');

type PreloadHarness = {
  scene: InstanceType<typeof PreloadScene>;
  loadEvents: MockEmitter;
  lifecycleEvents: MockEmitter;
  displayedText: string[];
  imageCalls: Array<[string, string]>;
  startCalls: string[];
};

function createPreloadHarness(existingKeys: string[] = []): PreloadHarness {
  const scene = Object.create(PreloadScene.prototype) as InstanceType<typeof PreloadScene>;
  const loadEvents = new MockEmitter();
  const lifecycleEvents = new MockEmitter();
  const displayedText: string[] = [];
  const imageCalls: Array<[string, string]> = [];
  const startCalls: string[] = [];
  const existing = new Set(existingKeys);
  const text = {
    setOrigin: () => text,
    setText: (value: string) => {
      displayedText.push(value);
      return text;
    },
  };

  Object.assign(scene, {
    add: {
      text: (_x: number, _y: number, value: string) => {
        displayedText.push(value);
        return text;
      },
    },
    events: lifecycleEvents,
    load: Object.assign(loadEvents, {
      image: (key: string, url: string) => imageCalls.push([key, url]),
    }),
    scene: { start: (key: string) => startCalls.push(key) },
    textures: { exists: (key: string) => existing.has(key) },
  });

  return { scene, loadEvents, lifecycleEvents, displayedText, imageCalls, startCalls };
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

  test('queued assets update normalized progress and transition only at create', () => {
    startupQueue = [
      { key: 'queued', url: '/queued.png' },
      { key: 'cached', url: '/cached.png' },
    ];
    const harness = createPreloadHarness(['cached']);

    harness.scene.init();
    harness.scene.preload();
    expect(harness.imageCalls).toEqual([['queued', '/queued.png']]);
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

  test('empty or already-cached queue completes without a timeout', () => {
    startupQueue = [{ key: 'cached', url: '/cached.png' }];
    const harness = createPreloadHarness(['cached']);

    harness.scene.init();
    harness.scene.preload();
    harness.scene.create();

    expect(harness.imageCalls).toEqual([]);
    expect(harness.startCalls).toEqual(['Menu']);
    expect(harness.displayedText).toEqual(['LOADING... 0%']);
  });

  test('load errors do not fabricate completion progress', () => {
    startupQueue = [{ key: 'broken', url: '/broken.png' }];
    const harness = createPreloadHarness();

    harness.scene.init();
    harness.scene.preload();
    harness.loadEvents.emit('progress', 0.4);
    harness.loadEvents.emit('loaderror', { key: 'broken' });

    expect(harness.displayedText).toEqual(['LOADING... 0%', 'LOADING... 40%']);
    expect(harness.startCalls).toEqual([]);
  });

  test('shutdown removes old-run progress callbacks before recreate', () => {
    startupQueue = [{ key: 'queued', url: '/queued.png' }];
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
});
