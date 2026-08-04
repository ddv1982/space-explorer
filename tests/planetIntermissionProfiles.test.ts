import { describe, expect, test } from 'bun:test';

import { getLevelConfig, getTotalLevels } from '../src/config/LevelsConfig';
import {
  getPlanetIntermissionProfile,
  PLANET_INTERMISSION_PROFILES,
} from '../src/scenes/planetIntermission/planetProfiles';

describe('planet intermission profiles', () => {
  test('authors a matching visual identity for every campaign level', () => {
    expect(PLANET_INTERMISSION_PROFILES).toHaveLength(getTotalLevels());

    for (let level = 1; level <= getTotalLevels(); level += 1) {
      const levelConfig = getLevelConfig(level);
      const profile = getPlanetIntermissionProfile(level);

      expect(profile.level).toBe(level);
      expect(profile.levelName).toBe(levelConfig.name);
      expect(profile.approachCode.length).toBeGreaterThan(4);
      expect(profile.classification.length).toBeGreaterThan(4);
      expect(profile.signalLabel.length).toBeGreaterThan(4);
    }
  });

  test('keeps every arrival approach code distinct', () => {
    expect(new Set(PLANET_INTERMISSION_PROFILES.map((profile) => profile.approachCode)).size)
      .toBe(PLANET_INTERMISSION_PROFILES.length);
  });

  test('rejects levels without an authored arrival profile', () => {
    expect(() => getPlanetIntermissionProfile(0)).toThrow('Missing planet intermission profile');
    expect(() => getPlanetIntermissionProfile(getTotalLevels() + 1)).toThrow(
      'Missing planet intermission profile'
    );
  });
});
