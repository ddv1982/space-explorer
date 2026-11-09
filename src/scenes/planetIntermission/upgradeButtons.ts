import Phaser from 'phaser';

import type { UpgradeEvaluation, UpgradeKey } from '../../config/UpgradesConfig';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import {
  drawAngledRectPath,
  NEON,
  NEON_FONT,
  neonLabelStyle,
  neonReadoutStyle,
  prefersReducedMotion,
} from '../shared/neonUiTheme';
import type { UpgradeButton, UpgradeGridLayout } from './shared';

const UPGRADE_COLORS: Record<UpgradeKey, number> = {
  hp: 0x65f6c1,
  damage: 0xff7d9a,
  fireRate: 0x62d9ff,
  shield: 0xb78cff,
  turrets: 0xffb85c,
};

const PIP_HEIGHT = 5;
const PIP_GAP = 3;

interface CardVisualState {
  /** Card outline, rail, icon and pips. */
  accent: number;
  /** Cost chip and its label. */
  status: number;
  background: number;
  backgroundAlpha: number;
  title: string;
  detail: string;
}

export function createUpgradeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  evaluation: UpgradeEvaluation,
  layout: UpgradeGridLayout
): UpgradeButton {
  const bg = scene.add.graphics().setPosition(x, y).setDepth(2);

  const text = scene.add
    .text(x + layout.textInsetX, y + layout.titleOffsetY, evaluation.upgrade.name, {
      fontSize: `${layout.titleFontSize}px`,
      fontFamily: NEON_FONT.display,
      fontStyle: 'bold',
    })
    .setDepth(3);

  const levelText = scene.add
    .text(x + layout.textInsetX, y + layout.descriptionOffsetY, '', neonLabelStyle(layout.descriptionFontSize))
    .setDepth(3);

  const chip = getCostChipRect(width, layout);
  const costText = scene.add
    .text(x + chip.x + chip.width / 2, y + chip.y + chip.height / 2, '', {
      ...neonReadoutStyle(layout.costFontSize),
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(3);

  const button: UpgradeButton = {
    bg,
    text,
    costText,
    levelText,
    upgradeKey: evaluation.upgrade.key,
    x,
    y,
    width,
    height: layout.buttonHeight,
    cornerCut: layout.cornerCut,
    layout,
  };
  updateUpgradeButton(button, evaluation);
  return button;
}

export function updateUpgradeButton(button: UpgradeButton, evaluation: UpgradeEvaluation): void {
  const state = getVisualState(evaluation);
  drawUpgradeCard(button.bg, button.width, evaluation, button.layout, state);
  button.text.setColor(state.title);
  button.levelText.setText(getLevelText(evaluation, button.layout.showDescription));
  button.levelText.setColor(state.detail);
  fitCardText(button);
  button.costText.setText(getCostLabel(evaluation));
  button.costText.setColor(Phaser.Display.Color.IntegerToColor(state.status).rgba);
}

/** White flash that burns off the card the moment an upgrade is installed. */
export function playUpgradePurchaseFlash(scene: Phaser.Scene, button: UpgradeButton): void {
  if (prefersReducedMotion()) {
    return;
  }

  const flash = scene.add.graphics().setPosition(button.x, button.y).setDepth(4);
  drawAngledRectPath(flash, 0, 0, button.width, button.height, button.cornerCut);
  flash.fillStyle(0xffffff, 0.55);
  flash.fillPath();
  scene.tweens.add({
    targets: flash,
    alpha: { from: 1, to: 0 },
    duration: 360,
    ease: 'Quad.Out',
    onComplete: () => flash.destroy(),
  });
}

/** Title and detail must both stop short of the status column, whatever the card width. */
function fitCardText(button: UpgradeButton): void {
  const { layout, levelText, text } = button;
  const available = button.width - layout.textInsetX - layout.statusColumnWidth - layout.costInsetX - 8;
  const pipless = layout.pipWidth === 0;
  // Pipless cards drop the chip to the detail row, so the title owns its whole row.
  fitLine(text, pipless ? button.width - layout.textInsetX - 6 : available);
  fitLine(levelText, available);
  // ...and a detail that still cannot clear the chip gives way to it.
  levelText.setVisible(!pipless || levelText.displayWidth <= available);
}

function fitLine(line: Phaser.GameObjects.Text, available: number): void {
  line.setScale(1);
  if (line.width > available) {
    line.setScale(Math.max(0.72, available / line.width));
  }
}

function getCostChipRect(
  width: number,
  layout: UpgradeGridLayout
): { x: number; y: number; width: number; height: number } {
  const x = width - layout.costInsetX - layout.statusColumnWidth;
  if (layout.pipWidth === 0) {
    // No room for pips: the chip drops to the detail row so the title keeps the full card width.
    const height = layout.costFontSize + 6;
    return { x, y: layout.buttonHeight - height - 5, width: layout.statusColumnWidth, height };
  }

  const height = layout.costFontSize + 10;
  // Chip and pip row are centred on the card as one block.
  const blockHeight = height + PIP_GAP + 2 + PIP_HEIGHT;
  return { x, y: (layout.buttonHeight - blockHeight) / 2, width: layout.statusColumnWidth, height };
}

function drawUpgradeCard(
  bg: Phaser.GameObjects.Graphics,
  width: number,
  evaluation: UpgradeEvaluation,
  layout: UpgradeGridLayout,
  state: CardVisualState
): void {
  const height = layout.buttonHeight;
  const cut = layout.cornerCut;
  const live = evaluation.canPurchase;
  bg.clear();

  if (live) {
    drawAngledRectPath(bg, -2.5, -2.5, width + 5, height + 5, cut + 1.25);
    bg.lineStyle(3, state.accent, scaleUiGlowAlpha(0.16));
    bg.strokePath();
  }

  drawAngledRectPath(bg, 0, 0, width, height, cut);
  bg.fillStyle(state.background, state.backgroundAlpha);
  bg.fillPath();

  // Top half catches the light.
  bg.fillStyle(state.accent, live ? 0.1 : 0.035);
  bg.beginPath();
  bg.moveTo(cut, 0);
  bg.lineTo(width, 0);
  bg.lineTo(width, height * 0.46);
  bg.lineTo(0, height * 0.46);
  bg.lineTo(0, cut);
  bg.closePath();
  bg.fillPath();

  drawAngledRectPath(bg, 0, 0, width, height, cut);
  bg.lineStyle(1, state.accent, live ? 0.8 : 0.36);
  bg.strokePath();
  bg.fillStyle(state.accent, live ? 0.95 : 0.45);
  bg.fillRect(0, cut, 3, height - cut);

  drawIconTile(bg, evaluation, layout, state.accent, live ? 1 : 0.6);
  drawCostChip(bg, getCostChipRect(width, layout), state.status, live);
  drawLevelPips(bg, width, evaluation, layout, state.accent);
}

function drawCostChip(
  bg: Phaser.GameObjects.Graphics,
  chip: { x: number; y: number; width: number; height: number },
  color: number,
  live: boolean
): void {
  drawAngledRectPath(bg, chip.x, chip.y, chip.width, chip.height, 5);
  bg.fillStyle(color, live ? 0.16 : 0.07);
  bg.fillPath();
  drawAngledRectPath(bg, chip.x, chip.y, chip.width, chip.height, 5);
  bg.lineStyle(1, color, live ? 0.7 : 0.32);
  bg.strokePath();
}

/** One pip per upgrade tier, right-aligned under the cost chip: lit when installed. */
function drawLevelPips(
  bg: Phaser.GameObjects.Graphics,
  width: number,
  evaluation: UpgradeEvaluation,
  layout: UpgradeGridLayout,
  accent: number
): void {
  if (layout.pipWidth === 0) {
    return;
  }

  const chip = getCostChipRect(width, layout);
  const count = evaluation.upgrade.maxLevel;
  const pipWidth = Math.min(layout.pipWidth, (chip.width - PIP_GAP * (count - 1)) / count);
  const top = chip.y + chip.height + PIP_GAP + 2;
  const right = chip.x + chip.width;

  for (let index = 0; index < count; index++) {
    const x = right - (count - index) * pipWidth - (count - 1 - index) * PIP_GAP;
    const installed = index < evaluation.currentLevel;
    bg.fillStyle(installed ? accent : 0x8fa6ba, installed ? 1 : 0.3);
    bg.fillRect(x, top, pipWidth, PIP_HEIGHT);
  }
}

function drawIconTile(
  bg: Phaser.GameObjects.Graphics,
  evaluation: UpgradeEvaluation,
  layout: UpgradeGridLayout,
  color: number,
  alpha: number
): void {
  const size = layout.iconSize;
  const left = 11;
  const top = (layout.buttonHeight - size) / 2;
  drawAngledRectPath(bg, left, top, size, size, 6);
  bg.fillStyle(color, 0.14 * alpha);
  bg.fillPath();
  drawAngledRectPath(bg, left, top, size, size, 6);
  bg.lineStyle(1, color, 0.75 * alpha);
  bg.strokePath();

  const unit = size / 36;
  const centerX = left + size / 2;
  const centerY = top + size / 2;
  bg.lineStyle(Math.max(1.5, 2 * unit), color, alpha);
  if (evaluation.blockReason === 'locked') {
    drawLockGlyph(bg, centerX, centerY, unit, color, alpha);
  } else {
    drawUpgradeGlyph(bg, evaluation.upgrade.key, centerX, centerY, unit);
  }
}

function drawLockGlyph(
  bg: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  unit: number,
  color: number,
  alpha: number
): void {
  bg.beginPath();
  bg.arc(centerX, centerY - 2 * unit, 5 * unit, Math.PI, 0);
  bg.strokePath();
  bg.fillStyle(color, alpha);
  bg.fillRect(centerX - 7.5 * unit, centerY - 2 * unit, 15 * unit, 11 * unit);
}

function drawUpgradeGlyph(
  bg: Phaser.GameObjects.Graphics,
  key: UpgradeKey,
  centerX: number,
  centerY: number,
  unit: number
): void {
  const line = (x1: number, y1: number, x2: number, y2: number): void => {
    bg.lineBetween(centerX + x1 * unit, centerY + y1 * unit, centerX + x2 * unit, centerY + y2 * unit);
  };

  switch (key) {
    case 'hp':
      line(-8, 0, 8, 0);
      line(0, -8, 0, 8);
      break;
    case 'damage':
      line(-8, 8, 8, -8);
      line(1, -8, 8, -8);
      line(8, -8, 8, -1);
      break;
    case 'fireRate':
      line(-9, -6, -1, -6);
      line(-9, 0, 4, 0);
      line(-9, 6, 9, 6);
      break;
    case 'shield':
      bg.strokeTriangle(
        centerX,
        centerY + 9 * unit,
        centerX - 8 * unit,
        centerY - 7 * unit,
        centerX + 8 * unit,
        centerY - 7 * unit
      );
      break;
    case 'turrets':
      // Picket mount: barrel rising from a domed housing on a base plate.
      line(0, 1, 0, -9);
      line(-5, 1, 5, 1);
      line(-5, 1, -5, 7);
      line(5, 1, 5, 7);
      line(-9, 7, 9, 7);
      break;
  }
}

function getVisualState(evaluation: UpgradeEvaluation): CardVisualState {
  const accent = UPGRADE_COLORS[evaluation.upgrade.key];
  switch (evaluation.blockReason) {
    case 'maxed':
      return {
        accent: 0x58d58a,
        status: 0x65f6a1,
        background: 0x07150f,
        backgroundAlpha: 0.9,
        title: '#d9f7e4',
        detail: '#8fc7a6',
      };
    case 'locked':
      return {
        accent: 0x5c6f88,
        status: 0x7d8ca3,
        background: 0x080c14,
        backgroundAlpha: 0.8,
        title: '#93a1b3',
        detail: '#8496ad',
      };
    case 'progression':
      return {
        accent,
        status: NEON.amber,
        background: NEON.panel,
        backgroundAlpha: 0.86,
        title: '#c9d6e2',
        detail: '#93a8ba',
      };
    case 'credits':
      return {
        accent,
        status: 0xff8292,
        background: NEON.panel,
        backgroundAlpha: 0.86,
        title: '#c9d6e2',
        detail: '#93a8ba',
      };
    default:
      return {
        accent,
        status: NEON.gold,
        background: NEON.glass,
        backgroundAlpha: 0.92,
        title: '#f4fbff',
        detail: '#b4cbdb',
      };
  }
}

function getLevelText(evaluation: UpgradeEvaluation, showDescription: boolean): string {
  if (!showDescription) {
    return `LVL ${evaluation.currentLevel}/${evaluation.upgrade.maxLevel}`;
  }

  if (evaluation.blockReason === 'locked' && evaluation.unlockReason) {
    return `UNLOCK: ${evaluation.unlockReason.toUpperCase()}`;
  }

  const tierName = evaluation.upgrade.tierNames?.[evaluation.currentLevel];
  const description = (tierName ?? evaluation.upgrade.description).toUpperCase();
  return `${description}  ·  ${evaluation.currentLevel}/${evaluation.upgrade.maxLevel}`;
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
