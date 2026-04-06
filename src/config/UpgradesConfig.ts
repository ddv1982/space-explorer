export type UpgradeKey = 'hp' | 'damage' | 'fireRate' | 'shield';

export interface PlayerUpgradeLevels {
  hp: number;
  damage: number;
  fireRate: number;
  shield: number;
}

interface UpgradeUnlockRequirement {
  minPlayerLevel?: number;
  minUpgradeLevels?: Partial<Record<UpgradeKey, number>>;
}

export interface UpgradeDef {
  key: UpgradeKey;
  name: string;
  description: string;
  maxLevel: number;
  progressionCaps: number[];
  baseCost: number;
  costMultiplier: number;
  unlock?: UpgradeUnlockRequirement;
}

export type UpgradeBlockReason = 'maxed' | 'locked' | 'progression' | 'credits' | null;

export interface UpgradeEvaluation {
  upgrade: UpgradeDef;
  currentLevel: number;
  cost: number;
  maxed: boolean;
  canAfford: boolean;
  unlocked: boolean;
  progressionLimit: number;
  withinProgression: boolean;
  canPurchase: boolean;
  blockReason: UpgradeBlockReason;
  unlockReason: string | null;
}

const UPGRADES: UpgradeDef[] = [
  {
    key: 'hp',
    name: 'HULL ARMOR',
    description: '+2 Max HP',
    maxLevel: 5,
    progressionCaps: [2, 3, 4, 5, 5],
    baseCost: 500,
    costMultiplier: 1.8,
  },
  {
    key: 'damage',
    name: 'WEAPONS',
    description: '+1 Damage',
    maxLevel: 4,
    progressionCaps: [1, 2, 3, 4, 4],
    baseCost: 800,
    costMultiplier: 2.0,
  },
  {
    key: 'fireRate',
    name: 'FIRE RATE',
    description: 'Faster shooting',
    maxLevel: 4,
    progressionCaps: [0, 1, 2, 4, 4],
    baseCost: 600,
    costMultiplier: 1.6,
    unlock: {
      minPlayerLevel: 2,
      minUpgradeLevels: {
        damage: 1,
      },
    },
  },
  {
    key: 'shield',
    name: 'SHIELD',
    description: '+1 Hit absorbed',
    maxLevel: 3,
    progressionCaps: [0, 0, 1, 3, 3],
    baseCost: 1200,
    costMultiplier: 2.5,
    unlock: {
      minPlayerLevel: 3,
      minUpgradeLevels: {
        hp: 2,
      },
    },
  },
];

const UPGRADE_NAME_LOOKUP: Record<UpgradeKey, string> = UPGRADES.reduce(
  (lookup, upgrade) => {
    lookup[upgrade.key] = upgrade.name;
    return lookup;
  },
  {} as Record<UpgradeKey, string>
);

function getUpgradeCost(upgrade: UpgradeDef, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

function isUpgradeMaxed(upgrade: UpgradeDef, currentLevel: number): boolean {
  return currentLevel >= upgrade.maxLevel;
}

export function getUpgradeByKey(key: UpgradeKey): UpgradeDef {
  const upgrade = UPGRADES.find((entry) => entry.key === key);
  if (!upgrade) {
    throw new Error(`Unknown upgrade: ${key}`);
  }

  return upgrade;
}

function getUpgradeProgressionLimit(upgrade: UpgradeDef, playerLevel: number): number {
  const cappedLevel = Math.max(1, playerLevel);
  const configuredCap = upgrade.progressionCaps[cappedLevel - 1] ?? upgrade.progressionCaps[upgrade.progressionCaps.length - 1];
  return Math.min(upgrade.maxLevel, Math.max(0, configuredCap ?? upgrade.maxLevel));
}

function getUpgradeUnlockReason(upgrade: UpgradeDef, playerLevel: number, upgrades: PlayerUpgradeLevels): string | null {
  const unlock = upgrade.unlock;
  if (!unlock) {
    return null;
  }

  if (unlock.minPlayerLevel !== undefined && playerLevel < unlock.minPlayerLevel) {
    return `Reach level ${unlock.minPlayerLevel}`;
  }

  if (unlock.minUpgradeLevels) {
    for (const [key, requiredLevel] of Object.entries(unlock.minUpgradeLevels) as [UpgradeKey, number][]) {
      if (upgrades[key] < requiredLevel) {
        return `${UPGRADE_NAME_LOOKUP[key]} ${requiredLevel}`;
      }
    }
  }

  return null;
}

export function evaluateUpgrade(
  upgrade: UpgradeDef,
  playerLevel: number,
  score: number,
  upgrades: PlayerUpgradeLevels
): UpgradeEvaluation {
  const currentLevel = upgrades[upgrade.key];
  const cost = getUpgradeCost(upgrade, currentLevel);
  const maxed = isUpgradeMaxed(upgrade, currentLevel);
  const canAfford = score >= cost;
  const unlockReason = getUpgradeUnlockReason(upgrade, playerLevel, upgrades);
  const unlocked = unlockReason === null;
  const progressionLimit = getUpgradeProgressionLimit(upgrade, playerLevel);
  const withinProgression = currentLevel < progressionLimit;
  const canPurchase = !maxed && unlocked && withinProgression && canAfford;

  let blockReason: UpgradeBlockReason = null;
  if (maxed) {
    blockReason = 'maxed';
  } else if (!unlocked) {
    blockReason = 'locked';
  } else if (!withinProgression) {
    blockReason = 'progression';
  } else if (!canAfford) {
    blockReason = 'credits';
  }

  return {
    upgrade,
    currentLevel,
    cost,
    maxed,
    canAfford,
    unlocked,
    progressionLimit,
    withinProgression,
    canPurchase,
    blockReason,
    unlockReason,
  };
}

export function evaluateUpgrades(
  playerLevel: number,
  score: number,
  upgrades: PlayerUpgradeLevels
): UpgradeEvaluation[] {
  return UPGRADES.map((upgrade) => evaluateUpgrade(upgrade, playerLevel, score, upgrades));
}
