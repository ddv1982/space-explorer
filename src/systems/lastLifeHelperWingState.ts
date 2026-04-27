import type { LastLifeHelperWingConfig } from '../config/LevelsConfig';
import type { PersistentHelperWingSlotState, PersistentHelperWingState } from './PlayerState';

export const DEFAULT_HELPER_CONFIG: Required<LastLifeHelperWingConfig> = {
  shipCount: 2,
  helperLives: 2,
  hpScaleFromPlayer: 0.5,
  fireRateMs: 280,
  respawnDelayMs: 800,
  spacing: 38,
  followOffsetY: 18,
};

const HARD_MAX_HELPER_SLOTS = 4;

interface NormalizedPersistedWingState {
  grantedSlots: number;
  slots: PersistentHelperWingSlotState[];
}

export function resolveRuntimeConfig(
  config: LastLifeHelperWingConfig | null | undefined
): Required<LastLifeHelperWingConfig> {
  const normalizedShipCount =
    typeof config?.shipCount === 'number' ? Math.max(1, Math.floor(config.shipCount)) : DEFAULT_HELPER_CONFIG.shipCount;

  return {
    shipCount: normalizedShipCount,
    helperLives:
      typeof config?.helperLives === 'number'
        ? Math.max(1, Math.floor(config.helperLives))
        : DEFAULT_HELPER_CONFIG.helperLives,
    hpScaleFromPlayer:
      typeof config?.hpScaleFromPlayer === 'number'
        ? Math.min(1, Math.max(0.1, config.hpScaleFromPlayer))
        : DEFAULT_HELPER_CONFIG.hpScaleFromPlayer,
    fireRateMs:
      typeof config?.fireRateMs === 'number'
        ? Math.max(80, Math.floor(config.fireRateMs))
        : DEFAULT_HELPER_CONFIG.fireRateMs,
    respawnDelayMs:
      typeof config?.respawnDelayMs === 'number'
        ? Math.max(120, Math.floor(config.respawnDelayMs))
        : DEFAULT_HELPER_CONFIG.respawnDelayMs,
    spacing:
      typeof config?.spacing === 'number'
        ? Math.max(18, Math.round(config.spacing))
        : DEFAULT_HELPER_CONFIG.spacing,
    followOffsetY:
      typeof config?.followOffsetY === 'number'
        ? Math.round(config.followOffsetY)
        : DEFAULT_HELPER_CONFIG.followOffsetY,
  };
}

export function normalizePersistedState(
  persistentState: PersistentHelperWingState | null | undefined
): NormalizedPersistedWingState {
  if (!persistentState || !Array.isArray(persistentState.slots)) {
    return {
      grantedSlots: 0,
      slots: [],
    };
  }

  const slots = persistentState.slots.map((slot) => ({
    remainingLives:
      typeof slot?.remainingLives === 'number'
        ? Math.max(0, Math.floor(slot.remainingLives))
        : 0,
    hp: typeof slot?.hp === 'number' ? Math.max(0, Math.round(slot.hp)) : 0,
  }));

  const sourceGrantedSlots =
    typeof persistentState.grantedSlots === 'number'
      ? Math.max(0, Math.floor(persistentState.grantedSlots))
      : slots.length;

  const grantedSlots = Math.min(Math.max(sourceGrantedSlots, slots.length), HARD_MAX_HELPER_SLOTS);
  const normalizedSlots = slots.slice(0, grantedSlots);

  while (normalizedSlots.length < grantedSlots) {
    normalizedSlots.push({ remainingLives: 0, hp: 0 });
  }

  return {
    grantedSlots,
    slots: normalizedSlots,
  };
}
