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
  test('uses the stable standard profile by default', () => {
    expect(getVisualQualityTier(null)).toBe('standard');
    expect(getVisualQualityProfile(null)).toEqual({
      tier: 'standard',
      entityTextureResolution: 2,
      particleTextureResolution: 1,
      backgroundLayerCount: 2,
      uiGlowStrength: 0.8,
      motifDensity: 1,
      particleBurstScale: 0.9,
      particleQuantityScale: 0.8,
      menuAtmosphere: 2,
    });
  });

  test('exposes remake FX budgets on every quality tier', () => {
    const storage = new MemoryStorage();
    const expected = {
      low: {
        uiGlowStrength: 0.4,
        motifDensity: 0.6,
        particleBurstScale: 0.75,
        particleQuantityScale: 0.6,
        menuAtmosphere: 1,
      },
      standard: {
        uiGlowStrength: 0.8,
        motifDensity: 1,
        particleBurstScale: 0.9,
        particleQuantityScale: 0.8,
        menuAtmosphere: 2,
      },
      high: {
        uiGlowStrength: 1,
        motifDensity: 1.25,
        particleBurstScale: 1.15,
        particleQuantityScale: 1,
        menuAtmosphere: 3,
      },
    } as const;

    for (const tier of ['low', 'standard', 'high'] as const) {
      expect(setVisualQualityTier(tier, storage)).toBe(true);
      expect(getVisualQualityProfile(storage)).toMatchObject(expected[tier]);
    }
  });

  test('persists and restores every supported tier', () => {
    const storage = new MemoryStorage();

    for (const tier of ['low', 'standard', 'high'] as const) {
      expect(setVisualQualityTier(tier, storage)).toBe(true);
      expect(storage.getItem(VISUAL_QUALITY_STORAGE_KEY)).toBe(tier);
      expect(getVisualQualityTier(storage)).toBe(tier);
      expect(getVisualQualityProfile(storage).tier).toBe(tier);
    }
  });

  test('ignores malformed and unsupported stored values', () => {
    const storage = new MemoryStorage();

    for (const value of ['', 'ultra', '{"tier":"high"}', '?visualQuality=low']) {
      storage.setItem(VISUAL_QUALITY_STORAGE_KEY, value);
      expect(getVisualQualityTier(storage)).toBe('standard');
    }
  });

  test('falls back safely when storage reads or writes fail', () => {
    const storage = new ThrowingStorage();

    expect(getVisualQualityTier(storage)).toBe('standard');
    expect(getVisualQualityProfile(storage)).toMatchObject({
      tier: 'standard',
      uiGlowStrength: 0.8,
      motifDensity: 1,
      particleBurstScale: 0.9,
      particleQuantityScale: 0.8,
      menuAtmosphere: 2,
    });
    expect(setVisualQualityTier('high', storage)).toBe(false);
  });

  test('does not read visual quality from the page URL', () => {
    const previousWindow = globalThis.window;
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: storage,
        location: { search: '?visualQuality=high' },
      },
    });

    try {
      expect(getVisualQualityTier()).toBe('standard');
      expect(getVisualQualityProfile().tier).toBe('standard');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: previousWindow,
      });
    }
  });
});
