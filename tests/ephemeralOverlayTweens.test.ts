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

const { createScorePopup, createSpawnWarning } = await import(
  '../src/systems/effects/ephemeralOverlayTweens'
);

type TweenConfig = {
  targets: unknown;
  alpha: { from: number; to: number };
  duration: number;
  ease: string;
  y?: number;
  onComplete: (tween: unknown, targets: unknown[]) => void;
};

class MockGraphics extends MockGameObject {
  public depth = -1;
  public scrollFactor = -1;
  public fillStyleCalls: Array<{ color: number; alpha: number }> = [];
  public fillTriangleCalls: Array<[number, number, number, number, number, number]> = [];

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
}

class MockText extends MockGameObject {
  public origin = -1;
  public depth = -1;

  setOrigin(origin: number): this {
    this.origin = origin;
    return this;
  }

  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }
}

function createSceneFixture() {
  const tweens: TweenConfig[] = [];
  const graphics: MockGraphics[] = [];
  const texts: Array<{ x: number; y: number; value: string; style: unknown; text: MockText }> = [];

  const scene = {
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
    expect(arrow.fillStyleCalls).toEqual([
      { color: 0xff4444, alpha: 0.8 },
      { color: 0xffffff, alpha: 0.5 },
    ]);
    expect(arrow.fillTriangleCalls).toEqual([
      [134, 24, 146, 24, 140, 36],
      [137, 27, 143, 27, 140, 33],
    ]);

    expect(fixture.tweens).toHaveLength(1);
    const tween = fixture.tweens[0];
    expect(tween.targets).toBe(arrow);
    expect(tween.alpha).toEqual({ from: 1, to: 0 });
    expect(tween.duration).toBe(600);
    expect(tween.ease).toBe('Power2');

    tween.onComplete({}, [arrow]);
    expect(arrow.destroyCalls).toBe(1);
  });

  test('createScorePopup preserves text style, timing, and target cleanup semantics', () => {
    const fixture = createSceneFixture();
    const style = {
      fontSize: '16px',
      color: '#ffcc00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    };

    createScorePopup(fixture.scene as never, 200, 300, 500, style);

    expect(fixture.texts).toHaveLength(1);
    expect(fixture.texts[0]).toMatchObject({
      x: 200,
      y: 300,
      value: '+500',
      style,
    });
    expect(fixture.texts[0].text.origin).toBe(0.5);
    expect(fixture.texts[0].text.depth).toBe(50);

    expect(fixture.tweens).toHaveLength(1);
    const tween = fixture.tweens[0];
    expect(tween.targets).toBe(fixture.texts[0].text);
    expect(tween.y).toBe(260);
    expect(tween.alpha).toEqual({ from: 1, to: 0 });
    expect(tween.duration).toBe(800);
    expect(tween.ease).toBe('Power2');

    tween.onComplete({}, [fixture.texts[0].text]);
    expect(fixture.texts[0].text.destroyCalls).toBe(1);
  });
});
