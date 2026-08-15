import type Phaser from 'phaser';
import { ROW_HEIGHT } from '../shared/musicSliderControl';
import type { SettingsPanelLayout } from '../shared/settingsPanel';
import { centerHorizontally, getViewportLayout } from '../../utils/layout';

const MENU_COMPACT_HEIGHT_BREAKPOINT = 720;
const MENU_COMPACT_WIDTH_BREAKPOINT = 800;
const MENU_COMPACT_VERY_SHORT_HEIGHT = 420;

export interface MenuLayoutPlan {
  compact: boolean;
  veryShortCompact: boolean;
  shortLandscape: boolean;
  centerX: number;
  outerFrameX: number;
  outerFrameY: number;
  outerFrameWidth: number;
  outerFrameHeight: number;
  titleY: number;
  subtitleY: number;
  tileRowY: number;
  tileWidth: number;
  tileHeight: number;
  tileGap: number;
  tileRowGap: number;
  tilePositions: Array<{ x: number; y: number }>;
  tileBlockHeight: number;
  musicPanelY: number;
  musicPanelWidth: number;
  musicPanelHeight: number;
  sliderX: number;
  sliderStartY: number;
  sliderSpacing: number;
  sliderWidth: number;
  qualityX: number;
  qualityY: number;
  qualityWidth: number;
  qualityHeight: number;
  statusY: number;
  statusHeight: number;
  settingsLayout: SettingsPanelLayout;
}

