import Phaser from 'phaser';
import { centerHorizontally, getViewportLayout } from '@/utils/layout';
import { drawNeonDivider, drawNeonFrame, NEON } from '../../shared/neonUiTheme';
import type { PauseOverlayLayout, PauseOverlayMessage, PauseOverlayState } from './types';

const PAUSE_OVERLAY_PANEL_WIDTH = 940;
const PAUSE_OVERLAY_PANEL_HEIGHT = 700;
const PAUSE_OVERLAY_COMPACT_PANEL_WIDTH = 540;
const PAUSE_OVERLAY_COMPACT_PANEL_HEIGHT = 620;
export const PAUSE_OVERLAY_BUTTON_WIDTH = 150;
export const PAUSE_OVERLAY_BUTTON_HEIGHT = 52;
const PAUSE_OVERLAY_BUTTON_GAP = 22;
export const PAUSE_OVERLAY_SLOT_BUTTON_WIDTH = 68;
export const PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT = 30;
export const PAUSE_OVERLAY_SLOT_BUTTON_GAP = 8;
export const PAUSE_OVERLAY_SLOT_ROW_HEIGHT = 72;
export const PAUSE_OVERLAY_SLIDER_WIDTH = 500;
export const PAUSE_OVERLAY_SLIDER_SPACING = 68;

const PAUSE_BREAKPOINT_NARROW_WIDTH = 720;
const PAUSE_BREAKPOINT_SHORT_HEIGHT = 520;
const PAUSE_BREAKPOINT_VERY_SHORT_HEIGHT = 400;
const PAUSE_BREAKPOINT_ULTRA_COMPACT_WIDTH = 340;
const PAUSE_BREAKPOINT_ULTRA_COMPACT_HEIGHT = 380;

interface PauseSaveSlotRowControlLayout {
  title: { x: number; y: number; width: number; height: number; visible: boolean };
  subtitle: { x: number; y: number; width: number; height: number; visible: boolean };
  savedAt: { x: number; y: number; width: number; height: number; visible: boolean };
  saveButton: { x: number; y: number; width: number; height: number };
  loadButton: { x: number; y: number; width: number; height: number };
  deleteButton: { x: number; y: number; width: number; height: number };
}

export function getPauseSaveSlotRowControlLayout(row: PauseOverlayLayout['slotRows'][number]): PauseSaveSlotRowControlLayout {
  const deleteX = row.x + row.width - PAUSE_OVERLAY_SLOT_BUTTON_WIDTH - 10;
  const loadX = deleteX - PAUSE_OVERLAY_SLOT_BUTTON_GAP - PAUSE_OVERLAY_SLOT_BUTTON_WIDTH;
  const saveX = loadX - PAUSE_OVERLAY_SLOT_BUTTON_GAP - PAUSE_OVERLAY_SLOT_BUTTON_WIDTH;
  const compactRow = row.height < 60;
  const ultraCompactRow = row.height <= 40;
  const narrowRow = row.width < 300;
  const textX = row.x + 14;

  if (narrowRow) {
    const buttonY = row.y + Math.max(4, Math.floor((row.height - PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT) / 2));
    const titleY = buttonY + PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT + 6;
    const titleVisible = !ultraCompactRow && titleY + 14 <= row.y + row.height - 6;

    return {
      title: { x: textX, y: titleY, width: 56, height: 14, visible: titleVisible },
      subtitle: { x: textX, y: titleY, width: 0, height: 0, visible: false },
      savedAt: { x: textX, y: titleY, width: 0, height: 0, visible: false },
      saveButton: { x: saveX, y: buttonY, width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT },
      loadButton: { x: loadX, y: buttonY, width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT },
      deleteButton: { x: deleteX, y: buttonY, width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT },
    };
  }

  const buttonY = row.y + row.height - PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT - 8;
  const availableTextWidth = Math.max(0, saveX - textX - 8);

  return {
    title: { x: textX, y: row.y + (ultraCompactRow ? 12 : compactRow ? 7 : 10), width: availableTextWidth, height: 14, visible: true },
    subtitle: { x: textX, y: row.y + (compactRow ? 24 : 30), width: availableTextWidth, height: 12, visible: !ultraCompactRow },
    savedAt: { x: textX, y: row.y + (compactRow ? 39 : 51), width: availableTextWidth, height: 10, visible: !ultraCompactRow },
    saveButton: { x: saveX, y: buttonY, width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT },
    loadButton: { x: loadX, y: buttonY, width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT },
    deleteButton: { x: deleteX, y: buttonY, width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH, height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT },
  };
}

