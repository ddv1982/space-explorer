import type { PlayerDamageOutcome } from '../../entities/Player';

export type PlayerDamageRoute = 'none' | 'hit-feedback' | 'fatal-transition';

export function routePlayerDamageOutcome(outcome: PlayerDamageOutcome): PlayerDamageRoute {
  switch (outcome) {
    case 'fatal':
      return 'fatal-transition';
    case 'absorbed':
    case 'damaged':
      return 'hit-feedback';
    case 'ignored':
      return 'none';
  }
}
