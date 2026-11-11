import type { SaveSlotId, SaveSlotViewModel } from '@/systems/SaveSlotStorage';
import type { GameplayDifficultyTier } from '@/config/gameplayDifficulty';
import type { VisualQualityTier } from '@/config/visualQuality';

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