function isPauseShortViewport(height: number): boolean {
  return height < PAUSE_BREAKPOINT_SHORT_HEIGHT;
}

function isPauseVeryShortViewport(height: number): boolean {
  return height < PAUSE_BREAKPOINT_VERY_SHORT_HEIGHT;
}

function isPauseNarrowViewport(width: number): boolean {
  return width < PAUSE_BREAKPOINT_NARROW_WIDTH;
}

function isPauseUltraCompactViewport(width: number, height: number): boolean {
  return width <= PAUSE_BREAKPOINT_ULTRA_COMPACT_WIDTH && height <= PAUSE_BREAKPOINT_ULTRA_COMPACT_HEIGHT;
}

export function getPauseOverlayLayout(scene: Phaser.Scene): PauseOverlayLayout {
  const viewport = getViewportLayout(scene);
  const shortViewport = isPauseShortViewport(viewport.height);
  const veryShortViewport = isPauseVeryShortViewport(viewport.height);
  const compact = isPauseNarrowViewport(viewport.width);
  const stackedLayout = compact || shortViewport;
  const ultraCompactViewport = isPauseUltraCompactViewport(viewport.width, viewport.height);
  const safeViewportWidth = Math.max(280, viewport.width);
  const widePanelWidth = Math.min(PAUSE_OVERLAY_PANEL_WIDTH, safeViewportWidth - 32);
  const panelWidth = stackedLayout
    ? Math.min(PAUSE_OVERLAY_COMPACT_PANEL_WIDTH, safeViewportWidth - 24)
    : Math.min(PAUSE_OVERLAY_PANEL_WIDTH, safeViewportWidth - 24, widePanelWidth);
  const panelHeight = Math.min(shortViewport ? PAUSE_OVERLAY_PANEL_HEIGHT : compact ? PAUSE_OVERLAY_COMPACT_PANEL_HEIGHT : PAUSE_OVERLAY_PANEL_HEIGHT, viewport.height - 24);
  const panelX = centerHorizontally(viewport, panelWidth);
  const panelY = viewport.centerY - panelHeight / 2;
  const panelBottom = panelY + panelHeight;
  const contentInset = ultraCompactViewport ? 12 : shortViewport ? 22 : 42;
  const contentLeft = panelX + contentInset;
  const contentRight = stackedLayout ? contentLeft : panelX + Math.max(410, panelWidth - 350);
  const desktopMusicColumnWidth = stackedLayout ? 0 : Math.max(0, contentRight - contentLeft - 24);
  const totalButtonsWidth = PAUSE_OVERLAY_BUTTON_WIDTH * 4 + PAUSE_OVERLAY_BUTTON_GAP * 3;
  const twoButtonsWidth = PAUSE_OVERLAY_BUTTON_WIDTH * 2 + PAUSE_OVERLAY_BUTTON_GAP;
  const actionButtonsVisible = !stackedLayout && !shortViewport && panelWidth >= totalButtonsWidth + 48;
  const buttonsStacked = panelWidth < twoButtonsWidth + (shortViewport ? 16 : 48);
  const musicVisible = !stackedLayout && !veryShortViewport && desktopMusicColumnWidth >= PAUSE_OVERLAY_SLIDER_WIDTH;
  const saveSlotsVisible = true;
  const footerBottomMargin = ultraCompactViewport ? 4 : buttonsStacked ? 10 : shortViewport ? 6 : 36;
  const footerButtonGap = ultraCompactViewport ? 6 : PAUSE_OVERLAY_BUTTON_GAP;
  const menuButtonY = panelBottom - PAUSE_OVERLAY_BUTTON_HEIGHT - footerBottomMargin;
  const footerTop = buttonsStacked
    ? menuButtonY - footerButtonGap - PAUSE_OVERLAY_BUTTON_HEIGHT
    : menuButtonY;
  const resumeButtonY = footerTop;
  const statusTextHeight = 20;
  const statusY = footerTop - 8 - statusTextHeight / 2;
  const slotRowHeight = ultraCompactViewport || veryShortViewport
    ? 38
    : buttonsStacked
      ? (shortViewport ? 44 : PAUSE_OVERLAY_SLOT_ROW_HEIGHT)
      : shortViewport ? 44 : PAUSE_OVERLAY_SLOT_ROW_HEIGHT;
  const slotRowGap = ultraCompactViewport || veryShortViewport ? 2 : buttonsStacked || shortViewport ? 4 : 10;
  const splitColumns = !stackedLayout && musicVisible;
  const slotRowWidth = stackedLayout || !splitColumns
    ? panelWidth - contentInset * 2
    : Math.min(310, panelX + panelWidth - contentRight - 42);
  const slotBlockHeight = slotRowHeight * 3 + slotRowGap * 2;
  const titleFontSize = veryShortViewport ? 64 : shortViewport ? 72 : 86;
  const subtitleFontSize = veryShortViewport ? 14 : 16;
  const hintFontSize = veryShortViewport ? 12 : 14;
  const titleY = panelY + (veryShortViewport ? 60 : shortViewport ? 38 : 96);
  const baseSubtitleY = panelY + (veryShortViewport ? 94 : shortViewport ? 72 : 176);
  const baseHintY = panelY + (veryShortViewport ? 118 : shortViewport ? 96 : 216);
  let musicHeaderY = panelY + (shortViewport ? 96 : compact ? 148 : 252);
  let sliderStartY = panelY + (shortViewport ? 126 : compact ? 176 : 284);
  const desiredSlotStartY = stackedLayout
    ? panelY + (ultraCompactViewport ? 68 : veryShortViewport ? 104 : shortViewport ? 118 : 170)
    : splitColumns
      ? panelY + 286
      : panelY + 198;
  const earliestSlotStartY = panelY + (ultraCompactViewport ? 34 : veryShortViewport ? 36 : shortViewport ? 24 : stackedLayout ? 130 : 150);
  const latestSlotStartY = statusY - statusTextHeight / 2 - 8 - slotBlockHeight;

  let subtitleVisible = !ultraCompactViewport && !veryShortViewport;
  let hintVisible = !ultraCompactViewport && !veryShortViewport;
  let subtitleY = baseSubtitleY;
  let hintY = baseHintY;
  const textToSlotsGap = stackedLayout ? 10 : 14;

  const getTopBandBottom = (): number => {
    if (hintVisible) {
      return hintY + 12;
    }
    if (subtitleVisible) {
      return subtitleY + 12;
    }
    return titleY + 26;
  };

  const recomputeTextBand = (): number => {
    const topBandBottomLimit = latestSlotStartY - textToSlotsGap;

    if (subtitleVisible) {
      const minSubtitleY = titleY + 20;
      const subtitleBottomLimit = topBandBottomLimit - (hintVisible ? 24 : 10);
      subtitleY = Math.max(minSubtitleY, Math.min(baseSubtitleY, subtitleBottomLimit));
    }

    if (hintVisible) {
      const minHintY = subtitleVisible ? subtitleY + 18 : titleY + 24;
      const hintBottomLimit = topBandBottomLimit - 2;
      hintY = Math.max(minHintY, Math.min(baseHintY, hintBottomLimit));
    }

    return Math.max(earliestSlotStartY, getTopBandBottom() + textToSlotsGap);
  };

  let minimumSlotStartY = recomputeTextBand();
  if (minimumSlotStartY > latestSlotStartY && hintVisible) {
    hintVisible = false;
    hintY = baseHintY;
    minimumSlotStartY = recomputeTextBand();
  }
  if (minimumSlotStartY > latestSlotStartY && subtitleVisible) {
    subtitleVisible = false;
    subtitleY = baseSubtitleY;
    minimumSlotStartY = recomputeTextBand();
  }

  minimumSlotStartY = Math.min(minimumSlotStartY, latestSlotStartY);
  const slotStartY = Math.max(minimumSlotStartY, Math.min(desiredSlotStartY, latestSlotStartY));

  let saveHeaderY = slotStartY - (stackedLayout ? (ultraCompactViewport ? 16 : veryShortViewport ? 18 : 22) : splitColumns ? 34 : 28);
  saveHeaderY = Math.min(saveHeaderY, slotStartY - (splitColumns ? 28 : 20));
  if (splitColumns) {
    saveHeaderY = Math.min(musicHeaderY, saveHeaderY);
  }
  if (splitColumns) {
    musicHeaderY = saveHeaderY;
    sliderStartY = musicHeaderY + 36;
  }

  const slotX = splitColumns ? contentRight : contentLeft;
  const sliderWidth = Math.min(
    PAUSE_OVERLAY_SLIDER_WIDTH,
    stackedLayout ? panelWidth - contentInset * 2 : desktopMusicColumnWidth
  );
  const sliderX = stackedLayout ? panelX + (panelWidth - sliderWidth) / 2 : contentLeft;
  const actionStartX = panelX + (panelWidth - totalButtonsWidth) / 2;
  const compactResumeX = buttonsStacked ? viewport.centerX - PAUSE_OVERLAY_BUTTON_WIDTH / 2 : viewport.centerX - twoButtonsWidth / 2;
  const compactMenuX = buttonsStacked
    ? viewport.centerX - PAUSE_OVERLAY_BUTTON_WIDTH / 2
    : viewport.centerX - twoButtonsWidth / 2 + PAUSE_OVERLAY_BUTTON_WIDTH + PAUSE_OVERLAY_BUTTON_GAP;

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
    subtitleFontSize,
    hintFontSize,
    titleY,
    subtitleY,
    subtitleVisible,
    hintY,
    hintVisible,
    musicHeaderX: contentLeft,
    musicHeaderY,
    musicVisible,
    saveSlotsVisible,
    actionButtonsVisible,
    sliderX,
    sliderStartY,
    saveHeaderX: slotX,
    saveHeaderY,
    slotRows: [0, 1, 2].map((index) => ({
      x: slotX,
      y: slotStartY + index * (slotRowHeight + slotRowGap),
      width: slotRowWidth,
      height: slotRowHeight,
    })),
    statusX: viewport.centerX,
    statusY,
    resumeButtonX: actionButtonsVisible ? actionStartX : compactResumeX,
    resumeButtonY,
    saveButtonX: actionStartX + PAUSE_OVERLAY_BUTTON_WIDTH + PAUSE_OVERLAY_BUTTON_GAP,
    saveButtonY: footerTop,
    loadButtonX: actionStartX + (PAUSE_OVERLAY_BUTTON_WIDTH + PAUSE_OVERLAY_BUTTON_GAP) * 2,
    loadButtonY: footerTop,
    menuButtonX: actionButtonsVisible ? actionStartX + (PAUSE_OVERLAY_BUTTON_WIDTH + PAUSE_OVERLAY_BUTTON_GAP) * 3 : compactMenuX,
    menuButtonY,
    buttonY: footerTop,
  };
}

