import type Phaser from 'phaser';
import { NEON } from '../../scenes/shared/neonUiTheme';
import { SPECIAL_GUN_CHARGE } from '../../config/shipSystems';
import { mixColor } from '../../utils/colorUtils';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import {
  BOSS_BAR_HEIGHT,
  GUN_CHARGE_BAR_HEIGHT,
  HULL_CELL_HEIGHT,
  RESERVE_ICON_HEIGHT,
  SURGE_BAR_HEIGHT,
  type HudLayoutMetrics,
} from './statusBarLayout';

type Graphics = Phaser.GameObjects.Graphics;

const TRACK_COLOR = 0x0b1a2b;
const TRACK_ALPHA = 0.78;
/** Every HUD bar leans the same way, so the instruments read as one family. */
const SLANT = 4;
const HULL_CELL_GAP = 3;
/** Past this many hull points the cells stop mapping one-to-one and become a segmented gauge. */
const MAX_HULL_CELLS = 12;
const MAX_RESERVE_ICONS = 8;
const SURGE_COLOR = 0xb792ff;
const SHIELD_COLOR = 0x63a4ff;
const HULL_CRITICAL = 0xff5a55;

/** Right-leaning bar segment. */
function slantedPath(graphics: Graphics, x: number, y: number, width: number, height: number): void {
  graphics.beginPath();
  graphics.moveTo(x + SLANT, y);
  graphics.lineTo(x + width + SLANT, y);
  graphics.lineTo(x + width, y + height);
  graphics.lineTo(x, y + height);
  graphics.closePath();
}

function fillLitSegment(graphics: Graphics, x: number, y: number, width: number, height: number, color: number): void {
  slantedPath(graphics, x, y, width, height);
  graphics.fillStyle(mixColor(color, 0x000000, 0.12), 1);
  graphics.fillPath();
  // The upper half catches the light.
  const litHeight = height * 0.55;
  const litShift = SLANT * (1 - litHeight / height);
  graphics.beginPath();
  graphics.moveTo(x + SLANT, y);
  graphics.lineTo(x + width + SLANT, y);
  graphics.lineTo(x + width + litShift, y + litHeight);
  graphics.lineTo(x + litShift, y + litHeight);
  graphics.closePath();
  graphics.fillStyle(mixColor(color, 0xffffff, 0.32), 1);
  graphics.fillPath();
}

function hullColor(ratio: number): number {
  return ratio > 0.5 ? NEON.cyan : ratio > 0.25 ? NEON.amber : HULL_CRITICAL;
}

/** One cell per hull point: lit cells shift cyan → amber → red as the hull drains. */
export function renderHullCells(
  graphics: Graphics,
  hp: number | null,
  maxHp: number | null,
  layout: HudLayoutMetrics
): void {
  graphics.clear();

  if (hp === null || maxHp === null || maxHp <= 0) {
    return;
  }

  const cellCount = Math.min(Math.ceil(maxHp), MAX_HULL_CELLS);
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const litCells = ratio * cellCount;
  const cellWidth = (layout.hullWidth - SLANT - HULL_CELL_GAP * (cellCount - 1)) / cellCount;
  const color = hullColor(ratio);

  for (let index = 0; index < cellCount; index += 1) {
    const x = layout.hullX + index * (cellWidth + HULL_CELL_GAP);
    slantedPath(graphics, x, layout.hullCellsY, cellWidth, HULL_CELL_HEIGHT);
    graphics.fillStyle(TRACK_COLOR, TRACK_ALPHA);
    graphics.fillPath();
    slantedPath(graphics, x, layout.hullCellsY, cellWidth, HULL_CELL_HEIGHT);
    graphics.lineStyle(1, color, 0.28);
    graphics.strokePath();

    const lit = Math.max(0, Math.min(1, litCells - index));
    if (lit > 0) {
      fillLitSegment(graphics, x, layout.hullCellsY, cellWidth * lit, HULL_CELL_HEIGHT, color);
    }
  }
}

export function renderSurgeTrack(graphics: Graphics, layout: HudLayoutMetrics): void {
  graphics.clear();
  slantedPath(graphics, layout.hullX, layout.surgeY, layout.hullWidth - SLANT, SURGE_BAR_HEIGHT);
  graphics.fillStyle(TRACK_COLOR, TRACK_ALPHA);
  graphics.fillPath();
}

export function renderSurgeBar(graphics: Graphics, ratio: number | null, layout: HudLayoutMetrics): void {
  graphics.clear();

  if (ratio === null || ratio <= 0) {
    return;
  }

  const charged = ratio >= 1;
  const width = (layout.hullWidth - SLANT) * Math.min(1, ratio);
  slantedPath(graphics, layout.hullX, layout.surgeY, width, SURGE_BAR_HEIGHT);
  graphics.fillStyle(charged ? mixColor(SURGE_COLOR, 0xffffff, 0.55) : SURGE_COLOR, 1);
  graphics.fillPath();
}

