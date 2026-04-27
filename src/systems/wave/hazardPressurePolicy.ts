import Phaser from 'phaser';
import type { ScriptedHazardConfig } from '../../config/LevelsConfig';

const HAZARD_PRESSURE_DECAY_PER_MS = 1 / 1800;
const HAZARD_PRESSURE_SPAWN_REDUCTION = 0.28;
const HAZARD_PRESSURE_MAX = 2.4;

const HAZARD_BASE_PRESSURE_COST: Record<ScriptedHazardConfig['type'], number> = {
  'ambient-asteroids': 0.35,
  'debris-surge': 0.55,
  minefield: 0.7,
  'nebula-ambush': 0.78,
  'ring-crossfire': 0.85,
  'rock-corridor': 1.05,
  'energy-storm': 0.95,
  'gravity-well': 1.1,
};

export function isHazardWithinDuration(
  hazard: ScriptedHazardConfig,
  sectionElapsedMs: number
): boolean {
  if (hazard.durationMs === undefined) {
    return true;
  }

  return sectionElapsedMs <= Math.max(0, hazard.durationMs);
}

export function decayHazardPressure(hazardPressure: number, delta: number): number {
  return Math.max(0, hazardPressure - delta * HAZARD_PRESSURE_DECAY_PER_MS);
}

export function getHazardPressureCost(hazard: ScriptedHazardConfig): number {
  const baseCost = HAZARD_BASE_PRESSURE_COST[hazard.type];
  const intensity = Phaser.Math.Clamp(hazard.intensity ?? 0.5, 0, 1.25);
  return baseCost * Phaser.Math.Linear(0.8, 1.35, intensity);
}

export function canTriggerHazard(hazardPressure: number, hazard: ScriptedHazardConfig): boolean {
  return hazardPressure + getHazardPressureCost(hazard) <= HAZARD_PRESSURE_MAX;
}

export function consumeHazardPressure(hazardPressure: number, hazard: ScriptedHazardConfig): number {
  return Math.min(HAZARD_PRESSURE_MAX, hazardPressure + getHazardPressureCost(hazard));
}

export function getEncounterCountPressureScale(hazardPressure: number): number {
  return Phaser.Math.Clamp(1 - hazardPressure * HAZARD_PRESSURE_SPAWN_REDUCTION, 0.6, 1);
}

export function getEncounterIntervalPressureScale(hazardPressure: number): number {
  return Phaser.Math.Linear(1, 1.45, Phaser.Math.Clamp(hazardPressure / HAZARD_PRESSURE_MAX, 0, 1));
}
