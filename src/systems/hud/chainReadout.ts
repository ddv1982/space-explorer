import type { ChainState } from '../ScoreManager';
import { isMaxChainMultiplier } from '../chainOverdrive';

/**
 * Chain HUD readout formatting. The max-chain Overdrive state reuses the
 * existing chain text treatment: a static suffix and a brighter gold. No
 * tweens or pulsing, so reduced-motion players get the same information
 * without added movement.
 */
export const CHAIN_READOUT_COLOR = '#ffd76a';
export const CHAIN_OVERDRIVE_READOUT_COLOR = '#ffedbe';

export interface ChainReadout {
  label: string;
  color: string;
}

export function resolveChainReadout(chainState: ChainState): ChainReadout {
  if (chainState.multiplier <= 1) {
    return { label: '', color: CHAIN_READOUT_COLOR };
  }

  const overdrive = isMaxChainMultiplier(chainState.multiplier);
  return {
    label: `x${chainState.multiplier} CHAIN ${chainState.chain}${overdrive ? ' · OVERDRIVE' : ''}`,
    color: overdrive ? CHAIN_OVERDRIVE_READOUT_COLOR : CHAIN_READOUT_COLOR,
  };
}
