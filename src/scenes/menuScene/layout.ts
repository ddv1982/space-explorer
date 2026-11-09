import type Phaser from 'phaser';
import { ROW_HEIGHT } from '../shared/musicSliderControl';
import type { SettingsPanelLayout } from '../shared/settingsPanel';
import { centerHorizontally, getViewportLayout } from '../../utils/layout';
import { isNarrowViewport, isShortViewport } from '../shared/responsiveViewport';

const MENU_COMPACT_HEIGHT_BREAKPOINT = 720;
const MENU_COMPACT_WIDTH_BREAKPOINT = 800;
const MENU_COMPACT_VERY_SHORT_HEIGHT = 420;
/** The frame's bottom divider ornament sits this far above the frame edge; the footer stays above it. */
const FRAME_BOTTOM_ORNAMENT_CLEARANCE = 46;
const FOOTER_BUTTON_HEIGHT = 44;
const SETTINGS_BUTTON_WIDTH = 188;
const STATUS_HEIGHT = 14;
/** Below this, the hero ship would be too small to read and the band is left empty. */
const MIN_HERO_SHIP_HEIGHT = 64;
/** Native size of the player ship frame (`player-ship`, 36×44 logical px). */
const SHIP_FRAME_HEIGHT = 44;

type MenuResponsiveProfile = 'desktop' | 'tablet' | 'phone-portrait' | 'phone-landscape' | 'ultra-compact';

interface MenuLayoutBand {
  top: number;
  bottom: number;
}

interface MenuRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MenuProfileMetrics {
  titleTopInset: number;
  eyebrowHeight: number;
  eyebrowGap: number;
  titleHeight: number;
  subtitleGap: number;
  subtitleHeight: number;
  tileHeight: number;
  tileGap: number;
  footerGap: number;
  statusGap: number;
  heroMaxShipHeight: number;
  tierHeight: number;
  tierGap: number;
  sliderSpacing: number;
}

const PROFILE_METRICS: Record<MenuResponsiveProfile, MenuProfileMetrics> = {
  desktop: {
    titleTopInset: 26,
    eyebrowHeight: 12,
    eyebrowGap: 8,
    titleHeight: 94,
    subtitleGap: 8,
    subtitleHeight: 20,
    tileHeight: 132,
    tileGap: 20,
    footerGap: 22,
    statusGap: 10,
    heroMaxShipHeight: 176,
    tierHeight: 34,
    tierGap: 10,
    sliderSpacing: 62,
  },
  tablet: {
    titleTopInset: 20,
    eyebrowHeight: 10,
    eyebrowGap: 7,
    titleHeight: 70,
    subtitleGap: 7,
    subtitleHeight: 18,
    tileHeight: 120,
    tileGap: 12,
    footerGap: 18,
    statusGap: 8,
    heroMaxShipHeight: 160,
    tierHeight: 30,
    tierGap: 8,
    sliderSpacing: 58,
  },
  'phone-portrait': {
    titleTopInset: 16,
    eyebrowHeight: 10,
    eyebrowGap: 6,
    titleHeight: 51,
    subtitleGap: 6,
    subtitleHeight: 18,
    tileHeight: 116,
    tileGap: 10,
    footerGap: 16,
    statusGap: 8,
    heroMaxShipHeight: 150,
    tierHeight: 30,
    tierGap: 8,
    sliderSpacing: 58,
  },
  'phone-landscape': {
    titleTopInset: 10,
    eyebrowHeight: 0,
    eyebrowGap: 0,
    titleHeight: 36,
    subtitleGap: 9,
    subtitleHeight: 14,
    tileHeight: 72,
    tileGap: 8,
    footerGap: 8,
    statusGap: 4,
    heroMaxShipHeight: 104,
    tierHeight: 26,
    tierGap: 6,
    sliderSpacing: 54,
  },
  'ultra-compact': {
    titleTopInset: 10,
    eyebrowHeight: 0,
    eyebrowGap: 0,
    titleHeight: 41,
    subtitleGap: 9,
    subtitleHeight: 14,
    tileHeight: 92,
    tileGap: 8,
    footerGap: 10,
    statusGap: 6,
    heroMaxShipHeight: 120,
    tierHeight: 26,
    tierGap: 6,
    sliderSpacing: 54,
  },
};

