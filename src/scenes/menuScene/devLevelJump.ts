import { normalizeShipSystems, type ShipSystems } from '../../config/shipSystems';
import { getTotalLevels } from '../../config/LevelsConfig';
import {
  getUpgradeByKey,
  getUpgradeProgressionLimit,
  type PlayerUpgradeLevels,
  type UpgradeKey,
} from '../../config/UpgradesConfig';

const START_LEVEL_PARAM = 'startLevel';
const UPGRADES_PARAM = 'upgrades';
const SYSTEMS_PARAM = 'systems';
const SEED_PARAM = 'seed';
const UPGRADE_KEYS: UpgradeKey[] = ['hp', 'damage', 'fireRate', 'shield', 'turrets'];
const FRESH_SHIP_VALUES = new Set(['0', 'none', 'fresh']);
const STOCK_UPGRADES: PlayerUpgradeLevels = { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 };

export interface DevLevelJumpRequest {
  level: number;
  upgrades: PlayerUpgradeLevels;
  systems: ShipSystems;
  /** `&seed=123` replays one run's waves and sky; null leaves the game to pick a fresh seed. */
  runSeed: number | null;
}

function getProgressionMaxUpgrades(level: number): PlayerUpgradeLevels {
  return {
    hp: getUpgradeProgressionLimit(getUpgradeByKey('hp'), level),
    damage: getUpgradeProgressionLimit(getUpgradeByKey('damage'), level),
    fireRate: getUpgradeProgressionLimit(getUpgradeByKey('fireRate'), level),
    shield: getUpgradeProgressionLimit(getUpgradeByKey('shield'), level),
    turrets: getUpgradeProgressionLimit(getUpgradeByKey('turrets'), level),
  };
}

function parseExplicitUpgrades(raw: string): PlayerUpgradeLevels | null {
  const parts = raw.split(',').map((part) => Number.parseInt(part.trim(), 10));
  // The fifth turret value is optional; a four-value legacy loadout leaves turrets stock.
  if (
    (parts.length !== UPGRADE_KEYS.length && parts.length !== UPGRADE_KEYS.length - 1) ||
    parts.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }

  return UPGRADE_KEYS.reduce<PlayerUpgradeLevels>(
    (upgrades, key, index) => {
      const maxLevel = getUpgradeByKey(key).maxLevel;
      upgrades[key] = Math.min(maxLevel, Math.max(0, parts[index] ?? 0));
      return upgrades;
    },
    { ...STOCK_UPGRADES }
  );
}

function resolveJumpUpgrades(raw: string | null, level: number): PlayerUpgradeLevels {
  if (raw !== null && FRESH_SHIP_VALUES.has(raw.trim().toLowerCase())) {
    return { ...STOCK_UPGRADES };
  }

  const explicit = raw !== null ? parseExplicitUpgrades(raw) : null;
  return explicit ?? getProgressionMaxUpgrades(level);
}

/**
 * Playtest shortcut: `?startLevel=9` skips the menu straight into a level with the
 * progression-legal max loadout for that level. `&upgrades=3,3,3,2` (hp,damage,
 * fireRate,shield) forces an explicit loadout with stock turrets; append an optional
 * fifth value (`&upgrades=3,3,3,2,1`) to include a turret tier. `&upgrades=0` jumps
 * with a stock ship. `&systems=lance,magnet,overdrive` (gun,support,doctrine) picks ship systems; leave
 * a place empty to skip it (`&systems=scatter` or `&systems=,wingman`).
 */
export function resolveDevLevelJump(search: string): DevLevelJumpRequest | null {
  const params = new URLSearchParams(search);
  const rawLevel = params.get(START_LEVEL_PARAM);
  if (rawLevel === null) {
    return null;
  }

  const parsed = Number.parseInt(rawLevel, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const level = Math.min(getTotalLevels(), Math.max(1, parsed));
  const upgrades = resolveJumpUpgrades(params.get(UPGRADES_PARAM), level);
  const [gun, support, late] = (params.get(SYSTEMS_PARAM) ?? '').split(',').map((part) => part.trim());
  const seed = Number.parseInt(params.get(SEED_PARAM) ?? '', 10);
  return {
    level,
    upgrades,
    systems: normalizeShipSystems({ gun, support, late }),
    runSeed: Number.isFinite(seed) && seed > 0 ? seed : null,
  };
}
