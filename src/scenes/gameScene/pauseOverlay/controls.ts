import Phaser from 'phaser';
import type { SaveSlotId, SaveSlotViewModel } from '../../../systems/SaveSlotStorage';
import { createActionButtonControl, type ActionButtonControl } from '../../shared/actionButtonControl';
import { setSingleLineTextWithEllipsis } from '../../shared/textFit';
import {
  PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
  PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
  PAUSE_OVERLAY_SLOT_ROW_HEIGHT,
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
}

function drawSlotRowChrome(row: PauseSaveSlotRow): void {
  const { x, y, width } = row.layout;
  const occupied = row.viewModel?.occupied ?? false;
  const accent = occupied ? 0x5fe7ff : 0x4c6078;
  const height = row.layout.height;

  row.chrome.clear();
  row.chrome.fillStyle(occupied ? 0x071d31 : 0x07111d, occupied ? 0.82 : 0.55);
  row.chrome.fillRoundedRect(x, y, width, height, 6);
  row.chrome.lineStyle(1, accent, occupied ? 0.85 : 0.45);
  row.chrome.strokeRoundedRect(x, y, width, height, 6);
}

function fitPauseSaveSlotRowText(row: PauseSaveSlotRow): void {
  const controlLayout = getPauseSaveSlotRowControlLayout(row.layout);

  setSingleLineTextWithEllipsis(
    row.title,
    row.viewModel?.title ?? row.title.text,
    controlLayout.title.visible ? controlLayout.title.width : 0,
    'SLOT'
  );
  setSingleLineTextWithEllipsis(
    row.subtitle,
    row.viewModel?.subtitle ?? row.subtitle.text,
    controlLayout.subtitle.visible ? controlLayout.subtitle.width : 0,
    'EMPTY'
  );
  setSingleLineTextWithEllipsis(
    row.savedAt,
    row.viewModel?.savedAtLabel || row.savedAt.text,
    controlLayout.savedAt.visible ? controlLayout.savedAt.width : 0,
    'NO CHECKPOINT'
  );
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
    rows: slotIds.map((slotId, index) => ({
      chrome: scene.add.graphics(),
      title: scene.add.text(0, 0, `SLOT ${index + 1}`, {
        fontSize: '14px',
        color: '#e9f8ff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }),
      subtitle: scene.add.text(0, 0, 'EMPTY', {
        fontSize: '12px',
        color: '#9eb9d3',
        fontFamily: 'monospace',
      }),
      savedAt: scene.add.text(0, 0, 'NO CHECKPOINT', {
        fontSize: '10px',
        color: '#6f8aa6',
        fontFamily: 'monospace',
      }),
      saveButton: createActionButtonControl(scene, {
        label: '+ SAVE',
        width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
        height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
        onClick: () => handlers.onSaveSlot(slotId),
        variant: 'primary',
        fontSize: '11px',
      }),
      loadButton: createActionButtonControl(scene, {
        label: '> LOAD',
        width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
        height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
        onClick: () => handlers.onLoadSlot(slotId),
        variant: 'secondary',
        fontSize: '11px',
      }),
      deleteButton: createActionButtonControl(scene, {
        label: 'X DEL',
        width: PAUSE_OVERLAY_SLOT_BUTTON_WIDTH,
        height: PAUSE_OVERLAY_SLOT_BUTTON_HEIGHT,
        onClick: () => handlers.onDeleteSlot(slotId),
        variant: 'danger',
        fontSize: '11px',
      }),
      viewModel: null,
      layout: { x: 0, y: 0, width: 300, height: PAUSE_OVERLAY_SLOT_ROW_HEIGHT },
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
    row.title.setPosition(controlLayout.title.x, controlLayout.title.y);
    row.subtitle.setPosition(controlLayout.subtitle.x, controlLayout.subtitle.y);
    row.savedAt.setPosition(controlLayout.savedAt.x, controlLayout.savedAt.y);
    row.title.setVisible(controlLayout.title.visible);
    row.subtitle.setVisible(controlLayout.subtitle.visible);
    row.savedAt.setVisible(controlLayout.savedAt.visible);
    row.saveButton.setPosition(controlLayout.saveButton.x, controlLayout.saveButton.y);
    row.loadButton.setPosition(controlLayout.loadButton.x, controlLayout.loadButton.y);
    row.deleteButton.setPosition(controlLayout.deleteButton.x, controlLayout.deleteButton.y);
    fitPauseSaveSlotRowText(row);
    drawSlotRowChrome(row);
  });
}

export function setPauseSaveSlotRowsState(rows: PauseSaveSlotRows, state: PauseOverlayState): void {
  rows.rows.forEach((row, index) => {
    const viewModel = state.saveSlots[index] ?? null;
    row.viewModel = viewModel;

    row.title.setText(viewModel?.title ?? `SLOT ${index + 1}`);
    row.subtitle.setText(viewModel?.subtitle ?? 'EMPTY');
    row.savedAt.setText(viewModel?.savedAtLabel || 'NO CHECKPOINT');
    fitPauseSaveSlotRowText(row);
    row.title.setColor(viewModel?.occupied ? '#f4feff' : '#aeb9c6');
    row.subtitle.setColor(viewModel?.occupied ? '#b7dcff' : '#77869a');
    row.savedAt.setColor(viewModel?.occupied ? '#6ff3ff' : '#647386');

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
  rows.rows.forEach((row) => {
    const controlLayout = getPauseSaveSlotRowControlLayout(row.layout);
    row.chrome.setVisible(visible);
    row.title.setVisible(visible && controlLayout.title.visible);
    row.subtitle.setVisible(visible && controlLayout.subtitle.visible);
    row.savedAt.setVisible(visible && controlLayout.savedAt.visible);
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
