import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Math: {
      Vector2: class {
        x = 0;
        y = 0;
        set(x: number, y: number) {
          this.x = x;
          this.y = y;
          return this;
        }
      },
    },
    Input: {
      Keyboard: {
        JustDown: () => false,
        KeyCodes: {
          SPACE: 32,
          ESC: 27,
          W: 87,
          A: 65,
          S: 83,
          D: 68,
        },
      },
    },
  },
}));

mock.module('../src/utils/device', () => ({
  isTouchMobileDevice: () => true,
  isPortraitTouchViewport: () => false,
}));

mock.module('../src/utils/layout', () => ({
  getViewportBounds: () => ({
    left: 0,
    top: 0,
    width: 400,
    height: 300,
    right: 400,
    bottom: 300,
    centerX: 200,
    centerY: 150,
  }),
  getViewportLayout: () => ({
    left: 0,
    top: 0,
    width: 400,
    height: 300,
    right: 400,
    bottom: 300,
    centerX: 200,
    centerY: 150,
  }),
  centerHorizontally: (layout: { left: number; width: number }, width: number) => layout.left + (layout.width - width) / 2,
}));

const { InputManager } = await import('../src/systems/InputManager');

function createKey() {
  return { isDown: false };
}

describe('InputManager mobile fire-touch filtering', () => {
  test('ignores pause/control touches on the right half of the screen', () => {
    const pointer = { id: 7, isDown: true, downX: 320 };
    const scene = {
      input: {
        activePointer: { isDown: false },
        manager: {
          pointers: [pointer],
        },
        keyboard: {
          createCursorKeys: () => ({
            left: createKey(),
            right: createKey(),
            up: createKey(),
            down: createKey(),
          }),
          addKey: () => createKey(),
        },
      },
    };

    const inputManager = new InputManager();
    inputManager.create(scene as never, {
      getMovementVector: (out: { set: (x: number, y: number) => unknown }) => out.set(0, 0),
      isControlPointer: (candidate: { id: number }) => candidate.id === 7,
    } as never);

    expect(inputManager.isFiring()).toBe(false);
  });

  test('still treats non-control right-side touches as mobile fire input', () => {
    const pointer = { id: 8, isDown: true, downX: 320 };
    const scene = {
      input: {
        activePointer: { isDown: false },
        manager: {
          pointers: [pointer],
        },
        keyboard: {
          createCursorKeys: () => ({
            left: createKey(),
            right: createKey(),
            up: createKey(),
            down: createKey(),
          }),
          addKey: () => createKey(),
        },
      },
    };

    const inputManager = new InputManager();
    inputManager.create(scene as never, {
      getMovementVector: (out: { set: (x: number, y: number) => unknown }) => out.set(0, 0),
      isControlPointer: () => false,
    } as never);

    expect(inputManager.isFiring()).toBe(true);
  });
});
