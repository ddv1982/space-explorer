import { describe, expect, mock, test } from 'bun:test';

import type { LevelSectionConfig, ScriptedHazardConfig } from '../src/config/LevelsConfig';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));

const { resolveSectionAtmosphereTargets } = await import('../src/systems/parallax/atmosphereProfile');
type SectionAtmosphereTargets = ReturnType<typeof resolveSectionAtmosphereTargets>;

function createSection(overrides?: Partial<LevelSectionConfig>): LevelSectionConfig {
  return {
    id: 'section-1',
    label: 'Section 1',
    startProgress: 0,
    endProgress: 1,
    phase: 'climax',
    summary: 'test section',
    ...overrides,
  };
}

describe('resolveSectionAtmosphereTargets', () => {
  test('null section returns neutral defaults and clears hazards', () => {
    const targets: SectionAtmosphereTargets = resolveSectionAtmosphereTargets(null, 0.5);

    expect(targets).toEqual({
      atmosphereAlpha: 1,
      atmosphereDrift: 1,
      landmarkAlpha: 1,
      hazardOverlayAlpha: 0,
      activeHazards: [],
    } satisfies SectionAtmosphereTargets);
  });

  test('clamps section progress and returns the same hazards array reference', () => {
    const hazards: ScriptedHazardConfig[] = [{ type: 'debris-surge', intensity: 0.5 }];
    const section = createSection({
      phase: 'intro',
      hazardEvents: hazards,
    });

    const low = resolveSectionAtmosphereTargets(section, -1);
    const high = resolveSectionAtmosphereTargets(section, 2);

    expect(low.activeHazards).toBe(hazards);
    expect(high.activeHazards).toBe(hazards);
    expect(low.atmosphereAlpha).toBeGreaterThan(0);
    expect(high.atmosphereAlpha).toBeGreaterThan(0);
  });
});
