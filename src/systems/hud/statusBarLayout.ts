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
  hpBarX: number;
  hpBarY: number;
  hpBarWidth: number;
  progressX: number;
  progressY: number;
  progressWidth: number;
  bossBarX: number;
  bossBarY: number;
  bossBarWidth: number;
  bossNameY: number;
  announcementY: number;
  announcementExitY: number;
}

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

  return {
    ...viewport,
    topBarRight: viewport.right - 16,
    topBarWidth: Math.max(0, viewport.width - 20),
    hpBarX: viewport.left + 16,
    hpBarY: viewport.top + 16,
    hpBarWidth,
    progressX: viewport.left + (viewport.width - progressWidth) / 2,
    progressY: viewport.top + 8,
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
  const barWidth = (layout.hpBarWidth - 26) * hpRatio;
  const barX = layout.hpBarX + 24;
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

  if (fillWidth > 4) {
    progressFill.fillStyle(0xffffff, 0.3);
    progressFill.fillRect(layout.progressX + fillWidth - 3, layout.progressY, 3, progressHeight);
  }
}

export function renderBossBar(params: {
  bossBarBg: Phaser.GameObjects.Graphics;
  bossBarFill: Phaser.GameObjects.Graphics;
  bossVisible: boolean;
  currentBossHp: number | null;
  currentBossMaxHp: number | null;
  bossBarHeight: number;
  layout: HudLayoutMetrics;
}): void {
  const { bossBarBg, bossBarFill, bossVisible, currentBossHp, currentBossMaxHp, bossBarHeight, layout } = params;

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
}
