import type { BossConfig } from '../../config/LevelsConfig';
import type { PlayerUpgradeLevels } from '../../config/UpgradesConfig';
import { PLAYER_CONFIG } from '../../config/playerConfig';

interface BossScalingContext {
  levelNumber: number;
  totalLevels: number;
  upgrades: PlayerUpgradeLevels;
}

const MAX_LEVEL_BONUS = 1.1;
const MAX_OFFENSE_BONUS = 2.4;
const MAX_DEFENSE_BONUS = 0.7;
const MAX_TOTAL_SCALING = 4.6;
const GLOBAL_BOSS_HP_TUNING = 0.3;

const OFFENSE_REFERENCE_SPAN = 5;
const DEFENSE_REFERENCE_SPAN = 6;

const DEFENSE_UPGRADE_WEIGHT = {
  hp: 0.65,
  shield: 0.9,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getNormalizedLevelProgress(context: BossScalingContext): number {
  if (context.totalLevels <= 1) {
    return 0;
  }

  return clamp((context.levelNumber - 1) / (context.totalLevels - 1), 0, 1);
}

function getPlayerDamage(upgrades: PlayerUpgradeLevels): number {
  return PLAYER_CONFIG.baseDamage + upgrades.damage * PLAYER_CONFIG.damagePerUpgrade;
}

function getPlayerFireRate(upgrades: PlayerUpgradeLevels): number {
  return Math.max(
    PLAYER_CONFIG.minFireRate,
    PLAYER_CONFIG.baseFireRate - upgrades.fireRate * PLAYER_CONFIG.fireRateReductionPerUpgrade
  );
}

function getOffenseMultiplier(upgrades: PlayerUpgradeLevels): number {
  const damageMultiplier = getPlayerDamage(upgrades) / PLAYER_CONFIG.baseDamage;
  const fireRateMultiplier = PLAYER_CONFIG.baseFireRate / getPlayerFireRate(upgrades);
  return damageMultiplier * fireRateMultiplier;
}

function getLevelBonus(context: BossScalingContext): number {
  return getNormalizedLevelProgress(context) * MAX_LEVEL_BONUS;
}

function getOffenseBonus(context: BossScalingContext): number {
  const normalizedOffense = clamp((getOffenseMultiplier(context.upgrades) - 1) / OFFENSE_REFERENCE_SPAN, 0, 1);

  // Preserve readability in earlier levels while still reacting to upgrades.
  const levelGate = 0.45 + getNormalizedLevelProgress(context) * 0.55;

  return normalizedOffense * MAX_OFFENSE_BONUS * levelGate;
}

function getDefenseBonus(upgrades: PlayerUpgradeLevels): number {
  const defensePressure =
    upgrades.hp * DEFENSE_UPGRADE_WEIGHT.hp + upgrades.shield * DEFENSE_UPGRADE_WEIGHT.shield;
  const normalizedDefense = clamp(defensePressure / DEFENSE_REFERENCE_SPAN, 0, 1);

  return normalizedDefense * MAX_DEFENSE_BONUS;
}

function getBossDifficultyMultiplier(context: BossScalingContext): number {
  const levelBonus = getLevelBonus(context);
  const offenseBonus = getOffenseBonus(context);
  const defenseBonus = getDefenseBonus(context.upgrades);

  return clamp(1 + levelBonus + offenseBonus + defenseBonus, 1, MAX_TOTAL_SCALING);
}

export function createScaledBossConfig(
  baseConfig: BossConfig,
  context: BossScalingContext
): BossConfig {
  const multiplier = getBossDifficultyMultiplier(context);
  const tunedMultiplier = multiplier * GLOBAL_BOSS_HP_TUNING;

  return {
    ...baseConfig,
    maxHp: Math.max(1, Math.round(baseConfig.maxHp * tunedMultiplier)),
  };
}