export function drawPauseOverlayBackdrop(
  dimmer: Phaser.GameObjects.Graphics,
  panel: Phaser.GameObjects.Graphics,
  layout: PauseOverlayLayout
): void {
  dimmer.clear();
  dimmer.fillStyle(0x00030a, 0.86);
  dimmer.fillRect(layout.left, layout.top, layout.width, layout.height);
  dimmer.fillStyle(0x071b35, 0.2);
  dimmer.fillRect(layout.left, layout.top, layout.width, layout.height * 0.26);
  dimmer.lineStyle(1, 0x17314d, 0.22);
  const scanlineStep = 22;
  for (let y = layout.top; y < layout.top + layout.height; y += scanlineStep) {
    dimmer.lineBetween(layout.left, y, layout.left + layout.width, y);
  }

  panel.clear();
  drawNeonFrame(panel, layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight, {
    accentColor: NEON.cyan,
    fillAlpha: 0.9,
    strokeAlpha: 0.94,
    cornerCut: 32,
    glow: true,
  });

  drawNeonDivider(panel, layout.centerX, Math.max(layout.panelY + 24, layout.titleY - 48), Math.min(620, layout.panelWidth - 160));
  if (layout.hintVisible) {
    drawNeonDivider(
      panel,
      layout.centerX,
      Math.min(layout.saveHeaderY - 16, layout.hintY + 24),
      Math.min(520, layout.panelWidth - 180)
    );
  }
  drawNeonDivider(panel, layout.centerX, layout.buttonY - 28, Math.min(540, layout.panelWidth - 160));

  panel.fillStyle(0x0e2b45, 0.35);
  panel.fillRect(layout.panelX + 18, layout.panelY + 12, layout.panelWidth - 36, 1);
  panel.fillRect(layout.panelX + 18, layout.panelY + layout.panelHeight - 13, layout.panelWidth - 36, 1);
}

export function getPauseOverlayMessage(state: PauseOverlayState): PauseOverlayMessage {
  if (state.orientationBlocked) {
    return {
      title: 'PAUSED',
      subtitle: 'ORIENTATION LOCK ENGAGED',
      hint: 'Rotate to landscape to resume, or manage checkpoint slots while paused.',
      resumeLabel: '!!\nROTATE',
    };
  }

  return {
    title: 'PAUSED',
    subtitle: 'Press ESC or tap RESUME to continue.',
    hint: 'Tune music + volume for this run.',
    resumeLabel: '▶\nRESUME',
  };
}
