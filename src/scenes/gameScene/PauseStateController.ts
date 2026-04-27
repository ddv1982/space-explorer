import type Phaser from 'phaser';
import { audioManager } from '../../systems/AudioManager';
import type { SaveSlotId, SaveSlotViewModel } from '../../systems/SaveSlotStorage';
import { PauseOverlay } from './PauseOverlay';
import type { PauseOverlayHandlers, PauseOverlayState } from './pauseOverlay/types';

export type SaveSlotActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export interface PauseSaveSlotAdapter {
  isAvailable: () => boolean;
  list: () => SaveSlotViewModel[];
  save: (slotId: SaveSlotId) => SaveSlotActionResult;
  load: (slotId: SaveSlotId) => SaveSlotActionResult;
  delete: (slotId: SaveSlotId) => SaveSlotActionResult;
  canSave: () => boolean;
}

interface PauseOverlayPort {
  setState(nextState: Partial<PauseOverlayState>): void;
  relayout(): void;
  destroy(): void;
}

interface PauseStateControllerConfig {
  scene: Phaser.Scene;
  stopPlayerMotion: () => void;
  setMobileControlsBlocked: (blocked: boolean) => void;
  onReturnToMenu: () => void;
  saveSlotAdapter?: PauseSaveSlotAdapter;
  createOverlay?: (scene: Phaser.Scene, handlers: PauseOverlayHandlers) => PauseOverlayPort;
  playClick?: () => void;
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
  private playClick: (() => void) | null = null;

  private manualPauseRequested = false;
  private orientationPauseActive = false;
  private gameplayPaused = false;
  private statusMessage = '';
  private statusOk = true;

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
    this.playClick = config.playClick ?? (() => audioManager.playClick());

    this.manualPauseRequested = false;
    this.orientationPauseActive = false;
    this.gameplayPaused = false;
    this.statusMessage = '';
    this.statusOk = true;

    const createOverlay = config.createOverlay ?? ((scene: Phaser.Scene, handlers: PauseOverlayHandlers) => PauseOverlay.create(scene, handlers));
    this.pauseOverlay = createOverlay(config.scene, {
      onResume: () => this.handlePauseResumeRequested(),
      onMainMenu: () => this.handleMainMenuRequested(),
      onSaveSlot: (slotId) => this.handleSaveSlotRequested(slotId),
      onLoadSlot: (slotId) => this.handleLoadSlotRequested(slotId),
      onDeleteSlot: (slotId) => this.handleDeleteSlotRequested(slotId),
    });

    this.syncGameplayPauseState();

    return this;
  }

  destroy(): void {
    this.pauseOverlay?.destroy();

    this.pauseOverlay = null;
    this.scene = null;
    this.stopPlayerMotion = null;
    this.setMobileControlsBlocked = null;
    this.onReturnToMenu = null;
    this.saveSlotAdapter = createUnavailableSaveSlotAdapter();
    this.playClick = null;
    this.manualPauseRequested = false;
    this.orientationPauseActive = false;
    this.gameplayPaused = false;
    this.statusMessage = '';
    this.statusOk = true;
  }

  relayout(): void {
    this.pauseOverlay?.relayout();
  }

  isGameplayPaused(): boolean {
    return this.gameplayPaused;
  }

  setOrientationBlocked(blocked: boolean): void {
    this.orientationPauseActive = blocked;
    if (blocked) {
      this.stopPlayerMotion?.();
    }

    this.syncGameplayPauseState();
  }

  togglePauseRequest(gameplayLocked: boolean): void {
    if (gameplayLocked) {
      return;
    }

    if (this.orientationPauseActive && !this.manualPauseRequested) {
      return;
    }

    this.manualPauseRequested = !this.manualPauseRequested;
    if (this.manualPauseRequested) {
      this.statusMessage = '';
    }
    this.playClick?.();
    this.syncGameplayPauseState();
  }

  private handlePauseResumeRequested(): void {
    if (!this.manualPauseRequested || this.orientationPauseActive) {
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
      this.statusMessage = 'Checkpoint storage unavailable.';
      this.statusOk = false;
      this.syncGameplayPauseState();
      return;
    }

    const result = this.saveSlotAdapter.delete(slotId);
    this.statusMessage = result.message;
    this.statusOk = result.ok;
    this.syncGameplayPauseState();
  }

  private syncGameplayPauseState(): void {
    const shouldPause = this.manualPauseRequested || this.orientationPauseActive;
    if (!shouldPause) {
      this.statusMessage = '';
      this.statusOk = true;
    }

    const overlayState: PauseOverlayState = {
      visible: shouldPause,
      orientationBlocked: this.orientationPauseActive,
      canResume: this.manualPauseRequested,
      canSave: this.saveSlotAdapter.isAvailable() && this.saveSlotAdapter.canSave(),
      storageAvailable: this.saveSlotAdapter.isAvailable(),
      saveSlots: this.saveSlotAdapter.list(),
      statusMessage: this.statusMessage,
      statusOk: this.statusOk,
    };

    if (this.gameplayPaused !== shouldPause) {
      this.gameplayPaused = shouldPause;

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
