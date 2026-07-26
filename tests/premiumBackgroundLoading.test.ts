import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const {
  ensurePremiumBackgroundAssets,
  releasePremiumBackgroundTexturesOutsideWindow,
} = await import('../src/systems/parallax/premiumBackgroundLoading');

function createSceneHarness(existingKeys: string[] = []) {
  const textures = new Map(existingKeys.map((key) => [key, true]));
  const queuedImages: Array<{ key: string; url: string }> = [];
  const completeHandlers: Array<() => void> = [];
  const fileErrorHandlers: Array<(file: { key?: string }) => void> = [];
  const sceneEventHandlers = new Map<string, Array<() => void>>();
  let loadStarted = false;
  let isLoading = false;

  const scene = {
    textures: {
      exists: (key: string) => textures.has(key),
      remove: (key: string) => {
        textures.delete(key);
      },
    },
    load: {
      image: (key: string, url: string) => {
        queuedImages.push({ key, url });
      },
      once: (event: string, handler: () => void) => {
        if (event === 'complete') {
          completeHandlers.push(handler);
        }
      },
      on: (event: string, handler: (file: { key?: string }) => void) => {
        if (event === 'loaderror') {
          fileErrorHandlers.push(handler);
        }
      },
      off: (event: string, handler: (...args: never[]) => void) => {
        if (event === 'complete') {
          const index = completeHandlers.indexOf(handler as () => void);
          if (index >= 0) {
            completeHandlers.splice(index, 1);
          }
        }
        if (event === 'loaderror') {
          const index = fileErrorHandlers.indexOf(handler as (file: { key?: string }) => void);
          if (index >= 0) {
            fileErrorHandlers.splice(index, 1);
          }
        }
      },
      isLoading: () => isLoading,
      start: () => {
        loadStarted = true;
        isLoading = true;
      },
    },
    events: {
      once: (event: string, handler: () => void) => {
        const handlers = sceneEventHandlers.get(event) ?? [];
        handlers.push(handler);
        sceneEventHandlers.set(event, handlers);
      },
      off: (event: string, handler: () => void) => {
        const handlers = sceneEventHandlers.get(event) ?? [];
        const index = handlers.indexOf(handler);
        if (index >= 0) {
          handlers.splice(index, 1);
        }
      },
    },
  };

  return {
    scene: scene as never,
    queuedImages,
    get loadStarted() {
      return loadStarted;
    },
    get completeHandlerCount() {
      return completeHandlers.length;
    },
    completeLoad: () => {
      for (const image of queuedImages) {
        textures.set(image.key, true);
      }
      isLoading = false;
      const handlers = [...completeHandlers];
      for (const handler of handlers) {
        handler();
      }
    },
    emitFileLoadError: (key: string) => {
      for (const handler of [...fileErrorHandlers]) {
        handler({ key });
      }
    },
    emitSceneShutdown: () => {
      const handlers = [...(sceneEventHandlers.get('shutdown') ?? [])];
      for (const handler of handlers) {
        handler();
      }
    },
    hasTexture: (key: string) => textures.has(key),
  };
}

describe('premium background loading helpers', () => {
  test('ensure skips the loader when the level window is already cached', () => {
    const harness = createSceneHarness(['bg_level05', 'bg_level06']);
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 5, onReady);

    expect(harness.queuedImages).toEqual([]);
    expect(harness.loadStarted).toBe(false);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(harness.hasTexture('bg_level01')).toBe(false);
  });

  test('ensure does not release outside-window textures by default (outgoing scene may still use them)', () => {
    const harness = createSceneHarness(['bg_level01', 'bg_level02', 'bg_level03']);
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 3, onReady);

    expect(harness.queuedImages.map((asset) => asset.key)).toEqual(['bg_level04']);
    expect(harness.loadStarted).toBe(true);
    expect(onReady).not.toHaveBeenCalled();

    harness.completeLoad();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(harness.hasTexture('bg_level01')).toBe(true);
    expect(harness.hasTexture('bg_level02')).toBe(true);
    expect(harness.hasTexture('bg_level03')).toBe(true);
    expect(harness.hasTexture('bg_level04')).toBe(true);
  });

  test('ensure can still release when explicitly requested', () => {
    const harness = createSceneHarness(['bg_level01', 'bg_level02', 'bg_level03']);
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 3, onReady, {
      releaseOutsideWindow: true,
    });

    harness.completeLoad();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(harness.hasTexture('bg_level03')).toBe(true);
    expect(harness.hasTexture('bg_level04')).toBe(true);
    expect(harness.hasTexture('bg_level01')).toBe(false);
    expect(harness.hasTexture('bg_level02')).toBe(false);
  });

  test('warm ensure keeps outside-window textures when release is disabled', () => {
    const harness = createSceneHarness(['bg_level01', 'bg_level02']);
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 2, onReady, {
      releaseOutsideWindow: false,
    });

    expect(harness.queuedImages.map((asset) => asset.key)).toEqual(['bg_level03']);
    harness.completeLoad();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(harness.hasTexture('bg_level01')).toBe(true);
    expect(harness.hasTexture('bg_level02')).toBe(true);
    expect(harness.hasTexture('bg_level03')).toBe(true);
  });

  test('shutdown mid-load aborts without calling onReady', () => {
    const harness = createSceneHarness(['bg_level01', 'bg_level02']);
    const onReady = mock();

    ensurePremiumBackgroundAssets(harness.scene, 3, onReady);
    expect(harness.loadStarted).toBe(true);

    harness.emitSceneShutdown();
    harness.completeLoad();

    expect(onReady).not.toHaveBeenCalled();
    expect(harness.completeHandlerCount).toBe(0);
  });

  test('file load errors are tolerated and COMPLETE still finishes', () => {
    const harness = createSceneHarness(['bg_level01']);
    const onReady = mock();
    const warn = mock();
    const originalWarn = console.warn;
    console.warn = warn;

    try {
      ensurePremiumBackgroundAssets(harness.scene, 1, onReady);
      harness.emitFileLoadError('bg_level02');
      harness.completeLoad();
    } finally {
      console.warn = originalWarn;
    }

    expect(warn).toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  test('release removes only textures outside the active window', () => {
    const harness = createSceneHarness([
      'bg_level01',
      'bg_level02',
      'bg_level03',
      'bg_level04',
    ]);

    releasePremiumBackgroundTexturesOutsideWindow(harness.scene, 3);

    expect(harness.hasTexture('bg_level01')).toBe(false);
    expect(harness.hasTexture('bg_level02')).toBe(false);
    expect(harness.hasTexture('bg_level03')).toBe(true);
    expect(harness.hasTexture('bg_level04')).toBe(true);
  });
});
