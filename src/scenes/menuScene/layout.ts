import type Phaser from 'phaser';
import { ROW_HEIGHT } from '../shared/musicSliderControl';
import { centerHorizontally, getViewportLayout } from '../../utils/layout';

const MENU_COMPACT_HEIGHT_BREAKPOINT = 720;
const MENU_COMPACT_WIDTH_BREAKPOINT = 800;
const MENU_MUSIC_VISIBLE_MIN_HEIGHT = 600;
const MENU_COMPACT_MUSIC_VISIBLE_MIN_HEIGHT = 680;
const MENU_COMPACT_VERY_SHORT_HEIGHT = 420;

export interface MenuLayoutPlan {
  compact: boolean;
  veryShortCompact: boolean;
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
  statusY: number;
  statusHeight: number;
}

export function createMenuLayoutPlan(scene: Phaser.Scene): MenuLayoutPlan {
  const layout = getViewportLayout(scene);
  const compact =
    layout.height < MENU_COMPACT_HEIGHT_BREAKPOINT ||
    layout.width < MENU_COMPACT_WIDTH_BREAKPOINT;
  const veryShortCompact = compact && layout.height < MENU_COMPACT_VERY_SHORT_HEIGHT;
  const safeViewportWidth = Math.max(280, layout.width);

  const outerFrameWidth = Math.min(safeViewportWidth - 32, compact ? 840 : 1100);
  const outerFrameHeight = Math.min(layout.height - 32, compact ? layout.height - 32 : 740);
  const outerFrameX = centerHorizontally(layout, outerFrameWidth);
  const outerFrameY = layout.top + (layout.height - outerFrameHeight) / 2;

  const tileGap = compact ? 10 : 20;
  let tileRowGap = compact ? (veryShortCompact ? 8 : 12) : 0;
  const defaultTileWidth = compact ? 120 : 180;
  const tileColumns = compact && defaultTileWidth * 4 + tileGap * 3 > outerFrameWidth ? 2 : 4;
  const maxTileWidth = Math.floor((outerFrameWidth - tileGap * (tileColumns - 1)) / tileColumns);
  const tileWidth = Math.max(100, Math.min(defaultTileWidth, maxTileWidth));

  const musicPanelWidth = Math.min(outerFrameWidth - 64, 880);
  const musicVisible =
    layout.height > MENU_MUSIC_VISIBLE_MIN_HEIGHT &&
    (layout.width >= MENU_COMPACT_WIDTH_BREAKPOINT || layout.height >= MENU_COMPACT_MUSIC_VISIBLE_MIN_HEIGHT);

  // Give each slider row proper breathing room:
  // 8px gap compact, 16px gap desktop
  const sliderSpacing = ROW_HEIGHT + (compact ? 8 : 16);
  const musicPanelHeight = musicVisible ? (ROW_HEIGHT + sliderSpacing * 3) : 0;

  const titleY = outerFrameY + (compact ? (veryShortCompact ? 42 : 52) : 100);
  const subtitleY = outerFrameY + (compact ? (veryShortCompact ? 96 : 112) : 170);
  const sliderStartY = subtitleY + (compact ? (veryShortCompact ? 18 : 30) : 50);

  const tileRows = Math.ceil(4 / tileColumns);
  const statusHeight = 14;
  const statusGap = compact ? (veryShortCompact ? 12 : 20) : 24;
  const frameBottomPadding = compact ? (veryShortCompact ? 10 : 14) : 16;
  const topBandBottom = musicVisible
    ? sliderStartY + musicPanelHeight
    : subtitleY + (compact ? (veryShortCompact ? 12 : 18) : 24);
  const tileTopPadding = compact ? (veryShortCompact ? 10 : 16) : 10;
  const tileTopMinY = topBandBottom + tileTopPadding;
  const tileBottomLimit = outerFrameY + outerFrameHeight - frameBottomPadding - statusHeight - statusGap;

  const compactTargetTileHeight = veryShortCompact ? 96 : 120;
  let compactMaxTileHeight = Math.floor(
    (Math.max(0, tileBottomLimit - tileTopMinY) - (tileRows - 1) * tileRowGap) / tileRows
  );
  if (compact && compactMaxTileHeight < compactTargetTileHeight) {
    tileRowGap = Math.max(4, tileRowGap - (veryShortCompact ? 4 : 2));
    compactMaxTileHeight = Math.floor(
      (Math.max(0, tileBottomLimit - tileTopMinY) - (tileRows - 1) * tileRowGap) / tileRows
    );
  }
  const tileHeight = compact
    ? Math.max(72, Math.min(compactTargetTileHeight, compactMaxTileHeight))
    : 180;

  const tileBlockHeight = tileRows * tileHeight + (tileRows - 1) * tileRowGap;
  const desiredTileRowY = tileTopMinY;
  const maxTileRowY = tileBottomLimit - tileBlockHeight;
  const tileRowY = Math.max(tileTopMinY, Math.min(desiredTileRowY, maxTileRowY));
  const tileGridWidth = tileColumns * tileWidth + (tileColumns - 1) * tileGap;
  const tileStartX = layout.centerX - tileGridWidth / 2;
  const tilePositions = Array.from({ length: 4 }, (_, index) => {
    const column = index % tileColumns;
    const row = Math.floor(index / tileColumns);

    return {
      x: tileStartX + column * (tileWidth + tileGap),
      y: tileRowY + row * (tileHeight + tileRowGap),
    };
  });
  const statusY = tileRowY + tileBlockHeight + statusGap;

  return {
    compact,
    veryShortCompact,
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
    statusY,
    statusHeight,
  };
}
