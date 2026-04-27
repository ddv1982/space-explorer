import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));

mock.module('../src/utils/layout', () => ({
  getViewportBounds: () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    centerX: 400,
    centerY: 300,
  }),
  getViewportLayout: () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    centerX: 400,
    centerY: 300,
  }),
  centerHorizontally: (layout: { left: number; width: number }, width: number) => layout.left + (layout.width - width) / 2,
}));

const { getLayoutMetrics, renderHpBar, renderProgressBar, renderBossBar } = await import(
  '../src/systems/hud/statusBarLayout'
);

type Call = { method: string; args: unknown[] };

function createGraphicsStub(): { graphics: Phaser.GameObjects.Graphics; calls: Call[] } {
  const calls: Call[] = [];
  const graphics = {
    clear: () => {
      calls.push({ method: 'clear', args: [] });
      return graphics;
    },
    fillStyle: (...args: unknown[]) => {
      calls.push({ method: 'fillStyle', args });
      return graphics;
    },
    fillRect: (...args: unknown[]) => {
      calls.push({ method: 'fillRect', args });
      return graphics;
    },
    fillRoundedRect: (...args: unknown[]) => {
      calls.push({ method: 'fillRoundedRect', args });
      return graphics;
    },
    lineStyle: (...args: unknown[]) => {
      calls.push({ method: 'lineStyle', args });
      return graphics;
    },
    strokeRect: (...args: unknown[]) => {
      calls.push({ method: 'strokeRect', args });
      return graphics;
    },
    strokeRoundedRect: (...args: unknown[]) => {
      calls.push({ method: 'strokeRoundedRect', args });
      return graphics;
    },
  };

  return { graphics: graphics as never, calls };
}

describe('statusBarLayout helpers', () => {
  test('getLayoutMetrics derives stable layout metrics from viewport size', () => {
    const layout = getLayoutMetrics({} as Phaser.Scene, 200, 300, 400);

    expect(layout.hpBarWidth).toBe(176);
    expect(layout.progressWidth).toBe(192);
    expect(layout.bossBarWidth).toBe(400);
    expect(layout.hpBarX).toBe(16);
    expect(layout.progressX).toBe(304);
    expect(layout.bossBarY).toBe(572);
    expect(layout.announcementY).toBe(240);
    expect(layout.announcementExitY).toBe(200);
  });

  test('renderHpBar and renderProgressBar draw expected filled widths', () => {
    const layout = getLayoutMetrics({} as Phaser.Scene, 200, 300, 400);
    const hp = createGraphicsStub();
    const progress = createGraphicsStub();

    renderHpBar({
      hpBarFill: hp.graphics,
      currentHp: 50,
      currentMaxHp: 100,
      hpBarHeight: 16,
      layout,
    });

    renderProgressBar({
      progressFill: progress.graphics,
      currentProgress: 0.5,
      progressHeight: 6,
      progressFillColor: 0x54dcff,
      layout,
    });

    const hpFillRect = hp.calls.find((call) => call.method === 'fillRoundedRect');
    expect(hpFillRect?.args.slice(0, 4)).toEqual([40, 18, 75, 12]);

    const progressRects = progress.calls.filter((call) => call.method === 'fillRect');
    expect(progressRects[0]?.args).toEqual([304, 8, 96, 6]);
    expect(progressRects.at(-1)?.args).toEqual([397, 8, 3, 6]);
  });

  test('renderBossBar clears and returns early when boss bar is hidden', () => {
    const layout = getLayoutMetrics({} as Phaser.Scene, 200, 300, 400);
    const bg = createGraphicsStub();
    const fill = createGraphicsStub();

    renderBossBar({
      bossBarBg: bg.graphics,
      bossBarFill: fill.graphics,
      bossVisible: false,
      currentBossHp: null,
      currentBossMaxHp: null,
      bossBarHeight: 10,
      layout,
    });

    expect(bg.calls.map((call) => call.method)).toEqual(['clear']);
    expect(fill.calls.map((call) => call.method)).toEqual(['clear']);
  });
});
