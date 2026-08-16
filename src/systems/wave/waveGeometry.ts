import Phaser from 'phaser';

import type { AuthoredLaneAnchor } from '@/config/LevelsConfig';

export interface HorizontalRange {
  min: number;
  max: number;
}

export function getEncounterHorizontalRange(viewportWidth: number, padding: number): HorizontalRange {
  const effectivePadding = Math.min(padding, viewportWidth / 2);
  return { min: effectivePadding, max: Math.max(effectivePadding, viewportWidth - effectivePadding) };
}

export function clampEncounterX(viewportWidth: number, x: number, padding: number): number {
  const { min, max } = getEncounterHorizontalRange(viewportWidth, padding);
  return Phaser.Math.Clamp(x, min, max);
}

export function getLaneAnchorX(viewportWidth: number, lane: AuthoredLaneAnchor, padding: number): number {
  const { min, max } = getEncounterHorizontalRange(viewportWidth, padding);
  if (lane === 'left') return min;
  if (lane === 'right') return max;
  return (min + max) / 2;
}
