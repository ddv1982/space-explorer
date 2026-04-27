import Phaser from 'phaser';
import type { LevelSectionConfig, ScriptedHazardConfig } from '../../config/LevelsConfig';

interface PhaseBias {
  alpha: number;
  drift: number;
  twinkle: number;
}

interface SectionAtmosphereTargets {
  atmosphereAlpha: number;
  atmosphereDrift: number;
  atmosphereTwinkle: number;
  landmarkAlpha: number;
  hazardOverlayAlpha: number;
  hazardResponseScale: number;
  activeHazards: ScriptedHazardConfig[];
}

function getSectionPhaseAtmosphereBias(phase: LevelSectionConfig['phase']): PhaseBias {
  switch (phase) {
    case 'build':
      return { alpha: 0.04, drift: 0.03, twinkle: 0.03 };
    case 'hazard':
      return { alpha: 0.07, drift: 0.06, twinkle: 0.04 };
    case 'climax':
      return { alpha: 0.1, drift: 0.08, twinkle: 0.06 };
    case 'boss-approach':
      return { alpha: -0.04, drift: -0.03, twinkle: -0.16 };
    case 'intro':
    default:
      return { alpha: -0.02, drift: -0.01, twinkle: -0.03 };
  }
}

function getHazardVisualIntensity(hazards: ScriptedHazardConfig[]): number {
  if (hazards.length === 0) {
    return 0;
  }

  const total = hazards.reduce((sum, hazard) => sum + (hazard.intensity ?? 0.5), 0);
  return Phaser.Math.Clamp(total / hazards.length, 0, 1.2);
}

export function resolveSectionAtmosphereTargets(
  section: LevelSectionConfig | null,
  sectionProgress: number
): SectionAtmosphereTargets {
  if (!section) {
    return {
      atmosphereAlpha: 1,
      atmosphereDrift: 1,
      atmosphereTwinkle: 1,
      landmarkAlpha: 1,
      hazardOverlayAlpha: 0,
      hazardResponseScale: 1,
      activeHazards: [],
    };
  }

  const progress = Phaser.Math.Clamp(sectionProgress, 0, 1);
  const musicIntensity = section.musicIntensity ?? 0.5;
  const tension = Phaser.Math.Clamp(section.vatTarget?.tension ?? 0.4, 0, 1);
  const visualModifiers = section.visualModifiers;
  const atmosphereScale = visualModifiers?.atmosphereAlpha ?? 1;
  const driftScale = visualModifiers?.driftScale ?? 1;
  const twinkleScale = visualModifiers?.twinkleScale ?? 1;
  const landmarkScale = visualModifiers?.landmarkAlpha ?? 1;
  const hazardResponseScale = visualModifiers?.hazardResponseScale ?? 1;
  const activeHazards = section.hazardEvents ?? [];
  const phaseBias = getSectionPhaseAtmosphereBias(section.phase);

  let atmosphereAlpha =
    Phaser.Math.Clamp(
      0.94 + musicIntensity * 0.14 + tension * 0.08 + progress * 0.04 + phaseBias.alpha,
      0.82,
      1.14
    ) * atmosphereScale;
  atmosphereAlpha = Phaser.Math.Clamp(atmosphereAlpha, 0.8, 1.18);

  let atmosphereDrift =
    Phaser.Math.Clamp(
      0.95 + musicIntensity * 0.08 + tension * 0.08 + phaseBias.drift,
      0.9,
      1.16
    ) * driftScale;
  atmosphereDrift = Phaser.Math.Clamp(atmosphereDrift, 0.88, 1.2);

  let atmosphereTwinkle =
    Phaser.Math.Clamp(
      0.92 + musicIntensity * 0.1 + tension * 0.06 + phaseBias.twinkle,
      0.72,
      1.18
    ) * twinkleScale;
  atmosphereTwinkle = Phaser.Math.Clamp(atmosphereTwinkle, 0.65, 1.22);

  const landmarkAlpha = Phaser.Math.Clamp(
    (0.94 + tension * 0.12 + progress * 0.05) * landmarkScale,
    0.78,
    1.22
  );

  const hazardIntensity = getHazardVisualIntensity(activeHazards);
  const hazardOverlayAlpha = Phaser.Math.Clamp(hazardIntensity * 0.18 * hazardResponseScale, 0, 0.22);

  return {
    atmosphereAlpha,
    atmosphereDrift,
    atmosphereTwinkle,
    landmarkAlpha,
    hazardOverlayAlpha,
    hazardResponseScale,
    activeHazards,
  };
}
