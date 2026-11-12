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
});
