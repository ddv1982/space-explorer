import Phaser from 'phaser';
import type { UpgradeKey } from '../../config/UpgradesConfig';

export interface UpgradeGridLayout {
  top: number;
  columns: number;
  buttonWidth: number;
  buttonHeight: number;
  spacingX: number;
  spacingY: number;
  textInsetX: number;
  titleOffsetY: number;
  descriptionOffsetY: number;
  costInsetX: number;
  borderRadius: number;
  titleFontSize: string;
  descriptionFontSize: string;
  costFontSize: string;
}

export const DEFAULT_UPGRADE_GRID_LAYOUT: UpgradeGridLayout = {
  top: 380,
  columns: 2,
  buttonWidth: 240,
  buttonHeight: 60,
  spacingX: 32,
  spacingY: 16,
  textInsetX: 10,
  titleOffsetY: 8,
  descriptionOffsetY: 28,
  costInsetX: 10,
  borderRadius: 8,
  titleFontSize: '14px',
  descriptionFontSize: '11px',
  costFontSize: '16px',
};

export function getUpgradeGridLayout(viewportHeight: number): UpgradeGridLayout {
  if (viewportHeight < 430) {
    return {
      ...DEFAULT_UPGRADE_GRID_LAYOUT,
      buttonWidth: 210,
      buttonHeight: 44,
      spacingX: 24,
      spacingY: 8,
      textInsetX: 8,
      titleOffsetY: 5,
      descriptionOffsetY: 20,
      costInsetX: 8,
      borderRadius: 7,
      titleFontSize: '12px',
      descriptionFontSize: '10px',
      costFontSize: '13px',
    };
  }

  if (viewportHeight < 520) {
    return {
      ...DEFAULT_UPGRADE_GRID_LAYOUT,
      buttonWidth: 220,
      buttonHeight: 52,
      spacingX: 28,
      spacingY: 12,
      titleFontSize: '13px',
      descriptionFontSize: '10px',
      costFontSize: '14px',
    };
  }

  return DEFAULT_UPGRADE_GRID_LAYOUT;
}

export interface UpgradeButton {
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  upgradeKey: UpgradeKey;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  layout: UpgradeGridLayout;
}
