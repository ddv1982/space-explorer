import type Phaser from 'phaser';
import { noteRunDifficulty } from '@/systems/PlayerState';
import { NO_SHIP_SYSTEMS, type ShipSystems, type ShipSystemSlot } from '@/config/shipSystems';
import { setGameplayDifficultyTier, type GameplayDifficultyTier } from '@/config/gameplayDifficulty';
import { setVisualQualityTier, type VisualQualityTier } from '@/config/visualQuality';
import { createArmingAction } from '@/systems/armingAction';
import { audioManager } from '@/systems/AudioManager';
import type { SaveSlotId, SaveSlotViewModel } from '@/systems/SaveSlotStorage';
import { PauseOverlay } from './PauseOverlay';
import type { PauseOverlayHandlers, PauseOverlayState } from './pauseOverlay/types';

type SaveSlotActionResult = { ok: true; message: string } | { ok: false; message: string };

export interface PauseSaveSlotAdapter {
  isAvailable: () => boolean;
  list: () => SaveSlotViewModel[];
  save: (slotId: SaveSlotId) => SaveSlotActionResult;
  load: (slotId: SaveSlotId) => SaveSlotActionResult;
  delete: (slotId: SaveSlotId) => SaveSlotActionResult;
  canSave: () => boolean;
}

/** The run's current ship systems, which the pause panel shows and can cycle. */
export interface PauseShipSystemsPort {
  getSystems: () => ShipSystems;
  cycleSystem: (slot: ShipSystemSlot) => void;
  /** True from sector 3, where the swap key borrows a special gun. */
  hasSpecialGuns: () => boolean;
}

interface PauseOverlayPort {
  setState(nextState: Partial<PauseOverlayState>): void;
  destroy(): void;
}

interface PauseStateControllerConfig {
  scene: Phaser.Scene;
  stopPlayerMotion: () => void;
  setMobileControlsBlocked: (blocked: boolean) => void;
  onReturnToMenu: () => void;
  saveSlotAdapter?: PauseSaveSlotAdapter;
  shipSystems?: PauseShipSystemsPort;
  createOverlay?: (scene: Phaser.Scene, handlers: PauseOverlayHandlers) => PauseOverlayPort;
  playClick?: () => void;
  setAudioPaused?: (paused: boolean) => void;
}

const createUnavailableSaveSlotAdapter = (): PauseSaveSlotAdapter => ({
  isAvailable: () => false,
  list: () => [],
  save: () => ({ ok: false, message: 'Checkpoint storage unavailable.' }),
  load: () => ({ ok: false, message: 'Checkpoint storage unavailable.' }),
  delete: () => ({ ok: false, message: 'Checkpoint storage unavailable.' }),
  canSave: () => false,
});

export class PauseStateController {
  private scene: Phaser.Scene | null = null;
  private pauseOverlay: PauseOverlayPort | null = null;
  private stopPlayerMotion: (() => void) | null = null;
  private setMobileControlsBlocked: ((blocked: boolean) => void) | null = null;
  private onReturnToMenu: (() => void) | null = null;
  private saveSlotAdapter: PauseSaveSlotAdapter = createUnavailableSaveSlotAdapter();
  private shipSystems: PauseShipSystemsPort | null = null;
  private playClick: (() => void) | null = null;
  private setAudioPaused: ((paused: boolean) => void) | null = null;

  private manualPauseRequested = false;
  private gameplayPaused = false;
  private statusMessage = '';
  private statusOk = true;
  private readonly deleteArm = createArmingAction<SaveSlotId>((slotId) => {
    this.completeDeleteSlot(slotId);
  });

  static create(config: PauseStateControllerConfig): PauseStateController {
    return new PauseStateController().create(config);
  }