/** The settings sheet that opens over the home view. */
interface MenuSettingsModalPlan extends MenuRect {
  titleY: number;
  titleFontSize: number;
  missionBand: MenuLayoutBand;
  tuningBand: MenuLayoutBand;
  doneButton: MenuRect;
}

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
  /** Home view, top to bottom: title lockup, hero ship, run tiles, settings button and status. */
  titleBand: MenuLayoutBand;
  heroBand: MenuLayoutBand;
  runSelectionBand: MenuLayoutBand;
  footerBand: MenuLayoutBand;
  /** Where the hero ship is drawn, or null when the screen is too short to show it. */
  hero: { x: number; y: number; shipHeight: number; scale: number } | null;
  tileRowY: number;
  tileWidth: number;
  tileHeight: number;
  tilePositions: Array<{ x: number; y: number }>;
  tileBlockHeight: number;
  settingsButton: MenuRect;
  statusY: number;
  statusHeight: number;
  settingsModal: MenuSettingsModalPlan;
  settingsLayout: SettingsPanelLayout;
}

interface ViewportSize {
  width: number;
  height: number;
}

type MenuViewport = ReturnType<typeof getViewportLayout>;

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
  centerX: number,
  sliderStartY: number,
  sliderSpacing: number,
  sliderWidth: number,
  twoColumns: boolean,
  columnGap: number
): Array<{ x: number; y: number }> {
  if (!twoColumns) {
    return [0, 1, 2, 3].map((index) => ({ x: centerX - sliderWidth / 2, y: sliderStartY + index * sliderSpacing }));
  }
  const left = centerX - sliderWidth - columnGap / 2;
  const right = centerX + columnGap / 2;
  return [
    { x: left, y: sliderStartY },
    { x: right, y: sliderStartY },
    { x: left, y: sliderStartY + sliderSpacing },
    { x: right, y: sliderStartY + sliderSpacing },
  ];
}

