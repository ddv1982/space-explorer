import Phaser from 'phaser';
import type { SaveSlotId, SaveSlotViewModel } from '@/systems/SaveSlotStorage';
import { createActionButtonControl, type ActionButtonControl } from '../../shared/actionButtonControl';
import { drawAngledRectPath, NEON, NEON_TEXT, neonLabelStyle, neonReadoutStyle } from '../../shared/neonUiTheme';
import { MIN_TOUCH_TARGET_PX } from '../../shared/touchTarget';
import { setSingleLineTextWithEllipsis } from '../../shared/textFit';
import {
  PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
  PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
  getPauseSaveSlotRowControlLayout,
} from './view';
import type { PauseOverlayState, PauseSaveSlotRowLayout } from './types';

interface PauseSaveSlotRow {
  chrome: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  subtitle: Phaser.GameObjects.Text;
  savedAt: Phaser.GameObjects.Text;
  saveButton: ActionButtonControl;
  loadButton: ActionButtonControl;
  deleteButton: ActionButtonControl;
  viewModel: SaveSlotViewModel | null;
  layout: PauseSaveSlotRowLayout;
}

export interface PauseSaveSlotRows {
  rows: PauseSaveSlotRow[];
  visible: boolean;
}

/** Glass card: lit and accented when it holds a checkpoint, recessed when empty. */
function drawSlotRowChrome(row: PauseSaveSlotRow): void {
  const { x, y, width, height } = row.layout;
  const occupied = row.viewModel?.occupied ?? false;
  const cut = Math.min(10, height * 0.22);

  row.chrome.clear();
  drawAngledRectPath(row.chrome, x, y, width, height, cut);
  row.chrome.fillStyle(occupied ? 0x0d2a4a : NEON.glass, occupied ? 0.78 : 0.34);
  row.chrome.fillPath();
  drawAngledRectPath(row.chrome, x, y, width, height, cut);
  row.chrome.lineStyle(1, occupied ? NEON.cyan : 0x6fb4e0, occupied ? 0.6 : 0.2);
  row.chrome.strokePath();
  if (occupied) {
    row.chrome.fillStyle(NEON.cyanBright, 0.95);
    row.chrome.fillRect(x, y + cut, 2, height - cut);
  }
}

/** Positions, fits and shows the card text; which lines exist depends on the card size and occupancy. */
function layoutPauseSaveSlotRowText(row: PauseSaveSlotRow, index: number, visible: boolean): void {
  const bands = getPauseSaveSlotRowControlLayout(row.layout, row.viewModel?.occupied ?? false);
  const lines = [
    { text: row.title, band: bands.title, value: row.viewModel?.title ?? `SLOT ${index + 1}` },
    { text: row.subtitle, band: bands.subtitle, value: row.viewModel?.subtitle ?? 'EMPTY' },
    { text: row.savedAt, band: bands.savedAt, value: row.viewModel?.savedAtLabel ?? '' },
  ];
  for (const { text, band, value } of lines) {
    text.setPosition(band.x, band.y);
    text.setVisible(visible && band.visible);
    setSingleLineTextWithEllipsis(text, value, band.width);
  }
}

/** Slot actions are all ghost controls: the panel's one solid button is RESUME. */
function createSlotButton(
  scene: Phaser.Scene,
  label: string,
  variant: 'secondary' | 'danger',
  onClick: () => void
): ActionButtonControl {
  return createActionButtonControl(scene, {
    label,
    width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
    height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
    hitHeight: MIN_TOUCH_TARGET_PX,
    onClick,
    variant,
    fontSize: '13px',
  });
}