/** Lance refilling reads cyan like the hull; a special gun burning its charge reads amber. */
const GUN_CHARGE_COLORS = { refilling: NEON.cyan, draining: NEON.amber } as const;

/** Where the charge bar sits: centred on the gun name's line. */
function gunChargeBarY(layout: HudLayoutMetrics): number {
  return layout.gunY + 2;
}

/** The unlit charge bar, with a tick where the meter is full enough to leave Lance. */
export function renderGunChargeTrack(graphics: Graphics, layout: HudLayoutMetrics): void {
  graphics.clear();
  const y = gunChargeBarY(layout);
  slantedPath(graphics, layout.gunBarX, y, layout.gunBarWidth, GUN_CHARGE_BAR_HEIGHT);
  graphics.fillStyle(TRACK_COLOR, TRACK_ALPHA);
  graphics.fillPath();
  const tickX = layout.gunBarX + layout.gunBarWidth * SPECIAL_GUN_CHARGE.minToLeaveLance + SLANT / 2;
  graphics.fillStyle(NEON.cyan, 0.55);
  graphics.fillRect(tickX, y - 2, 1, GUN_CHARGE_BAR_HEIGHT + 4);
}

/**
 * The special-gun charge. Draining (a special gun is out) burns amber; refilling on Lance is cyan, dim
 * until it passes the threshold to leave Lance and bright once full.
 */
export function renderGunChargeBar(
  graphics: Graphics,
  charge: number,
  draining: boolean,
  layout: HudLayoutMetrics
): void {
  graphics.clear();
  if (charge <= 0) return;
  const width = layout.gunBarWidth * Math.min(1, charge);
  const y = gunChargeBarY(layout);
  if (draining) {
    fillLitSegment(graphics, layout.gunBarX, y, width, GUN_CHARGE_BAR_HEIGHT, GUN_CHARGE_COLORS.draining);
    return;
  }
  const color = charge >= 1 ? mixColor(GUN_CHARGE_COLORS.refilling, 0xffffff, 0.45) : GUN_CHARGE_COLORS.refilling;
  slantedPath(graphics, layout.gunBarX, y, width, GUN_CHARGE_BAR_HEIGHT);
  graphics.fillStyle(color, charge < SPECIAL_GUN_CHARGE.minToLeaveLance ? 0.45 : 1);
  graphics.fillPath();
}

/** Where the hull label and its numeric readout end on the label row; shield pips stay right of it. */
const HULL_READOUT_WIDTH = 86;
const SHIELD_PIP_STEP = 13;

/**
 * Shield charges: small blue crests right-aligned on the hull label row. A full rack on a narrow
 * cluster closes up and overlaps like fanned cards instead of running into the hull readout.
 */
export function renderShieldPips(graphics: Graphics, shields: number, layout: HudLayoutMetrics): void {
  graphics.clear();

  const room = layout.hullWidth - HULL_READOUT_WIDTH - 10;
  const step = shields > 1 ? Math.min(SHIELD_PIP_STEP, room / (shields - 1)) : SHIELD_PIP_STEP;
  // Drawn right to left would bury each crest under its neighbour: start at the far end so the
  // rightmost pip, the next charge to be spent, sits on top.
  for (let index = shields - 1; index >= 0; index -= 1) {
    const centerX = layout.hullX + layout.hullWidth - 5 - index * step;
    const y = layout.hullLabelY + 2;
    graphics.fillStyle(SHIELD_COLOR, 0.95);
    graphics.beginPath();
    graphics.moveTo(centerX - 5, y);
    graphics.lineTo(centerX + 5, y);
    graphics.lineTo(centerX + 5, y + 6);
    graphics.lineTo(centerX, y + 11);
    graphics.lineTo(centerX - 5, y + 6);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(mixColor(SHIELD_COLOR, 0xffffff, 0.6), 0.9);
    graphics.fillRect(centerX - 3, y + 2, 6, 2);
  }
}

