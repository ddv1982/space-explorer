import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import {
  getGameplayDifficultyTier,
  setGameplayDifficultyTier,
  type GameplayDifficultyTier,
} from '../config/gameplayDifficulty';
import { getVisualQualityTier, setVisualQualityTier, type VisualQualityTier } from '../config/visualQuality';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import {
  deleteSaveSlot,
  getSaveSlotName,
  isSaveStorageAvailable,
  listSaveSlots,
  readSaveSlot,
  type SaveSlotId,
} from '../systems/SaveSlotStorage';
import {
  getPlayerMaxHp,
  getPlayerState,
  resetPlayerState,
  resetRunSummary,
  setPlayerState,
  setRunSummary,
  type PlayerStateData,
} from '../systems/PlayerState';
import { createArmingAction, type ArmingAction } from '../systems/armingAction';
import { audioManager } from '../systems/AudioManager';
import { startFreshRun, startPreparedRun } from './shared/startRun';
import { createRunSeed } from '../systems/runVariation';
import { rebindSceneLifecycleHandlers } from '../utils/sceneLifecycle';
import { registerRestartOnResize } from './shared/registerRestartOnResize';
import { resolveDevLevelJump } from './menuScene/devLevelJump';
import { createMenuHero, placeMenuHero, type MenuHero } from './menuScene/hero';
import { createMenuVista, type MenuVista } from './menuScene/vista';
import { createMenuView, type MenuView } from './menuScene/menuView';
import { measureInGame } from '../ui/dom';

