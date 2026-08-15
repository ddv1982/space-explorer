import Phaser from 'phaser';
import { mixColor } from '../../utils/colorUtils';
import { getViewportBounds } from '../../utils/layout';

export interface HudLayoutMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  topBarRight: number;
  topBarWidth: number;
  topBarHeight: number;
  hpBarX: number;
  hpBarY: number;
  hpBarWidth: number;
  progressX: number;
  progressY: number;
  progressLabelY: number;
  progressWidth: number;
  bossBarX: number;
  bossBarY: number;
  bossBarWidth: number;
  bossNameY: number;
  announcementY: number;
  announcementExitY: number;
}

export const HP_BAR_TRACK_OFFSET = 30;

export function getLayoutMetrics(
  scene: Phaser.Scene,
  baseHpBarWidth: number,
  baseProgressWidth: number,
  baseBossBarWidth: number,
): HudLayoutMetrics {
  const viewport = getViewportBounds(scene);
  const hpBarWidth = Math.round(Phaser.Math.Clamp(viewport.width * 0.22, 150, baseHpBarWidth));
  const progressWidth = Math.round(Phaser.Math.Clamp(viewport.width * 0.24, 160, baseProgressWidth));
  const bossBarWidth = Math.round(Phaser.Math.Clamp(viewport.width - 80, 220, baseBossBarWidth));
  const compact = viewport.width < 600;

  return {
    ...viewport,
    topBarRight: viewport.right - 16,
    topBarWidth: Math.max(0, viewport.width - 20),
    topBarHeight: compact ? 68 : 60,
    hpBarX: viewport.left + 16,
    hpBarY: viewport.top + 16,
    hpBarWidth,
    progressX: viewport.left + (viewport.width - progressWidth) / 2,
    progressY: viewport.top + (compact ? 58 : 8),
    progressLabelY: viewport.top + (compact ? 43 : 18),
    progressWidth,
    bossBarX: viewport.left + (viewport.width - bossBarWidth) / 2,
    bossBarY: viewport.bottom - 28,
    bossBarWidth,
    bossNameY: viewport.bottom - 40,
    announcementY: viewport.centerY - 60,
    announcementExitY: viewport.centerY - 100,
  };
}

export function renderHpBar(params: {
  hpBarFill: Phaser.GameObjects.Graphics;
  currentHp: number | null;
  currentMaxHp: number | null;
  hpBarHeight: number;
  layout: HudLayoutMetrics;
}): void {
  const { hpBarFill, currentHp, currentMaxHp, hpBarHeight, layout } = params;

  hpBarFill.clear();

  if (currentHp === null || currentMaxHp === null || currentMaxHp <= 0) {
    return;
  }

  const hpRatio = currentHp / currentMaxHp;
  const barWidth = (layout.hpBarWidth - HP_BAR_TRACK_OFFSET - 4) * hpRatio;
  const barX = layout.hpBarX + HP_BAR_TRACK_OFFSET + 2;
  const barY = layout.hpBarY + 2;
  const barH = hpBarHeight - 4;

  const hpColor = hpRatio > 0.5 ? 0x00ff44 : hpRatio > 0.25 ? 0xffaa00 : 0xff2222;
  const hpHighlight = hpRatio > 0.5 ? 0x66ff88 : hpRatio > 0.25 ? 0xffcc44 : 0xff6666;
  const hpDark = hpRatio > 0.5 ? 0x00aa22 : hpRatio > 0.25 ? 0xaa7700 : 0xaa1111;

  hpBarFill.fillStyle(hpDark, 1);
  hpBarFill.fillRoundedRect(barX, barY, barWidth, barH, 2);

  hpBarFill.fillStyle(hpColor, 1);
  hpBarFill.fillRoundedRect(barX, barY, barWidth, barH * 0.65, 2);

  hpBarFill.fillStyle(hpHighlight, 0.6);
  hpBarFill.fillRect(barX + 2, barY + 1, Math.max(0, barWidth - 4), 2);

  hpBarFill.fillStyle(0xffffff, 0.12);
  hpBarFill.fillRect(barX + 2, barY + barH * 0.3, Math.max(0, barWidth - 4), 1);
}

export function renderProgressBar(params: {
  progressFill: Phaser.GameObjects.Graphics;
  currentProgress: number | null;
  progressHeight: number;
  progressFillColor: number;
  layout: HudLayoutMetrics;
}): void {
  const { progressFill, currentProgress, progressHeight, progressFillColor, layout } = params;

  progressFill.clear();

  if (currentProgress === null) {
    return;
  }

  const fillWidth = layout.progressWidth * currentProgress;

  const darkFill = mixColor(progressFillColor, 0x000000, 0.3);
  progressFill.fillStyle(darkFill, 0.95);
  progressFill.fillRect(layout.progressX, layout.progressY, fillWidth, progressHeight);

  progressFill.fillStyle(progressFillColor, 0.95);
  progressFill.fillRect(layout.progressX, layout.progressY, fillWidth, progressHeight * 0.6);

  const highlightColor = mixColor(progressFillColor, 0xffffff, 0.4);
  progressFill.fillStyle(highlightColor, 0.5);
  progressFill.fillRect(layout.progressX + 1, layout.progressY, Math.max(0, fillWidth - 2), 1);

  // Section ticks make progress readable at a glance without changing the
  // continuous underlying value or any level pacing.
  for (let index = 1; index < 10; index += 1) {
    const tickX = layout.progressX + layout.progressWidth * (index / 10);
    if (tickX < layout.progressX + fillWidth) {
      progressFill.fillStyle(0x020812, 0.52);
      progressFill.fillRect(tickX, layout.progressY, 1, progressHeight);
    }
  }

  if (fillWidth > 4) {
    progressFill.fillStyle(0xffffff, 0.3);
    progressFill.fillRect(layout.progressX + fillWidth - 3, layout.progressY, 3, progressHeight);
  }
}

