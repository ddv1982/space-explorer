import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();
mock.module('../src/utils/device', () => ({ isTouchMobileDevice: () => true }));
mock.module('../src/scenes/shared/neonUiTheme', () => ({ drawNeonFrame: () => {}, NEON: { cyan: 0, cyanBright: 0 } }));

const { MobileControls } = await import('../src/systems/MobileControls');

/** Any game object call chains back to the same stub. */
function chainable(): Record<string, unknown> {
  const target: Record<string, unknown> = {};
  const proxy: Record<string, unknown> = new Proxy(target, {
    get: (object, key) => (key in object ? object[key as string] : () => proxy),
  });
  return proxy;
}

function createScene(viewport = { x: 0, y: 0, width: 390, height: 844 }) {
  const handlers = new Map<string, Array<(pointer: unknown) => void>>();
  const scene = {
    add: { graphics: () => chainable(), zone: () => chainable(), circle: () => chainable() },
    input: {
      manager: { pointersTotal: 3 },
      addPointer: () => {},
      on: (event: string, handler: (pointer: unknown) => void) => {
        handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      },
      off: (event: string, handler: (pointer: unknown) => void) => {
        handlers.set(
          event,
          (handlers.get(event) ?? []).filter((candidate) => candidate !== handler)
        );
      },
    },
    scale: { getViewPort: () => viewport },
  };
  const emit = (event: string, pointer: { id: number; x: number; y: number }) => {
    for (const handler of handlers.get(event) ?? []) handler(pointer);
  };
  return { scene, emit, viewport };
}

function createControls(viewport?: { x: number; y: number; width: number; height: number }) {
  const harness = createScene(viewport);
  const controls = new MobileControls().create(harness.scene as never);
  return { controls, ...harness };
}

// Pause button centre for a 390-wide viewport: right - 22 - 22, top + 84 + 22.
const PAUSE = { x: 346, y: 106 };

describe('MobileControls relative drag', () => {
  test('momentum flight uses drag mode and autofires while touch steering is active', () => {
    const { controls } = createControls();
    expect(controls.isDragMode()).toBe(true);
    expect(controls.isTouchSteeringActive()).toBe(true);
    controls.setJoystickSuppressed(true);
    expect(controls.isTouchSteeringActive()).toBe(false);
  });

  test('ship follows the finger movement relative to where the drag began', () => {
    const { controls, emit } = createControls();
    emit('pointerdown', { id: 1, x: 200, y: 700 });
    expect(controls.getDragDesiredVelocity(195, 760, 0, 480)).toEqual({ vx: 0, vy: 0 });
    emit('pointermove', { id: 1, x: 260, y: 700 });
    const velocity = controls.getDragDesiredVelocity(195, 760, 0, 480);
    expect(velocity?.vx).toBe(480);
    expect(velocity?.vy).toBe(0);
  });

  test('a pause-button touch never starts a drag', () => {
    const { controls, emit } = createControls();
    emit('pointerdown', { id: 4, ...PAUSE });
    expect(controls.getDragDesiredVelocity(195, 760, 0, 480)).toBeNull();
  });

  test('a second finger while dragging does not steer', () => {
    const { controls, emit } = createControls();
    emit('pointerdown', { id: 1, x: 200, y: 700 });
    controls.getDragDesiredVelocity(195, 760, 0, 480);
    emit('pointerdown', { id: 2, x: 50, y: 300 });
    emit('pointermove', { id: 2, x: 10, y: 100 });
    expect(controls.getDragDesiredVelocity(195, 760, 0, 480)).toEqual({ vx: 0, vy: 0 });
    expect(controls.isControlPointer({ id: 2 } as never)).toBe(false);
    expect(controls.isControlPointer({ id: 1 } as never)).toBe(true);
  });

  test('lifting and touching again re-anchors without a jump', () => {
    const { controls, emit } = createControls();
    emit('pointerdown', { id: 1, x: 200, y: 700 });
    controls.getDragDesiredVelocity(195, 760, 0, 480);
    emit('pointermove', { id: 1, x: 300, y: 700 });
    emit('pointerup', { id: 1, x: 300, y: 700 });
    expect(controls.getDragDesiredVelocity(295, 760, 0, 480)).toBeNull();
    emit('pointerdown', { id: 3, x: 20, y: 200 });
    expect(controls.getDragDesiredVelocity(295, 760, 0, 480)).toEqual({ vx: 0, vy: 0 });
  });

  test('a respawned ship re-anchors to the held finger instead of flying back', () => {
    const { controls, emit } = createControls();
    emit('pointerdown', { id: 1, x: 200, y: 700 });
    controls.getDragDesiredVelocity(100, 400, 0, 480);
    emit('pointermove', { id: 1, x: 220, y: 700 });
    // New spawn generation at the spawn point: no pull back toward the old ship position.
    expect(controls.getDragDesiredVelocity(195, 760, 1, 480)).toEqual({ vx: 0, vy: 0 });
  });

  test('drag target stays inside the viewport after it shrinks', () => {
    const { controls, emit, viewport } = createControls({ x: 0, y: 0, width: 844, height: 390 });
    emit('pointerdown', { id: 1, x: 400, y: 200 });
    controls.getDragDesiredVelocity(700, 300, 0, 480);
    emit('pointermove', { id: 1, x: 800, y: 200 });
    viewport.width = 390;
    viewport.height = 844;
    // Ship already at the new right margin: it must not be pushed further off-screen.
    expect(controls.getDragDesiredVelocity(372, 300, 0, 480)).toEqual({ vx: 0, vy: 0 });
  });
});
