import { mock } from 'bun:test';

/**
 * Shared minimal Phaser stub for unit tests.
 * Covers the Arcade/Math/GameObject surface most entity and collision tests need.
 * Keep this additive and small — prefer local mocks only when a suite needs exotic APIs.
 */

class MockGameObject {
  active = true;
}

class MockArcadeSprite extends MockGameObject {
  preUpdate(_time: number, _delta: number): void {}
}

class MockArcadeBody {}

class MockArcadeGroup {}

class MockScene {}

class MockVector2 {
  x = 0;
  y = 0;

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  rotate(_radians?: number): this {
    return this;
  }

  normalize(): this {
    return this;
  }

  scale(_value?: number): this {
    return this;
  }
}

function createDefaultPhaserMock() {
  return {
    default: {
      Scene: MockScene,
      TintModes: {
        MULTIPLY: 0,
        FILL: 1,
      },
      BlendModes: {
        NORMAL: 0,
        ADD: 1,
      },
      Display: {
        Color: {
          HexStringToColor: (hex: string) => ({ color: parseInt(hex.replace('#', ''), 16) }),
        },
      },
      GameObjects: {
        GameObject: MockGameObject,
        Image: class {},
        TileSprite: class {},
        Graphics: class {},
      },
      Physics: {
        Arcade: {
          Sprite: MockArcadeSprite,
          Body: MockArcadeBody,
          Group: MockArcadeGroup,
        },
      },
      Math: {
        DegToRad: (degrees: number) => (degrees * Math.PI) / 180,
        RadToDeg: (radians: number) => radians * (180 / Math.PI),
        Linear: (a: number, b: number, t: number) => a + (b - a) * t,
        Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
        FloatBetween: (min: number, _max?: number) => min,
        Between: (min: number, _max?: number) => min,
        Angle: {
          Between: (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1),
        },
        Vector2: MockVector2,
      },
      Utils: {
        Array: {
          GetRandom: <T>(values: T[]) => values[0],
        },
      },
      Loader: {
        Events: {
          COMPLETE: 'complete',
          FILE_LOAD_ERROR: 'loaderror',
        },
      },
      Scenes: {
        Events: {
          SHUTDOWN: 'shutdown',
          DESTROY: 'destroy',
        },
      },
    },
  };
}

/** Install the shared Phaser module mock. Call before importing production modules under test. */
export function mockPhaserModule(): void {
  mock.module('phaser', () => createDefaultPhaserMock());
}
