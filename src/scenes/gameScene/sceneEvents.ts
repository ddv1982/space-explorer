import Phaser from 'phaser';

export interface SceneEventBinding {
  event: string;
  handler: (...args: never[]) => void;
}

interface SceneEventBindingsOptions {
  events: Phaser.Events.EventEmitter;
  bindings: SceneEventBinding[];
  context?: unknown;
}

export function rebindSceneEventHandlers({ events, bindings, context }: SceneEventBindingsOptions): void {
  unbindSceneEventHandlers({ events, bindings, context });

  for (const { event, handler } of bindings) {
    events.on(event, handler, context);
  }
}

export function unbindSceneEventHandlers({ events, bindings, context }: SceneEventBindingsOptions): void {
  for (const { event, handler } of bindings) {
    events.off(event, handler, context);
  }
}
