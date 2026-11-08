import type Phaser from 'phaser';
import { getPlayerState, resetPlayerState, resetRunSummary } from '../../systems/PlayerState';
import { prepareLegacyBackgroundTextures } from '../../systems/parallax/premiumBackgroundLoading';
import { startRegisteredScene } from '../sceneRegistry';

export function startFreshRun(scene: Phaser.Scene): void {
  resetPlayerState(scene.registry);
  resetRunSummary(scene.registry);
  startPreparedRun(scene);
}

export function startPreparedRun(scene: Phaser.Scene): void {
  prepareLegacyBackgroundTextures(scene, getPlayerState(scene.registry).level);
  startRegisteredScene(scene, 'Game');
}
