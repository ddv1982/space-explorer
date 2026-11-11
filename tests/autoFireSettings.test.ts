import { describe, expect, test } from 'bun:test';
import { getAutoFireSettings, setAutoFire } from '../src/config/autoFireSettings';

const throwingStorage = {
  getItem: () => null,
  setItem: () => {
    throw new Error('quota');
  },
};

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe('autofire settings', () => {
  test('touch autofires and keyboard does not by default', () => {
    expect(getAutoFireSettings(createStorage())).toEqual({ touch: true, keyboard: false });
    expect(getAutoFireSettings(null)).toEqual({ touch: true, keyboard: false });
  });

  test('each input is stored on its own and survives a reload', () => {
    const storage = createStorage();
    expect(setAutoFire('keyboard', true, storage)).toEqual({ touch: true, keyboard: true });
    expect(setAutoFire('touch', false, storage)).toEqual({ touch: false, keyboard: true });
    expect(getAutoFireSettings(storage)).toEqual({ touch: false, keyboard: true });
  });

  test('malformed or partial values fall back per field', () => {
    expect(getAutoFireSettings(createStorage({ 'space-explorer.autoFire.v1': '{oops' }))).toEqual({
      touch: true,
      keyboard: false,
    });
    expect(
      getAutoFireSettings(createStorage({ 'space-explorer.autoFire.v1': '{"keyboard":true,"touch":"no"}' }))
    ).toEqual({ touch: true, keyboard: true });
  });

  test('a failing storage still applies the choice for this visit', () => {
    expect(setAutoFire('keyboard', true, throwingStorage)).toEqual({ touch: true, keyboard: true });
  });

  test('in the browser, consecutive changes keep each other when storage refuses writes', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: throwingStorage } });
    try {
      setAutoFire('keyboard', true);
      expect(setAutoFire('touch', false)).toEqual({ touch: false, keyboard: true });
      expect(getAutoFireSettings()).toEqual({ touch: false, keyboard: true });
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });
});
