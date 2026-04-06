import Phaser from 'phaser';
import type { UpgradeBlockReason, UpgradeEvaluation } from '../../config/UpgradesConfig';
import type { UpgradeButton, UpgradeGridLayout } from './shared';

export function createUpgradeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  evaluation: UpgradeEvaluation,
  layout: UpgradeGridLayout
): UpgradeButton {
  const bg = scene.add.graphics();
  drawUpgradeButtonBackground(bg, evaluation.canPurchase, evaluation.blockReason, layout);
  bg.setPosition(x, y);
  bg.setDepth(2);

  const text = scene.add
    .text(x + layout.textInsetX, y + layout.titleOffsetY, evaluation.upgrade.name, {
      fontSize: layout.titleFontSize,
      color: evaluation.canPurchase ? '#ffffff' : '#999999',
      fontFamily: 'monospace',
    })
    .setDepth(3);

  const levelText = scene.add
    .text(
      x + layout.textInsetX,
      y + layout.descriptionOffsetY,
      getLevelText(evaluation),
      {
        fontSize: layout.descriptionFontSize,
        color: evaluation.canPurchase ? '#aaaaaa' : '#777777',
        fontFamily: 'monospace',
      }
    )
    .setDepth(3);

  const costText = scene.add
    .text(
      x + layout.buttonWidth - layout.costInsetX,
      y + layout.buttonHeight / 2,
      getCostLabel(evaluation),
      {
        fontSize: layout.costFontSize,
        color: getCostColor(evaluation.blockReason),
        fontFamily: 'monospace',
      }
    )
    .setOrigin(1, 0.5)
    .setDepth(3);

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
  drawUpgradeButtonBackground(button.bg, evaluation.canPurchase, evaluation.blockReason, button.layout);
  button.text.setColor(evaluation.canPurchase ? '#ffffff' : '#999999');
  button.levelText.setText(getLevelText(evaluation));
  button.levelText.setColor(evaluation.canPurchase ? '#aaaaaa' : '#777777');
  button.costText.setText(getCostLabel(evaluation));
  button.costText.setColor(getCostColor(evaluation.blockReason));
}

function drawUpgradeButtonBackground(
  bg: Phaser.GameObjects.Graphics,
  active: boolean,
  blockReason: UpgradeBlockReason,
  layout: UpgradeGridLayout
): void {
  bg.clear();

  let bgColor: number;
  let bgAlpha: number;
  let borderColor: number;
  let borderWidth: number;

  switch (blockReason) {
    case 'maxed':
      bgColor = 0x151f18;
      bgAlpha = 0.88;
      borderColor = 0x58c77a;
      borderWidth = 2;
      break;
    case 'locked':
      bgColor = 0x151a28;
      bgAlpha = 0.76;
      borderColor = 0x4b5368;
      borderWidth = 1;
      break;
    case 'progression':
      bgColor = 0x191a24;
      bgAlpha = 0.82;
      borderColor = 0xcda45a;
      borderWidth = 2;
      break;
    case 'credits':
      bgColor = 0x1b1820;
      bgAlpha = 0.82;
      borderColor = 0xc46b6b;
      borderWidth = 2;
      break;
    default:
      bgColor = 0x182238;
      bgAlpha = 0.9;
      borderColor = 0x4e7fe0;
      borderWidth = active ? 2 : 1;
      break;
  }

  bg.fillStyle(bgColor, bgAlpha);
  bg.fillRoundedRect(0, 0, layout.buttonWidth, layout.buttonHeight, layout.borderRadius);

  if (blockReason === null && active) {
    bg.fillStyle(0x79a9ff, 0.08);
    bg.fillRoundedRect(
      2,
      2,
      layout.buttonWidth - 4,
      layout.buttonHeight / 2 - 2,
      layout.borderRadius - 2
    );
  }

  bg.lineStyle(borderWidth, borderColor, 1);
  bg.strokeRoundedRect(0, 0, layout.buttonWidth, layout.buttonHeight, layout.borderRadius);
}

function getLevelText(evaluation: UpgradeEvaluation): string {
  const baseText = `${evaluation.upgrade.description} [${evaluation.currentLevel}/${evaluation.upgrade.maxLevel}]`;

  if (evaluation.blockReason === 'locked' && evaluation.unlockReason) {
    return `UNLOCK: ${evaluation.unlockReason}`;
  }

  if (evaluation.blockReason === 'progression') {
    return `${baseText} CAP ${evaluation.progressionLimit}`;
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
      return `L${evaluation.progressionLimit}`;
    default:
      return `${evaluation.cost} L${evaluation.progressionLimit}`;
  }
}

function getCostColor(blockReason: UpgradeBlockReason): string {
  switch (blockReason) {
    case 'maxed':
      return '#44ff44';
    case 'locked':
      return '#666688';
    case 'progression':
      return '#ffaa00';
    case 'credits':
      return '#ff6666';
    default:
      return '#ffcc00';
  }
}
