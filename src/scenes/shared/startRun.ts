import Phaser from 'phaser';
import { getPlayerState, resetPlayerState, resetRunSummary } from '../../systems/PlayerState';
import { ensurePremiumBackgroundAssets } from '../../systems/parallax/premiumBackgroundLoading';
import { startRegisteredScene } from '../sceneRegistry';

export function startFreshRun(scene: Phaser.Scene): void {
  resetPlayerState(scene.registry);
  resetRunSummary(scene.registry);
  startPreparedRun(scene);
}

export function startPreparedRun(scene: Phaser.Scene): void {
  let pending = true;
  const cancel = (): void => {
    pending = false;
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cancel);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cancel);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cancel);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cancel);
  ensurePremiumBackgroundAssets(scene, getPlayerState(scene.registry).level, () => {
    if (!pending) return;
    cancel();
    startRegisteredScene(scene, 'Game');
  });
}
