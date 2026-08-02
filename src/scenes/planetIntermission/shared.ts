import Phaser from 'phaser';
import type { UpgradeKey } from '../../config/UpgradesConfig';

export type IntermissionViewportMode = 'desktop' | 'landscape' | 'portrait' | 'ultra-compact';

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
  iconSize: number;
  showDescription: boolean;
}

interface UpgradeGridLayoutOptions {
  availableWidth?: number;
  columns?: number;
  mode?: IntermissionViewportMode;
}

export function getUpgradeGridLayout(
  viewportHeight: number,
  viewportWidth = Number.POSITIVE_INFINITY,
  options: UpgradeGridLayoutOptions = {}
): UpgradeGridLayout {
  const mode = options.mode ?? (viewportHeight < 430 ? 'landscape' : 'desktop');
  const availableWidth = Math.max(220, Math.min(options.availableWidth ?? viewportWidth, viewportWidth));
  const columns = options.columns ?? (mode === 'portrait' ? 1 : 2);
  const spacingX = mode === 'desktop' ? 14 : 8;
  const maxButtonWidth = mode === 'desktop' ? 286 : mode === 'portrait' ? 420 : 248;
  const buttonWidth = Math.min(
    maxButtonWidth,
    Math.floor((availableWidth - spacingX * (columns - 1)) / columns)
  );

  if (mode === 'ultra-compact') {
    return {
      top: 0,
      columns,
      buttonWidth,
      buttonHeight: 44,
      spacingX,
      spacingY: 6,
      textInsetX: 34,
      titleOffsetY: 7,
      descriptionOffsetY: 25,
      costInsetX: 8,
      borderRadius: 8,
      titleFontSize: '11px',
      descriptionFontSize: '9px',
      costFontSize: '11px',
      iconSize: 24,
      showDescription: false,
    };
  }

  if (mode === 'landscape') {
    return {
      top: 0,
      columns,
      buttonWidth,
      buttonHeight: 54,
      spacingX,
      spacingY: 8,
      textInsetX: 42,
      titleOffsetY: 8,
      descriptionOffsetY: 29,
      costInsetX: 9,
      borderRadius: 9,
      titleFontSize: '12px',
      descriptionFontSize: '9px',
      costFontSize: '12px',
      iconSize: 30,
      showDescription: true,
    };
  }

  if (mode === 'portrait') {
    const roomy = viewportHeight >= 760;
    return {
      top: 0,
      columns,
      buttonWidth,
      buttonHeight: roomy ? 60 : 52,
      spacingX: 0,
      spacingY: 7,
      textInsetX: 44,
      titleOffsetY: roomy ? 10 : 7,
      descriptionOffsetY: roomy ? 33 : 28,
      costInsetX: 10,
      borderRadius: 10,
      titleFontSize: '12px',
      descriptionFontSize: '10px',
      costFontSize: '12px',
      iconSize: 30,
      showDescription: true,
    };
  }

  return {
    top: 0,
    columns,
    buttonWidth,
    buttonHeight: 72,
    spacingX,
    spacingY: 12,
    textInsetX: 54,
    titleOffsetY: 12,
    descriptionOffsetY: 39,
    costInsetX: 12,
    borderRadius: 12,
    titleFontSize: '14px',
    descriptionFontSize: '11px',
    costFontSize: '14px',
    iconSize: 36,
    showDescription: true,
  };
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
