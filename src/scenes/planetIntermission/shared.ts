import Phaser from 'phaser';
import type { UpgradeKey } from '../../config/UpgradesConfig';

export const UPGRADE_GRID_LAYOUT = {
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
} as const;

export interface UpgradeButton {
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  upgradeKey: UpgradeKey;
  x: number;
  y: number;
}
