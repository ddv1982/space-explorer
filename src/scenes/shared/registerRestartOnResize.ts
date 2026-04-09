import Phaser from 'phaser';

const RESIZE_RESTART_DEBOUNCE_MS = 120;

export function registerRestartOnResize(
  scene: Phaser.Scene,
  shouldRestart: () => boolean = () => true
): void {
  let width = Math.round(scene.scale.gameSize.width);
  let height = Math.round(scene.scale.gameSize.height);
  let pendingRestart: ReturnType<typeof window.setTimeout> | null = null;

  const handleResize = (gameSize: Phaser.Structs.Size): void => {
    const nextWidth = Math.round(gameSize.width);
    const nextHeight = Math.round(gameSize.height);

    if (!shouldRestart()) {
      width = nextWidth;
      height = nextHeight;
      return;
    }

    if (nextWidth === width && nextHeight === height) {
      return;
    }

    if (pendingRestart !== null) {
      window.clearTimeout(pendingRestart);
    }

    pendingRestart = window.setTimeout(() => {
      pendingRestart = null;

      if (!shouldRestart()) {
        width = nextWidth;
        height = nextHeight;
        return;
      }

      if (nextWidth === width && nextHeight === height) {
        return;
      }

      width = nextWidth;
      height = nextHeight;
      scene.scene.restart();
    }, RESIZE_RESTART_DEBOUNCE_MS);
  };

  const cleanup = (): void => {
    if (pendingRestart !== null) {
      window.clearTimeout(pendingRestart);
      pendingRestart = null;
    }

    scene.scale.off(Phaser.Scale.Events.RESIZE, handleResize);
  };

  scene.scale.on(Phaser.Scale.Events.RESIZE, handleResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}
