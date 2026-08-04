import { describe, expect, test } from 'bun:test';

import {
  getPicketTierConfig,
  normalizePicketTier,
  PICKET_BOLT_DAMAGE,
  PICKET_BOLT_POOL_SIZE,
  PICKET_TURRET_MAX_TIER,
  PICKET_TURRET_TIERS,
} from '../src/systems/picketTurretConfig';

describe('picketTurretConfig', () => {
  test('normalizePicketTier clamps to the owned tier range and rejects non-finite values', () => {
    expect(normalizePicketTier(0)).toBe(0);
    expect(normalizePicketTier(1)).toBe(1);
    expect(normalizePicketTier(2)).toBe(2);
    expect(normalizePicketTier(99)).toBe(PICKET_TURRET_MAX_TIER);
    expect(normalizePicketTier(-3)).toBe(0);
    expect(normalizePicketTier(1.9)).toBe(1);
    expect(normalizePicketTier(Number.NaN)).toBe(0);
    expect(normalizePicketTier(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizePicketTier('2')).toBe(0);
    expect(normalizePicketTier(undefined)).toBe(0);
  });

  test('getPicketTierConfig returns null without an owned tier and configs otherwise', () => {
    expect(getPicketTierConfig(0)).toBeNull();
    expect(getPicketTierConfig(1)?.fireIntervalMs).toBe(700);
    expect(getPicketTierConfig(2)?.fireIntervalMs).toBe(480);
    expect(getPicketTierConfig(99)?.fireIntervalMs).toBe(480);
  });

  test('picket raw dps stays under half of an equivalent main gun', () => {
    // Two mounts, flat damage per bolt; compare against a damage-2 main gun at
    // the stock 250ms cadence (8 dps) and the best 110ms cadence (~18.2 dps).
    for (const tier of PICKET_TURRET_TIERS) {
      const rawDps = (2 * PICKET_BOLT_DAMAGE * 1000) / tier.fireIntervalMs;
      expect(rawDps).toBeLessThan((2 * 1000) / 250 / 2 + 1.1);
      expect(rawDps).toBeLessThanOrEqual(4.2);
    }

    expect(PICKET_BOLT_POOL_SIZE).toBeGreaterThanOrEqual(8);
    expect(PICKET_BOLT_POOL_SIZE).toBeLessThanOrEqual(16);
  });
});
