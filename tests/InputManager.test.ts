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

function createScene(pointers: Array<{ id: number; isDown: boolean; downX: number }> = []) {
  return {
    input: {
      activePointer: { isDown: false },
      manager: {
        pointers,
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
}

describe('InputManager mobile fire-touch filtering', () => {
  test('ignores pause/control touches on the right half of the screen', () => {
    const pointer = { id: 7, isDown: true, downX: 320 };
    const scene = createScene([pointer]);

    const inputManager = new InputManager();
    inputManager.create(scene as never, {
      getMovementVector: (out: { set: (x: number, y: number) => unknown }) => out.set(0, 0),
      isControlPointer: (candidate: { id: number }) => candidate.id === 7,
    } as never);

    expect(inputManager.isFiring()).toBe(false);
  });

  test('still treats non-control right-side touches as mobile fire input', () => {
    const pointer = { id: 8, isDown: true, downX: 320 };
    const scene = createScene([pointer]);

    const inputManager = new InputManager();
    inputManager.create(scene as never, {
      getMovementVector: (out: { set: (x: number, y: number) => unknown }) => out.set(0, 0),
      isControlPointer: () => false,
    } as never);

    expect(inputManager.isFiring()).toBe(true);
  });
});

describe('InputManager mobile movement gating', () => {
  test('requires deliberate movement before engaging a direction', () => {
    const scene = createScene();
    let vector = { x: 0.34, y: 0 };

    const inputManager = new InputManager();
    inputManager.create(scene as never, {
      getMovementVector: (out: { set: (x: number, y: number) => unknown }) => out.set(vector.x, vector.y),
      isControlPointer: () => false,
    } as never);

    expect(inputManager.isRight()).toBe(false);

    vector = { x: 0.36, y: 0 };
    expect(inputManager.isRight()).toBe(true);
  });

  test('uses hysteresis so an engaged direction stays stable until movement meaningfully relaxes', () => {
    const scene = createScene();
    let vector = { x: 0.4, y: 0 };

    const inputManager = new InputManager();
    inputManager.create(scene as never, {
      getMovementVector: (out: { set: (x: number, y: number) => unknown }) => out.set(vector.x, vector.y),
      isControlPointer: () => false,
    } as never);

    expect(inputManager.isRight()).toBe(true);

    vector = { x: 0.2, y: 0 };
    expect(inputManager.isRight()).toBe(true);

    vector = { x: 0.17, y: 0 };
    expect(inputManager.isRight()).toBe(false);
  });

  test('requires renewed commitment to reverse directions', () => {
    const scene = createScene();
    let vector = { x: 0.5, y: 0 };

    const inputManager = new InputManager();
    inputManager.create(scene as never, {
      getMovementVector: (out: { set: (x: number, y: number) => unknown }) => out.set(vector.x, vector.y),
      isControlPointer: () => false,
    } as never);

    expect(inputManager.isRight()).toBe(true);

    vector = { x: -0.2, y: 0 };
    expect(inputManager.isLeft()).toBe(false);

    vector = { x: -0.36, y: 0 };
    expect(inputManager.isLeft()).toBe(true);
  });

  test('suppresses weak secondary-axis drift while preserving intentional diagonals', () => {
    const scene = createScene();
    let vector = { x: 0.8, y: 0.45 };

    const inputManager = new InputManager();
    inputManager.create(scene as never, {
      getMovementVector: (out: { set: (x: number, y: number) => unknown }) => out.set(vector.x, vector.y),
      isControlPointer: () => false,
    } as never);

    expect(inputManager.isRight()).toBe(true);
    expect(inputManager.isDown()).toBe(false);

    vector = { x: 0.8, y: 0.65 };
    expect(inputManager.isRight()).toBe(true);
    expect(inputManager.isDown()).toBe(true);
  });
});
