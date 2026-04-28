import type Phaser from 'phaser';
import type { LastLifeHelperWing } from '@/systems/LastLifeHelperWing';
import { saveHelperWingState } from '@/systems/PlayerState';

export function syncLastLifeHelperWingState(
  lastLifeHelperWing: LastLifeHelperWing | null,
  remainingLives: number
): void {
  lastLifeHelperWing?.updateLastLifeState(remainingLives);
}

export function persistHelperWingState(
  registry: Phaser.Data.DataManager,
  lastLifeHelperWing: LastLifeHelperWing | null
): void {
  if (!lastLifeHelperWing) {
    saveHelperWingState(registry, { slots: [], grantedSlots: 0 });
    return;
  }

  saveHelperWingState(registry, lastLifeHelperWing.capturePersistentState());
}
