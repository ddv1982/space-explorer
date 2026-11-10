import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));

const viewport = { width: 800, height: 600 };
mock.module('../src/utils/layout', () => {
  const bounds = () => ({
    left: 0,
    top: 0,
    width: viewport.width,
    height: viewport.height,
    right: viewport.width,
    bottom: viewport.height,
    centerX: viewport.width / 2,
    centerY: viewport.height / 2,
  });
  return {
    getViewportBounds: bounds,
    getViewportLayout: bounds,
    getGameplayBounds: bounds,
    centerHorizontally: (layout: { left: number; width: number }, width: number) =>
      layout.left + (layout.width - width) / 2,
  };
});

function layoutFor(width: number, height: number) {
  viewport.width = width;
  viewport.height = height;
  return getLayoutMetrics({} as Phaser.Scene);
}

import { callsTo, createRecordingStub, type RecordedCall } from './helpers/recordingStub';

const { createHudWidgets, relayoutHudWidgets } = await import('../src/systems/hud/bootstrapRelayout');
const { getLayoutMetrics } = await import('../src/systems/hud/statusBarLayout');

function createWidgets() {
  const calls = new Map<unknown, RecordedCall[]>();
  const texts: string[] = [];
  const record = <T>(): T => {
    const { stub, calls: stubCalls } = createRecordingStub<T>();
    calls.set(stub, stubCalls);
    return stub;
  };
  const scene = {
    add: {
      graphics: () => record<Phaser.GameObjects.Graphics>(),
      text: (_x: number, _y: number, value: string) => {
        texts.push(value);
        return record<Phaser.GameObjects.Text>();
      },
    },
  };
  const widgets = createHudWidgets({ scene: scene as never, labelColor: '#d8f4ff', sectorColor: '#55aaff' });
  const callsFor = (widget: unknown, method: string) => callsTo(calls.get(widget) ?? [], method);
  return { widgets, texts, callsFor };
}

describe('HUD widgets', () => {
  test('creates the static labels and hides boss, chain and announcement until they are needed', () => {
    const { widgets, texts, callsFor } = createWidgets();

    expect(texts).toEqual(['HULL', '', 'RES', 'SCORE', '0', '', '', 'BOSS', '', '']);
    expect(callsFor(widgets.plates, 'setDepth')).toEqual([[99]]);
    expect(callsFor(widgets.bossBarBg, 'setVisible')).toEqual([[false]]);
    expect(callsFor(widgets.bossBarFill, 'setVisible')).toEqual([[false]]);
    expect(callsFor(widgets.bossNameText, 'setVisible')).toEqual([[false]]);
    expect(callsFor(widgets.chainText, 'setVisible')).toEqual([[false]]);
    expect(callsFor(widgets.announcementText, 'setAlpha')).toEqual([[0]]);
    expect(callsFor(widgets.announcementRule, 'setAlpha')).toEqual([[0]]);
    expect(callsFor(widgets.announcementText, 'setDepth')).toEqual([[200]]);
  });

  test('wide relayout captions the rail with sector and level and right-aligns the chain badge', () => {
    const { widgets, callsFor } = createWidgets();
    relayoutHudWidgets(widgets, layoutFor(1280, 720), 0x54dcff);

    expect(callsFor(widgets.hullLabel, 'setPosition')).toEqual([[16, 12]]);
    expect(callsFor(widgets.scoreText, 'setPosition')).toEqual([[1264, 23]]);
    expect(callsFor(widgets.scoreLabel, 'setVisible')).toEqual([[true]]);
    expect(callsFor(widgets.sectorText, 'setPosition')).toEqual([[460, 10]]);
    expect(callsFor(widgets.sectorText, 'setOrigin').at(-1)).toEqual([0, 0]);
    expect(callsFor(widgets.levelText, 'setPosition')).toEqual([[820, 9]]);
    expect(callsFor(widgets.chainText, 'setOrigin').at(-1)).toEqual([1, 0]);
    expect(callsFor(widgets.bossNameText, 'setPosition')).toEqual([[640, 677]]);
    expect(callsFor(widgets.announcementText, 'setFontSize')).toEqual([[30]]);
    // Rail track: body plus eleven ticks.
    expect(callsFor(widgets.progressTrack, 'fillRect')).toHaveLength(12);
  });

  test('compact relayout drops the score label and tucks sector and level under the score', () => {
    const { widgets, callsFor } = createWidgets();
    relayoutHudWidgets(widgets, layoutFor(390, 844), 0x54dcff);

    expect(callsFor(widgets.scoreLabel, 'setVisible')).toEqual([[false]]);
    expect(callsFor(widgets.scoreText, 'setFontSize')).toEqual([[22]]);
    expect(callsFor(widgets.sectorText, 'setPosition')).toEqual([[374, 45]]);
    expect(callsFor(widgets.sectorText, 'setOrigin').at(-1)).toEqual([1, 0]);
    expect(callsFor(widgets.levelText, 'setPosition')).toEqual([[374, 58]]);
    expect(callsFor(widgets.chainText, 'setOrigin').at(-1)).toEqual([0, 0]);
    expect(callsFor(widgets.announcementText, 'setFontSize')).toEqual([[22]]);
  });
});
