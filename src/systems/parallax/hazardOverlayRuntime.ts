import Phaser from 'phaser';
import type { LevelConfig, ScriptedHazardConfig } from '../../config/LevelsConfig';
import { drawHazardOverlayPrimitives } from './hazardOverlayRenderer';

function getHazardIntensity(
  activeHazards: ScriptedHazardConfig[],
  type: ScriptedHazardConfig['type']
): number {
  return Phaser.Math.Clamp(
    activeHazards
      .filter((hazard) => hazard.type === type)
      .reduce((sum, hazard) => sum + (hazard.intensity ?? 0.5), 0),
    0,
    1.8
  );
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

  overlay.clear();
  const dampingAlpha = Number.isFinite(delta) && delta > 0
    ? Phaser.Math.Clamp(1 - Math.pow(1 - 0.12, delta / (1000 / 60)), 0, 1)
    : 0;
  const nextOverlayAlpha = Phaser.Math.Linear(overlayAlpha, targetOverlayAlpha, dampingAlpha);

  if (nextOverlayAlpha <= 0.005 || !scene) {
    return nextOverlayAlpha;
  }

  const accentColor = levelConfig?.accentColor ?? 0xffffff;

  drawHazardOverlayPrimitives(overlay, {
    width,
    height,
    time,
    accentColor,
    overlayAlpha: nextOverlayAlpha,
    energyStorm: getHazardIntensity(activeHazards, 'energy-storm'),
    gravityWell: getHazardIntensity(activeHazards, 'gravity-well'),
    nebulaAmbush: getHazardIntensity(activeHazards, 'nebula-ambush'),
    ringCrossfire: getHazardIntensity(activeHazards, 'ring-crossfire'),
    debrisSurge: getHazardIntensity(activeHazards, 'debris-surge'),
    minefield: getHazardIntensity(activeHazards, 'minefield'),
    rockCorridor: getHazardIntensity(activeHazards, 'rock-corridor'),
  });

  return nextOverlayAlpha;
}
