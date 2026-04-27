import { describe, expect, test } from 'bun:test';
import type Phaser from 'phaser';
import { HudShieldIconRenderer } from '../src/systems/hud/shieldIconRenderer';
import type { HudLayoutMetrics } from '../src/systems/hud/statusBarLayout';

class GraphicsStub {
  destroyCalls = 0;
  depth: number | null = null;
  scrollFactor: number | null = null;
  fillCircleCalls: Array<[number, number, number]> = [];

  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }

  setScrollFactor(scrollFactor: number): this {
    this.scrollFactor = scrollFactor;
    return this;
  }

  fillStyle(): this { return this; }
  fillCircle(x: number, y: number, radius: number): this {
    this.fillCircleCalls.push([x, y, radius]);
    return this;
  }
  beginPath(): this { return this; }
  moveTo(): this { return this; }
  lineTo(): this { return this; }
  closePath(): this { return this; }
  fillPath(): this { return this; }
  lineStyle(): this { return this; }
  strokePath(): this { return this; }

  destroy(): void {
    this.destroyCalls += 1;
  }
}

function createSceneHarness() {
  const created: GraphicsStub[] = [];
  const scene = {
    add: {
      graphics: () => {
        const graphics = new GraphicsStub();
        created.push(graphics);
        return graphics;
      },
    },
  };
  return { scene: scene as unknown as Phaser.Scene, created };
}

const layout: HudLayoutMetrics = {
  left: 0,
  top: 0,
  width: 800,
  height: 600,
  right: 800,
  bottom: 600,
  centerX: 400,
  centerY: 300,
  topBarRight: 784,
  topBarWidth: 780,
  hpBarX: 16,
  hpBarY: 16,
  hpBarWidth: 176,
  progressX: 304,
  progressY: 8,
  progressWidth: 192,
  bossBarX: 200,
  bossBarY: 572,
  bossBarWidth: 400,
  bossNameY: 560,
  announcementY: 240,
  announcementExitY: 200,
};

describe('HudShieldIconRenderer', () => {
  test('updateShields dedupes repeat values', () => {
    const renderer = new HudShieldIconRenderer();
    let renderCalls = 0;

    renderer.updateShields(2, () => { renderCalls += 1; });
    renderer.updateShields(2, () => { renderCalls += 1; });
    renderer.updateShields(3, () => { renderCalls += 1; });

    expect(renderCalls).toBe(2);
  });

  test('renderShieldIcons creates one icon per shield and clear destroys them', () => {
    const renderer = new HudShieldIconRenderer();
    const { scene, created } = createSceneHarness();

    renderer.updateShields(2, () => {});
    renderer.renderShieldIcons({ scene, hpBarHeight: 16, layout });

    expect(created).toHaveLength(2);
    expect(created[0]?.depth).toBe(100);
    expect(created[0]?.scrollFactor).toBe(0);

    const iconCenters = created
      .map((graphics) => graphics.fillCircleCalls[0])
      .filter((value): value is [number, number, number] => Boolean(value))
      .sort((a, b) => a[0] - b[0]);
    expect(iconCenters).toEqual([
      [24, 44, 9],
      [44, 44, 9],
    ]);

    renderer.clearShieldIcons();
    expect(created[0]?.destroyCalls).toBe(1);
    expect(created[1]?.destroyCalls).toBe(1);
  });
});
