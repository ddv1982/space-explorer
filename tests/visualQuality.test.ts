import { describe, expect, test } from 'bun:test';

import {
  getVisualQualityProfile,
  getVisualQualityTier,
  setVisualQualityTier,
  VISUAL_QUALITY_STORAGE_KEY,
} from '../src/config/visualQuality';

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

describe('visual quality profiles', () => {
  test('defaults to Auto, the full look', () => {
    expect(getVisualQualityTier(null)).toBe('auto');
    expect(getVisualQualityProfile(null)).toMatchObject({
      tier: 'auto',
      dynamicLights: 8,
      normalMapLighting: true,
      bloom: 'full',
    });
  });

  test('Low is the baked look with no dynamic lighting', () => {
    const storage = new MemoryStorage();
    expect(setVisualQualityTier('low', storage)).toBe(true);
    expect(getVisualQualityProfile(storage)).toMatchObject({
      tier: 'low',
      dynamicLights: 0,
      normalMapLighting: false,
      bloom: 'off',
    });
  });

  test('persists and restores both tiers', () => {
    const storage = new MemoryStorage();

    for (const tier of ['low', 'auto'] as const) {
      expect(setVisualQualityTier(tier, storage)).toBe(true);
      expect(storage.getItem(VISUAL_QUALITY_STORAGE_KEY)).toBe(tier);
      expect(getVisualQualityTier(storage)).toBe(tier);
      expect(getVisualQualityProfile(storage).tier).toBe(tier);
    }
  });

  test('migrates the retired Standard and High tiers to Auto so players keep the full look', () => {
    const storage = new MemoryStorage();

    for (const value of ['standard', 'high']) {
      storage.setItem(VISUAL_QUALITY_STORAGE_KEY, value);
      expect(getVisualQualityTier(storage)).toBe('auto');
    }
  });

  test('ignores malformed and unsupported stored values', () => {
    const storage = new MemoryStorage();

    for (const value of ['', 'ultra', '{"tier":"low"}', '?visualQuality=low']) {
      storage.setItem(VISUAL_QUALITY_STORAGE_KEY, value);
      expect(getVisualQualityTier(storage)).toBe('auto');
    }
  });

  test('falls back safely when storage reads or writes fail', () => {
    const storage = new ThrowingStorage();

    expect(getVisualQualityTier(storage)).toBe('auto');
    expect(setVisualQualityTier('low', storage)).toBe(false);
  });

  test('does not read visual quality from the page URL', () => {
    const previousWindow = globalThis.window;
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: storage,
        location: { search: '?visualQuality=low' },
      },
    });

    try {
      expect(getVisualQualityTier()).toBe('auto');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: previousWindow,
      });
    }
  });
});
