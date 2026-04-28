import type { SaveSlotId, SaveSlotViewModel } from '@/systems/SaveSlotStorage';

export interface PauseOverlayHandlers {
  onResume: () => void;
  onMainMenu: () => void;
  onSaveSlot: (slotId: SaveSlotId) => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
}

export interface PauseOverlayState {
  visible: boolean;
  orientationBlocked: boolean;
  canResume: boolean;
  canSave: boolean;
  storageAvailable: boolean;
  saveSlots: SaveSlotViewModel[];
  statusMessage: string;
  statusOk?: boolean;
}

export interface PauseOverlayMessage {
  title: string;
  subtitle: string;
  hint: string;
  resumeLabel: string;
}

export interface PauseSaveSlotRowLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PauseOverlayLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  titleFontSize: number;
  subtitleFontSize: number;
  hintFontSize: number;
  titleY: number;
  subtitleY: number;
  subtitleVisible: boolean;
  hintY: number;
  hintVisible: boolean;
  musicHeaderX: number;
  musicHeaderY: number;
  musicVisible: boolean;
  saveSlotsVisible: boolean;
  actionButtonsVisible: boolean;
  sliderX: number;
  sliderStartY: number;
  saveHeaderX: number;
  saveHeaderY: number;
  slotRows: PauseSaveSlotRowLayout[];
  statusX: number;
  statusY: number;
  resumeButtonX: number;
  resumeButtonY: number;
  saveButtonX: number;
  saveButtonY: number;
  loadButtonX: number;
  loadButtonY: number;
  menuButtonX: number;
  menuButtonY: number;
  buttonY: number;
}
