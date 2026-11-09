import type Phaser from 'phaser';
import { resetPlayerState, resetRunSummary } from '../../systems/PlayerState';
import { startRegisteredScene } from '../sceneRegistry';

export function startFreshRun(scene: Phaser.Scene): void {
  resetPlayerState(scene.registry);
  resetRunSummary(scene.registry);
  startPreparedRun(scene);
}

export function startPreparedRun(scene: Phaser.Scene): void {
  startRegisteredScene(scene, 'Game');
}
