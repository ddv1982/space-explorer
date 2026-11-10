import Phaser from 'phaser';
import { centerHorizontally, getViewportLayout } from '@/utils/layout';
import { drawNeonFrame, NEON } from '../../shared/neonUiTheme';
import type { PauseOverlayLayout, PauseSaveSlotRowLayout } from './types';

export const PAUSE_OVERLAY_BUTTON_WIDTH = 150;
export const PAUSE_OVERLAY_BUTTON_HEIGHT = 48;
const PAUSE_OVERLAY_BUTTON_GAP = 16;
export const PAUSE_OVERLAY_SLOT_BUTTON_WIDTH = 68;
export const PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT = 30;
const PAUSE_OVERLAY_SLOT_BUTTON_GAP = 8;
/** Buttons keep this distance from the right edge of their slot card. */
const SLOT_BUTTON_INSET = 10;
const SLOT_TEXT_INSET = 14;
/** Cards this tall put the checkpoint text above the buttons instead of beside them. */
const STACKED_SLOT_ROW_HEIGHT = 88;
const SIDE_BY_SIDE_SLOT_ROW_HEIGHT = 60;

/** Height of one shared music slider row. */
const SLIDER_ROW_HEIGHT = 52;

const PAUSE_PANEL_MAX_WIDTH = 680;
const PAUSE_PANEL_MARGIN = 12;
const PAUSE_BREAKPOINT_SHORT_HEIGHT = 520;
const PAUSE_STACKED_CARDS_MAX_PANEL_WIDTH = 496;
const PAUSE_STACKED_CARDS_MIN_HEIGHT = 640;
/** Below this the settings sliders stack in one column. */
const PAUSE_SETTINGS_TWO_COLUMN_MIN_WIDTH = 390;
/** One width for every viewport: tier buttons keep the size they were built with across resizes. */
const PAUSE_SETTINGS_MAX_WIDTH = 330;
/** Viewports at least this wide are assumed to have a keyboard worth hinting at. */
const PAUSE_KEY_HINT_MIN_WIDTH = 720;

