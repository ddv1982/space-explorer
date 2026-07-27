import { describe, expect, test } from 'bun:test';
import type Phaser from 'phaser';
import {
  rebindSceneEventHandlers,
  unbindSceneEventHandlers,
  type SceneEventBinding,
} from '../src/scenes/gameScene/sceneEvents';

describe('GameScene event bindings', () => {
  test('rebind and unbind preserve handler identity and context', () => {
    type EventHandler = (...args: unknown[]) => unknown;
    const calls: Array<{
      operation: 'on' | 'off';
      event: string;
      handler: EventHandler;
      context: object;
    }> = [];
    const events = {
      on(event: string, handler: EventHandler, context: object) {
        calls.push({ operation: 'on', event, handler, context });
      },
      off(event: string, handler: EventHandler, context: object) {
        calls.push({ operation: 'off', event, handler, context });
      },
    } as Phaser.Events.EventEmitter;
    const context = {};
    const handler = (x: number): void => {
      void x;
    };
    const bindings: SceneEventBinding[] = [
      { event: 'enemy-spawn-warning', handler },
    ];

    rebindSceneEventHandlers({ events, bindings, context });
    unbindSceneEventHandlers({ events, bindings, context });

    expect(calls.map(({ operation }) => operation)).toEqual(['off', 'on', 'off']);
    expect(calls.every(call => call.handler === handler)).toBe(true);
    expect(calls.every(call => call.context === context)).toBe(true);
  });
});
