import type { BossConfig } from '../../config/LevelsConfig';
import type { PlayerUpgradeLevels } from '../../config/UpgradesConfig';

interface BossScalingContext {
  levelNumber: number;
  totalLevels: number;
  upgrades: PlayerUpgradeLevels;
}

const UPGRADE_WEIGHT = {
  hp: 0.35,
  damage: 0.8,
  fireRate: 0.7,
  shield: 0.55,
} as const;

const MAX_UPGRADE_PRESSURE = 9;
const MAX_UPGRADE_BONUS = 0.3;
const MAX_LEVEL_BONUS = 0.18;
const MAX_TOTAL_SCALING = 1.45;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getUpgradePressure(upgrades: PlayerUpgradeLevels): number {
  return (
    upgrades.hp * UPGRADE_WEIGHT.hp +
    upgrades.damage * UPGRADE_WEIGHT.damage +
    upgrades.fireRate * UPGRADE_WEIGHT.fireRate +
    upgrades.shield * UPGRADE_WEIGHT.shield
  );
}

function getBossDifficultyMultiplier(context: BossScalingContext): number {
  const normalizedLevelProgress =
    context.totalLevels <= 1
      ? 0
      : clamp((context.levelNumber - 1) / (context.totalLevels - 1), 0, 1);

  const levelBonus = normalizedLevelProgress * MAX_LEVEL_BONUS;
  const upgradeBonus =
    clamp(getUpgradePressure(context.upgrades) / MAX_UPGRADE_PRESSURE, 0, 1) *
    MAX_UPGRADE_BONUS;

  return clamp(1 + levelBonus + upgradeBonus, 1, MAX_TOTAL_SCALING);
}

export function createScaledBossConfig(
  baseConfig: BossConfig,
  context: BossScalingContext
): BossConfig {
  const multiplier = getBossDifficultyMultiplier(context);

  return {
    ...baseConfig,
    maxHp: Math.max(1, Math.round(baseConfig.maxHp * multiplier)),
  };
}
