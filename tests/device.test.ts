import { afterEach, describe, expect, test } from 'bun:test';

type WindowStub = {
  innerWidth: number;
  innerHeight: number;
  visualViewport?: { width: number; height: number };
  matchMedia: (query: string) => { matches: boolean };
};

const originalWindow = globalThis.window;
const originalNavigator = globalThis.navigator;

function installEnvironment(options: {
  width: number;
  height: number;
  coarsePointer: boolean;
  orientation?: 'portrait' | 'landscape';
  touchPoints?: number;
}): void {
  const orientation = options.orientation ?? (options.height > options.width ? 'portrait' : 'landscape');
  const windowStub: WindowStub = {
    innerWidth: options.width,
    innerHeight: options.height,
    visualViewport: { width: options.width, height: options.height },
    matchMedia: (query: string) => ({
      matches:
        (query === '(pointer: coarse)' && options.coarsePointer) ||
        (query === '(orientation: portrait)' && orientation === 'portrait'),
    }),
  };

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: windowStub,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { maxTouchPoints: options.touchPoints ?? (options.coarsePointer ? 5 : 0) },
  });
}

async function loadDeviceModule(cacheKey: string) {
  return import(`../src/utils/device.ts?case=${cacheKey}`);
}

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  });
});

describe('isPhoneSizedTouchViewport', () => {
  test('returns true for a typical phone-sized touch viewport', async () => {
    installEnvironment({ width: 430, height: 932, coarsePointer: true, orientation: 'portrait' });
    const { isPhoneSizedTouchViewport } = await loadDeviceModule('phone');

    expect(isPhoneSizedTouchViewport()).toBe(true);
  });

  test('returns false for tablet-sized touch viewports', async () => {
    installEnvironment({ width: 768, height: 1024, coarsePointer: true, orientation: 'portrait' });
    const { isPhoneSizedTouchViewport } = await loadDeviceModule('tablet');

    expect(isPhoneSizedTouchViewport()).toBe(false);
  });

  test('returns false for tall touch layouts that exceed the phone long-side cap', async () => {
    installEnvironment({ width: 500, height: 1200, coarsePointer: true, orientation: 'portrait' });
    const { isPhoneSizedTouchViewport } = await loadDeviceModule('tall-touch');

    expect(isPhoneSizedTouchViewport()).toBe(false);
  });

  test('returns false when the device is not coarse-touch mobile', async () => {
    installEnvironment({ width: 390, height: 844, coarsePointer: false, touchPoints: 0 });
    const { isPhoneSizedTouchViewport } = await loadDeviceModule('desktop');

    expect(isPhoneSizedTouchViewport()).toBe(false);
  });
});
