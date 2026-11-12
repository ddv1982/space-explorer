import { afterEach, describe, expect, mock, test } from 'bun:test';
import { getMotionSettings, setScreenShake } from '../src/config/motionSettings';

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

function stubReducedMotion(reduce: boolean): void {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { matchMedia: mock((query: string) => ({ matches: reduce && query.includes('reduce') })) },
  });
}

afterEach(() => {
  if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
  else Reflect.deleteProperty(globalThis, 'window');
});

describe('motion settings', () => {
  test('screen shake is on by default', () => {
    stubReducedMotion(false);
    expect(getMotionSettings(createStorage())).toEqual({ screenShake: true });
  });

  test('a system reduced-motion preference turns screen shake off by default', () => {
    stubReducedMotion(true);
    expect(getMotionSettings(createStorage())).toEqual({ screenShake: false });
  });

  test("the player's choice wins over the system default and survives a reload", () => {
    stubReducedMotion(true);
    const storage = createStorage();
    expect(setScreenShake(true, storage)).toEqual({ screenShake: true });
    expect(getMotionSettings(storage)).toEqual({ screenShake: true });
  });

  test('malformed values fall back to the default', () => {
    stubReducedMotion(false);
    expect(getMotionSettings(createStorage({ 'space-explorer.motion.v1': '{bad' }))).toEqual({ screenShake: true });
    expect(getMotionSettings(createStorage({ 'space-explorer.motion.v1': '{"screenShake":"no"}' }))).toEqual({
      screenShake: true,
    });
  });
});
