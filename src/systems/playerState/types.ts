import type { PlayerUpgradeLevels } from '@/config/UpgradesConfig';

export interface PlayerStateData {
  level: number;
  score: number;
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
}
