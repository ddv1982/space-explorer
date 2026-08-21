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
import { ensurePremiumBackgroundAssets } from '../systems/parallax/premiumBackgroundLoading';
import { rebindSceneLifecycleHandlers } from '../utils/sceneLifecycle';
import {
  mountAccessibleActionLayer,
  type AccessibleAction,
  type AccessibleActionLayerHandle,
} from './shared/accessibleActionLayer';
import { registerRestartOnResize } from './shared/registerRestartOnResize';
import { createSettingsPanel, type SettingsPanel } from './shared/settingsPanel';
import { createMenuLayoutPlan } from './menuScene/layout';
import { resolveDevLevelJump } from './menuScene/devLevelJump';
import { startRegisteredScene } from './sceneRegistry';
import {
  createMenuBackdrop,
  createMenuTitle,
  createSaveSlotEntryPanel,
  type MenuSaveSlotPanel,
} from './menuScene/panels';

export class MenuScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private saveSlotPanel: MenuSaveSlotPanel | null = null;
  private settingsPanel: SettingsPanel | null = null;
  private gameTransitionQueued = false;
  private deleteArm?: ArmingAction<SaveSlotId>;
  private teardownAccessibleActions?: AccessibleActionLayerHandle;
  private accessibleStatusMessage = '';
  private accessibleStatusOk = true;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const menuConfig = getLevelConfig(1);
    const layoutPlan = this.initializeMenuScene(menuConfig);
    this.createMenuPanels(layoutPlan, menuConfig.accentColor);
    this.refreshSaveSlots('');
    this.syncAccessibleActions();
    this.maybeStartDevLevelJump();
  }

  private maybeStartDevLevelJump(): void {
    // Dev-server playtest shortcut only; Vite dead-code-eliminates this whole
    // path (including the devLevelJump module) from production builds.
    if (!import.meta.env.DEV) {
      return;
    }

    const jump = resolveDevLevelJump(window.location.search);
    if (!jump || !this.queueGameTransition()) {
      return;
    }

    this.resetRunState();
    const baseState = getPlayerState(this.registry);
    const jumpState: PlayerStateData = {
      ...baseState,
      level: jump.level,
      upgrades: jump.upgrades,
      currentShields: jump.upgrades.shield,
      remainingLives: 3,
    };
    jumpState.currentHp = getPlayerMaxHp(jumpState);
    setPlayerState(this.registry, jumpState);
    this.startGameScene();
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
    // Block resize restarts while a Game transition load is in flight so we do not
    // reset gameTransitionQueued and orphan a late ensure COMPLETE callback.
    registerRestartOnResize(this, () => !this.gameTransitionQueued);

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

  private createMenuPanels(layoutPlan: ReturnType<typeof createMenuLayoutPlan>, accentColor: number): void {
    createMenuBackdrop(this, layoutPlan, accentColor);
    createMenuTitle(this, layoutPlan);
    this.saveSlotPanel = createSaveSlotEntryPanel(
      this,
      layoutPlan,
      accentColor,
      this.createSaveSlotPanelHandlers(),
      isSaveStorageAvailable()
    );
    this.settingsPanel = createSettingsPanel(this, {
      layout: layoutPlan.settingsLayout,
      difficulty: this.getCurrentGameplayDifficultyTier(),
      quality: this.getCurrentVisualQualityTier(),
      onSelectDifficulty: (tier) => this.selectGameplayDifficultyTier(tier),
      onSelectQuality: (tier) => this.selectVisualQualityTier(tier),
      onMusicValueChanged: () => this.syncAccessibleActions(),
    });
    this.settingsPanel.setDepth(11);
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

    const deleteArm = this.ensureDeleteArm();
    if (!this.isSaveStorageAvailable()) {
      deleteArm.cancel();
      this.showSaveSlotError('Save slots unavailable in this browser context.');
      return;
    }

    if (!deleteArm.trigger(slotId)) {
      this.refreshSaveSlots(`Tap DEL again to confirm slot ${slotId.slice(-1)}.`);
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
    this.accessibleStatusMessage = message;
    this.accessibleStatusOk = !isError;
    if (this.teardownAccessibleActions) this.syncAccessibleActions();
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
    const level = getPlayerState(this.registry).level;
    ensurePremiumBackgroundAssets(this, level, () => {
      startRegisteredScene(this, 'Game');
    });
  }

  private syncAccessibleActions(): void {
    const slots = this.listAvailableSaveSlots();
    const options = {
      label: 'Command deck',
      summary: 'Start a new run, manage save slots, or change game and music settings.',
      status: {
        message: this.accessibleStatusMessage,
        politeness: this.accessibleStatusOk ? ('polite' as const) : ('assertive' as const),
      },
      actions: [
        { name: 'new-run', label: 'New run', activate: () => this.startNewRun() },
        ...slots.map((slot) => ({
          name: `load-${slot.id}`,
          label: `Load ${slot.title}`,
          description: slot.occupied ? `${slot.subtitle}, ${slot.savedAtLabel}` : 'Empty slot',
          disabled: !slot.occupied,
          activate: () => this.loadFromSlot(slot.id),
        })),
        ...slots.map((slot) => ({
          name: `delete-${slot.id}`,
          label: `Delete ${slot.title}`,
          disabled: !slot.occupied,
          activate: () => this.deleteSlot(slot.id),
        })),
        ...(['low', 'normal', 'high'] as const).map((tier) => ({
          name: `difficulty-${tier}`,
          label: `Set difficulty ${tier}`,
          selected: this.getCurrentGameplayDifficultyTier() === tier,
          activate: () => {
            if (this.selectGameplayDifficultyTier(tier)) this.settingsPanel?.setDifficulty(tier);
          },
        })),
        ...(['low', 'standard', 'high', 'auto'] as const).map((tier) => ({
          name: `quality-${tier}`,
          label: `Set visual quality ${tier}`,
          selected: this.getCurrentVisualQualityTier() === tier,
          activate: () => this.selectVisualQualityTier(tier),
        })),
        ...this.createAccessibleMusicActions(),
      ],
    };
    if (this.teardownAccessibleActions) {
      this.teardownAccessibleActions.update(options);
    } else {
      this.teardownAccessibleActions = mountAccessibleActionLayer(options);
    }
  }

  private createAccessibleMusicActions(): AccessibleAction[] {
    const tuning = audioManager.getMusicRuntimeTuning();
    const values = { ...tuning, volume: audioManager.getMusicVolume() };
    return (Object.keys(values) as Array<keyof typeof values>).flatMap((key) => {
      const label = key === 'volume' ? 'music volume' : key;
      const description = `${Math.round(values[key] * 100)} percent`;
      return [
        {
          name: `decrease-${key}`,
          label: `Decrease ${label}`,
          description,
          disabled: values[key] <= 0,
          activate: () => this.adjustAccessibleMusicValue(key, -0.05),
        },
        {
          name: `increase-${key}`,
          label: `Increase ${label}`,
          description,
          disabled: values[key] >= 1,
          activate: () => this.adjustAccessibleMusicValue(key, 0.05),
        },
      ];
    });
  }

  private adjustAccessibleMusicValue(key: 'creativity' | 'energy' | 'ambience' | 'volume', delta: number): void {
    audioManager.resumeFromUserGesture();
    const current = key === 'volume' ? audioManager.getMusicVolume() : audioManager.getMusicRuntimeTuning()[key];
    const requested = Math.max(0, Math.min(1, current + delta));
    const value =
      key === 'volume'
        ? audioManager.setMusicVolume(requested)
        : audioManager.setMusicRuntimeTuning({ [key]: requested })[key];
    this.settingsPanel?.setMusicValue(key, value);
    this.accessibleStatusMessage = `${key === 'volume' ? 'Music volume' : key} ${Math.round(value * 100)} percent.`;
    this.accessibleStatusOk = true;
    this.syncAccessibleActions();
  }

  private handleSceneShutdown(): void {
    this.teardownAccessibleActions?.();
    this.teardownAccessibleActions = undefined;
    this.parallax?.destroy();
    this.saveSlotPanel?.destroy();
    this.saveSlotPanel = null;
    this.settingsPanel?.destroy();
    this.settingsPanel = null;
  }
}