export const SURGE_BAR_HEIGHT = 5;

/**
 * Quantize meter redraws to visible pixels while still drawing endpoint
 * transitions exactly once. In particular, a settled empty meter must not
 * clear its Graphics object again on every gameplay frame.
 */
export function shouldRenderMeterRatio(
  currentRatio: number | null,
  nextRatio: number,
  renderStep: number,
): boolean {
  if (currentRatio === null) {
    return true;
  }
  if (currentRatio === nextRatio) {
    return false;
  }

  return nextRatio === 0
    || nextRatio === 1
    || Math.abs(nextRatio - currentRatio) >= renderStep;
}

export function renderSurgeBar(params: {
  surgeFill: Phaser.GameObjects.Graphics;
  currentSurgeRatio: number | null;
  hpBarHeight: number;
  layout: HudLayoutMetrics;
}): void {
  const { surgeFill, currentSurgeRatio, hpBarHeight, layout } = params;

  surgeFill.clear();

  if (currentSurgeRatio === null || currentSurgeRatio <= 0) {
    return;
  }

  const barWidth = layout.hpBarWidth - HP_BAR_TRACK_OFFSET - 4;
  const fillWidth = barWidth * Math.min(1, currentSurgeRatio);
  const barX = layout.hpBarX + HP_BAR_TRACK_OFFSET + 2;
  const barY = layout.hpBarY + hpBarHeight + 6;

  const surgeColor = 0x9be8ff;
  const darkFill = mixColor(surgeColor, 0x000000, 0.4);
  surgeFill.fillStyle(darkFill, 0.95);
  surgeFill.fillRect(barX, barY, fillWidth, SURGE_BAR_HEIGHT);

  surgeFill.fillStyle(surgeColor, 0.95);
  surgeFill.fillRect(barX, barY, fillWidth, SURGE_BAR_HEIGHT * 0.6);

  if (currentSurgeRatio >= 1) {
    surgeFill.fillStyle(0xffffff, 0.85);
    surgeFill.fillRect(barX, barY - 1, fillWidth, 1);
  }
}

export function renderBossBar(params: {
  bossBarBg: Phaser.GameObjects.Graphics;
  bossBarFill: Phaser.GameObjects.Graphics;
  bossVisible: boolean;
  currentBossHp: number | null;
  currentBossMaxHp: number | null;
  bossBarHeight: number;
  guardRatio?: number;
  guardBroken?: boolean;
  layout: HudLayoutMetrics;
}): void {
  const {
    bossBarBg,
    bossBarFill,
    bossVisible,
    currentBossHp,
    currentBossMaxHp,
    bossBarHeight,
    guardRatio,
    guardBroken,
    layout,
  } = params;

  bossBarBg.clear();
  bossBarFill.clear();

  if (!bossVisible) {
    return;
  }

  bossBarBg.fillStyle(0x442222, 0.8);
  bossBarBg.fillRect(layout.bossBarX, layout.bossBarY, layout.bossBarWidth, bossBarHeight);
  bossBarBg.lineStyle(1, 0x882222, 1);
  bossBarBg.strokeRect(layout.bossBarX, layout.bossBarY, layout.bossBarWidth, bossBarHeight);

  if (currentBossHp === null || currentBossMaxHp === null || currentBossMaxHp <= 0) {
    return;
  }

  const ratio = currentBossHp / currentBossMaxHp;
  const color = ratio > 0.5 ? 0xff4444 : ratio > 0.25 ? 0xff8800 : 0xffff00;
  const darkColor = ratio > 0.5 ? 0xaa2222 : ratio > 0.25 ? 0xaa5500 : 0xaaaa00;
  const fillWidth = (layout.bossBarWidth - 2) * ratio;

  bossBarFill.fillStyle(darkColor, 1);
  bossBarFill.fillRect(layout.bossBarX + 1, layout.bossBarY + 1, fillWidth, bossBarHeight - 2);

  bossBarFill.fillStyle(color, 1);
  bossBarFill.fillRect(layout.bossBarX + 1, layout.bossBarY + 1, fillWidth, (bossBarHeight - 2) * 0.6);

  const highlightColor = ratio > 0.5 ? 0xff8888 : ratio > 0.25 ? 0xffaa44 : 0xffff66;
  bossBarFill.fillStyle(highlightColor, 0.5);
  bossBarFill.fillRect(layout.bossBarX + 2, layout.bossBarY + 1, Math.max(0, fillWidth - 2), 1);

  if (fillWidth > 4) {
    bossBarFill.fillStyle(0xffffff, 0.25);
    bossBarFill.fillRect(layout.bossBarX + 1 + fillWidth - 3, layout.bossBarY + 1, 3, bossBarHeight - 2);
  }

  if (guardRatio !== undefined) {
    const guardY = layout.bossBarY + bossBarHeight + 3;
    const clampedGuard = Math.max(0, Math.min(1, guardRatio));
    bossBarBg.fillStyle(0x201a2a, 0.88);
    bossBarBg.fillRect(layout.bossBarX, guardY, layout.bossBarWidth, 4);
    bossBarBg.lineStyle(1, guardBroken ? 0xffd76a : 0x8a6cb8, 0.9);
    bossBarBg.strokeRect(layout.bossBarX, guardY, layout.bossBarWidth, 4);
    bossBarFill.fillStyle(guardBroken ? 0xffd76a : 0xb792ff, 0.95);
    bossBarFill.fillRect(layout.bossBarX + 1, guardY + 1, (layout.bossBarWidth - 2) * clampedGuard, 2);
  }
}