export class MenuScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private view: MenuView | null = null;
  private hero: MenuHero | null = null;
  private vista: MenuVista | null = null;
  private gameTransitionQueued = false;
  private devLevelJumpConsumed = false;
  private deleteArm?: ArmingAction<SaveSlotId>;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const menuConfig = getLevelConfig(1);
    rebindSceneLifecycleHandlers(this, { onShutdown: this.handleSceneShutdown, context: this });
    this.gameTransitionQueued = false;
    this.cameras.main.setBackgroundColor(menuConfig.bgColor);
    audioManager.init();
    audioManager.startMusic(menuConfig.music.stage);
    audioManager.setMusicIntensity(0.9);
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, menuConfig);
    // The canvas art (parallax, vista, hero) is sized to the viewport, so a resize rebuilds the scene;
    // blocked while a Game transition load is in flight so a late ensure COMPLETE is not orphaned.
    registerRestartOnResize(this, () => !this.gameTransitionQueued);

    this.vista = createMenuVista(this);
    this.view = createMenuView({
      onNewRun: () => this.startNewRun(),
      onLoadSlot: (slotId) => this.loadFromSlot(slotId),
      onDeleteSlot: (slotId) => this.deleteSlot(slotId),
      onToggleSettings: () => this.playMenuClick(),
      settings: {
        difficulty: this.getCurrentGameplayDifficultyTier(),
        quality: this.getCurrentVisualQualityTier(),
        onSelectDifficulty: (tier) => this.selectGameplayDifficultyTier(tier),
        onSelectQuality: (tier) => this.selectVisualQualityTier(tier),
      },
    });
    // Before the hero is measured: an empty autosave card is hidden here, which changes the band's size.
    this.refreshSaveSlots('');
    this.hero = createMenuHero(this, this.measureHeroBand(this.view.heroSlot));
    this.input.keyboard?.on('keydown-ESC', this.closeSettingsSheet, this);
    this.maybeStartDevLevelJump();
  }

  /** The hero ship flies in the band the HTML layout leaves empty between the title and NEW RUN. */
  private measureHeroBand(slot: HTMLElement) {
    const maxShipHeight = Number(getComputedStyle(slot).getPropertyValue('--hero-max')) || 230;
    return placeMenuHero(measureInGame(this, slot), maxShipHeight);
  }

  private maybeStartDevLevelJump(): void {
    // Dev-server playtest shortcut only; Vite dead-code-eliminates this whole
    // path (including the devLevelJump module) from production builds.
    if (!import.meta.env.DEV || this.devLevelJumpConsumed) {
      return;
    }

    const jump = resolveDevLevelJump(window.location.search);
    if (!jump || !this.queueGameTransition()) {
      return;
    }

    this.devLevelJumpConsumed = true;
    this.resetRunState();
    const baseState = getPlayerState(this.registry);
    const jumpState: PlayerStateData = {
      ...baseState,
      level: jump.level,
      upgrades: jump.upgrades,
      systems: jump.systems,
      runSeed: jump.runSeed ?? createRunSeed(),
      currentShields: jump.upgrades.shield,
      remainingLives: 3,
    };
    jumpState.currentHp = getPlayerMaxHp(jumpState);
    setPlayerState(this.registry, jumpState);
    this.startGameScene();
  }

  private closeSettingsSheet(): void {
    this.view?.closeSettings();
  }

  private selectGameplayDifficultyTier(tier: GameplayDifficultyTier): boolean {
    if (tier === this.getCurrentGameplayDifficultyTier()) return false;
    this.playMenuClick();
    if (!this.persistGameplayDifficultyTier(tier)) {
      this.showSaveSlotError('Unable to save difficulty in this browser context.');
      return false;
    }
    this.refreshSaveSlots(`Difficulty set to ${tier.toUpperCase()}.`);
    return true;
  }

  private getCurrentGameplayDifficultyTier(): GameplayDifficultyTier {
    return getGameplayDifficultyTier();
  }

  private persistGameplayDifficultyTier(tier: GameplayDifficultyTier): boolean {
    return setGameplayDifficultyTier(tier);
  }

  private selectVisualQualityTier(tier: VisualQualityTier): boolean {
    if (tier === this.getCurrentVisualQualityTier()) {
      return false;
    }

    this.playMenuClick();
    if (!this.persistVisualQualityTier(tier)) {
      this.showSaveSlotError('Unable to save visual quality in this browser context.');
      return false;
    }

    this.reloadForVisualQualityChange();
    return true;
  }

  private getCurrentVisualQualityTier(): VisualQualityTier {
    return getVisualQualityTier();
  }

  private persistVisualQualityTier(tier: VisualQualityTier): boolean {
    return setVisualQualityTier(tier);
  }

  private reloadForVisualQualityChange(): void {
    window.location.reload();
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
    this.hero?.update(delta);
  }

  private startNewRun(): void {
    if (!this.queueGameTransition()) {
      return;
    }

    this.playMenuClick();
    startFreshRun(this);
  }

  private loadFromSlot(slotId: SaveSlotId): void {
    this.playMenuClick();

    if (!this.isSaveStorageAvailable()) {
      this.showSaveSlotError('Save slots unavailable in this browser context.');
      return;
    }

    const record = this.readSaveSlotRecord(slotId);
    if (!record) {
      this.showSaveSlotError(`${getSaveSlotName(slotId)} is empty.`);
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

    const deleteArm = this.ensureDeleteArm();
    if (!this.isSaveStorageAvailable()) {
      deleteArm.cancel();
      this.showSaveSlotError('Save slots unavailable in this browser context.');
      return;
    }

    if (!deleteArm.trigger(slotId)) {
      this.refreshSaveSlots(`Tap DEL again to confirm ${getSaveSlotName(slotId)}.`);
    }
  }

  private ensureDeleteArm() {
    this.deleteArm ??= createArmingAction<SaveSlotId>((slotId) => {
      this.completeDeleteSlot(slotId);
    });
    return this.deleteArm;
  }

  private completeDeleteSlot(slotId: SaveSlotId): void {
    const ok = this.deleteStoredSaveSlot(slotId);
    if (!ok) {
      this.showSaveSlotError('Failed to delete slot. Check browser storage permissions.');
      return;
    }

    this.refreshSaveSlots(`${getSaveSlotName(slotId)} cleared.`);
  }

  private playMenuClick(): void {
    audioManager.init();
    audioManager.playUi();
  }

  private queueGameTransition(): boolean {
    if (this.gameTransitionQueued) {
      return false;
    }

    this.gameTransitionQueued = true;
    return true;
  }

  private refreshSaveSlots(message: string, isError = false): void {
    this.view?.refreshSlots(this.listAvailableSaveSlots(), this.isSaveStorageAvailable());
    this.view?.setStatus(message, isError);
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
    startPreparedRun(this);
  }

  private handleSceneShutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.closeSettingsSheet, this);
    this.view?.destroy();
    this.view = null;
    this.parallax?.destroy();
    this.hero?.destroy();
    this.hero = null;
    this.vista?.destroy();
    this.vista = null;
  }
}