export function createMenuLayoutPlan(scene: Phaser.Scene): MenuLayoutPlan {
  const layout = getViewportLayout(scene);
  const compact =
    layout.height < MENU_COMPACT_HEIGHT_BREAKPOINT ||
    layout.width < MENU_COMPACT_WIDTH_BREAKPOINT;
  const veryShortCompact = compact && layout.height < MENU_COMPACT_VERY_SHORT_HEIGHT;
  const safeViewportWidth = Math.max(280, layout.width);

  const outerFrameWidth = Math.min(safeViewportWidth - 32, compact ? 840 : 1100);
  const shortFrameInset = veryShortCompact && layout.width >= 460 ? 8 : 32;
  const outerFrameHeight = Math.min(layout.height - shortFrameInset, compact ? layout.height - shortFrameInset : 740);
  const outerFrameX = centerHorizontally(layout, outerFrameWidth);
  const outerFrameY = layout.top + (layout.height - outerFrameHeight) / 2;

  const tileGap = compact ? 10 : 20;
  let tileRowGap = compact ? (veryShortCompact ? 8 : 12) : 0;
  const defaultTileWidth = compact ? 120 : 180;
  const tileColumns = compact && 100 * 4 + tileGap * 3 > outerFrameWidth ? 2 : 4;
  const maxTileWidth = Math.floor((outerFrameWidth - tileGap * (tileColumns - 1)) / tileColumns);
  const tileWidth = Math.max(100, Math.min(defaultTileWidth, maxTileWidth));

  const musicPanelWidth = Math.min(outerFrameWidth - 64, 880);
  // Give each slider row proper breathing room:
  // 8px gap compact, 16px gap desktop
  const sliderSpacing = ROW_HEIGHT + (compact ? 8 : 16);
  const shortLandscape = veryShortCompact && layout.width >= 460;

  const titleY = outerFrameY + (shortLandscape ? 25 : compact ? (veryShortCompact ? 34 : 52) : 82);
  const subtitleY = outerFrameY + (shortLandscape ? 54 : compact ? (veryShortCompact ? 72 : 112) : 136);
  const qualityWidth = Math.min(330, shortLandscape ? (outerFrameWidth - 30) / 2 : outerFrameWidth - 48);
  const qualityHeight = compact ? (shortLandscape ? 24 : 28) : 34;
  const qualityY = subtitleY + (compact ? (veryShortCompact ? 12 : 20) : 22);
  const difficultyY = qualityY;
  const visualQualityY = difficultyY + qualityHeight + (compact ? 5 : 8);
  const sliderStartY = visualQualityY + qualityHeight + (shortLandscape ? 0 : compact ? 8 : 12);
  const twoColumnSettings = layout.width >= 460;
  const settingsSliderWidth = twoColumnSettings
    ? Math.min(330, (outerFrameWidth - 20) / 2)
    : qualityWidth;
  const settingsSliderSpacing = shortLandscape ? 52 : compact ? 54 : 62;
  const sliderPositions = twoColumnSettings
    ? [
        { x: layout.centerX - settingsSliderWidth - (shortLandscape ? 5 : 10), y: sliderStartY },
        { x: layout.centerX + (shortLandscape ? 5 : 10), y: sliderStartY },
        { x: layout.centerX - settingsSliderWidth - (shortLandscape ? 5 : 10), y: sliderStartY + settingsSliderSpacing },
        { x: layout.centerX + (shortLandscape ? 5 : 10), y: sliderStartY + settingsSliderSpacing },
      ]
    : [0, 1, 2, 3].map((index) => ({
        x: centerHorizontally(layout, qualityWidth),
        y: sliderStartY + index * settingsSliderSpacing,
      }));
  const settingsBottom = Math.max(...sliderPositions.map((position) => position.y + ROW_HEIGHT));
  const musicPanelHeight = settingsBottom - qualityY;

  const tileRows = Math.ceil(4 / tileColumns);
  const statusHeight = 14;
  const statusGap = compact ? (shortLandscape ? 8 : veryShortCompact ? 12 : 20) : 24;
  const frameBottomPadding = compact ? (veryShortCompact ? 10 : 14) : 16;
  const topBandBottom = settingsBottom;
  const tileTopPadding = compact ? (veryShortCompact ? 10 : 16) : 10;
  const tileTopMinY = topBandBottom + tileTopPadding;
  const tileBottomLimit = outerFrameY + outerFrameHeight - frameBottomPadding - statusHeight - statusGap;

  const compactTargetTileHeight = veryShortCompact ? 96 : layout.height >= 780 ? 160 : 120;
  let compactMaxTileHeight = Math.floor(
    (Math.max(0, tileBottomLimit - tileTopMinY) - (tileRows - 1) * tileRowGap) / tileRows
  );
  if (compact && compactMaxTileHeight < compactTargetTileHeight) {
    tileRowGap = Math.max(4, tileRowGap - (veryShortCompact ? 4 : 2));
    compactMaxTileHeight = Math.floor(
      (Math.max(0, tileBottomLimit - tileTopMinY) - (tileRows - 1) * tileRowGap) / tileRows
    );
  }
  let tileHeight = compact
    ? Math.max(52, Math.min(compactTargetTileHeight, compactMaxTileHeight))
    : 180;

  if (shortLandscape) tileHeight = 72;
  const tileBlockHeight = shortLandscape ? tileHeight : tileRows * tileHeight + (tileRows - 1) * tileRowGap;
  const desiredTileRowY = tileTopMinY;
  const maxTileRowY = tileBottomLimit - tileBlockHeight;
  const tileRowY = shortLandscape
    ? outerFrameY + outerFrameHeight - statusHeight - statusGap - tileHeight + 6
    : Math.max(tileTopMinY, Math.min(desiredTileRowY, maxTileRowY));
  const tileGridWidth = tileColumns * tileWidth + (tileColumns - 1) * tileGap;
  const tileStartX = layout.centerX - tileGridWidth / 2;
  const tilePositions = Array.from({ length: 4 }, (_, index) => {
    const column = shortLandscape ? index : index % tileColumns;
    const row = shortLandscape ? 0 : Math.floor(index / tileColumns);

    return {
      x: (shortLandscape ? layout.centerX - (4 * tileWidth + 3 * tileGap) / 2 : tileStartX) + column * (tileWidth + tileGap),
      y: tileRowY + row * (tileHeight + tileRowGap),
    };
  });
  const statusY = tileRowY + tileBlockHeight + statusGap;

  return {
    compact,
    veryShortCompact,
    shortLandscape,
    centerX: layout.centerX,
    outerFrameX,
    outerFrameY,
    outerFrameWidth,
    outerFrameHeight,
    titleY,
    subtitleY,
    tileRowY,
    tileWidth,
    tileHeight,
    tileGap,
    tileRowGap,
    tilePositions,
    tileBlockHeight,
    musicPanelY: sliderStartY - 10,
    musicPanelWidth,
    musicPanelHeight,
    sliderX: centerHorizontally(layout, musicPanelWidth),
    sliderStartY,
    sliderSpacing,
    sliderWidth: musicPanelWidth,
    qualityX: centerHorizontally(layout, qualityWidth),
    qualityY,
    qualityWidth,
    qualityHeight,
    statusY,
    statusHeight,
    settingsLayout: {
      x: centerHorizontally(layout, qualityWidth),
      width: qualityWidth,
      sliderWidth: settingsSliderWidth,
      difficultyY,
      qualityY: visualQualityY,
      tierHeight: qualityHeight,
      compact,
      sliderPositions,
    },
  };
}
