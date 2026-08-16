import { beforeEach, describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Scale: { Events: { RESIZE: 'resize' } },
    Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
  },
}));

mock.module('@/utils/layout', () => ({
  centerHorizontally: () => 240,
  getViewportLayout: () => ({ centerX: 400, centerY: 300 }),
}));

mock.module('@/utils/uiFonts', () => ({
  UI_FONT_MONO: 'monospace',
}));

let hardwareDetected = false;
const detectionSubscribers: Array<() => void> = [];

mock.module('@/systems/hardwareKeyboardDetection', () => ({
  isHardwareKeyboardDetected: () => hardwareDetected,
  onHardwareKeyboardDetected: (handler: () => void) => {
    if (hardwareDetected) {
      handler();
      return (): void => undefined;
    }

    detectionSubscribers.push(handler);
    return () => {
      const index = detectionSubscribers.indexOf(handler);
      if (index >= 0) {
        detectionSubscribers.splice(index, 1);
      }
    };
  },
}));

const { showControlsHint } = await import('../src/scenes/gameScene/showControlsHint');

interface FakeText {
  text: string;
  destroyed: boolean;
  setText(value: string): void;
}

function createFakeText(initial: string): FakeText & Record<string, unknown> {
  const fake: FakeText & Record<string, unknown> = {
    text: initial,
    destroyed: false,
    setText(value: string) {
      fake.text = value;
    },
    setOrigin: () => fake,
    setDepth: () => fake,
    setScrollFactor: () => fake,
    setPosition: () => fake,
    destroy: () => {
      fake.destroyed = true;
    },
  };
  return fake;
}

function createFakeScene() {
  const texts: FakeText[] = [];
  const graphics = {
    setDepth: () => graphics,
    setScrollFactor: () => graphics,
    clear: () => graphics,
    fillStyle: () => graphics,
    fillRoundedRect: () => graphics,
    destroy: (): void => undefined,
  };
  const scene = {
    add: {
      graphics: () => graphics,
      text: (_x: number, _y: number, value: string) => {
        const text = createFakeText(value);
        texts.push(text);
        return text;
      },
    },
    scale: { on: (): void => undefined, off: (): void => undefined },
    events: { once: (): void => undefined },
    tweens: { add: (): void => undefined },
  };

  return { scene, texts };
}

describe('showControlsHint hardware keyboard handling', () => {
  beforeEach(() => {
    hardwareDetected = false;
    detectionSubscribers.length = 0;
  });

  test('shows touch hints on mobile before any keyboard is detected', () => {
    const { scene, texts } = createFakeScene();
    showControlsHint(scene as never, { mobile: true });

    expect(texts.map((text) => text.text)).toEqual(['Use the joystick to move', 'Tap the right side to shoot']);
    expect(detectionSubscribers.length).toBe(1);
  });

  test('swaps to keyboard hints live when the first keypress lands', () => {
    const { scene, texts } = createFakeScene();
    showControlsHint(scene as never, { mobile: true });

    hardwareDetected = true;
    detectionSubscribers.forEach((handler) => handler());

    expect(texts.map((text) => text.text)).toEqual(['WASD / Arrows to Move', 'SPACE / Click to Fire']);
  });

  test('shows keyboard hints immediately when detection happened before scene start', () => {
    hardwareDetected = true;

    const { scene, texts } = createFakeScene();
    showControlsHint(scene as never, { mobile: true });

    expect(texts.map((text) => text.text)).toEqual(['WASD / Arrows to Move', 'SPACE / Click to Fire']);
  });

  test('keeps desktop keyboard hints and ignores later detection', () => {
    const { scene, texts } = createFakeScene();
    showControlsHint(scene as never, { mobile: false });

    hardwareDetected = true;
    detectionSubscribers.forEach((handler) => handler());

    expect(texts.map((text) => text.text)).toEqual(['WASD / Arrows to Move', 'SPACE / Click to Fire']);
  });
});
