import { getTotalLevels } from '../../config/LevelsConfig';
import {
  getUpgradeByKey,
  getUpgradeProgressionLimit,
  type PlayerUpgradeLevels,
  type UpgradeKey,
} from '../../config/UpgradesConfig';

const START_LEVEL_PARAM = 'startLevel';
const UPGRADES_PARAM = 'upgrades';
const UPGRADE_KEYS: UpgradeKey[] = ['hp', 'damage', 'fireRate', 'shield'];
const FRESH_SHIP_VALUES = new Set(['0', 'none', 'fresh']);

export interface DevLevelJumpRequest {
  level: number;
  upgrades: PlayerUpgradeLevels;
}

function getProgressionMaxUpgrades(level: number): PlayerUpgradeLevels {
  return {
    hp: getUpgradeProgressionLimit(getUpgradeByKey('hp'), level),
    damage: getUpgradeProgressionLimit(getUpgradeByKey('damage'), level),
    fireRate: getUpgradeProgressionLimit(getUpgradeByKey('fireRate'), level),
    shield: getUpgradeProgressionLimit(getUpgradeByKey('shield'), level),
  };
}

function parseExplicitUpgrades(raw: string): PlayerUpgradeLevels | null {
  const parts = raw.split(',').map((part) => Number.parseInt(part.trim(), 10));
  if (parts.length !== UPGRADE_KEYS.length || parts.some((value) => !Number.isFinite(value))) {
    return null;
  }

  return UPGRADE_KEYS.reduce<PlayerUpgradeLevels>((upgrades, key, index) => {
    const maxLevel = getUpgradeByKey(key).maxLevel;
    upgrades[key] = Math.min(maxLevel, Math.max(0, parts[index]));
    return upgrades;
  }, { hp: 0, damage: 0, fireRate: 0, shield: 0 });
}

function resolveJumpUpgrades(raw: string | null, level: number): PlayerUpgradeLevels {
  if (raw !== null && FRESH_SHIP_VALUES.has(raw.trim().toLowerCase())) {
    return { hp: 0, damage: 0, fireRate: 0, shield: 0 };
  }

  const explicit = raw !== null ? parseExplicitUpgrades(raw) : null;
  return explicit ?? getProgressionMaxUpgrades(level);
}

/**
 * Playtest shortcut: `?startLevel=9` skips the menu straight into a level with the
 * progression-legal max loadout for that level. `&upgrades=3,3,3,2` (hp,damage,
 * fireRate,shield) forces an explicit loadout; `&upgrades=0` jumps with a stock ship.
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
  return { level, upgrades };
}
