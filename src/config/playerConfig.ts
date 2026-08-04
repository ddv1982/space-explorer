export const PLAYER_CONFIG = {
  speed: 800,
  drag: 400,
  baseMaxHp: 5,
  baseFireRate: 150,
  bulletSpeed: -600,
  hpPerUpgrade: 2,
  fireRateReductionPerUpgrade: 15,
  minFireRate: 60,
  // Hard floor for any fire-rate reduction (rapidfire pickups, max-chain Overdrive).
  absoluteMinFireRate: 40,
  baseDamage: 1,
  damagePerUpgrade: 1,
};
