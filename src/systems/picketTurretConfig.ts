/**
 * AEGIS Picket turret tuning. Two purchased tiers (Picket Installation, then
 * Picket Overclock) drive a pair of fixed screen-edge mounts with target-gated
 * autonomous fire. Values are tuned so the pair's raw DPS (2.86 at T1, 4.17 at
 * T2, flat 1 damage per bolt) stays well under half of an equivalently leveled
 * main gun, before accounting for target-gated uptime and unguided bolts.
 */
export interface PicketTurretTierConfig {
  fireIntervalMs: number;
}

export const PICKET_TURRET_MAX_TIER = 2;

export const PICKET_TURRET_TIERS: readonly PicketTurretTierConfig[] = [
  { fireIntervalMs: 700 },
  { fireIntervalMs: 480 },
];

export const PICKET_BOLT_DAMAGE = 1;
export const PICKET_BOLT_SPEED = 560;
export const PICKET_BOLT_POOL_SIZE = 12;

/** Delay before a mount retries after finding no eligible target. */
export const PICKET_TARGET_RETRY_MS = 180;

/** Hardpoint anchoring: fixed inset from the left/right viewport edges. */
export const PICKET_HARDPOINT_EDGE_INSET_X = 26;
export const PICKET_HARDPOINT_Y_RATIO = 0.5;

/** Delay after level start so the announcement follows the sector title. */
export const PICKET_ONLINE_ANNOUNCE_DELAY_MS = 3200;

/** Light enemies the pickets prefer: scouts, swarms, and boss adds. */
export const PICKET_PREFERRED_TARGET_TYPES: ReadonlySet<string> = new Set(['scout', 'swarm', 'swarmling', 'diver']);

export function normalizePicketTier(value: unknown): number {
  const tier = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(PICKET_TURRET_MAX_TIER, Math.max(0, tier));
}

export function getPicketTierConfig(tier: number): PicketTurretTierConfig | null {
  const normalizedTier = normalizePicketTier(tier);
  if (normalizedTier < 1) {
    return null;
  }

  return PICKET_TURRET_TIERS[normalizedTier - 1] ?? null;
}
