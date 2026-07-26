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
      atmosphereTwinkle: 1,
      landmarkAlpha: 1,
      hazardOverlayAlpha: 0,
      activeHazards: [],
    } satisfies SectionAtmosphereTargets);
  });

  test('section + progress yields stable golden targets for climax visual modifiers', () => {
    const hazards: ScriptedHazardConfig[] = [
      { type: 'energy-storm', intensity: 1 },
      { type: 'debris-surge', intensity: 0.8 },
    ];
    const section = createSection({
      phase: 'climax',
      musicIntensity: 0.8,
      vatTarget: { valence: 0, arousal: 0.7, tension: 0.6 },
      hazardEvents: hazards,
      visualModifiers: {
        atmosphereAlpha: 1.1,
        driftScale: 0.9,
        twinkleScale: 1.05,
        landmarkAlpha: 0.95,
        hazardResponseScale: 1.2,
      },
    });

    const targets = resolveSectionAtmosphereTargets(section, 0.5);

    expect(targets.atmosphereAlpha).toBeCloseTo(1.18, 6);
    expect(targets.atmosphereDrift).toBeCloseTo(1.0278, 6);
    expect(targets.atmosphereTwinkle).toBeCloseTo(1.1508, 6);
    expect(targets.landmarkAlpha).toBeCloseTo(0.98515, 6);
    expect(targets.hazardOverlayAlpha).toBeCloseTo(0.1944, 6);
    expect(targets.activeHazards).toBe(hazards);
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
