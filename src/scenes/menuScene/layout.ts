import type Phaser from 'phaser';
import { ROW_HEIGHT } from '../shared/musicSliderControl';
import type { SettingsPanelLayout } from '../shared/settingsPanel';
import { MIN_TOUCH_TARGET_PX } from '../shared/touchTarget';
import { centerHorizontally, getViewportLayout } from '../../utils/layout';

const MENU_COMPACT_HEIGHT_BREAKPOINT = 720;
const MENU_COMPACT_WIDTH_BREAKPOINT = 800;
/** Wide but short screens split into two columns: hero on the left, run selection on the right. */
const SIDE_BY_SIDE_MAX_HEIGHT = 540;
const SIDE_BY_SIDE_MIN_WIDTH = 460;
/** The three save slots sit in one row on wide screens, and on mid-width ones too short to stack them. */
const SLOT_ROW_MIN_WIDTH = 900;
const SLOT_ROW_SHORT_MIN_WIDTH = 720;
const SLOT_ROW_SHORT_MAX_HEIGHT = 800;
const FOOTER_BUTTON_HEIGHT = MIN_TOUCH_TARGET_PX;
const SETTINGS_BUTTON_WIDTH = 168;
const STATUS_HEIGHT = 14;
/** Below this, the hero ship would be too small to read and the band is left empty. */
const MIN_HERO_SHIP_HEIGHT = 64;
/** Native size of the player ship frame (`player-ship`, 36×44 logical px). */
const SHIP_FRAME_HEIGHT = 44;
/** The hero needs half its height above its centre and 0.8 below it (engine plume and launch pad). */
const HERO_FOOTPRINT = 1.3;
const SECTION_HEADER_HEIGHT = 22;

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
  topInset: number;
  /** 0 hides the kicker above the title. */
  kickerSize: number;
  kickerGap: number;
  titleSize: number;
  taglineGap: number;
  taglineSize: number;
  launchWidth: number;
  launchHeight: number;
  slotHeight: number;
  slotGap: number;
  sectionGap: number;
  bottomInset: number;
  heroMaxShipHeight: number;
  tierHeight: number;
  tierGap: number;
  sliderSpacing: number;
}

const PROFILE_METRICS: Record<MenuResponsiveProfile, MenuProfileMetrics> = {
  desktop: {
    topInset: 30,
    kickerSize: 13,
    kickerGap: 10,
    titleSize: 78,
    taglineGap: 10,
    taglineSize: 16,
    launchWidth: 320,
    launchHeight: 64,
    slotHeight: 76,
    slotGap: 14,
    sectionGap: 18,
    bottomInset: 22,
    heroMaxShipHeight: 230,
    tierHeight: 36,
    tierGap: 10,
    sliderSpacing: 60,
  },
  tablet: {
    topInset: 22,
    kickerSize: 12,
    kickerGap: 8,
    titleSize: 58,
    taglineGap: 8,
    taglineSize: 15,
    launchWidth: 300,
    launchHeight: 58,
    slotHeight: 68,
    slotGap: 10,
    sectionGap: 16,
    bottomInset: 18,
    heroMaxShipHeight: 280,
    tierHeight: 34,
    tierGap: 10,
    sliderSpacing: 58,
  },
  'phone-portrait': {
    topInset: 22,
    kickerSize: 11,
    kickerGap: 8,
    titleSize: 42,
    taglineGap: 8,
    taglineSize: 14,
    launchWidth: 420,
    launchHeight: 56,
    slotHeight: 56,
    slotGap: 8,
    sectionGap: 16,
    bottomInset: 18,
    heroMaxShipHeight: 240,
    tierHeight: 32,
    tierGap: 10,
    sliderSpacing: 58,
  },
  'phone-landscape': {
    topInset: 10,
    kickerSize: 0,
    kickerGap: 0,
    titleSize: 30,
    taglineGap: 6,
    taglineSize: 12,
    launchWidth: 380,
    launchHeight: 48,
    slotHeight: 60,
    slotGap: 6,
    sectionGap: 8,
    bottomInset: 8,
    heroMaxShipHeight: 150,
    tierHeight: 30,
    tierGap: 14,
    sliderSpacing: 54,
  },
  'ultra-compact': {
    topInset: 14,
    kickerSize: 0,
    kickerGap: 0,
    titleSize: 34,
    taglineGap: 6,
    taglineSize: 13,
    launchWidth: 420,
    launchHeight: 50,
    slotHeight: 48,
    slotGap: 6,
    sectionGap: 12,
    bottomInset: 12,
    heroMaxShipHeight: 130,
    tierHeight: 30,
    tierGap: 14,
    sliderSpacing: 54,
  },
};

