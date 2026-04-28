import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import {
  deleteSaveSlot,
  isSaveStorageAvailable,
  listSaveSlots,
  readSaveSlot,
  type SaveSlotId,
} from '../systems/SaveSlotStorage';
import {
  resetPlayerState,
  resetRunSummary,
  setPlayerState,
  setRunSummary,
} from '../systems/PlayerState';
import { audioManager } from '../systems/AudioManager';
import { rebindSceneLifecycleHandlers } from '../utils/sceneLifecycle';
import { registerRestartOnResize } from './shared/registerRestartOnResize';
import { createMenuLayoutPlan } from './menuScene/layout';
import { startRegisteredScene } from './sceneRegistry';
import {
  createMenuBackdrop,
  createMenuTitle,
  createMusicLabPanel,
  createSaveSlotEntryPanel,
  destroyMenuMusicSliders,
  type MenuMusicSliders,
  type MenuSaveSlotPanel,
} from './menuScene/panels';

export class MenuScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private musicSliders: MenuMusicSliders | null = null;
  private saveSlotPanel: MenuSaveSlotPanel | null = null;
  private gameTransitionQueued = false;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const menuConfig = getLevelConfig(1);
    const layoutPlan = this.initializeMenuScene(menuConfig);
    this.createMenuPanels(layoutPlan, menuConfig.accentColor);
    this.refreshSaveSlots('');
  }

  private initializeMenuScene(menuConfig: ReturnType<typeof getLevelConfig>) {
    rebindSceneLifecycleHandlers(this, {
      onShutdown: this.handleSceneShutdown,
      context: this,
    });

    this.gameTransitionQueued = false;
    this.cameras.main.setBackgroundColor(menuConfig.bgColor);
    this.initializeMenuAudio(menuConfig.music.stage);
    this.initializeParallax(menuConfig);
    registerRestartOnResize(this);

    return createMenuLayoutPlan(this);
  }

  private initializeMenuAudio(stageMusicKey: ReturnType<typeof getLevelConfig>['music']['stage']): void {
    audioManager.init();
    audioManager.startMusic(stageMusicKey);
    audioManager.setMusicIntensity(0.9);
  }

  private initializeParallax(menuConfig: ReturnType<typeof getLevelConfig>): void {
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, menuConfig);
  }

  private createMenuPanels(
    layoutPlan: ReturnType<typeof createMenuLayoutPlan>,
    accentColor: number
  ): void {
    createMenuBackdrop(this, layoutPlan, accentColor);
    createMenuTitle(this, layoutPlan);
    this.saveSlotPanel = createSaveSlotEntryPanel(
      this,
      layoutPlan,
      accentColor,
      this.createSaveSlotPanelHandlers(),
      isSaveStorageAvailable(),
    );
    this.musicSliders = createMusicLabPanel(this, layoutPlan, accentColor, () => this.musicSliders);
  }

  private createSaveSlotPanelHandlers(): {
    onNewRun: () => void;
    onLoadSlot: (slotId: SaveSlotId) => void;
    onDeleteSlot: (slotId: SaveSlotId) => void;
  } {
    return {
      onNewRun: () => this.startNewRun(),
      onLoadSlot: (slotId) => this.loadFromSlot(slotId),
      onDeleteSlot: (slotId) => this.deleteSlot(slotId),
    };
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }

  private startNewRun(): void {
    if (!this.queueGameTransition()) {
      return;
    }

    this.playMenuClick();
    this.resetRunState();
    this.startGameScene();
  }

  private loadFromSlot(slotId: SaveSlotId): void {
    this.playMenuClick();

    if (!this.isSaveStorageAvailable()) {
      this.showSaveSlotError('Save slots unavailable in this browser context.');
      return;
    }

    const record = this.readSaveSlotRecord(slotId);
    if (!record) {
      this.showSaveSlotError(`Slot ${slotId.slice(-1)} is empty.`);
      return;
    }

    if (!this.queueGameTransition()) {
      return;
    }

    this.applyLoadedRunState(record.playerState, record.runSummary);
    this.startGameScene();
  }

  private deleteSlot(slotId: SaveSlotId): void {
    this.playMenuClick();

    if (!this.isSaveStorageAvailable()) {
      this.showSaveSlotError('Save slots unavailable in this browser context.');
      return;
    }

    const ok = this.deleteStoredSaveSlot(slotId);
    if (!ok) {
      this.showSaveSlotError('Failed to delete slot. Check browser storage permissions.');
      return;
    }

    this.refreshSaveSlots(`Slot ${slotId.slice(-1)} cleared.`);
  }

  private playMenuClick(): void {
    audioManager.init();
    audioManager.playClick();
  }

  private queueGameTransition(): boolean {
    if (this.gameTransitionQueued) {
      return false;
    }

    this.gameTransitionQueued = true;
    return true;
  }

  private refreshSaveSlots(message: string, isError = false): void {
    this.saveSlotPanel?.refresh(this.listAvailableSaveSlots());
    this.saveSlotPanel?.setStatus(message, isError);
  }

  private showSaveSlotError(message: string): void {
    this.refreshSaveSlots(message, true);
  }

  private isSaveStorageAvailable(): boolean {
    return isSaveStorageAvailable();
  }

  private readSaveSlotRecord(slotId: SaveSlotId) {
    return readSaveSlot(slotId);
  }

  private deleteStoredSaveSlot(slotId: SaveSlotId): boolean {
    return deleteSaveSlot(slotId);
  }

  private listAvailableSaveSlots() {
    return listSaveSlots();
  }

  private resetRunState(): void {
    resetPlayerState(this.registry);
    resetRunSummary(this.registry);
  }

  private applyLoadedRunState(
    playerState: Parameters<typeof setPlayerState>[1],
    runSummary: Parameters<typeof setRunSummary>[1]
  ): void {
    setPlayerState(this.registry, playerState);
    setRunSummary(this.registry, runSummary);
  }

  private startGameScene(): void {
    startRegisteredScene(this, 'Game');
  }

  private handleSceneShutdown(): void {
    this.parallax?.destroy();
    destroyMenuMusicSliders(this.musicSliders);
    this.musicSliders = null;
    this.saveSlotPanel?.destroy();
    this.saveSlotPanel = null;
  }
}
