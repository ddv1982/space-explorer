import { describe, expect, test } from 'bun:test';

import {
  GAMEPLAY_DIFFICULTY_STORAGE_KEY,
  getGameplayDifficultyProfile,
  getGameplayDifficultyTier,
  setGameplayDifficultyTier,
} from '../src/config/gameplayDifficulty';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class ThrowingStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('storage unavailable');
  }

  override setItem(): void {
    throw new Error('storage unavailable');
  }
}

describe('gameplay difficulty profiles', () => {
  test('uses the current gameplay balance as normal by default', () => {
    expect(getGameplayDifficultyTier(null)).toBe('normal');
    expect(getGameplayDifficultyProfile(null)).toEqual({
      tier: 'normal',
      hullDamageMultiplier: 1,
    });
  });

  test('persists and restores every supported tier', () => {
    const storage = new MemoryStorage();
    const expectedMultipliers = { low: 0.75, normal: 1, high: 1.25 } as const;

    for (const tier of ['low', 'normal', 'high'] as const) {
      expect(setGameplayDifficultyTier(tier, storage)).toBe(true);
      expect(storage.getItem(GAMEPLAY_DIFFICULTY_STORAGE_KEY)).toBe(tier);
      expect(getGameplayDifficultyTier(storage)).toBe(tier);
      expect(getGameplayDifficultyProfile(storage)).toEqual({
        tier,
        hullDamageMultiplier: expectedMultipliers[tier],
      });
    }
  });

  test('falls back to normal for malformed values and unavailable storage', () => {
    const storage = new MemoryStorage();

    for (const value of ['', 'standard', 'easy', 'hard', '{"tier":"high"}']) {
      storage.setItem(GAMEPLAY_DIFFICULTY_STORAGE_KEY, value);
      expect(getGameplayDifficultyTier(storage)).toBe('normal');
    }

    const throwingStorage = new ThrowingStorage();
    expect(getGameplayDifficultyTier(throwingStorage)).toBe('normal');
    expect(getGameplayDifficultyProfile(throwingStorage).hullDamageMultiplier).toBe(1);
    expect(setGameplayDifficultyTier('high', throwingStorage)).toBe(false);
    expect(setGameplayDifficultyTier('high', null)).toBe(false);
  });
});
