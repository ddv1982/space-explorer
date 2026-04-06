import Phaser from 'phaser';

export interface ProceedOnInputOptions {
  includePointer?: boolean;
  shouldProceedKey?: (event: KeyboardEvent) => boolean;
}

export function bindProceedOnInput(
  scene: Phaser.Scene,
  callback: () => void,
  options: ProceedOnInputOptions = {}
): void {
  let fired = false;
  const includePointer = options.includePointer ?? true;

  const cleanup = () => {
    if (includePointer) {
      scene.input.off('pointerdown', handleProceed);
    }
    scene.input.keyboard?.off('keydown', handleKeyDown);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
  };

  const fireOnce = () => {
    if (fired) {
      return;
    }

    fired = true;
    cleanup();
    callback();
  };

  const handleProceed = () => {
    fireOnce();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    if (options.shouldProceedKey && !options.shouldProceedKey(event)) {
      return;
    }

    fireOnce();
  };

  if (includePointer) {
    scene.input.on('pointerdown', handleProceed);
  }
  scene.input.keyboard?.on('keydown', handleKeyDown);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}
