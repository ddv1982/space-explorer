import Phaser from 'phaser';

import type {
  UpgradeBlockReason,
  UpgradeEvaluation,
  UpgradeKey,
} from '../../config/UpgradesConfig';
import { UI_FONT_DISPLAY, UI_FONT_MONO } from '../../utils/uiFonts';
import type { UpgradeButton, UpgradeGridLayout } from './shared';

const UPGRADE_COLORS: Record<UpgradeKey, number> = {
  hp: 0x65f6c1,
  damage: 0xff7d9a,
  fireRate: 0x62d9ff,
  shield: 0xb78cff,
};

export function createUpgradeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  evaluation: UpgradeEvaluation,
  layout: UpgradeGridLayout
): UpgradeButton {
  const bg = scene.add.graphics();
  drawUpgradeButtonBackground(bg, evaluation, layout);
  bg.setPosition(x, y);
  bg.setDepth(2);

  const text = scene.add.text(x + layout.textInsetX, y + layout.titleOffsetY, evaluation.upgrade.name, {
    fontSize: layout.titleFontSize,
    color: evaluation.canPurchase ? '#f4fbff' : '#87939e',
    fontFamily: UI_FONT_DISPLAY,
    fontStyle: 'bold',
  }).setDepth(3);

  const levelText = scene.add.text(
    x + layout.textInsetX,
    y + layout.descriptionOffsetY,
    getLevelText(evaluation, layout.showDescription),
    {
      fontSize: layout.descriptionFontSize,
      color: evaluation.canPurchase ? '#9db4c3' : '#66737d',
      fontFamily: UI_FONT_MONO,
    }
  ).setDepth(3);

  const costText = scene.add.text(
    x + layout.buttonWidth - layout.costInsetX,
    y + (layout.showDescription ? layout.buttonHeight / 2 : layout.buttonHeight - 10),
    getCostLabel(evaluation),
    {
      fontSize: layout.costFontSize,
      color: getCostColor(evaluation.blockReason),
      fontFamily: UI_FONT_MONO,
      fontStyle: 'bold',
    }
  ).setOrigin(1, 0.5).setDepth(3);

  return {
    bg,
    text,
    costText,
    levelText,
    upgradeKey: evaluation.upgrade.key,
    x,
    y,
    width: layout.buttonWidth,
    height: layout.buttonHeight,
    borderRadius: layout.borderRadius,
    layout,
  };
}

export function updateUpgradeButton(button: UpgradeButton, evaluation: UpgradeEvaluation): void {
  drawUpgradeButtonBackground(button.bg, evaluation, button.layout);
  button.text.setColor(evaluation.canPurchase ? '#f4fbff' : '#87939e');
  button.levelText.setText(getLevelText(evaluation, button.layout.showDescription));
  button.levelText.setColor(evaluation.canPurchase ? '#9db4c3' : '#66737d');
  button.costText.setText(getCostLabel(evaluation));
  button.costText.setColor(getCostColor(evaluation.blockReason));
}

function drawUpgradeIcon(
  graphics: Phaser.GameObjects.Graphics,
  key: UpgradeKey,
  layout: UpgradeGridLayout,
  alpha: number
): void {
  const size = layout.iconSize;
  const centerX = 8 + size / 2;
  const centerY = layout.buttonHeight / 2;
  const color = UPGRADE_COLORS[key];
  graphics.fillStyle(color, 0.1 * alpha);
  graphics.fillRoundedRect(7, centerY - size / 2, size, size, 7);
  graphics.lineStyle(1, color, 0.72 * alpha);
  graphics.strokeRoundedRect(7, centerY - size / 2, size, size, 7);
  graphics.lineStyle(2, color, 0.9 * alpha);

  switch (key) {
    case 'hp':
      graphics.lineBetween(centerX - 7, centerY, centerX + 7, centerY);
      graphics.lineBetween(centerX, centerY - 7, centerX, centerY + 7);
      break;
    case 'damage':
      graphics.lineBetween(centerX - 8, centerY + 7, centerX + 7, centerY - 8);
      graphics.lineBetween(centerX + 2, centerY - 8, centerX + 7, centerY - 8);
      graphics.lineBetween(centerX + 7, centerY - 8, centerX + 7, centerY - 3);
      break;
    case 'fireRate':
      graphics.lineBetween(centerX - 9, centerY - 5, centerX - 2, centerY - 5);
      graphics.lineBetween(centerX - 9, centerY, centerX + 4, centerY);
      graphics.lineBetween(centerX - 9, centerY + 5, centerX + 9, centerY + 5);
      break;
    case 'shield':
      graphics.strokeTriangle(centerX, centerY + 9, centerX - 8, centerY - 7, centerX + 8, centerY - 7);
      break;
  }
}

