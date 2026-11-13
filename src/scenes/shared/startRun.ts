import type Phaser from 'phaser';
import { resetPlayerState, resetRunSummary } from '../../systems/PlayerState';
import { AUTOSAVE_SLOT_ID, deleteSaveSlot } from '../../systems/SaveSlotStorage';
import { createRunSeed } from '../../systems/runVariation';
import { startRegisteredScene } from '../sceneRegistry';

/** Starts a run from sector 1. Without a seed it gets a new one; RETRY passes the lost run's seed. */
export function startFreshRun(scene: Phaser.Scene, runSeed: number = createRunSeed()): void {
  // A new run replaces the old one, so its autosave would only offer a run the player left behind.
  deleteSaveSlot(AUTOSAVE_SLOT_ID);
  resetPlayerState(scene.registry, runSeed);
  resetRunSummary(scene.registry);
  startPreparedRun(scene);
}

export function startPreparedRun(scene: Phaser.Scene): void {
  startRegisteredScene(scene, 'Game');
}
