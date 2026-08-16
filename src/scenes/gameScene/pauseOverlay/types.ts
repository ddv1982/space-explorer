import type { SaveSlotId, SaveSlotViewModel } from '@/systems/SaveSlotStorage';
import type { GameplayDifficultyTier } from '@/config/gameplayDifficulty';
import type { VisualQualityTier } from '@/config/visualQuality';
import type { SettingsPanelLayout } from '../../shared/settingsPanel';

export interface PauseOverlayHandlers {
  onResume: () => void;
  onMainMenu: () => void;
  onSaveSlot: (slotId: SaveSlotId) => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
  onSelectDifficulty: (tier: GameplayDifficultyTier) => boolean;
  onSelectQuality: (tier: VisualQualityTier) => boolean;
}

export interface PauseOverlayState {
  visible: boolean;
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
  checkpointHint: string;
  settingsHint: string;
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
  saveSlotsVisible: boolean;
  saveHeaderVisible: boolean;
  saveHeaderX: number;
  saveHeaderY: number;
  slotRows: PauseSaveSlotRowLayout[];
  statusX: number;
  statusY: number;
  resumeButtonX: number;
  resumeButtonY: number;
  menuButtonX: number;
  menuButtonY: number;
  buttonY: number;
  checkpointTabX: number;
  settingsTabX: number;
  tabY: number;
  tabWidth: number;
  tabHeight: number;
  settingsLayout: SettingsPanelLayout;
}
