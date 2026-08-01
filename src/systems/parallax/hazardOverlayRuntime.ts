import Phaser from 'phaser';
import type { LevelConfig, ScriptedHazardConfig } from '../../config/LevelsConfig';
import { drawHazardOverlayPrimitives } from './hazardOverlayRenderer';

interface HazardIntensities {
  energyStorm: number;
  gravityWell: number;
  nebulaAmbush: number;
  ringCrossfire: number;
  debrisSurge: number;
  minefield: number;
  rockCorridor: number;
}

function getHazardIntensities(activeHazards: ScriptedHazardConfig[]): HazardIntensities {
  const intensities: HazardIntensities = {
    energyStorm: 0,
    gravityWell: 0,
    nebulaAmbush: 0,
    ringCrossfire: 0,
    debrisSurge: 0,
    minefield: 0,
    rockCorridor: 0,
  };

  for (const hazard of activeHazards) {
    const intensity = hazard.intensity ?? 0.5;
    switch (hazard.type) {
      case 'energy-storm': intensities.energyStorm += intensity; break;
      case 'gravity-well': intensities.gravityWell += intensity; break;
      case 'nebula-ambush': intensities.nebulaAmbush += intensity; break;
      case 'ring-crossfire': intensities.ringCrossfire += intensity; break;
      case 'debris-surge': intensities.debrisSurge += intensity; break;
      case 'minefield': intensities.minefield += intensity; break;
      case 'rock-corridor': intensities.rockCorridor += intensity; break;
    }
  }

  intensities.energyStorm = Phaser.Math.Clamp(intensities.energyStorm, 0, 1.8);
  intensities.gravityWell = Phaser.Math.Clamp(intensities.gravityWell, 0, 1.8);
  intensities.nebulaAmbush = Phaser.Math.Clamp(intensities.nebulaAmbush, 0, 1.8);
  intensities.ringCrossfire = Phaser.Math.Clamp(intensities.ringCrossfire, 0, 1.8);
  intensities.debrisSurge = Phaser.Math.Clamp(intensities.debrisSurge, 0, 1.8);
  intensities.minefield = Phaser.Math.Clamp(intensities.minefield, 0, 1.8);
  intensities.rockCorridor = Phaser.Math.Clamp(intensities.rockCorridor, 0, 1.8);

  return intensities;
}

interface HazardOverlayRuntimeUpdateInput {
  overlay: Phaser.GameObjects.Graphics | null;
  scene: Phaser.Scene | null;
  width: number;
  height: number;
  time: number;
  delta: number;
  levelConfig?: LevelConfig;
  overlayAlpha: number;
  targetOverlayAlpha: number;
  activeHazards: ScriptedHazardConfig[];
}

export function updateHazardOverlay(input: HazardOverlayRuntimeUpdateInput): number {
  const {
    overlay,
    scene,
    width,
    height,
    time,
    delta,
    levelConfig,
    overlayAlpha,
    targetOverlayAlpha,
    activeHazards,
  } = input;

  if (!overlay) {
    return overlayAlpha;
  }

  const dampingAlpha = Number.isFinite(delta) && delta > 0
    ? Phaser.Math.Clamp(1 - Math.pow(1 - 0.12, delta / (1000 / 60)), 0, 1)
    : 0;
  const nextOverlayAlpha = Phaser.Math.Linear(overlayAlpha, targetOverlayAlpha, dampingAlpha);

  if (nextOverlayAlpha <= 0.005 || !scene) {
    // Clear once when the last visible frame expires, then leave the already-empty
    // Graphics object untouched while the overlay remains dormant.
    if (overlayAlpha > 0.005) {
      overlay.clear();
    }
    return nextOverlayAlpha;
  }

  overlay.clear();
  const accentColor = levelConfig?.accentColor ?? 0xffffff;
  const intensities = getHazardIntensities(activeHazards);

  drawHazardOverlayPrimitives(overlay, {
    width,
    height,
    time,
    accentColor,
    overlayAlpha: nextOverlayAlpha,
    ...intensities,
  });

  return nextOverlayAlpha;
}
