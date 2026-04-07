import Phaser from 'phaser';
import { audioManager } from '../../systems/AudioManager';
import { PauseOverlay } from './PauseOverlay';

interface PauseStateControllerConfig {
  scene: Phaser.Scene;
  stopPlayerMotion: () => void;
  setMobileControlsBlocked: (blocked: boolean) => void;
  onReturnToMenu: () => void;
}

export class PauseStateController {
  private scene: Phaser.Scene | null = null;
  private pauseOverlay: PauseOverlay | null = null;
  private stopPlayerMotion: (() => void) | null = null;
  private setMobileControlsBlocked: ((blocked: boolean) => void) | null = null;
  private onReturnToMenu: (() => void) | null = null;

  private manualPauseRequested = false;
  private orientationPauseActive = false;
  private gameplayPaused = false;

  static create(config: PauseStateControllerConfig): PauseStateController {
    return new PauseStateController().create(config);
  }

  create(config: PauseStateControllerConfig): this {
    this.destroy();

    this.scene = config.scene;
    this.stopPlayerMotion = config.stopPlayerMotion;
    this.setMobileControlsBlocked = config.setMobileControlsBlocked;
    this.onReturnToMenu = config.onReturnToMenu;

    this.manualPauseRequested = false;
    this.orientationPauseActive = false;
    this.gameplayPaused = false;

    this.pauseOverlay = PauseOverlay.create(config.scene, {
      onResume: () => this.handlePauseResumeRequested(),
      onMainMenu: () => this.handleMainMenuRequested(),
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
    this.manualPauseRequested = false;
    this.orientationPauseActive = false;
    this.gameplayPaused = false;
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
    audioManager.playClick();
    this.syncGameplayPauseState();
  }

  private handlePauseResumeRequested(): void {
    if (!this.manualPauseRequested || this.orientationPauseActive) {
      return;
    }

    audioManager.playClick();
    this.manualPauseRequested = false;
    this.syncGameplayPauseState();
  }

  private handleMainMenuRequested(): void {
    audioManager.playClick();
    this.onReturnToMenu?.();
  }

  private syncGameplayPauseState(): void {
    const shouldPause = this.manualPauseRequested || this.orientationPauseActive;
    if (this.gameplayPaused === shouldPause) {
      this.pauseOverlay?.setState({
        visible: shouldPause,
        orientationBlocked: this.orientationPauseActive,
        canResume: this.manualPauseRequested,
      });
      this.setMobileControlsBlocked?.(shouldPause);
      return;
    }

    this.gameplayPaused = shouldPause;

    if (shouldPause) {
      this.stopPlayerMotion?.();
      if (this.scene && !this.scene.physics.world.isPaused) {
        this.scene.physics.world.pause();
      }
    } else if (this.scene?.physics.world.isPaused) {
      this.scene.physics.world.resume();
    }

    this.pauseOverlay?.setState({
      visible: shouldPause,
      orientationBlocked: this.orientationPauseActive,
      canResume: this.manualPauseRequested,
    });

    this.setMobileControlsBlocked?.(shouldPause);
  }
}
