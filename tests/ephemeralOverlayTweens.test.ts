import { describe, expect, mock, test } from 'bun:test';

class MockGameObject {
  public destroyCalls = 0;

  destroy(): void {
    this.destroyCalls += 1;
  }
}

mock.module('phaser', () => ({
  default: {
    GameObjects: {
      GameObject: MockGameObject,
    },
  },
}));

const { createPickupLabel, createScorePopup, createSpawnWarning } =
  await import('../src/systems/effects/ephemeralOverlayTweens');

type TweenConfig = {
  targets: unknown;
  alpha?: { from: number; to: number };
  scale?: number;
  duration: number;
  ease: string;
  y?: number;
  onComplete?: (tween: unknown, targets: unknown[]) => void;
};

class MockGraphics extends MockGameObject {
  public depth = -1;
  public scrollFactor = -1;
  public fillStyleCalls: Array<{ color: number; alpha: number }> = [];
  public fillTriangleCalls: Array<[number, number, number, number, number, number]> = [];
  public lineStyleCalls: Array<{ width: number; color: number; alpha: number }> = [];
  public strokeTriangleCalls: Array<[number, number, number, number, number, number]> = [];

  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }

  setScrollFactor(scrollFactor: number): this {
    this.scrollFactor = scrollFactor;
    return this;
  }

  fillStyle(color: number, alpha: number): this {
    this.fillStyleCalls.push({ color, alpha });
    return this;
  }

  fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): this {
    this.fillTriangleCalls.push([x1, y1, x2, y2, x3, y3]);
    return this;
  }

  lineStyle(width: number, color: number, alpha: number): this {
    this.lineStyleCalls.push({ width, color, alpha });
    return this;
  }

  strokeTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): this {
    this.strokeTriangleCalls.push([x1, y1, x2, y2, x3, y3]);
    return this;
  }
}

class MockText extends MockGameObject {
  public origin = -1;
  public depth = -1;
  public scale = 1;

  setOrigin(origin: number): this {
    this.origin = origin;
    return this;
  }

  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }

  setScale(scale: number): this {
    this.scale = scale;
    return this;
  }
}

function createSceneFixture() {
  const tweens: TweenConfig[] = [];
  const graphics: MockGraphics[] = [];
  const texts: Array<{ x: number; y: number; value: string; style: unknown; text: MockText }> = [];

  const scene = {
    scale: { getViewPort: () => ({ x: 0, y: 0, width: 800, height: 600 }) },
    add: {
      graphics: () => {
        const next = new MockGraphics();
        graphics.push(next);
        return next;
      },
      text: (x: number, y: number, value: string, style: unknown) => {
        const text = new MockText();
        texts.push({ x, y, value, style, text });
        return text;
      },
    },
    tweens: {
      add: (config: TweenConfig) => {
        tweens.push(config);
        return {};
      },
    },
  };

  return {
    scene,
    tweens,
    graphics,
    texts,
  };
}

describe('ephemeralOverlayTweens', () => {
  test('createSpawnWarning preserves indicator geometry and tween cleanup semantics', () => {
    const fixture = createSceneFixture();

    createSpawnWarning(fixture.scene as never, 140);

    expect(fixture.graphics).toHaveLength(1);
    const arrow = fixture.graphics[0];
    expect(arrow.depth).toBe(150);
    expect(arrow.scrollFactor).toBe(0);
    expect(arrow.lineStyleCalls).toEqual([
      { width: 4, color: 0xff756f, alpha: 0.2 },
      { width: 1.5, color: 0xff756f, alpha: 0.95 },
    ]);
    expect(arrow.strokeTriangleCalls).toEqual([
      [133, 23, 147, 23, 140, 37],
      [134, 24, 146, 24, 140, 36],
    ]);
    expect(arrow.fillStyleCalls).toEqual([
      { color: 0x3d0a0a, alpha: 0.9 },
      { color: 0xffd7d4, alpha: 0.9 },
    ]);
    expect(arrow.fillTriangleCalls).toEqual([
      [134, 24, 146, 24, 140, 36],
      [137.5, 27, 142.5, 27, 140, 33],
    ]);

    expect(fixture.tweens).toHaveLength(1);
    const tween = fixture.tweens[0];
    expect(tween.targets).toBe(arrow);
    expect(tween.alpha).toEqual({ from: 1, to: 0 });
    expect(tween.duration).toBe(600);
    expect(tween.ease).toBe('Power2');

    tween.onComplete?.({}, [arrow]);
    expect(arrow.destroyCalls).toBe(1);
  });

  test('createScorePopup pops in, then rises, fades and destroys its text', () => {
    const fixture = createSceneFixture();

    createScorePopup(fixture.scene as never, 200, 300, 100);

    expect(fixture.texts).toHaveLength(1);
    expect(fixture.texts[0]).toMatchObject({ x: 200, y: 300, value: '+100' });
    expect(fixture.texts[0].style).toMatchObject({ fontSize: '17px', color: '#ffd27a' });
    expect(fixture.texts[0].text.origin).toBe(0.5);
    expect(fixture.texts[0].text.depth).toBe(50);
    expect(fixture.texts[0].text.scale).toBe(0.55);

    const [pop, rise] = fixture.tweens;
    expect(pop).toMatchObject({ targets: fixture.texts[0].text, scale: 1 });
    expect(rise).toMatchObject({ y: 262, alpha: { from: 1, to: 0 }, duration: 800 });

    rise.onComplete?.({}, [fixture.texts[0].text]);
    expect(fixture.texts[0].text.destroyCalls).toBe(1);
  });

  test('bigger awards get a bigger, longer popup', () => {
    const fixture = createSceneFixture();

    createScorePopup(fixture.scene as never, 200, 300, 400);
    createScorePopup(fixture.scene as never, 200, 300, 2500);

    expect(fixture.texts.map((entry) => (entry.style as { fontSize: string }).fontSize)).toEqual(['22px', '28px']);
    expect(fixture.tweens[3].duration).toBeGreaterThan(fixture.tweens[1].duration);
  });

  test('floating text is kept clear of the status bar and the screen edges', () => {
    const fixture = createSceneFixture();

    createScorePopup(fixture.scene as never, -40, 12, 100);
    createPickupLabel(fixture.scene as never, 2000, 400, '+HP', '#5dffa0');

    expect(fixture.texts[0]).toMatchObject({ x: 34, y: 132 });
    expect(fixture.texts[1]).toMatchObject({ x: 766, y: 366, value: '+HP' });
  });
});
