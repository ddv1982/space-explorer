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

import { callsTo, createRecordingStub } from './helpers/recordingStub';

const { getLayoutMetrics } = await import('../src/systems/hud/statusBarLayout');
const {
  HULL_READOUT_WIDTH,
  hullColor,
  renderBossBar,
  renderChainBadge,
  renderHullCells,
  renderProgressBar,
  renderReserveIcons,
  renderShieldPips,
  renderSurgeBar,
} = await import('../src/systems/hud/meterRenderers');

const graphics = () => createRecordingStub<Phaser.GameObjects.Graphics>();
const count = (calls: Parameters<typeof callsTo>[0], method: string) => callsTo(calls, method).length;

describe('HUD meter renderers', () => {
  const layout = layoutFor(1280, 720);

  test('hull colour shifts cyan, amber, red as the hull drains', () => {
    expect(hullColor(1)).toBe(0x5bd8ff);
    expect(hullColor(0.5)).toBe(0xffc36e);
    expect(hullColor(0.25)).toBe(0xff5a55);
  });

  test('hull draws one cell per hull point and lights only the remaining ones', () => {
    const full = graphics();
    renderHullCells(full.stub, 5, 5, layout);
    // Each cell: track fill + outline; each lit cell adds a body and a highlight.
    expect(count(full.calls, 'strokePath')).toBe(5);
    expect(count(full.calls, 'fillPath')).toBe(5 + 5 * 2);

    const hurt = graphics();
    renderHullCells(hurt.stub, 2, 5, layout);
    expect(count(hurt.calls, 'strokePath')).toBe(5);
    expect(count(hurt.calls, 'fillPath')).toBe(5 + 2 * 2);
  });

  test('hull caps its cell count for heavily upgraded ships and stays clear without data', () => {
    const upgraded = graphics();
    renderHullCells(upgraded.stub, 30, 30, layout);
    expect(count(upgraded.calls, 'strokePath')).toBe(12);

    const empty = graphics();
    renderHullCells(empty.stub, null, null, layout);
    expect(empty.calls.map((call) => call.method)).toEqual(['clear']);
  });

  test('surge, shields and reserve ships only draw what the player has', () => {
    const surge = graphics();
    renderSurgeBar(surge.stub, 0, layout);
    expect(surge.calls.map((call) => call.method)).toEqual(['clear']);
    renderSurgeBar(surge.stub, 0.5, layout);
    expect(count(surge.calls, 'fillPath')).toBe(1);

    const shields = graphics();
    renderShieldPips(shields.stub, 2, layout);
    expect(count(shields.calls, 'fillPath')).toBe(2);

    // A full rack on a phone closes up instead of running into the hull readout.
    const phone = layoutFor(390, 844);
    const rack = graphics();
    renderShieldPips(rack.stub, 8, phone);
    const leftmostPipEdge = Math.min(...callsTo(rack.calls, 'moveTo').map(([x]) => x as number));
    expect(leftmostPipEdge).toBeGreaterThanOrEqual(phone.hullX + HULL_READOUT_WIDTH);

    const reserve = graphics();
    renderReserveIcons(reserve.stub, 3, layout);
    expect(count(reserve.calls, 'fillPath')).toBe(3);
    const fleet = graphics();
    renderReserveIcons(fleet.stub, 40, layout);
    expect(count(fleet.calls, 'fillPath')).toBe(8);
  });

  test('flight-vector fill spans the completed share of the rail', () => {
    const progress = graphics();
    renderProgressBar(progress.stub, 0.5, 0x54dcff, layout);
    expect(callsTo(progress.calls, 'fillRect')[0]).toEqual([460, 28, 180, 4]);

    const unknown = graphics();
    renderProgressBar(unknown.stub, null, 0x54dcff, layout);
    expect(unknown.calls.map((call) => call.method)).toEqual(['clear']);
  });

  test('chain badge clears when there is no chain', () => {
    const badge = graphics();
    renderChainBadge(badge.stub, null, 0xffd76a);
    expect(badge.calls.map((call) => call.method)).toEqual(['clear']);
    renderChainBadge(badge.stub, { x: 100, y: 50, width: 80, height: 16 }, 0xffd76a);
    expect(count(badge.calls, 'fillPath')).toBe(1);
    expect(count(badge.calls, 'strokePath')).toBe(1);
  });

  test('boss bar clears while hidden and draws the guard only when the boss has one', () => {
    const state = { visible: false, hp: 50, maxHp: 100, guardRatio: null, guardBroken: false };
    const hiddenTrack = graphics();
    const hiddenFill = graphics();
    renderBossBar(hiddenTrack.stub, hiddenFill.stub, state, layout);
    expect(hiddenTrack.calls.map((call) => call.method)).toEqual(['clear']);
    expect(hiddenFill.calls.map((call) => call.method)).toEqual(['clear']);

    const track = graphics();
    const fill = graphics();
    renderBossBar(track.stub, fill.stub, { ...state, visible: true }, layout);
    expect(count(track.calls, 'fillPath')).toBe(1);
    expect(count(fill.calls, 'fillPath')).toBe(2);

    const guardedTrack = graphics();
    const guardedFill = graphics();
    renderBossBar(guardedTrack.stub, guardedFill.stub, { ...state, visible: true, guardRatio: 0.6 }, layout);
    expect(count(guardedTrack.calls, 'fillPath')).toBe(2);
    expect(count(guardedFill.calls, 'fillPath')).toBe(3);
  });
});