/** Reserve ships as a row of small interceptor silhouettes. */
export function renderReserveIcons(graphics: Graphics, lives: number, layout: HudLayoutMetrics): void {
  graphics.clear();

  const count = Math.min(Math.max(0, lives), MAX_RESERVE_ICONS);
  for (let index = 0; index < count; index += 1) {
    const centerX = layout.reserveIconsX + 5 + index * 14;
    const y = layout.reserveY;
    graphics.fillStyle(NEON.cyanBright, 0.95);
    graphics.beginPath();
    graphics.moveTo(centerX, y);
    graphics.lineTo(centerX + 5, y + RESERVE_ICON_HEIGHT);
    graphics.lineTo(centerX, y + RESERVE_ICON_HEIGHT - 3);
    graphics.lineTo(centerX - 5, y + RESERVE_ICON_HEIGHT);
    graphics.closePath();
    graphics.fillPath();
  }
}

/** Unlit flight-vector rail with a tick at every tenth of the sector. */
export function renderProgressTrack(graphics: Graphics, color: number, layout: HudLayoutMetrics): void {
  graphics.clear();
  graphics.fillStyle(TRACK_COLOR, TRACK_ALPHA);
  graphics.fillRect(layout.progressX, layout.progressY, layout.progressWidth, layout.progressHeight);
  graphics.fillStyle(color, 0.4);
  for (let index = 0; index <= 10; index += 1) {
    const tickX = layout.progressX + (layout.progressWidth - 1) * (index / 10);
    graphics.fillRect(tickX, layout.progressY - 2, 1, layout.progressHeight + 4);
  }
}

/** Lit share of the flight-vector rail, capped by a marker showing where the ship is in the sector. */
export function renderProgressBar(
  graphics: Graphics,
  progress: number | null,
  color: number,
  layout: HudLayoutMetrics
): void {
  graphics.clear();

  if (progress === null) {
    return;
  }

  const fillWidth = layout.progressWidth * progress;
  const { progressX: x, progressY: y, progressHeight: height } = layout;
  graphics.fillStyle(color, 0.95);
  graphics.fillRect(x, y, fillWidth, height);
  graphics.fillStyle(mixColor(color, 0xffffff, 0.45), 0.7);
  graphics.fillRect(x, y, fillWidth, 1);

  const markerX = x + fillWidth;
  const markerY = y + height / 2;
  graphics.fillStyle(color, scaleUiGlowAlpha(0.3));
  graphics.fillCircle(markerX, markerY, 6);
  graphics.fillStyle(0xffffff, 1);
  graphics.beginPath();
  graphics.moveTo(markerX, markerY - 4);
  graphics.lineTo(markerX + 4, markerY);
  graphics.lineTo(markerX, markerY + 4);
  graphics.lineTo(markerX - 4, markerY);
  graphics.closePath();
  graphics.fillPath();
}

/** Backing plate that turns the chain readout into a badge. */
export function renderChainBadge(
  graphics: Graphics,
  bounds: { x: number; y: number; width: number; height: number } | null,
  color: number
): void {
  graphics.clear();

  if (!bounds) {
    return;
  }

  const x = bounds.x - 8;
  const y = bounds.y - 2;
  const width = bounds.width + 14;
  const height = bounds.height + 4;
  slantedPath(graphics, x, y, width, height);
  graphics.fillStyle(mixColor(NEON.panel, color, 0.2), 0.82);
  graphics.fillPath();
  slantedPath(graphics, x, y, width, height);
  graphics.lineStyle(1, color, 0.75);
  graphics.strokePath();
}

interface BossBarState {
  visible: boolean;
  hp: number | null;
  maxHp: number | null;
}

export function renderBossBar(track: Graphics, fill: Graphics, state: BossBarState, layout: HudLayoutMetrics): void {
  track.clear();
  fill.clear();

  if (!state.visible) {
    return;
  }

  const { bossBarX: x, bossBarY: y, bossBarWidth } = layout;
  const width = bossBarWidth - SLANT;
  slantedPath(track, x, y, width, BOSS_BAR_HEIGHT);
  track.fillStyle(0x260c14, 0.86);
  track.fillPath();
  slantedPath(track, x, y, width, BOSS_BAR_HEIGHT);
  track.lineStyle(1, NEON.red, 0.7);
  track.strokePath();

  if (state.hp === null || state.maxHp === null || state.maxHp <= 0) {
    return;
  }

  const ratio = Math.max(0, Math.min(1, state.hp / state.maxHp));
  const color = ratio > 0.5 ? 0xff4d5e : ratio > 0.25 ? 0xff8a3c : NEON.gold;
  if (ratio > 0) {
    fillLitSegment(fill, x, y, width * ratio, BOSS_BAR_HEIGHT, color);
  }
  // Quarter marks stay readable over both the lit and the spent bar.
  fill.fillStyle(0x12040a, 0.7);
  for (let quarter = 1; quarter < 4; quarter += 1) {
    fill.fillRect(x + SLANT / 2 + (width * quarter) / 4, y + 1, 1.5, BOSS_BAR_HEIGHT - 2);
  }
}