  create(config: PauseStateControllerConfig): this {
    this.destroy();

    this.scene = config.scene;
    this.stopPlayerMotion = config.stopPlayerMotion;
    this.setMobileControlsBlocked = config.setMobileControlsBlocked;
    this.onReturnToMenu = config.onReturnToMenu;
    this.saveSlotAdapter = config.saveSlotAdapter ?? createUnavailableSaveSlotAdapter();
    this.shipSystems = config.shipSystems ?? null;
    this.playClick = config.playClick ?? (() => audioManager.playUi());
    this.setAudioPaused = config.setAudioPaused ?? ((paused) => audioManager.setPaused('gameplay', paused));

    this.manualPauseRequested = false;
    this.gameplayPaused = false;
    this.statusMessage = '';
    this.statusOk = true;
    this.deleteArm.cancel();

    const createOverlay =
      config.createOverlay ??
      ((scene: Phaser.Scene, handlers: PauseOverlayHandlers) => PauseOverlay.create(scene, handlers));
    this.pauseOverlay = createOverlay(config.scene, {
      onResume: () => this.handlePauseResumeRequested(),
      onMainMenu: () => this.handleMainMenuRequested(),
      onSaveSlot: (slotId) => this.handleSaveSlotRequested(slotId),
      onLoadSlot: (slotId) => this.handleLoadSlotRequested(slotId),
      onDeleteSlot: (slotId) => this.handleDeleteSlotRequested(slotId),
      onSelectDifficulty: (tier) => this.handleDifficultyRequested(tier),
      onSelectQuality: (tier) => this.handleQualityRequested(tier),
      onCycleSystem: (slot) => this.handleCycleSystemRequested(slot),
    });

    this.syncGameplayPauseState();

    return this;
  }

  destroy(): void {
    if (this.gameplayPaused) {
      this.setAudioPaused?.(false);
    }
    this.pauseOverlay?.destroy();

    this.pauseOverlay = null;
    this.scene = null;
    this.stopPlayerMotion = null;
    this.setMobileControlsBlocked = null;
    this.onReturnToMenu = null;
    this.saveSlotAdapter = createUnavailableSaveSlotAdapter();
    this.shipSystems = null;
    this.playClick = null;
    this.setAudioPaused = null;
    this.manualPauseRequested = false;
    this.gameplayPaused = false;
    this.statusMessage = '';
    this.statusOk = true;
    this.deleteArm.cancel();
  }

  isGameplayPaused(): boolean {
    return this.gameplayPaused;
  }

  togglePauseRequest(gameplayLocked: boolean): void {
    if (gameplayLocked) {
      return;
    }

    this.manualPauseRequested = !this.manualPauseRequested;
    if (this.manualPauseRequested) {
      this.statusMessage = '';
      this.statusOk = true;
    }
    this.playClick?.();
    this.syncGameplayPauseState();
  }

  private handlePauseResumeRequested(): void {
    if (!this.manualPauseRequested) {
      return;
    }

    this.playClick?.();
    this.manualPauseRequested = false;
    this.statusMessage = '';
    this.syncGameplayPauseState();
  }

  private handleMainMenuRequested(): void {
    this.playClick?.();
    this.onReturnToMenu?.();
  }

  private handleSaveSlotRequested(slotId: SaveSlotId): void {
    this.playClick?.();

    if (!this.saveSlotAdapter.isAvailable()) {
      this.statusMessage = 'Checkpoint storage unavailable.';
      this.statusOk = false;
      this.syncGameplayPauseState();
      return;
    }

    if (!this.saveSlotAdapter.canSave()) {
      this.statusMessage = 'Cannot save during transitions or while the ship is offline.';
      this.statusOk = false;
      this.syncGameplayPauseState();
      return;
    }

    const result = this.saveSlotAdapter.save(slotId);
    this.statusMessage = result.message;
    this.statusOk = result.ok;
    this.syncGameplayPauseState();
  }

