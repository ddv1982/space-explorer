import type { BossPhaseConfig } from '@/config/LevelsConfig';

/**
 * The phase a boss moves on to at this hull share, or null to stay. Phases advance one at a time, so a
 * burst of damage that skips past two thresholds still plays every phase change in order.
 */
export function resolveBossPhaseIndex(
  phases: readonly BossPhaseConfig[],
  currentIndex: number,
  hullShare: number
): number | null {
  const next = phases[currentIndex + 1];
  return next && hullShare <= next.startsAtHull ? currentIndex + 1 : null;
}
