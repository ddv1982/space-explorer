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

export type PauseSubview = 'checkpoints' | 'settings';

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
  titleX: number;
  titleY: number;
  /** False when the title sits left of the tabs on one header line. */
  titleCentered: boolean;
  /** Left edge of the first tab; the second follows directly. */
  tabsX: number;
  tabY: number;
  tabWidth: number;
  tabHeight: number;
  /** The hairline the tabs sit on spans the whole content column. */
  tabRuleX: number;
  tabRuleWidth: number;
  slotRows: PauseSaveSlotRowLayout[];
  statusX: number;
  statusY: number;
  statusWrapWidth: number;
  resumeButtonX: number;
  resumeButtonY: number;
  menuButtonX: number;
  menuButtonY: number;
  /** Top of the footer actions. */
  buttonY: number;
  keyHintY: number;
  keyHintVisible: boolean;
  settingsLayout: SettingsPanelLayout;
}
