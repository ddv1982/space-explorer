import type { DamageSource } from '../PlayerDamage';
import type { PlayerUpgradeLevels } from '@/config/UpgradesConfig';

export interface PlayerStateData {
  level: number;
  /** Points earned this run. It only goes up, so two runs can be compared whatever was bought. */
  score: number;
  /** Credits spent on upgrades. Credits are earned one per point, so the balance is `score - creditsSpent`. */
  creditsSpent: number;
  currentHp: number;
  currentShields: number;
  remainingLives: number;
  upgrades: PlayerUpgradeLevels;
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
