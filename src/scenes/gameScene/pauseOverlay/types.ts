import type { SaveSlotId, SaveSlotViewModel } from '@/systems/SaveSlotStorage';
import type { GameplayDifficultyTier } from '@/config/gameplayDifficulty';
import type { VisualQualityTier } from '@/config/visualQuality';
import type { ShipSystems, ShipSystemSlot } from '@/config/shipSystems';

export interface PauseOverlayHandlers {
  onResume: () => void;
  onMainMenu: () => void;
  onSaveSlot: (slotId: SaveSlotId) => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
  onSelectDifficulty: (tier: GameplayDifficultyTier) => boolean;
  onSelectQuality: (tier: VisualQualityTier) => boolean;
  onCycleSystem: (slot: ShipSystemSlot) => void;
}

export interface PauseOverlayState {
  visible: boolean;
  canResume: boolean;
  canSave: boolean;
  storageAvailable: boolean;
  saveSlots: SaveSlotViewModel[];
  /** The run's ship systems; the SYSTEMS tab shows only when one is picked. */
  systems: ShipSystems;
  statusMessage: string;
  statusOk?: boolean;
}

export type PauseSubview = 'checkpoints' | 'systems' | 'settings';