interface SlotTextBand {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface SlotButtonRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PauseSaveSlotRowControlLayout {
  title: SlotTextBand;
  subtitle: SlotTextBand;
  savedAt: SlotTextBand;
  saveButton: SlotButtonRect;
  loadButton: SlotButtonRect;
  deleteButton: SlotButtonRect;
}

/** Width reserved for the saved-at timestamp (`2026-04-27 12:34` in the readout face). */
const SAVED_AT_WIDTH = 116;

/**
 * Places a slot card's text and buttons. Empty cards have no timestamp, so pass `occupied: false`
 * to centre their two remaining lines.
 */
export function getPauseSaveSlotRowControlLayout(
  row: PauseSaveSlotRowLayout,
  occupied = true
): PauseSaveSlotRowControlLayout {
  const deleteX = row.x + row.width - PAUSE_OVERLAY_SLOT_BUTTON_WIDTH - SLOT_BUTTON_INSET;
  const loadX = deleteX - PAUSE_OVERLAY_SLOT_BUTTON_GAP - PAUSE_OVERLAY_SLOT_BUTTON_WIDTH;
  const saveX = loadX - PAUSE_OVERLAY_SLOT_BUTTON_GAP - PAUSE_OVERLAY_SLOT_BUTTON_WIDTH;
  const textX = row.x + SLOT_TEXT_INSET;
  const stacked = row.height >= STACKED_SLOT_ROW_HEIGHT;
  const buttonY = stacked
    ? row.y + row.height - PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT - 10
    : row.y + (row.height - PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT) / 2;
  const button = (x: number): SlotButtonRect => ({
    x,
    y: buttonY,
    width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
    height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
  });
  const band = (x: number, y: number, width: number, height: number): SlotTextBand => ({
    x,
    y,
    width,
    height,
    visible: true,
  });
  const hidden: SlotTextBand = { x: textX, y: row.y, width: 0, height: 0, visible: false };
  const buttons = { saveButton: button(saveX), loadButton: button(loadX), deleteButton: button(deleteX) };

  // Text column: the full card when stacked above the buttons, otherwise what is left beside them.
  const textWidth = stacked ? row.width - SLOT_TEXT_INSET * 2 : Math.max(0, saveX - textX - 10);
  if (textWidth < 40) {
    return { title: hidden, subtitle: hidden, savedAt: hidden, ...buttons };
  }

  // The timestamp shares a line with other text, right-aligned, whenever the column is wide enough.
  const savedAtFits = occupied && textWidth >= SAVED_AT_WIDTH * 2.4;
  const savedAtX = textX + textWidth - SAVED_AT_WIDTH;
  const besideSavedAt = savedAtFits ? textWidth - SAVED_AT_WIDTH - 10 : textWidth;

  if (stacked) {
    return {
      title: band(textX, row.y + 9, textWidth, 18),
      subtitle: band(textX, row.y + 29, besideSavedAt, 16),
      savedAt: savedAtFits ? band(savedAtX, row.y + 30, SAVED_AT_WIDTH, 14) : hidden,
      ...buttons,
    };
  }
  if (row.height < 42) {
    return {
      title: band(textX, row.y + (row.height - 18) / 2, besideSavedAt, 18),
      subtitle: hidden,
      savedAt: savedAtFits ? band(savedAtX, row.y + (row.height - 14) / 2, SAVED_AT_WIDTH, 14) : hidden,
      ...buttons,
    };
  }
  const titleY = row.y + row.height / 2 - 19;
  return {
    title: band(textX, titleY, besideSavedAt, 18),
    subtitle: band(textX, titleY + 20, textWidth, 16),
    savedAt: savedAtFits ? band(savedAtX, titleY + 2, SAVED_AT_WIDTH, 14) : hidden,
    ...buttons,
  };
}

/**
 * The panel is a single column: header (title + tabs), the active subview, one status line and the
 * footer actions. Its height is the sum of those bands, so it hugs its content at every size.
 */
export function getPauseOverlayLayout(scene: Phaser.Scene): PauseOverlayLayout {
  const viewport = getViewportLayout(scene);
  const panelWidth = Math.min(PAUSE_PANEL_MAX_WIDTH, Math.max(256, viewport.width - PAUSE_PANEL_MARGIN * 2));
  // Narrow panels stack their checkpoint cards, which needs more height before the roomy layout fits.
  const short =
    viewport.height <= PAUSE_BREAKPOINT_SHORT_HEIGHT ||
    (panelWidth < PAUSE_STACKED_CARDS_MAX_PANEL_WIDTH && viewport.height < PAUSE_STACKED_CARDS_MIN_HEIGHT);
  const pad = panelWidth < 300 ? 8 : short || panelWidth < 420 ? 14 : 28;
  const contentWidth = panelWidth - pad * 2;
  const contentX = viewport.centerX - contentWidth / 2;
  const availableHeight = viewport.height - 16;

  // Header: short viewports put the title beside the tabs when both fit on one line.
  const inlineHeader = short && contentWidth >= 400;
  const titleFontSize = short ? (inlineHeader ? 26 : 22) : panelWidth < 420 ? 40 : 52;
  const titleBand = inlineHeader ? 0 : short ? 30 : titleFontSize + 30;
  const tabHeight = short ? (inlineHeader ? 38 : 32) : 40;
  const tabWidth = inlineHeader ? 132 : Math.min(180, contentWidth / 2);
  const topPad = short ? 6 : 18;
  const tabToContentGap = short ? 8 : 16;

  const statusBand = short ? 24 : 36;
  const twoButtonsWidth = PAUSE_OVERLAY_BUTTON_WIDTH * 2 + PAUSE_OVERLAY_BUTTON_GAP;
  const buttonsStacked = panelWidth - 16 < twoButtonsWidth;
  const footerGap = short ? 6 : PAUSE_OVERLAY_BUTTON_GAP;
  const footerHeight = buttonsStacked ? PAUSE_OVERLAY_BUTTON_HEIGHT * 2 + footerGap : PAUSE_OVERLAY_BUTTON_HEIGHT;
  const keyHintVisible = !short && viewport.width >= PAUSE_KEY_HINT_MIN_WIDTH;
  const keyHintBand = keyHintVisible ? 26 : 0;
  const bottomPad = short ? 8 : keyHintVisible ? 14 : 22;
  const chromeHeight =
    topPad + titleBand + tabHeight + tabToContentGap + statusBand + footerHeight + keyHintBand + bottomPad;

  // Settings: two tier selectors above the music sliders.
  const settingsWidth = Math.min(PAUSE_SETTINGS_MAX_WIDTH, contentWidth);
  const settingsTwoColumns = viewport.width >= PAUSE_SETTINGS_TWO_COLUMN_MIN_WIDTH;
  const settingsColumnGap = short ? 12 : 16;
  const tierHeight = short ? 24 : 28;
  const tierPitch = short ? 32 : 40;
  const sliderPitch = SLIDER_ROW_HEIGHT + (short ? 4 : 8);
  const sliderRows = settingsTwoColumns ? 2 : 4;
  const tiersToSlidersGap = short ? 10 : 16;
  const settingsHeight =
    tierPitch + tierHeight + tiersToSlidersGap + sliderPitch * (sliderRows - 1) + SLIDER_ROW_HEIGHT;

  // Checkpoint cards: short viewports stretch them over whatever height the subview has.
  const slotGap = short ? 4 : 8;
  const roomForContent = availableHeight - chromeHeight;
  const slotHeight = short
    ? Math.max(32, Math.min(56, Math.floor((Math.min(settingsHeight, roomForContent) - slotGap * 2) / 3)))
    : panelWidth < PAUSE_STACKED_CARDS_MAX_PANEL_WIDTH
      ? STACKED_SLOT_ROW_HEIGHT
      : SIDE_BY_SIDE_SLOT_ROW_HEIGHT;
  const slotsHeight = slotHeight * 3 + slotGap * 2;

  const contentHeight = Math.max(slotsHeight, Math.min(settingsHeight, roomForContent));
  const panelHeight = chromeHeight + contentHeight;
  const panelX = centerHorizontally(viewport, panelWidth);
  const panelY = Math.max(viewport.top + 4, viewport.centerY - panelHeight / 2);

  const headerY = panelY + topPad;
  const tabY = headerY + titleBand;
  const tabsX = inlineHeader ? contentX + contentWidth - tabWidth * 2 : viewport.centerX - tabWidth;
  const contentY = tabY + tabHeight + tabToContentGap;
  const statusY = contentY + contentHeight + statusBand / 2;
  const footerY = contentY + contentHeight + statusBand;
  const footerLeft = viewport.centerX - (buttonsStacked ? PAUSE_OVERLAY_BUTTON_WIDTH : twoButtonsWidth) / 2;

  const settingsX = viewport.centerX - settingsWidth / 2;
  const sliderWidth = settingsTwoColumns
    ? Math.min(settingsWidth, (contentWidth - settingsColumnGap) / 2)
    : settingsWidth;
  const sliderLeftX = settingsTwoColumns ? viewport.centerX - sliderWidth - settingsColumnGap / 2 : settingsX;
  const sliderRightX = viewport.centerX + settingsColumnGap / 2;
  const slotsY = contentY + (contentHeight - slotsHeight) / 2;
  const settingsY = contentY + Math.max(0, (contentHeight - settingsHeight) / 2);
  const sliderY = settingsY + tierPitch + tierHeight + tiersToSlidersGap;

  return {
    left: viewport.left,
    top: viewport.top,
    width: viewport.width,
    height: viewport.height,
    centerX: viewport.centerX,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    titleFontSize,
    titleX: inlineHeader ? contentX : viewport.centerX,
    titleY: inlineHeader ? tabY + tabHeight / 2 : headerY + titleBand / 2,
    titleCentered: !inlineHeader,
    tabsX,
    tabY,
    tabWidth,
    tabHeight,
    tabRuleX: contentX,
    tabRuleWidth: contentWidth,
    slotRows: [0, 1, 2].map((index) => ({
      x: contentX,
      y: slotsY + index * (slotHeight + slotGap),
      width: contentWidth,
      height: slotHeight,
    })),
    statusX: viewport.centerX,
    statusY,
    statusWrapWidth: contentWidth,
    resumeButtonX: footerLeft,
    resumeButtonY: footerY,
    menuButtonX: buttonsStacked ? footerLeft : footerLeft + PAUSE_OVERLAY_BUTTON_WIDTH + PAUSE_OVERLAY_BUTTON_GAP,
    menuButtonY: buttonsStacked ? footerY + PAUSE_OVERLAY_BUTTON_HEIGHT + footerGap : footerY,
    buttonY: footerY,
    keyHintY: footerY + footerHeight + keyHintBand / 2 + 2,
    keyHintVisible,
    settingsLayout: {
      x: settingsX,
      width: settingsWidth,
      sliderWidth,
      difficultyY: settingsY,
      qualityY: settingsY + tierPitch,
      tierHeight,
      compact: short || panelWidth < 420,
      sliderPositions: settingsTwoColumns
        ? [
            { x: sliderLeftX, y: sliderY },
            { x: sliderRightX, y: sliderY },
            { x: sliderLeftX, y: sliderY + sliderPitch },
            { x: sliderRightX, y: sliderY + sliderPitch },
          ]
        : [0, 1, 2, 3].map((index) => ({ x: settingsX, y: sliderY + index * sliderPitch })),
    },
  };
}

/** Scrim that keeps the frozen battlefield legible, and the glass panel over it. */
export function drawPauseOverlayBackdrop(
  dimmer: Phaser.GameObjects.Graphics,
  panel: Phaser.GameObjects.Graphics,
  layout: PauseOverlayLayout
): void {
  dimmer.clear();
  dimmer.fillStyle(0x010409, 0.72);
  dimmer.fillRect(layout.left, layout.top, layout.width, layout.height);

  panel.clear();
  drawNeonFrame(panel, layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight, {
    accentColor: NEON.cyan,
    fillAlpha: 0.94,
    cornerCut: Math.min(22, layout.panelWidth * 0.05),
    glow: true,
  });
}
