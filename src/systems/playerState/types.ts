import type { DamageSource } from '../PlayerDamage';
import type { PlayerUpgradeLevels } from '@/config/UpgradesConfig';
import type { GameplayDifficultyTier } from '@/config/gameplayDifficulty';
import type { ShipSystems } from '@/config/shipSystems';

export interface PlayerStateData {
  level: number;
  /** Points earned this run. It only goes up, so two runs can be compared whatever was bought. */
  score: number;
  /** Credits spent on upgrades. Credits are earned one per point, so the balance is `score - creditsSpent`. */
  creditsSpent: number;
  /**
   * Seeds this run's waves and sky. RETRY keeps it, so a lost run can be replayed as it was; a new run
   * gets a new one. 0 (older saves) means the classic, unvaried sectors.
   */
  runSeed: number;
  /** The easiest difficulty this run has been played on; the personal best is recorded under it. */
  easiestDifficulty: GameplayDifficultyTier | null;
  currentHp: number;
  currentShields: number;
  remainingLives: number;
  upgrades: PlayerUpgradeLevels;
  /** Free picks from the refit bay that change how the ship plays. */
  systems: ShipSystems;
  helperWing: PersistentHelperWingState;
}

export interface PersistentHelperWingSlotState {
  remainingLives: number;
  hp: number;
}

export interface PersistentHelperWingState {
  slots: PersistentHelperWingSlotState[];
  grantedSlots: number;
}

export interface RunSummaryData {
  finalScore: number;
  levelReached: number;
  deathCause: DamageSource | null;
}
