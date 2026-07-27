import type Phaser from 'phaser';
import type {
  GameSceneEventHandler,
  GameSceneEventName,
} from '@/systems/GameplayFlow';

export type SceneEventBinding = {
  [Event in GameSceneEventName]: {
    event: Event;
    handler: GameSceneEventHandler<Event>;
  };
}[GameSceneEventName];

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
