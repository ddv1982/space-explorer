import { PLAYER_CONFIG } from '../config/playerConfig';
import { CHAIN_MAX_MULTIPLIER } from './ScoreManager';

/**
 * Max-chain Overdrive: while the chain multiplier sits exactly at its x5 cap,
 * the main gun cycles ~15% faster. The benefit is derived from the live chain
 * state every frame, so it disappears the moment the chain drops below max.
 * Score multiplication itself is untouched, and picket/helper cadence is
 * driven elsewhere.
 */
export const OVERDRIVE_COOLDOWN_SCALE = 0.85;

export function isMaxChainMultiplier(multiplier: number): boolean {
  return multiplier >= CHAIN_MAX_MULTIPLIER;
}

export function resolvePlayerFireCooldownMs(baseFireRateMs: number, chainMultiplier: number): number {
  if (!isMaxChainMultiplier(chainMultiplier)) {
    return baseFireRateMs;
  }

  return Math.max(PLAYER_CONFIG.absoluteMinFireRate, baseFireRateMs * OVERDRIVE_COOLDOWN_SCALE);
}
