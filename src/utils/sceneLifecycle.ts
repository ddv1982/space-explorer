import Phaser from 'phaser';

interface SceneLifecycleHandlerOptions {
  onShutdown: () => void;
  onDestroy?: () => void;
  context?: unknown;
}

export function rebindSceneLifecycleHandlers(
  scene: Phaser.Scene,
  { onShutdown, onDestroy = onShutdown, context }: SceneLifecycleHandlerOptions
): void {
  scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown, context);
  scene.events.off(Phaser.Scenes.Events.DESTROY, onDestroy, context);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown, context);
  scene.events.once(Phaser.Scenes.Events.DESTROY, onDestroy, context);
}

export function unbindSceneLifecycleHandlers(
  scene: Phaser.Scene,
  { onShutdown, onDestroy = onShutdown, context }: SceneLifecycleHandlerOptions
): void {
  scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown, context);
  scene.events.off(Phaser.Scenes.Events.DESTROY, onDestroy, context);
}
