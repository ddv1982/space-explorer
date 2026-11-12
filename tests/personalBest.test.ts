import { describe, expect, test } from 'bun:test';
import { recordRunScore } from '../src/config/personalBest';

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe('personal best', () => {
  test('the first scoring run is a new best, and a lower run is shown the best to beat', () => {
    const storage = createStorage();
    expect(recordRunScore(9500, 'normal', storage)).toEqual({ best: 9500, isNewBest: true });
    expect(recordRunScore(4000, 'normal', storage)).toEqual({ best: 9500, isNewBest: false });
    expect(recordRunScore(12000, 'normal', storage)).toEqual({ best: 12000, isNewBest: true });
  });

  test('recording the same run again gives the same answer (a summary screen can be rebuilt)', () => {
    const storage = createStorage();
    recordRunScore(9500, 'normal', storage);
    expect(recordRunScore(9500, 'normal', storage)).toEqual({ best: 9500, isNewBest: true });
  });

  test('each difficulty keeps its own best', () => {
    const storage = createStorage();
    recordRunScore(9500, 'low', storage);
    expect(recordRunScore(100, 'high', storage)).toEqual({ best: 100, isNewBest: true });
    expect(recordRunScore(100, 'low', storage)).toEqual({ best: 9500, isNewBest: false });
  });

  test('a run with no score sets nothing, and bad stored data counts as no best', () => {
    expect(recordRunScore(0, 'normal', createStorage())).toEqual({ best: 0, isNewBest: false });
    const storage = createStorage({ 'space-explorer.personalBest.v1': '{"normal":"lots","low":-5}' });
    expect(recordRunScore(10, 'normal', storage)).toEqual({ best: 10, isNewBest: true });
  });

  test('a best set in another tab is not overwritten by this tab', () => {
    const values = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
    try {
      recordRunScore(100, 'normal');
      // Another tab records better scores after this tab's first read.
      values.set('space-explorer.personalBest.v1', JSON.stringify({ low: 0, normal: 1000, high: 500 }));
      expect(recordRunScore(200, 'normal')).toEqual({ best: 1000, isNewBest: false });
      expect(JSON.parse(values.get('space-explorer.personalBest.v1')!)).toEqual({ low: 0, normal: 1000, high: 500 });
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  test('a best that could not be saved still holds for the rest of the visit', () => {
    const localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
    try {
      recordRunScore(5000, 'high');
      expect(recordRunScore(300, 'high')).toEqual({ best: 5000, isNewBest: false });
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });
});