function drawUpgradeButtonBackground(
  bg: Phaser.GameObjects.Graphics,
  evaluation: UpgradeEvaluation,
  layout: UpgradeGridLayout
): void {
  bg.clear();

  const visualState = getVisualState(evaluation.blockReason, evaluation.upgrade.key);
  bg.fillStyle(visualState.background, visualState.backgroundAlpha);
  bg.fillRoundedRect(0, 0, layout.buttonWidth, layout.buttonHeight, layout.borderRadius);
  bg.fillStyle(visualState.border, evaluation.canPurchase ? 0.13 : 0.05);
  bg.fillRoundedRect(1, 1, layout.buttonWidth - 2, Math.max(12, layout.buttonHeight * 0.42), layout.borderRadius - 1);
  bg.fillStyle(visualState.border, evaluation.canPurchase ? 0.8 : 0.38);
  bg.fillRect(0, layout.borderRadius, 3, layout.buttonHeight - layout.borderRadius * 2);
  bg.lineStyle(evaluation.canPurchase ? 1.5 : 1, visualState.border, evaluation.canPurchase ? 0.92 : 0.5);
  bg.strokeRoundedRect(0, 0, layout.buttonWidth, layout.buttonHeight, layout.borderRadius);
  drawUpgradeIcon(bg, evaluation.upgrade.key, layout, evaluation.canPurchase ? 1 : 0.56);
}

function getVisualState(
  blockReason: UpgradeBlockReason,
  upgradeKey: UpgradeKey
): { background: number; backgroundAlpha: number; border: number } {
  switch (blockReason) {
    case 'maxed':
      return { background: 0x07150f, backgroundAlpha: 0.92, border: 0x58d58a };
    case 'locked':
      return { background: 0x080c14, backgroundAlpha: 0.82, border: 0x435064 };
    case 'progression':
      return { background: 0x141108, backgroundAlpha: 0.86, border: 0xd7a953 };
    case 'credits':
      return { background: 0x16090e, backgroundAlpha: 0.86, border: 0xc76072 };
    default:
      return { background: 0x061321, backgroundAlpha: 0.94, border: UPGRADE_COLORS[upgradeKey] };
  }
}

function getLevelText(evaluation: UpgradeEvaluation, showDescription: boolean): string {
  if (!showDescription) {
    return `LVL ${evaluation.currentLevel}/${evaluation.upgrade.maxLevel}`;
  }

  const baseText = `${evaluation.upgrade.description.toUpperCase()}  ·  ${evaluation.currentLevel}/${evaluation.upgrade.maxLevel}`;

  if (evaluation.blockReason === 'locked' && evaluation.unlockReason) {
    return `UNLOCK: ${evaluation.unlockReason.toUpperCase()}`;
  }

  if (evaluation.blockReason === 'progression') {
    return `${baseText}  ·  CAP ${evaluation.progressionLimit}`;
  }

  return baseText;
}

function getCostLabel(evaluation: UpgradeEvaluation): string {
  switch (evaluation.blockReason) {
    case 'maxed':
      return 'MAXED';
    case 'locked':
      return 'LOCKED';
    case 'progression':
      return `CAP ${evaluation.progressionLimit}`;
    default:
      return `${evaluation.cost} CR`;
  }
}

function getCostColor(blockReason: UpgradeBlockReason): string {
  switch (blockReason) {
    case 'maxed':
      return '#65f6a1';
    case 'locked':
      return '#6b788d';
    case 'progression':
      return '#ffc269';
    case 'credits':
      return '#ff8292';
    default:
      return '#ffe083';
  }
}
