import Phaser from 'phaser';

export function registerRestartOnResize(
  scene: Phaser.Scene,
  shouldRestart: () => boolean = () => true
): void {
  let width = scene.scale.gameSize.width;
  let height = scene.scale.gameSize.height;

  const handleResize = (gameSize: Phaser.Structs.Size): void => {
    if (!shouldRestart()) {
      width = gameSize.width;
      height = gameSize.height;
      return;
    }

    if (gameSize.width === width && gameSize.height === height) {
      return;
    }

    width = gameSize.width;
    height = gameSize.height;
    scene.scene.restart();
  };

  const cleanup = (): void => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, handleResize);
  };

  scene.scale.on(Phaser.Scale.Events.RESIZE, handleResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}