export function createPauseSaveSlotRows(
  scene: Phaser.Scene,
  handlers: {
    onSaveSlot: (slotId: SaveSlotId) => void;
    onLoadSlot: (slotId: SaveSlotId) => void;
    onDeleteSlot: (slotId: SaveSlotId) => void;
  }
): PauseSaveSlotRows {
  const slotIds: SaveSlotId[] = ['slot-1', 'slot-2', 'slot-3'];

  return {
    visible: true,
    rows: slotIds.map<PauseSaveSlotRow>((slotId, index) => ({
      chrome: scene.add.graphics(),
      title: scene.add.text(0, 0, `SLOT ${index + 1}`, neonLabelStyle(15, NEON_TEXT.primary)),
      subtitle: scene.add.text(0, 0, 'EMPTY', neonLabelStyle(13, NEON_TEXT.secondary)),
      savedAt: scene.add.text(0, 0, '', neonReadoutStyle(12, NEON_TEXT.muted)),
      saveButton: createSlotButton(scene, 'SAVE', 'secondary', () => handlers.onSaveSlot(slotId)),
      loadButton: createSlotButton(scene, 'LOAD', 'secondary', () => handlers.onLoadSlot(slotId)),
      deleteButton: createSlotButton(scene, 'DEL', 'danger', () => handlers.onDeleteSlot(slotId)),
      viewModel: null,
      layout: { x: 0, y: 0, width: 300, height: 64 },
    })),
  };
}

export function setPauseSaveSlotRowsPosition(rows: PauseSaveSlotRows, layouts: PauseSaveSlotRowLayout[]): void {
  rows.rows.forEach((row, index) => {
    const layout = layouts[index];
    if (!layout) {
      return;
    }

    row.layout = layout;
    const controlLayout = getPauseSaveSlotRowControlLayout(layout);
    row.saveButton.setPosition(controlLayout.saveButton.x, controlLayout.saveButton.y);
    row.loadButton.setPosition(controlLayout.loadButton.x, controlLayout.loadButton.y);
    row.deleteButton.setPosition(controlLayout.deleteButton.x, controlLayout.deleteButton.y);
    layoutPauseSaveSlotRowText(row, index, rows.visible);
    drawSlotRowChrome(row);
  });
}

export function setPauseSaveSlotRowsState(rows: PauseSaveSlotRows, state: PauseOverlayState): void {
  rows.rows.forEach((row, index) => {
    const viewModel = state.saveSlots[index] ?? null;
    row.viewModel = viewModel;

    layoutPauseSaveSlotRowText(row, index, rows.visible);
    row.title.setColor(viewModel?.occupied ? NEON_TEXT.primary : NEON_TEXT.secondary);
    row.subtitle.setColor(viewModel?.occupied ? NEON_TEXT.cyan : NEON_TEXT.muted);

    row.saveButton.setEnabled(state.storageAvailable && state.canSave);
    row.loadButton.setEnabled(state.storageAvailable && Boolean(viewModel?.occupied));
    row.deleteButton.setEnabled(state.storageAvailable && Boolean(viewModel?.occupied));
    drawSlotRowChrome(row);
  });
}

export function setPauseSaveSlotRowsDepth(rows: PauseSaveSlotRows, depth: number): void {
  rows.rows.forEach((row) => {
    row.chrome.setDepth(depth);
    row.title.setDepth(depth + 1);
    row.subtitle.setDepth(depth + 1);
    row.savedAt.setDepth(depth + 1);
    row.saveButton.setDepth(depth + 2);
    row.loadButton.setDepth(depth + 2);
    row.deleteButton.setDepth(depth + 2);
  });
}

export function setPauseSaveSlotRowsVisible(rows: PauseSaveSlotRows, visible: boolean): void {
  rows.visible = visible;
  rows.rows.forEach((row, index) => {
    row.chrome.setVisible(visible);
    layoutPauseSaveSlotRowText(row, index, visible);
    row.saveButton.setVisible(visible);
    row.loadButton.setVisible(visible);
    row.deleteButton.setVisible(visible);
  });
}

export function destroyPauseSaveSlotRows(rows: PauseSaveSlotRows | null): void {
  rows?.rows.forEach((row) => {
    row.chrome.destroy();
    row.title.destroy();
    row.subtitle.destroy();
    row.savedAt.destroy();
    row.saveButton.destroy();
    row.loadButton.destroy();
    row.deleteButton.destroy();
  });
}
