export const PLAYER_CONFIG = {
  acceleration: 3200,
  maxSpeed: 480,
  drag: 4000,
  baseMaxHp: 5,
  // The campaign has no reserve-life upgrades, so this is also the persisted-state maximum.
  startingLives: 3,
  baseFireRate: 150,
  hpPerUpgrade: 2,
  fireRateReductionPerUpgrade: 15,
  minFireRate: 60,
  // Hard floor for any fire-rate reduction (rapidfire pickups, max-chain Overdrive).
  absoluteMinFireRate: 40,
  baseDamage: 1,
  damagePerUpgrade: 1,
};
