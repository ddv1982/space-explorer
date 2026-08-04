import type { EnemyType } from './levels/types';

/**
 * Marked Aces tuning. Aces are a mid/late-campaign (levels 5-10) authored
 * target-priority beat: a small number of wave enemies per level are gilded,
 * roughly twice as durable, worth 4x score, and always drop a power-up on
 * defeat. Placements stay sparse so the gilded read never clutters a wave.
 */
export const ACE_HP_MULTIPLIER = 2;
export const ACE_SCORE_MULTIPLIER = 4;

/** Gilded multiply sheen; matches the chain readout gold in the HUD. */
export const ACE_TINT = 0xffd76a;

export const ACE_MIN_LEVEL = 5;
export const ACE_MAX_LEVEL = 10;
export const ACE_MAX_PER_WAVE = 2;
export const ACE_MAX_PER_LEVEL = 3;

/**
 * Eligibility keeps aces on durable combat enemies: one-hit popcorn
 * (scout/swarm/swarmling) and kamikaze divers never read as priority targets,
 * and bosses are never wave-authored.
 */
export const ACE_ELIGIBLE_TYPES: readonly EnemyType[] = [
  'fighter',
  'dodger',
  'splitter',
  'sower',
  'bomber',
  'lancer',
  'gunship',
];

export function isAceEligibleType(type: EnemyType): boolean {
  return ACE_ELIGIBLE_TYPES.includes(type);
}
