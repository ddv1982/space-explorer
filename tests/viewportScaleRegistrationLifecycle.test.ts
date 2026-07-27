import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: { Scale: { Events: { RESIZE: 'resize' } } },
}));

const { registerScaleHandlers } = await import(
  '../src/scenes/gameScene/viewportScaleRegistration'
);

describe('viewport scale registration lifecycle', () => {
  test('repeated registration retains exactly one resize callback', () => {
    const activeHandlers = new Set<() => void>();
    const on = mock((_event: string, handler: () => void) => {
      activeHandlers.add(handler);
    });
    const off = mock((_event: string, handler: () => void) => {
      activeHandlers.delete(handler);
    });
    const scale = { on, off } as unknown as Phaser.Scale.ScaleManager;
    const handler = (): void => {};
    const context = {};

    for (let cycle = 0; cycle < 4; cycle++) {
      registerScaleHandlers(scale, handler, context);
      expect(activeHandlers.size).toBe(1);
    }

    expect(off).toHaveBeenCalledTimes(4);
    expect(on).toHaveBeenCalledTimes(4);
  });
});
