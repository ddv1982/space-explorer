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

const { createHudWidgets, relayoutHudWidgets } = await import('../src/systems/hud/bootstrapRelayout');

type Call = { method: string; args: unknown[] };

function createGraphicsStub(): { graphics: Phaser.GameObjects.Graphics; calls: Call[] } {
  const calls: Call[] = [];
  const graphics = {
    depth: null as number | null,
    visible: true,
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
    setDepth(value: number) {
      graphics.depth = value;
      return graphics;
    },
    setVisible(value: boolean) {
      graphics.visible = value;
      return graphics;
    },
  };
  return { graphics: graphics as never, calls };
}

function createTextStub(initialText = '') {
  const state = {
    text: initialText,
    x: 0,
    y: 0,
    alpha: 1,
    depth: null as number | null,
    origin: null as [number, number] | null,
    visible: true,
    letterSpacing: 0,
  };
  const text = {
    get alpha() {
      return state.alpha;
    },
    setDepth(value: number) {
      state.depth = value;
      return text;
    },
    setOrigin(x: number, y: number) {
      state.origin = [x, y];
      return text;
    },
    setAlpha(value: number) {
      state.alpha = value;
      return text;
    },
    setVisible(value: boolean) {
      state.visible = value;
      return text;
    },
    setPosition(x: number, y: number) {
      state.x = x;
      state.y = y;
      return text;
    },
    setLetterSpacing(value: number) {
      state.letterSpacing = value;
      return text;
    },
  };
  return { text: text as never, state };
}

describe('bootstrapRelayout', () => {
  test('createHudWidgets creates core HUD objects with expected depth/visibility baselines', () => {
    const graphics: ReturnType<typeof createGraphicsStub>[] = [];
    const texts: ReturnType<typeof createTextStub>[] = [];
    const scene = {
      add: {
        graphics: () => {
          const g = createGraphicsStub();
          graphics.push(g);
          return g.graphics;
        },
        text: (_x: number, _y: number, value: string) => {
          const t = createTextStub(value);
          texts.push(t);
          return t.text;
        },
      },
    };

    const widgets = createHudWidgets({
      scene: scene as never,
      labelStyle: {} as never,
      valueStyle: {} as never,
      sectorColor: '#55aaff',
    });

    expect(widgets.topBarPanel).toBeDefined();
    expect(graphics).toHaveLength(7);
    expect(texts).toHaveLength(9);
    expect(graphics[0]?.graphics.depth).toBe(99);
    expect(graphics[5]?.graphics.visible).toBe(false);
    expect(graphics[6]?.graphics.visible).toBe(false);
    expect(texts[8]?.state.visible).toBe(false);
  });

  test('relayoutHudWidgets repositions widgets and restarts announcement fade tween when visible', () => {
    const topBarPanel = createGraphicsStub();
    const hpBarBg = createGraphicsStub();
    const progressBg = createGraphicsStub();
    const hpLabel = createTextStub('HP');
    const hpText = createTextStub('');
    const livesLabel = createTextStub('LIVES');
    const livesText = createTextStub('');
    const scoreText = createTextStub('0');
    const sectorText = createTextStub('');
    const levelText = createTextStub('');
    const announcementText = createTextStub('ALERT');
    announcementText.state.alpha = 0.5;
    const bossNameText = createTextStub('BOSS');
    const stop = mock();
    const tweensAdd = mock(() => ({ id: 'newTween' }));
    let nextTween: unknown = null;

    const result = relayoutHudWidgets({
      scene: { tweens: { add: tweensAdd } } as never,
      baseHpBarWidth: 200,
      baseProgressWidth: 300,
      baseBossBarWidth: 400,
      topBarPanel: topBarPanel.graphics,
      hpBarBg: hpBarBg.graphics,
      hpLabel: hpLabel.text,
      hpText: hpText.text,
      livesLabel: livesLabel.text,
      livesText: livesText.text,
      scoreText: scoreText.text,
      sectorText: sectorText.text,
      levelText: levelText.text,
      progressBg: progressBg.graphics,
      announcementText: announcementText.text,
      bossNameText: bossNameText.text,
      hpBarHeight: 16,
      progressHeight: 6,
      panelStrokeColor: 0x123456,
      hpBorderColor: 0xabcdef,
      progressBorderColor: 0x55aaff,
      announcementTween: { stop } as never,
      setAnnouncementTween: (tween) => {
        nextTween = tween;
      },
    });

    expect(hpLabel.state.x).toBe(16);
    expect(hpLabel.state.y).toBe(14);
    expect(scoreText.state.x).toBe(784);
    expect(scoreText.state.y).toBe(13);
    expect(announcementText.state.x).toBe(400);
    expect(announcementText.state.y).toBe(240);
    expect(bossNameText.state.x).toBe(400);
    expect(bossNameText.state.y).toBe(560);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(tweensAdd).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'newTween' });
    expect(nextTween).toBeNull();
  });
});