/** A captioned group on the settings sheet: GAMEPLAY, VISUALS, AUDIO. */
interface MenuSettingsSectionHeader extends MenuRect {
  label: string;
}

/** The settings sheet that opens over the home view. */
interface MenuSettingsModalPlan extends MenuRect {
  titleX: number;
  titleY: number;
  titleFontSize: number;
  /** Empty when the sheet is too short to caption its groups. */
  sectionHeaders: MenuSettingsSectionHeader[];
  missionBand: MenuLayoutBand;
  tuningBand: MenuLayoutBand;
  doneButton: MenuRect;
}

export interface MenuLayoutPlan {
  profile: MenuResponsiveProfile;
  compact: boolean;
  /** Hero and settings on the left, run selection on the right; otherwise one centred stack. */
  sideBySide: boolean;
  centerX: number;
  kickerVisible: boolean;
  kickerFontSize: number;
  kickerY: number;
  titleFontSize: number;
  titleMaxWidth: number;
  titleY: number;
  taglineFontSize: number;
  taglineY: number;
  /** Home view: title lockup, hero ship, run selection (launch button and save slots), footer. */
  titleBand: MenuLayoutBand;
  heroBand: MenuLayoutBand;
  runSelectionBand: MenuLayoutBand;
  footerBand: MenuLayoutBand;
  /** Where the hero ship is drawn, or null when the screen is too short to show it. */
  hero: { x: number; y: number; shipHeight: number; scale: number } | null;
  launchButton: MenuRect;
  /** One card per save slot, in slot order. */
  slotCards: MenuRect[];
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
  if (viewport.height < SIDE_BY_SIDE_MAX_HEIGHT && viewport.width >= SIDE_BY_SIDE_MIN_WIDTH) return 'phone-landscape';
  if (viewport.width < SIDE_BY_SIDE_MIN_WIDTH) return viewport.height < 620 ? 'ultra-compact' : 'phone-portrait';
  if (viewport.height < MENU_COMPACT_HEIGHT_BREAKPOINT || viewport.width < MENU_COMPACT_WIDTH_BREAKPOINT) {
    return 'tablet';
  }
  return 'desktop';
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

/**
 * The settings sheet: heading, then GAMEPLAY (difficulty), VISUALS (quality) and AUDIO (four
 * sliders), then DONE. Group captions are dropped when the sheet would not fit with them.
 */
function createSettingsModalPlan(
  viewport: MenuViewport,
  profile: MenuResponsiveProfile,
  metrics: MenuProfileMetrics,
  compact: boolean
): { modal: MenuSettingsModalPlan; settingsLayout: SettingsPanelLayout } {
  const short = profile === 'phone-landscape';
  const twoColumns = viewport.width >= 576 || short;
  const columnGap = viewport.width < 576 ? 12 : 28;
  const padding = short ? 14 : viewport.width < 460 ? 18 : 28;
  const modalWidth = Math.min(viewport.width - 16, twoColumns ? 720 : 420);
  const contentWidth = modalWidth - padding * 2;
  const sliderWidth = twoColumns ? Math.min(330, (contentWidth - columnGap) / 2) : contentWidth;
  const controlWidth = Math.min(560, contentWidth);
  const titleFontSize = short ? 18 : compact ? 22 : 26;
  const headerHeight = titleFontSize + (short ? 10 : 22);
  const sliderRows = twoColumns ? 2 : 4;
  const sectionGap = metrics.tierGap + 4;
  const bodyHeight =
    headerHeight +
    metrics.tierHeight * 2 +
    metrics.tierGap +
    sectionGap +
    (sliderRows - 1) * metrics.sliderSpacing +
    ROW_HEIGHT +
    sectionGap +
    FOOTER_BUTTON_HEIGHT +
    padding * 2;
  const captioned = bodyHeight + SECTION_HEADER_HEIGHT * 3 <= viewport.height - 16;
  const captionHeight = captioned ? SECTION_HEADER_HEIGHT : 0;
  const modalHeight = Math.min(viewport.height - 8, bodyHeight + captionHeight * 3);
  const modalX = centerHorizontally(viewport, modalWidth);
  const modalY = viewport.top + (viewport.height - modalHeight) / 2;
  const contentX = modalX + padding;

  const sectionHeaders: MenuSettingsSectionHeader[] = [];
  const caption = (label: string, y: number): number => {
    if (!captioned) return y;
    sectionHeaders.push({ label, x: contentX, y, width: contentWidth, height: SECTION_HEADER_HEIGHT });
    return y + SECTION_HEADER_HEIGHT;
  };

  const contentTop = modalY + padding;
  const missionTop = contentTop + headerHeight;
  const difficultyY = caption('GAMEPLAY', missionTop);
  const qualityY = caption('VISUALS', difficultyY + metrics.tierHeight + metrics.tierGap);
  const missionBand = { top: missionTop, bottom: qualityY + metrics.tierHeight };
  const sliderStartY = caption('AUDIO', missionBand.bottom + sectionGap);
  const sliderPositions = createSliderPositions(
    viewport.centerX,
    sliderStartY,
    metrics.sliderSpacing,
    sliderWidth,
    twoColumns,
    columnGap
  );
  const tuningBottom = Math.max(...sliderPositions.map((position) => position.y + ROW_HEIGHT));
  const doneWidth = Math.min(220, contentWidth);
  const doneY = Math.min(tuningBottom + sectionGap, modalY + modalHeight - padding - FOOTER_BUTTON_HEIGHT);

  return {
    modal: {
      x: modalX,
      y: modalY,
      width: modalWidth,
      height: modalHeight,
      titleX: contentX,
      titleY: contentTop + titleFontSize / 2,
      titleFontSize,
      sectionHeaders,
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
      x: contentX,
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

type HomePlan = Pick<
  MenuLayoutPlan,
  'heroBand' | 'runSelectionBand' | 'footerBand' | 'hero' | 'launchButton' | 'slotCards' | 'settingsButton' | 'statusY'
>;

function placeHero(band: MenuLayoutBand, x: number, maxShipHeight: number): MenuLayoutPlan['hero'] {
  const bandHeight = band.bottom - band.top;
  const shipHeight = Math.min(maxShipHeight, (bandHeight - 24) / HERO_FOOTPRINT);
  if (shipHeight < MIN_HERO_SHIP_HEIGHT) return null;
  return {
    x,
    y: band.top + (bandHeight - shipHeight * HERO_FOOTPRINT) / 2 + shipHeight * 0.5,
    shipHeight,
    scale: shipHeight / SHIP_FRAME_HEIGHT,
  };
}

function stackSlotCards(x: number, y: number, width: number, height: number, gap: number): MenuRect[] {
  return [0, 1, 2].map((index) => ({ x, y: y + index * (height + gap), width, height }));
}

/** One centred stack: hero, launch button, save slots, settings, status. Built from the bottom up. */
function planStackedHome(viewport: MenuViewport, metrics: MenuProfileMetrics, titleBottom: number): HomePlan {
  const bottom = viewport.bottom - metrics.bottomInset;
  const statusY = bottom - STATUS_HEIGHT / 2;
  const settingsY = bottom - STATUS_HEIGHT - 8 - FOOTER_BUTTON_HEIGHT;
  const settingsWidth = Math.min(SETTINGS_BUTTON_WIDTH, viewport.width - 32);

  const slotsInRow =
    viewport.width >= SLOT_ROW_MIN_WIDTH ||
    (viewport.width >= SLOT_ROW_SHORT_MIN_WIDTH && viewport.height < SLOT_ROW_SHORT_MAX_HEIGHT);
  const slotRows = slotsInRow ? 1 : 3;
  const blockWidth = Math.min(viewport.width - 32, slotsInRow ? 880 : 420);
  const slotWidth = slotsInRow ? Math.floor((blockWidth - metrics.slotGap * 2) / 3) : blockWidth;
  // Short screens shrink the slot cards before they squeeze the launch button or the title.
  const roomForSlots = settingsY - metrics.sectionGap * 2 - metrics.launchHeight - titleBottom - 8;
  const slotHeight = Math.max(
    MIN_TOUCH_TARGET_PX,
    Math.min(metrics.slotHeight, Math.floor((roomForSlots - metrics.slotGap * (slotRows - 1)) / slotRows))
  );
  const slotBlockHeight = slotRows * slotHeight + (slotRows - 1) * metrics.slotGap;
  const slotsTop = settingsY - metrics.sectionGap - slotBlockHeight;
  const slotsLeft = viewport.centerX - blockWidth / 2;
  const slotCards = slotsInRow
    ? [0, 1, 2].map((index) => ({
        x: slotsLeft + index * (slotWidth + metrics.slotGap),
        y: slotsTop,
        width: slotWidth,
        height: slotHeight,
      }))
    : stackSlotCards(slotsLeft, slotsTop, slotWidth, slotHeight, metrics.slotGap);

  const launchWidth = Math.min(metrics.launchWidth, blockWidth);
  const launchY = slotsTop - metrics.sectionGap - metrics.launchHeight;
  const heroBand = { top: titleBottom, bottom: launchY };

  return {
    heroBand,
    runSelectionBand: { top: launchY, bottom: slotsTop + slotBlockHeight },
    footerBand: { top: settingsY, bottom },
    hero: placeHero(heroBand, viewport.centerX, metrics.heroMaxShipHeight),
    launchButton: {
      x: viewport.centerX - launchWidth / 2,
      y: launchY,
      width: launchWidth,
      height: metrics.launchHeight,
    },
    slotCards,
    settingsButton: {
      x: viewport.centerX - settingsWidth / 2,
      y: settingsY,
      width: settingsWidth,
      height: FOOTER_BUTTON_HEIGHT,
    },
    statusY,
  };
}

/** Two columns under the title: hero over the settings button on the left, run selection on the right. */
function planSideBySideHome(viewport: MenuViewport, metrics: MenuProfileMetrics, titleBottom: number): HomePlan {
  const gutter = 16;
  const bottom = viewport.bottom - metrics.bottomInset;
  const statusY = bottom - STATUS_HEIGHT / 2;
  const contentTop = titleBottom + metrics.sectionGap;
  const contentBottom = bottom - STATUS_HEIGHT - 4;
  const columnWidth = Math.min(metrics.launchWidth, (viewport.width - gutter * 3) / 2);
  const leftX = viewport.centerX - gutter / 2 - columnWidth;
  const rightX = viewport.centerX + gutter / 2;

  const roomForSlots = contentBottom - contentTop - metrics.launchHeight - metrics.slotGap * 3;
  const slotHeight = Math.max(MIN_TOUCH_TARGET_PX, Math.min(metrics.slotHeight, Math.floor(roomForSlots / 3)));
  const slotsTop = contentTop + metrics.launchHeight + metrics.slotGap;
  const slotCards = stackSlotCards(rightX, slotsTop, columnWidth, slotHeight, metrics.slotGap);

  const settingsWidth = Math.min(SETTINGS_BUTTON_WIDTH, columnWidth);
  const settingsY = contentBottom - FOOTER_BUTTON_HEIGHT;
  const heroBand = { top: contentTop, bottom: settingsY - 4 };

  return {
    heroBand,
    runSelectionBand: { top: contentTop, bottom: slotsTop + slotHeight * 3 + metrics.slotGap * 2 },
    footerBand: { top: settingsY, bottom },
    hero: placeHero(heroBand, leftX + columnWidth / 2, metrics.heroMaxShipHeight),
    launchButton: { x: rightX, y: contentTop, width: columnWidth, height: metrics.launchHeight },
    slotCards,
    settingsButton: {
      x: leftX + (columnWidth - settingsWidth) / 2,
      y: settingsY,
      width: settingsWidth,
      height: FOOTER_BUTTON_HEIGHT,
    },
    statusY,
  };
}

export function createMenuLayoutPlan(scene: Phaser.Scene): MenuLayoutPlan {
  const viewport = getViewportLayout(scene);
  const profile = selectMenuResponsiveProfile(viewport);
  const metrics = PROFILE_METRICS[profile];
  const sideBySide = profile === 'phone-landscape';

  // Title lockup: kicker, title, tagline.
  const kickerVisible = metrics.kickerSize > 0;
  const titleBandTop = viewport.top + metrics.topInset;
  const titleTop = titleBandTop + (kickerVisible ? metrics.kickerSize + metrics.kickerGap : 0);
  const taglineY = titleTop + metrics.titleSize + metrics.taglineGap + metrics.taglineSize / 2;
  const titleBand = { top: titleBandTop, bottom: taglineY + metrics.taglineSize / 2 };

  const home = sideBySide
    ? planSideBySideHome(viewport, metrics, titleBand.bottom)
    : planStackedHome(viewport, metrics, titleBand.bottom);
  const compact = profile !== 'desktop';
  const { modal, settingsLayout } = createSettingsModalPlan(viewport, profile, metrics, compact);

  return {
    profile,
    compact,
    sideBySide,
    centerX: viewport.centerX,
    kickerVisible,
    kickerFontSize: metrics.kickerSize,
    kickerY: titleBandTop + metrics.kickerSize / 2,
    titleFontSize: metrics.titleSize,
    titleMaxWidth: Math.max(180, viewport.width - 40),
    titleY: titleTop + metrics.titleSize / 2,
    taglineFontSize: metrics.taglineSize,
    taglineY,
    titleBand,
    ...home,
    statusHeight: STATUS_HEIGHT,
    settingsModal: modal,
    settingsLayout,
  };
}
