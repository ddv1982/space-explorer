import Phaser from 'phaser';

import type { LevelSectionConfig } from '@/config/LevelsConfig';
import { resolveSectionSpawnRateScale } from '@/systems/sectionIdentity';

import { getEncounterCountPressureScale, getEncounterIntervalPressureScale } from './hazardPressurePolicy';

export function resolveEncounterRateMultiplier(input: {
  progress: number;
  section: LevelSectionConfig | null;
  sectionProgress: number;
  defaultMultiplier: number;
  deathReliefActive: boolean;
}): number {
  const rampProgress = Phaser.Math.Easing.Cubic.In(Phaser.Math.Clamp(input.progress, 0, 1));
  const intensityMultiplier = Phaser.Math.Linear(1, 1.5, rampProgress);
  const sectionMultiplier = input.section?.spawnRateMultiplier ?? input.defaultMultiplier;
  const sectionArcMultiplier = resolveSectionSpawnRateScale(input.section, input.sectionProgress);
  return sectionMultiplier * intensityMultiplier * sectionArcMultiplier * (input.deathReliefActive ? 0.75 : 1);
}

export function resolveEncounterInterval(rateMultiplier: number, pressure: number): number {
  return (2000 / rateMultiplier) * getEncounterIntervalPressureScale(pressure);
}

export function resolveEncounterCount(
  section: LevelSectionConfig | null,
  fallback: Readonly<{ min: number; max: number }>,
  pressure: number
): number {
  const size = section?.encounterSizeOverride ?? fallback;
  const scale = getEncounterCountPressureScale(pressure);
  const min = Math.max(1, Math.round(size.min * scale));
  return Phaser.Math.Between(min, Math.max(min, Math.round(size.max * scale)));
}
