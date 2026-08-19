import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Scale: { Events: { RESIZE: 'resize' } },
    Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
  },
}));

const { registerRestartOnResize } = await import('../src/scenes/shared/registerRestartOnResize');

describe('registerRestartOnResize', () => {
  test('a second create keeps one live resize handler', () => {
    const resizeHandlers = new Set<(gameSize: { width: number; height: number }) => void>();
    const on = mock((_event: string, handler: (gameSize: { width: number; height: number }) => void) => {
      resizeHandlers.add(handler);
    });
    const off = mock((_event: string, handler: (gameSize: { width: number; height: number }) => void) => {
      resizeHandlers.delete(handler);
    });
    const once = mock(() => undefined);

    const scene = {
      scale: {
        gameSize: { width: 390, height: 844 },
        on,
        off,
      },
      events: {
        once,
        off: mock(),
      },
      scene: {
        restart: mock(),
      },
    } as unknown as Phaser.Scene;

    registerRestartOnResize(scene);
    registerRestartOnResize(scene);

    expect(resizeHandlers.size).toBe(1);
    expect(off).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledTimes(2);
  });
});
