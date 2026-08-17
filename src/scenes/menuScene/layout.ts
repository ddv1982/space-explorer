import type Phaser from 'phaser';
import { ROW_HEIGHT } from '../shared/musicSliderControl';
import type { SettingsPanelLayout } from '../shared/settingsPanel';
import { centerHorizontally, getViewportLayout } from '../../utils/layout';
import { isNarrowViewport, isShortViewport } from '../shared/responsiveViewport';

const MENU_COMPACT_HEIGHT_BREAKPOINT = 720;
const MENU_COMPACT_WIDTH_BREAKPOINT = 800;
const MENU_COMPACT_VERY_SHORT_HEIGHT = 420;

type MenuResponsiveProfile = 'desktop' | 'tablet' | 'phone-portrait' | 'phone-landscape' | 'ultra-compact';

interface MenuLayoutBand {
  top: number;
  bottom: number;
}

interface MenuProfileMetrics {
  titleTopInset: number;
  eyebrowHeight: number;
  eyebrowGap: number;
  titleHeight: number;
  subtitleGap: number;
  subtitleHeight: number;
  missionGap: number;
  tierHeight: number;
  tierGap: number;
  tuningGap: number;
  sliderSpacing: number;
  cardsGap: number;
  statusGap: number;
  frameBottomPadding: number;
}

const PROFILE_METRICS: Record<MenuResponsiveProfile, MenuProfileMetrics> = {
  desktop: {
    titleTopInset: 24,
    eyebrowHeight: 12,
    eyebrowGap: 6,
    titleHeight: 94,
    subtitleGap: 8,
    subtitleHeight: 20,
    missionGap: 18,
    tierHeight: 34,
    tierGap: 8,
    tuningGap: 14,
    sliderSpacing: 62,
    cardsGap: 36,
    statusGap: 24,
    frameBottomPadding: 16,
  },
  tablet: {
    titleTopInset: 18,
    eyebrowHeight: 10,
    eyebrowGap: 5,
    titleHeight: 70,
    subtitleGap: 7,
    subtitleHeight: 18,
    missionGap: 14,
    tierHeight: 30,
    tierGap: 6,
    tuningGap: 10,
    sliderSpacing: 56,
    cardsGap: 20,
    statusGap: 18,
    frameBottomPadding: 14,
  },
  'phone-portrait': {
    titleTopInset: 14,
    eyebrowHeight: 10,
    eyebrowGap: 4,
    titleHeight: 51,
    subtitleGap: 6,
    subtitleHeight: 18,
    missionGap: 12,
    tierHeight: 28,
    tierGap: 5,
    tuningGap: 9,
    sliderSpacing: 54,
    cardsGap: 12,
    statusGap: 12,
    frameBottomPadding: 10,
  },
  'phone-landscape': {
    titleTopInset: 8,
    eyebrowHeight: 0,
    eyebrowGap: 0,
    titleHeight: 36,
    subtitleGap: 8,
    subtitleHeight: 14,
    missionGap: 3,
    tierHeight: 24,
    tierGap: 5,
    tuningGap: 0,
    sliderSpacing: 52,
    cardsGap: 8,
    statusGap: 8,
    frameBottomPadding: 8,
  },
  'ultra-compact': {
    titleTopInset: 8,
    eyebrowHeight: 0,
    eyebrowGap: 0,
    titleHeight: 41,
    subtitleGap: 8,
    subtitleHeight: 14,
    missionGap: 5,
    tierHeight: 24,
    tierGap: 5,
    tuningGap: 4,
    sliderSpacing: 50,
    cardsGap: 8,
    statusGap: 8,
    frameBottomPadding: 8,
  },
};

export interface MenuLayoutPlan {
  profile: MenuResponsiveProfile;
  compact: boolean;
  veryShortCompact: boolean;
  shortLandscape: boolean;
  centerX: number;
  outerFrameX: number;
  outerFrameY: number;
  outerFrameWidth: number;
  outerFrameHeight: number;
  eyebrowVisible: boolean;
  titleFontSize: number;
  subtitleFontSize: number;
  titleY: number;
  eyebrowY: number;
  subtitleY: number;
  titleBand: MenuLayoutBand;
  missionBand: MenuLayoutBand;
  tuningBand: MenuLayoutBand;
  runSelectionBand: MenuLayoutBand;
  statusBand: MenuLayoutBand;
  tileRowY: number;
  tileWidth: number;
  tileHeight: number;
  tilePositions: Array<{ x: number; y: number }>;
  tileBlockHeight: number;
  musicPanelY: number;
  musicPanelHeight: number;
  statusY: number;
  statusHeight: number;
  settingsLayout: SettingsPanelLayout;
}