/** The settings sheet: heading, difficulty and quality rows, four audio sliders, then DONE. */
function createSettingsModalPlan(
  viewport: MenuViewport,
  profile: MenuResponsiveProfile,
  metrics: MenuProfileMetrics,
  compact: boolean
): { modal: MenuSettingsModalPlan; settingsLayout: SettingsPanelLayout } {
  const twoColumns = viewport.width >= 460 || profile === 'ultra-compact';
  const columnGap = viewport.width < 520 ? 10 : 20;
  const padding = profile === 'phone-landscape' ? 12 : 20;
  const modalWidth = Math.min(viewport.width - 16, twoColumns ? 720 : 400);
  const sliderWidth = twoColumns
    ? Math.min(330, (modalWidth - padding * 2 - columnGap) / 2)
    : Math.min(330, modalWidth - padding * 2);
  const controlWidth = Math.min(330, modalWidth - padding * 2);
  const titleFontSize = profile === 'phone-landscape' ? 18 : compact ? 22 : 26;
  const headerHeight = titleFontSize + (profile === 'phone-landscape' ? 10 : 22);
  const sliderRows = twoColumns ? 2 : 4;
  const contentHeight =
    headerHeight +
    metrics.tierHeight * 2 +
    metrics.tierGap +
    metrics.tierGap * 2 +
    (sliderRows - 1) * metrics.sliderSpacing +
    ROW_HEIGHT +
    metrics.tierGap * 2 +
    FOOTER_BUTTON_HEIGHT;
  const modalHeight = Math.min(viewport.height - 8, contentHeight + padding * 2);
  const modalX = centerHorizontally(viewport, modalWidth);
  const modalY = viewport.top + (viewport.height - modalHeight) / 2;
  const contentTop = modalY + padding;
  const titleY = contentTop + titleFontSize / 2;
  const difficultyY = contentTop + headerHeight;
  const qualityY = difficultyY + metrics.tierHeight + metrics.tierGap;
  const missionBand = { top: difficultyY, bottom: qualityY + metrics.tierHeight };
  const sliderStartY = missionBand.bottom + metrics.tierGap * 2;
  const sliderPositions = createSliderPositions(
    viewport.centerX,
    sliderStartY,
    metrics.sliderSpacing,
    sliderWidth,
    twoColumns,
    columnGap
  );
  const tuningBottom = Math.max(...sliderPositions.map((position) => position.y + ROW_HEIGHT));
  const doneWidth = Math.min(220, modalWidth - padding * 2);
  const doneY = Math.min(tuningBottom + metrics.tierGap * 2, modalY + modalHeight - padding - FOOTER_BUTTON_HEIGHT);

  return {
    modal: {
      x: modalX,
      y: modalY,
      width: modalWidth,
      height: modalHeight,
      titleY,
      titleFontSize,
      missionBand,
      tuningBand: { top: sliderStartY, bottom: tuningBottom },
      doneButton: {
        x: viewport.centerX - doneWidth / 2,
        y: doneY,
        width: doneWidth,
        height: FOOTER_BUTTON_HEIGHT,
      },
    },
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
  const frameBottom = outerFrameY + outerFrameHeight;

  // Title lockup.
  const eyebrowVisible = metrics.eyebrowHeight > 0;
  const titleFontSize = getTitleFontSize(profile, outerFrameWidth);
  const titleBandTop = outerFrameY + metrics.titleTopInset;
  const eyebrowY = eyebrowVisible ? titleBandTop + metrics.eyebrowHeight / 2 : 0;
  const titleTop = titleBandTop + (eyebrowVisible ? metrics.eyebrowHeight + metrics.eyebrowGap : 0);
  const titleY = titleTop + metrics.titleHeight / 2;
  const subtitleY = titleTop + metrics.titleHeight + metrics.subtitleGap + metrics.subtitleHeight / 2;
  const titleBandBottom = subtitleY + metrics.subtitleHeight / 2;

  // Footer: settings button and status line, kept clear of the frame's bottom ornament.
  const footerBottom = frameBottom - (veryShortCompact ? 30 : FRAME_BOTTOM_ORNAMENT_CLEARANCE);
  const statusY = footerBottom - STATUS_HEIGHT / 2;
  const settingsButtonY = footerBottom - STATUS_HEIGHT - metrics.statusGap - FOOTER_BUTTON_HEIGHT;
  const footerTop = settingsButtonY;
  const settingsButtonWidth = Math.min(SETTINGS_BUTTON_WIDTH, outerFrameWidth - 48);

  // Run tiles: NEW RUN plus three save slots.
  const tileGap = metrics.tileGap;
  const tileColumns = getTileColumns(profile, outerFrameWidth, tileGap);
  const tileRows = Math.ceil(4 / tileColumns);
  const maxTileWidth = Math.floor((outerFrameWidth - 24 - tileGap * (tileColumns - 1)) / tileColumns);
  const tileWidth = Math.max(100, Math.min(compact ? 150 : 200, maxTileWidth));
  const tileRowGap = tileRows > 1 ? tileGap : 0;
  const tileBottom = footerTop - metrics.footerGap;
  const roomForTiles = tileBottom - titleBandBottom - metrics.footerGap;
  const tileHeight = Math.max(56, Math.min(metrics.tileHeight, Math.floor((roomForTiles - tileRowGap) / tileRows)));
  const tileBlockHeight = tileRows * tileHeight + (tileRows - 1) * tileRowGap;
  const tileRowY = tileBottom - tileBlockHeight;
  const tileGridWidth = tileColumns * tileWidth + (tileColumns - 1) * tileGap;
  const tileStartX = viewport.centerX - tileGridWidth / 2;
  const tilePositions = Array.from({ length: 4 }, (_, index) => ({
    x: tileStartX + (index % tileColumns) * (tileWidth + tileGap),
    y: tileRowY + Math.floor(index / tileColumns) * (tileHeight + tileRowGap),
  }));

  // Hero ship fills the band between the title and the tiles. It needs half its height above its
  // centre and 0.8 below (engine glow and launch pad), so it reserves 1.3 ship heights.
  const heroBand = { top: titleBandBottom, bottom: tileRowY };
  const heroBandHeight = heroBand.bottom - heroBand.top;
  const heroShipHeight = Math.min(metrics.heroMaxShipHeight, (heroBandHeight - 8) / 1.3);
  const hero =
    heroShipHeight >= MIN_HERO_SHIP_HEIGHT
      ? {
          x: viewport.centerX,
          y: heroBand.top + (heroBandHeight - heroShipHeight * 1.3) / 2 + heroShipHeight * 0.5,
          shipHeight: heroShipHeight,
          scale: heroShipHeight / SHIP_FRAME_HEIGHT,
        }
      : null;

  const { modal, settingsLayout } = createSettingsModalPlan(viewport, profile, metrics, compact);

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
    subtitleFontSize: veryShortCompact ? 12 : compact ? 14 : 16,
    titleY,
    eyebrowY,
    subtitleY,
    titleBand: { top: titleBandTop, bottom: titleBandBottom },
    heroBand,
    runSelectionBand: { top: tileRowY, bottom: tileRowY + tileBlockHeight },
    footerBand: { top: footerTop, bottom: footerBottom },
    hero,
    tileRowY,
    tileWidth,
    tileHeight,
    tilePositions,
    tileBlockHeight,
    settingsButton: {
      x: viewport.centerX - settingsButtonWidth / 2,
      y: settingsButtonY,
      width: settingsButtonWidth,
      height: FOOTER_BUTTON_HEIGHT,
    },
    statusY,
    statusHeight: STATUS_HEIGHT,
    settingsModal: modal,
    settingsLayout,
  };
}
