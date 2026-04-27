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
    rebindSceneLifecycleHandlers(this, {
      onShutdown: this.handleSceneShutdown,
      context: this,
    });

    this.gameTransitionQueued = false;

    const menuConfig = getLevelConfig(1);
    const layoutPlan = createMenuLayoutPlan(this);

    this.cameras.main.setBackgroundColor(menuConfig.bgColor);

    audioManager.init();
    audioManager.startMusic(menuConfig.music.stage);
    audioManager.setMusicIntensity(0.9);

    this.parallax = new ParallaxBackground();
    this.parallax.create(this, menuConfig);
    registerRestartOnResize(this);

    createMenuBackdrop(this, layoutPlan, menuConfig.accentColor);
    createMenuTitle(this, layoutPlan);
    this.saveSlotPanel = createSaveSlotEntryPanel(
      this,
      layoutPlan,
      menuConfig.accentColor,
      {
        onNewRun: () => this.startNewRun(),
        onLoadSlot: (slotId) => this.loadFromSlot(slotId),
        onDeleteSlot: (slotId) => this.deleteSlot(slotId),
      },
      isSaveStorageAvailable(),
    );
    this.musicSliders = createMusicLabPanel(this, layoutPlan, menuConfig.accentColor, () => this.musicSliders);

    this.refreshSaveSlots('');
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }

  private startNewRun(): void {
    if (!this.queueGameTransition()) {
      return;
    }

    audioManager.init();
    audioManager.playClick();
    resetPlayerState(this.registry);
    resetRunSummary(this.registry);
    startRegisteredScene(this, 'Game');
  }

  private loadFromSlot(slotId: SaveSlotId): void {
    audioManager.init();
    audioManager.playClick();

    if (!isSaveStorageAvailable()) {
      this.refreshSaveSlots('Save slots unavailable in this browser context.', true);
      return;
    }

    const record = readSaveSlot(slotId);
    if (!record) {
      this.refreshSaveSlots(`Slot ${slotId.slice(-1)} is empty.`, true);
      return;
    }

    if (!this.queueGameTransition()) {
      return;
    }

    setPlayerState(this.registry, record.playerState);
    setRunSummary(this.registry, record.runSummary);
    startRegisteredScene(this, 'Game');
  }

  private deleteSlot(slotId: SaveSlotId): void {
    audioManager.init();
    audioManager.playClick();

    if (!isSaveStorageAvailable()) {
      this.refreshSaveSlots('Save slots unavailable in this browser context.', true);
      return;
    }

    const ok = deleteSaveSlot(slotId);
    if (!ok) {
      this.refreshSaveSlots('Failed to delete slot. Check browser storage permissions.', true);
      return;
    }

    this.refreshSaveSlots(`Slot ${slotId.slice(-1)} cleared.`);
  }

  private queueGameTransition(): boolean {
    if (this.gameTransitionQueued) {
      return false;
    }

    this.gameTransitionQueued = true;
    return true;
  }

  private refreshSaveSlots(message: string, isError = false): void {
    this.saveSlotPanel?.refresh(listSaveSlots());
    this.saveSlotPanel?.setStatus(message, isError);
  }

  private handleSceneShutdown(): void {
    this.parallax?.destroy();
    destroyMenuMusicSliders(this.musicSliders);
    this.musicSliders = null;
    this.saveSlotPanel?.destroy();
    this.saveSlotPanel = null;
  }
}