  private handleLoadSlotRequested(slotId: SaveSlotId): void {
    this.playClick?.();

    if (!this.saveSlotAdapter.isAvailable()) {
      this.statusMessage = 'Checkpoint storage unavailable.';
      this.statusOk = false;
      this.syncGameplayPauseState();
      return;
    }

    const result = this.saveSlotAdapter.load(slotId);
    this.statusMessage = result.message;
    this.statusOk = result.ok;
    this.syncGameplayPauseState();
  }

  private handleDeleteSlotRequested(slotId: SaveSlotId): void {
    this.playClick?.();

    if (!this.saveSlotAdapter.isAvailable()) {
      this.deleteArm.cancel();
      this.statusMessage = 'Checkpoint storage unavailable.';
      this.statusOk = false;
      this.syncGameplayPauseState();
      return;
    }

    if (!this.deleteArm.trigger(slotId)) {
      this.statusMessage = `Tap DEL again to confirm slot ${slotId.slice(-1)}.`;
      this.statusOk = true;
      this.syncGameplayPauseState();
    }
  }

  private completeDeleteSlot(slotId: SaveSlotId): void {
    const result = this.saveSlotAdapter.delete(slotId);
    this.statusMessage = result.message;
    this.statusOk = result.ok;
    this.syncGameplayPauseState();
  }

  /** The change takes effect at once; the frozen clock means it is felt on resume. */
  private handleCycleSystemRequested(slot: ShipSystemSlot): void {
    if (!this.manualPauseRequested || !this.shipSystems) return;
    this.playClick?.();
    this.shipSystems.cycleSystem(slot);
    this.syncGameplayPauseState();
  }

  private handleDifficultyRequested(tier: GameplayDifficultyTier): boolean {
    this.playClick?.();
    const ok = setGameplayDifficultyTier(tier);
    if (ok && this.scene) noteRunDifficulty(this.scene.registry, tier);
    this.statusMessage = ok
      ? `Difficulty set to ${tier.toUpperCase()}.`
      : 'Unable to save difficulty in this browser context.';
    this.statusOk = ok;
    this.syncGameplayPauseState();
    return ok;
  }

  private handleQualityRequested(tier: VisualQualityTier): boolean {
    this.playClick?.();
    const ok = setVisualQualityTier(tier);
    this.statusMessage = ok
      ? `Quality: ${tier.toUpperCase()}. Restart required.`
      : 'Unable to save visual quality in this browser context.';
    this.statusOk = ok;
    this.syncGameplayPauseState();
    return ok;
  }

  private syncGameplayPauseState(): void {
    const shouldPause = this.manualPauseRequested;
    if (!shouldPause) {
      this.statusMessage = '';
      this.statusOk = true;
    }

    const overlayState: PauseOverlayState = {
      visible: shouldPause,
      canResume: this.manualPauseRequested,
      canSave: this.saveSlotAdapter.isAvailable() && this.saveSlotAdapter.canSave(),
      storageAvailable: this.saveSlotAdapter.isAvailable(),
      saveSlots: this.saveSlotAdapter.list(),
      systems: this.shipSystems?.getSystems() ?? NO_SHIP_SYSTEMS,
      specialGuns: this.shipSystems?.hasSpecialGuns() ?? false,
      statusMessage: this.statusMessage,
      statusOk: this.statusOk,
    };

    if (this.gameplayPaused !== shouldPause) {
      this.gameplayPaused = shouldPause;
      this.setAudioPaused?.(shouldPause);

      if (shouldPause) {
        this.stopPlayerMotion?.();
      }
    }

    if (shouldPause && this.scene && !this.scene.physics.world.isPaused) {
      this.scene.physics.world.pause();
    } else if (!shouldPause && this.scene?.physics.world.isPaused) {
      this.scene.physics.world.resume();
    }

    this.publishPausePresentation(overlayState, shouldPause);
  }

  private publishPausePresentation(overlayState: PauseOverlayState, mobileControlsBlocked: boolean): void {
    this.pauseOverlay?.setState(overlayState);
    this.setMobileControlsBlocked?.(mobileControlsBlocked);
  }
}
