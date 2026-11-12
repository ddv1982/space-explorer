import type Phaser from 'phaser';
import { resetPlayerState, resetRunSummary } from '../../systems/PlayerState';
import { createRunSeed } from '../../systems/runVariation';
import { startRegisteredScene } from '../sceneRegistry';

/** Starts a run from sector 1. Without a seed it gets a new one; RETRY passes the lost run's seed. */
export function startFreshRun(scene: Phaser.Scene, runSeed: number = createRunSeed()): void {
  resetPlayerState(scene.registry, runSeed);
  resetRunSummary(scene.registry);
  startPreparedRun(scene);
}

export function startPreparedRun(scene: Phaser.Scene): void {
  startRegisteredScene(scene, 'Game');
}
