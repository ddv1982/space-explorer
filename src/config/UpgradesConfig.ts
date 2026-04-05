export interface UpgradeDef {
  key: 'hp' | 'damage' | 'fireRate' | 'shield';
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    key: 'hp',
    name: 'HULL ARMOR',
    description: '+2 Max HP',
    maxLevel: 5,
    baseCost: 500,
    costMultiplier: 1.8,
  },
  {
    key: 'damage',
    name: 'WEAPONS',
    description: '+1 Damage',
    maxLevel: 4,
    baseCost: 800,
    costMultiplier: 2.0,
  },
  {
    key: 'fireRate',
    name: 'FIRE RATE',
    description: 'Faster shooting',
    maxLevel: 5,
    baseCost: 600,
    costMultiplier: 1.6,
  },
  {
    key: 'shield',
    name: 'SHIELD',
    description: '+1 Hit absorbed',
    maxLevel: 3,
    baseCost: 1200,
    costMultiplier: 2.5,
  },
];

export function getUpgradeCost(upgrade: UpgradeDef, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

export function isUpgradeMaxed(upgrade: UpgradeDef, currentLevel: number): boolean {
  return currentLevel >= upgrade.maxLevel;
}