interface ViewportSize {
  width: number;
  height: number;
}

function selectMenuResponsiveProfile(viewport: ViewportSize): MenuResponsiveProfile {
  if (viewport.height < MENU_COMPACT_VERY_SHORT_HEIGHT && viewport.width >= 460) return 'phone-landscape';
  if (viewport.width < 460) return viewport.height < 620 ? 'ultra-compact' : 'phone-portrait';
  if (
    isShortViewport(viewport, MENU_COMPACT_HEIGHT_BREAKPOINT - 1) ||
    isNarrowViewport(viewport, MENU_COMPACT_WIDTH_BREAKPOINT)
  ) {
    return 'tablet';
  }
  return 'desktop';
}

function getTitleFontSize(profile: MenuResponsiveProfile, frameWidth: number): number {
  if (profile === 'phone-landscape') return 30;
  if (profile === 'ultra-compact') return 34;
  if (profile === 'phone-portrait' || frameWidth < 500) return 42;
  if (profile === 'tablet') return 58;
  return 78;
}

function getTileColumns(profile: MenuResponsiveProfile, frameWidth: number, gap: number): number {
  if (profile === 'phone-landscape') return 4;
  if (profile === 'phone-portrait' || profile === 'ultra-compact') return 2;
  return 100 * 4 + gap * 3 <= frameWidth ? 4 : 2;
}

function createSliderPositions(
  viewport: ViewportSize & { centerX: number; left: number },
  frameWidth: number,
  sliderStartY: number,
  sliderSpacing: number,
  controlWidth: number,
  twoColumns: boolean
): Array<{ x: number; y: number }> {
  if (!twoColumns) {
    return [0, 1, 2, 3].map((index) => ({
      x: centerHorizontally(viewport, controlWidth),
      y: sliderStartY + index * sliderSpacing,
    }));
  }
  const columnGap = frameWidth < 520 ? 10 : 20;
  const left = viewport.centerX - controlWidth - columnGap / 2;
  const right = viewport.centerX + columnGap / 2;
  return [
    { x: left, y: sliderStartY },
    { x: right, y: sliderStartY },
    { x: left, y: sliderStartY + sliderSpacing },
    { x: right, y: sliderStartY + sliderSpacing },
  ];
}

function distributeDesktopCardSpace(minimumY: number, maximumY: number, profile: MenuResponsiveProfile): number {
  if (maximumY <= minimumY || profile !== 'desktop') return Math.min(minimumY, maximumY);
  return minimumY + Math.min(56, (maximumY - minimumY) * 0.45);
}

