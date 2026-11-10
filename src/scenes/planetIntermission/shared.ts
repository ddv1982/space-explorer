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
  cornerCut: number;
  titleFontSize: number;
  descriptionFontSize: number;
  costFontSize: number;
  iconSize: number;
  /** Width of one upgrade-level pip; the row sits under the cost chip. Zero drops the pips. */
  pipWidth: number;
  showDescription: boolean;
}

interface UpgradeGridLayoutOptions {
  availableWidth?: number;
  columns?: number;
  mode?: IntermissionViewportMode;
  /** Tighter button metrics so a five-item grid fits short landscape/portrait viewports. */
  compact?: boolean;
}

/** Everything about a card that depends on the viewport mode rather than on the column split. */
type UpgradeCardMetrics = Omit<UpgradeGridLayout, 'columns' | 'buttonWidth' | 'spacingX'>;

function ultraCompactCardMetrics(): UpgradeCardMetrics {
  return {
    buttonHeight: 44,
    spacingY: 6,
    textInsetX: 38,
    titleOffsetY: 6,
    descriptionOffsetY: 24,
    costInsetX: 6,
    statusColumnWidth: 50,
    cornerCut: 8,
    titleFontSize: 10,
    descriptionFontSize: 11,
    costFontSize: 10,
    iconSize: 24,
    pipWidth: 0,
    showDescription: false,
  };
}

function landscapeCardMetrics(compact: boolean): UpgradeCardMetrics {
  return {
    buttonHeight: compact ? 48 : 54,
    spacingY: compact ? 6 : 8,
    textInsetX: compact ? 44 : 48,
    titleOffsetY: compact ? 7 : 8,
    descriptionOffsetY: compact ? 27 : 29,
    costInsetX: 9,
    statusColumnWidth: 62,
    cornerCut: 9,
    titleFontSize: compact ? 11 : 12,
    descriptionFontSize: 12,
    costFontSize: compact ? 11 : 12,
    iconSize: compact ? 28 : 32,
    pipWidth: 8,
    showDescription: true,
  };
}

function portraitCardMetrics(viewportHeight: number, compact: boolean): UpgradeCardMetrics {
  const roomy = viewportHeight >= 760 && !compact;
  return {
    buttonHeight: roomy ? 60 : compact ? 48 : 52,
    spacingY: compact ? 6 : 7,
    textInsetX: compact ? 46 : roomy ? 58 : 50,
    titleOffsetY: roomy ? 10 : 7,
    descriptionOffsetY: roomy ? 33 : compact ? 27 : 28,
    costInsetX: 10,
    statusColumnWidth: 64,
    cornerCut: 10,
    titleFontSize: compact ? 11 : 13,
    descriptionFontSize: compact ? 12 : 13,
    costFontSize: compact ? 11 : 13,
    iconSize: compact ? 28 : roomy ? 38 : 32,
    pipWidth: 9,
    showDescription: true,
  };
}

/** Small desktop windows squeeze the two-column cards: trade icon and chip size for text room. */
function desktopCardMetrics(buttonWidth: number): UpgradeCardMetrics {
  const narrow = buttonWidth < 290;
  return {
    buttonHeight: 72,
    spacingY: 12,
    textInsetX: narrow ? 54 : 66,
    titleOffsetY: 14,
    descriptionOffsetY: 40,
    costInsetX: narrow ? 10 : 14,
    statusColumnWidth: narrow ? 66 : 78,
    cornerCut: 12,
    titleFontSize: narrow ? 13 : 15,
    descriptionFontSize: narrow ? 13 : 14,
    costFontSize: narrow ? 13 : 14,
    iconSize: narrow ? 34 : 44,
    pipWidth: narrow ? 10 : 12,
    showDescription: true,
  };
}

function getCardMetrics(
  mode: IntermissionViewportMode,
  viewportHeight: number,
  buttonWidth: number,
  compact: boolean
): UpgradeCardMetrics {
  switch (mode) {
    case 'ultra-compact':
      return ultraCompactCardMetrics();
    case 'landscape':
      return landscapeCardMetrics(compact);
    case 'portrait':
      return portraitCardMetrics(viewportHeight, compact);
    default:
      return desktopCardMetrics(buttonWidth);
  }
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
  const maxButtonWidth = mode === 'desktop' ? 340 : mode === 'portrait' ? 420 : 300;
  const buttonWidth = Math.min(maxButtonWidth, Math.floor((availableWidth - spacingX * (columns - 1)) / columns));

  return {
    columns,
    buttonWidth,
    spacingX: mode === 'portrait' ? 0 : spacingX,
    ...getCardMetrics(mode, viewportHeight, buttonWidth, options.compact ?? false),
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
  cornerCut: number;
  layout: UpgradeGridLayout;
}
