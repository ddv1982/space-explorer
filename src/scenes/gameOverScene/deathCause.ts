import type { DamageSource } from '../../systems/PlayerDamage';

const labels: Record<DamageSource, string> = {
  'enemy-bullet': 'LOST TO HOSTILE FIRE',
  bomb: 'LOST TO A BOMB',
  mine: 'LOST TO A MINE',
  beam: 'LOST TO A HAZARD BEAM',
  'enemy-contact': 'LOST TO AN ENEMY COLLISION',
  asteroid: 'LOST TO DEBRIS',
  unknown: 'CAUSE UNKNOWN',
};

export function getDeathCauseText(source: DamageSource | null): string {
  return source === null ? '' : labels[source];
}
