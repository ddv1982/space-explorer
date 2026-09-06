import { describe, expect, test } from 'bun:test';
import {
  getAtmosphereSize,
  LIVING_CAMPAIGN,
  LIVING_WORLD_PROFILES,
  selectLivingWorld,
  visualNoise,
} from '../src/systems/parallax/livingBackgroundProfile';
import { getLevelConfig, getTotalLevels } from '../src/config/LevelsConfig';

describe('living background policy', () => {
  test('covers each authored campaign level exactly once', () => {
    expect(LIVING_CAMPAIGN).toHaveLength(getTotalLevels());
    expect(new Set(LIVING_CAMPAIGN.map((entry) => entry.level)).size).toBe(getTotalLevels());
    for (const entry of LIVING_CAMPAIGN) {
      expect(getLevelConfig(entry.level).name).toBe(entry.name);
      expect(selectLivingWorld(entry.name)).toBe(entry.world);
      const landmark = LIVING_WORLD_PROFILES[entry.world].landmark;
      if (landmark.kind !== 'none') expect(landmark.placements.length).toBeLessThanOrEqual(2);
    }
    expect(selectLivingWorld('Unknown sector')).toBeNull();
    expect(selectLivingWorld()).toBeNull();
  });
  test('bounds actual render pixels across landscape, portrait, and large displays', () => {
    for (const [width, height] of [
      [1280, 720],
      [390, 844],
      [3840, 2160],
      [1, 1],
    ]) {
      for (const [tier, cap] of [
        ['low', 320],
        ['standard', 480],
        ['high', 640],
        ['auto', 640],
      ] as const) {
        const [targetWidth, targetHeight] = getAtmosphereSize(width, height, tier);
        expect(Math.max(targetWidth, targetHeight)).toBeLessThanOrEqual(cap);
        expect(targetWidth * targetHeight).toBeLessThanOrEqual(cap * cap);
        expect(targetWidth).toBeGreaterThan(0);
        expect(targetHeight).toBeGreaterThan(0);
      }
    }
  });
  test('noise is reproducible without consuming global randomness', () => {
    const first = Array.from({ length: 64 }, (_, index) => visualNoise(index, 7));
    expect(first).toEqual(Array.from({ length: 64 }, (_, index) => visualNoise(index, 7)));
    expect(new Set(first).size).toBeGreaterThan(40);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});
