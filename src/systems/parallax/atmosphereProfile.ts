import Phaser from 'phaser';
import type { LevelSectionConfig, ScriptedHazardConfig } from '../../config/LevelsConfig';

interface PhaseBias {
  alpha: number;
  drift: number;
  twinkle: number;
}

export function getSectionPhaseAtmosphereBias(phase: LevelSectionConfig['phase']): PhaseBias {
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

export function getHazardVisualIntensity(hazards: ScriptedHazardConfig[]): number {
  if (hazards.length === 0) {
    return 0;
  }

  const total = hazards.reduce((sum, hazard) => sum + (hazard.intensity ?? 0.5), 0);
  return Phaser.Math.Clamp(total / hazards.length, 0, 1.2);
}
