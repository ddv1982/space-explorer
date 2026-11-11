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
  centerHorizontally: (layout: { left: number; width: number }, width: number) =>
    layout.left + (layout.width - width) / 2,
}));

let autoFire = { touch: true, keyboard: false };
mock.module('../src/config/autoFireSettings', () => ({
  getAutoFireSettings: () => autoFire,
}));

const { InputManager } = await import('../src/systems/InputManager');

function createManager(scene: ReturnType<typeof createScene>, touchSteeringActive: boolean) {
  const inputManager = new InputManager();
  inputManager.create(
    scene as never,
    {
      isTouchSteeringActive: () => touchSteeringActive,
      isControlPointer: () => false,
      getDragDesiredVelocity: () => null,
    } as never
  );
  return inputManager;
}

function createKey() {
  return { isDown: false, timeDown: 0 };
}

function createScene(pointers: Array<{ id: number; isDown: boolean; downX: number }> = []) {
  const keys = new Map<number, ReturnType<typeof createKey>>();
  return {
    keys,
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
        addKey: (code: number) => {
          const key = createKey();
          keys.set(code, key);
          return key;
        },
      },
    },
  };
}

describe('InputManager autofire settings', () => {
  test('touch autofire off fires only while a finger is down', () => {
    autoFire = { touch: false, keyboard: false };
    const scene = createScene([]);
    const inputManager = createManager(scene, true);
    expect(inputManager.isFiring()).toBe(false);
    scene.input.activePointer.isDown = true;
    expect(inputManager.isFiring()).toBe(true);
    autoFire = { touch: true, keyboard: false };
  });

  test('keyboard autofire on fires without Space and follows a change made mid-run', () => {
    const scene = createScene([]);
    const inputManager = createManager(scene, false);
    expect(inputManager.isFiring()).toBe(false);
    autoFire = { touch: true, keyboard: true };
    expect(inputManager.isFiring()).toBe(true);
    autoFire = { touch: true, keyboard: false };
    expect(inputManager.isFiring()).toBe(false);
  });

  test('keyboard autofire does not leak into touch flight with touch autofire off', () => {
    autoFire = { touch: false, keyboard: true };
    const inputManager = createManager(createScene([]), true);
    expect(inputManager.isFiring()).toBe(false);
    autoFire = { touch: true, keyboard: false };
  });
});

describe('InputManager touch momentum flight', () => {
  test('autofires while touch steering is active, even with no fire touch', () => {
    const scene = createScene([]);
    const inputManager = new InputManager();
    inputManager.create(
      scene as never,
      {
        isTouchSteeringActive: () => true,
        isControlPointer: () => false,
        getDragDesiredVelocity: () => ({ vx: 12, vy: -3 }),
      } as never
    );

    expect(inputManager.isFiring()).toBe(true);
    expect(inputManager.getTouchDesiredVelocity(0, 0, 0, 480)).toEqual({ vx: 12, vy: -3 });
  });

  test('a keyboard user on a touch device fires with Space or a held pointer, not automatically', () => {
    const scene = createScene([]);
    const inputManager = new InputManager();
    inputManager.create(
      scene as never,
      {
        isTouchSteeringActive: () => false,
        isControlPointer: () => false,
        getDragDesiredVelocity: () => null,
      } as never
    );

    expect(inputManager.isFiring()).toBe(false);
    scene.keys.get(32)!.isDown = true;
    expect(inputManager.isFiring()).toBe(true);
    expect(inputManager.getTouchDesiredVelocity(0, 0, 0, 480)).toBeNull();
  });
});

test('a brief pause press survives release before the next gameplay update', () => {
  const scene = createScene();
  const manager = new InputManager();
  manager.create(scene as never);
  const escape = scene.keys.get(27);
  if (!escape) throw new Error('Escape was not registered');
  expect(manager.consumePauseToggleRequest()).toBe(false);
  escape.timeDown = 100;
  escape.isDown = false;
  expect(manager.consumePauseToggleRequest()).toBe(true);
  expect(manager.consumePauseToggleRequest()).toBe(false);
  escape.timeDown = 200;
  escape.isDown = true;
  expect(manager.consumePauseToggleRequest()).toBe(true);
  expect(manager.consumePauseToggleRequest()).toBe(false);
  escape.timeDown = 0;
  escape.isDown = false;
  expect(manager.consumePauseToggleRequest()).toBe(false);
  escape.timeDown = 300;
  expect(manager.consumePauseToggleRequest()).toBe(true);
});
