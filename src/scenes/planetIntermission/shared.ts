import Phaser from 'phaser';
import type { UpgradeKey } from '../../config/UpgradesConfig';

export type IntermissionViewportMode = 'desktop' | 'landscape' | 'portrait' | 'ultra-compact';

export interface UpgradeGridLayout {
  columns: number;
  buttonWidth: number;
  buttonHeight: number;
  spacingX: number;
  spacingY: number;
  textInsetX: number;
  titleOffsetY: number;
  descriptionOffsetY: number;
  costInsetX: number;
  statusColumnWidth: number;
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
  /** Tighter button metrics so a five-item grid fits short landscape/portrait viewports. */
  compact?: boolean;
}

export function getUpgradeGridLayout(
  viewportHeight: number,
  viewportWidth = Number.POSITIVE_INFINITY,
  options: UpgradeGridLayoutOptions = {}
): UpgradeGridLayout {
  const mode = options.mode ?? (viewportHeight < 430 ? 'landscape' : 'desktop');
  const availableWidth = Math.max(220, Math.min(options.availableWidth ?? viewportWidth, viewportWidth));
  const columns = options.columns ?? (mode === 'portrait' ? 1 : 2);
  const compact = options.compact ?? false;
  const spacingX = mode === 'desktop' ? 14 : 8;
  const maxButtonWidth = mode === 'desktop' ? 286 : mode === 'portrait' ? 420 : 248;
  const buttonWidth = Math.min(maxButtonWidth, Math.floor((availableWidth - spacingX * (columns - 1)) / columns));

  if (mode === 'ultra-compact') {
    return {
      columns,
      buttonWidth,
      buttonHeight: 44,
      spacingX,
      spacingY: 6,
      textInsetX: 34,
      titleOffsetY: 7,
      descriptionOffsetY: 25,
      costInsetX: 8,
      statusColumnWidth: 48,
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
      columns,
      buttonWidth,
      buttonHeight: compact ? 48 : 54,
      spacingX,
      spacingY: compact ? 6 : 8,
      textInsetX: compact ? 38 : 42,
      titleOffsetY: compact ? 7 : 8,
      descriptionOffsetY: compact ? 27 : 29,
      costInsetX: 9,
      statusColumnWidth: 52,
      borderRadius: 9,
      titleFontSize: compact ? '11px' : '12px',
      descriptionFontSize: '9px',
      costFontSize: compact ? '11px' : '12px',
      iconSize: compact ? 26 : 30,
      showDescription: true,
    };
  }

  if (mode === 'portrait') {
    const roomy = viewportHeight >= 760 && !compact;
    return {
      columns,
      buttonWidth,
      buttonHeight: roomy ? 60 : compact ? 48 : 52,
      spacingX: 0,
      spacingY: compact ? 6 : 7,
      textInsetX: compact ? 40 : 44,
      titleOffsetY: roomy ? 10 : 7,
      descriptionOffsetY: roomy ? 33 : compact ? 27 : 28,
      costInsetX: 10,
      statusColumnWidth: 56,
      borderRadius: 10,
      titleFontSize: compact ? '11px' : '12px',
      descriptionFontSize: compact ? '9px' : '10px',
      costFontSize: compact ? '11px' : '12px',
      iconSize: compact ? 26 : 30,
      showDescription: true,
    };
  }

  return {
    columns,
    buttonWidth,
    buttonHeight: 72,
    spacingX,
    spacingY: 12,
    textInsetX: 54,
    titleOffsetY: 12,
    descriptionOffsetY: 39,
    costInsetX: 12,
    statusColumnWidth: 68,
    borderRadius: 12,
    titleFontSize: '14px',
    descriptionFontSize: '12px',
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