export function createMenuLayoutPlan(scene: Phaser.Scene): MenuLayoutPlan {
  const viewport = getViewportLayout(scene);
  const profile = selectMenuResponsiveProfile(viewport);
  const metrics = PROFILE_METRICS[profile];
  const compact = profile !== 'desktop';
  const veryShortCompact = profile === 'phone-landscape' || profile === 'ultra-compact';
  const shortLandscape = profile === 'phone-landscape';
  const safeViewportWidth = Math.max(280, viewport.width);
  const frameInset = veryShortCompact && viewport.width >= 460 ? 8 : 32;
  const outerFrameWidth = Math.min(safeViewportWidth - 32, compact ? 840 : 1100);
  const outerFrameHeight = Math.min(viewport.height - frameInset, compact ? viewport.height - frameInset : 740);
  const outerFrameX = centerHorizontally(viewport, outerFrameWidth);
  const outerFrameY = viewport.top + (viewport.height - outerFrameHeight) / 2;

  const eyebrowVisible = metrics.eyebrowHeight > 0;
  const titleFontSize = getTitleFontSize(profile, outerFrameWidth);
  const titleBandTop = outerFrameY + metrics.titleTopInset;
  const eyebrowY = eyebrowVisible ? titleBandTop + metrics.eyebrowHeight / 2 : 0;
  const titleTop = titleBandTop + (eyebrowVisible ? metrics.eyebrowHeight + metrics.eyebrowGap : 0);
  const titleY = titleTop + metrics.titleHeight / 2;
  const subtitleY = titleTop + metrics.titleHeight + metrics.subtitleGap + metrics.subtitleHeight / 2;
  const titleBandBottom = subtitleY + metrics.subtitleHeight / 2;

  const controlWidth = Math.min(330, shortLandscape ? (outerFrameWidth - 30) / 2 : outerFrameWidth - 48);
  const difficultyY = titleBandBottom + metrics.missionGap;
  const qualityY = difficultyY + metrics.tierHeight + metrics.tierGap;
  const missionBand = { top: difficultyY, bottom: qualityY + metrics.tierHeight };
  const sliderStartY = missionBand.bottom + metrics.tuningGap;
  const twoColumnSettings = viewport.width >= 460 || profile === 'ultra-compact';
  const sliderWidth = twoColumnSettings ? Math.min(330, (outerFrameWidth - 20) / 2) : controlWidth;
  const sliderPositions = createSliderPositions(
    viewport,
    outerFrameWidth,
    sliderStartY,
    metrics.sliderSpacing,
    sliderWidth,
    twoColumnSettings
  );
  const settingsBottom = Math.max(...sliderPositions.map((position) => position.y + ROW_HEIGHT));

  const tileGap = compact ? 10 : 20;
  const tileColumns = getTileColumns(profile, outerFrameWidth, tileGap);
  const tileRows = Math.ceil(4 / tileColumns);
  const maxTileWidth = Math.floor((outerFrameWidth - tileGap * (tileColumns - 1)) / tileColumns);
  const tileWidth = Math.max(100, Math.min(compact ? 120 : 180, maxTileWidth));
  let tileRowGap = compact ? (veryShortCompact ? 4 : 10) : 0;
  const statusHeight = 14;
  const tileTopMinY = settingsBottom + metrics.cardsGap;
  const tileBottomLimit =
    outerFrameY + outerFrameHeight - metrics.frameBottomPadding - statusHeight - metrics.statusGap;
  const targetTileHeight = shortLandscape ? 72 : compact ? (viewport.height >= 780 ? 160 : 120) : 180;
  let maxTileHeight = Math.floor((Math.max(0, tileBottomLimit - tileTopMinY) - (tileRows - 1) * tileRowGap) / tileRows);
  if (compact && maxTileHeight < targetTileHeight) {
    tileRowGap = Math.max(4, tileRowGap - 4);
    maxTileHeight = Math.floor((Math.max(0, tileBottomLimit - tileTopMinY) - (tileRows - 1) * tileRowGap) / tileRows);
  }
  const tileHeight = compact ? Math.max(52, Math.min(targetTileHeight, maxTileHeight)) : 180;
  const tileBlockHeight = tileRows * tileHeight + (tileRows - 1) * tileRowGap;
  const maxTileRowY = tileBottomLimit - tileBlockHeight;
  const tileRowY = distributeDesktopCardSpace(tileTopMinY, maxTileRowY, profile);
  const tileGridWidth = tileColumns * tileWidth + (tileColumns - 1) * tileGap;
  const tileStartX = viewport.centerX - tileGridWidth / 2;
  const tilePositions = Array.from({ length: 4 }, (_, index) => ({
    x: tileStartX + (index % tileColumns) * (tileWidth + tileGap),
    y: tileRowY + Math.floor(index / tileColumns) * (tileHeight + tileRowGap),
  }));
  const statusY = tileRowY + tileBlockHeight + metrics.statusGap;

  return {
    profile,
    compact,
    veryShortCompact,
    shortLandscape,
    centerX: viewport.centerX,
    outerFrameX,
    outerFrameY,
    outerFrameWidth,
    outerFrameHeight,
    eyebrowVisible,
    titleFontSize,
    subtitleFontSize: shortLandscape || veryShortCompact ? 12 : compact ? 14 : 16,
    titleY,
    eyebrowY,
    subtitleY,
    titleBand: { top: titleBandTop, bottom: titleBandBottom },
    missionBand,
    tuningBand: { top: sliderStartY, bottom: settingsBottom },
    runSelectionBand: { top: tileRowY, bottom: tileRowY + tileBlockHeight },
    statusBand: { top: statusY - statusHeight / 2, bottom: statusY + statusHeight / 2 },
    tileRowY,
    tileWidth,
    tileHeight,
    tilePositions,
    tileBlockHeight,
    musicPanelY: sliderStartY - 10,
    musicPanelHeight: settingsBottom - missionBand.top,
    statusY,
    statusHeight,
    settingsLayout: {
      x: centerHorizontally(viewport, controlWidth),
      width: controlWidth,
      sliderWidth,
      difficultyY,
      qualityY,
      tierHeight: metrics.tierHeight,
      compact,
      sliderPositions,
    },
  };
}
