import {
  getPendingShipSystemSlot,
  getShipSystemSlot,
  setShipSystem,
  type ShipSystemSlotDef,
} from '../config/shipSystems';
import { createSystemPickDialog } from './planetIntermission/systemPickDialog';
import { createSpecialGunIntroCard, isSpecialGunIntroDue } from './planetIntermission/specialGunIntro';
import Phaser from 'phaser';

import { getLevelConfig, getTotalLevels, isLastLevel } from '@/config/LevelsConfig';
import { evaluateUpgrades, type UpgradeEvaluation, type UpgradeKey } from '@/config/UpgradesConfig';
import { audioManager } from '@/systems/AudioManager';
import {
  advanceToNextLevel,
  getPlayerState,
  getRunSummary,
  setPlayerState,
  setRunSummary,
  getAvailableCredits,
  type PlayerStateData,
} from '@/systems/PlayerState';
import { AUTOSAVE_SLOT_ID, createSaveSlotRecord, writeSaveSlot } from '@/systems/SaveSlotStorage';
import { WarpTransition } from '@/systems/WarpTransition';
import { measureInGame } from '@/ui/dom';
import { isTouchMobileDevice } from '@/utils/device';
import { isHardwareKeyboardDetected } from '@/systems/hardwareKeyboardDetection';
import { rebindSceneLifecycleHandlers } from '@/utils/sceneLifecycle';

import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { queuePlanetPortrait } from './planetIntermission/planetPortraits';
import { getPlanetIntermissionProfile } from './planetIntermission/planetProfiles';
import { createIntermissionBackdrop, createPlanetArrivalVisual } from './planetIntermission/planetVisuals';
import { createRefitView, type RefitView } from './planetIntermission/refitView';
import { registerRestartOnResize } from './shared/registerRestartOnResize';
import { startRegisteredScene } from './sceneRegistry';

/** Keys that navigate or modify rather than mean "carry on". */
const NON_PROCEED_KEYS = new Set([
  'Tab',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
]);

export class PlanetIntermissionScene extends Phaser.Scene {
  private state!: PlayerStateData;
  private warpTransition!: WarpTransition;
  private view?: RefitView;
  /** The pick dialog or the special-gun card, whichever is open over the bay. */
  private dialog?: { destroy: () => void };
  /**
   * Set once the special-gun card is closed, so a resize restart of this visit does not show it again;
   * cleared on leaving, so the next run that reaches this bay sees it once more.
   */
  private specialGunIntroClosed = false;
  private isFinalMissionComplete = false;
  private transitioning = false;
  private pointerdownHandler?: () => void;
  private keydownHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super({ key: 'PlanetIntermission' });
  }

  preload(): void {
    // The boot preload caches every portrait, but direct/dev starts and
    // post-shutdown restarts can reach this scene with the texture already
    // released: queue it here so Phaser finishes the load before create.
    queuePlanetPortrait(this, getPlayerState(this.registry).level);
  }

  create(): void {
    rebindSceneLifecycleHandlers(this, { onShutdown: this.handleSceneShutdown, context: this });
    registerRestartOnResize(this, () => !this.transitioning);
    audioManager.init();
    // The opening theme, thinned out by a low intensity, plays under the refit bay.
    audioManager.startMusic(getLevelConfig(1).music.stage, 1.5);
    audioManager.setMusicIntensity(0.35);
    audioManager.playSfx('levelComplete');
    this.state = getPlayerState(this.registry);
    this.isFinalMissionComplete = isLastLevel(this.state.level);
    this.transitioning = false;
    this.cameras.main.setBackgroundColor('#000011');

    const { level, score } = this.state;
    const credits = getAvailableCredits(this.state);
    const levelConfig = getLevelConfig(level);
    const profile = getPlanetIntermissionProfile(level);
    const nextLevelName = this.isFinalMissionComplete ? null : getLevelConfig(level + 1).name;
    this.view = createRefitView({
      levelConfig,
      profile,
      level,
      totalLevels: getTotalLevels(),
      credits,
      nextLevelName,
      continueLabel: nextLevelName ? `Continue to ${nextLevelName}` : 'Review campaign record',
      summary: nextLevelName
        ? `Level ${level} complete. ${credits} credits available for upgrades.`
        : `Campaign complete. Final score ${score}.`,
      evaluations: this.evaluate(),
      onBuy: (key) => this.tryBuyUpgrade(key),
      onSwapSystem: (slot) => this.openSystemPick(getShipSystemSlot(slot)),
      onContinue: () => this.continueToNextLevel(),
    });

    // The planet fills the square the HTML layout reserves for it.
    const slot = measureInGame(this, this.view.planetSlot);
    createIntermissionBackdrop(this, levelConfig, level);
    createPlanetArrivalVisual(this, levelConfig, level, profile, {
      planetX: slot.left + slot.width / 2,
      planetY: slot.top + slot.height / 2,
      planetDiameter: Math.min(slot.width, slot.height),
    });
    this.warpTransition = new WarpTransition();
    this.warpTransition.create(this);
    this.bindContinueInputs();
    this.offerSpecialGunIntro();
  }

  /** Before the first sector that flies Lance, a card explains the special guns before the shop opens. */
  private offerSpecialGunIntro(): void {
    if (this.specialGunIntroClosed || !isSpecialGunIntroDue(this.state.level)) {
      this.offerShipSystemPick();
      return;
    }
    this.view?.setInert(true);
    const touch = isTouchMobileDevice() && !isHardwareKeyboardDetected();
    this.dialog = createSpecialGunIntroCard(touch, () => {
      this.closeDialog();
      this.specialGunIntroClosed = true;
      audioManager.playUi();
      this.offerShipSystemPick();
    });
  }

  /**
   * A free ship-system pick is offered before the shop whenever one is due; the run waits for it. Once
   * none is due, the bay lists the run's picks so the player can swap them.
   */
  private offerShipSystemPick(): void {
    const slot = this.isFinalMissionComplete ? null : getPendingShipSystemSlot(this.state.level, this.state.systems);
    if (slot) {
      this.openSystemPick(slot);
      return;
    }
    if (!this.isFinalMissionComplete) this.view?.showSystems(this.state.systems);
    this.view?.setInert(false);
  }

  /** The pick dialog for `slot`: its first pick, or a free swap when the slot already has one. */
  private openSystemPick(slot: ShipSystemSlotDef): void {
    const current = this.state.systems[slot.slot];
    this.view?.setInert(true);
    this.dialog = createSystemPickDialog(slot, current, (id) => {
      this.closeDialog();
      if (id !== current) {
        this.state.systems = setShipSystem(this.state.systems, slot.slot, id);
        setPlayerState(this.registry, this.state);
        audioManager.playUi('uiConfirm');
      } else audioManager.playUi();
      // A late start can owe more than one pick: offer the next before the shop opens.
      this.offerShipSystemPick();
    });
  }

  private closeDialog(): void {
    this.dialog?.destroy();
    this.dialog = undefined;
  }

  private evaluate(): UpgradeEvaluation[] {
    return this.isFinalMissionComplete
      ? []
      : evaluateUpgrades(this.state.level, getAvailableCredits(this.state), this.state.upgrades);
  }

  /**
   * A tap on the canvas (anywhere but a card or CONTINUE) carries on. Escape and any plain key carry on
   * too; arrows, Enter and Space pick and buy upgrades instead. Keys a focused control uses never get here.
   */
  private bindContinueInputs(): void {
    if (this.isFinalMissionComplete) {
      bindProceedOnInput(this, () => this.continueToNextLevel());
      return;
    }

    this.pointerdownHandler = () => this.continueToNextLevel();
    this.keydownHandler = (event: KeyboardEvent) => {
      if (this.transitioning || this.dialog || event.repeat || NON_PROCEED_KEYS.has(event.code)) return;
      if (event.target instanceof Element && event.target.closest('input, select, textarea')) return;
      if (!this.view?.handleUnfocusedKey(event.code)) this.continueToNextLevel();
    };
    this.input.on('pointerdown', this.pointerdownHandler);
    this.input.keyboard?.on('keydown', this.keydownHandler);
  }

  private handleSceneShutdown(): void {
    this.closeDialog();
    this.view?.destroy();
    this.view = undefined;
    if (this.pointerdownHandler) this.input.off('pointerdown', this.pointerdownHandler);
    if (this.keydownHandler) this.input.keyboard?.off('keydown', this.keydownHandler);
    this.pointerdownHandler = this.keydownHandler = undefined;
    this.transitioning = false;
  }

  private tryBuyUpgrade(upgradeKey: UpgradeKey): void {
    const evaluation = this.evaluate().find((entry) => entry.upgrade.key === upgradeKey);
    if (this.transitioning || !evaluation?.canPurchase) return;

    this.state.creditsSpent += evaluation.cost;
    this.state.upgrades[upgradeKey] += 1;
    setPlayerState(this.registry, this.state);
    audioManager.playUi('uiConfirm');
    const credits = getAvailableCredits(this.state);
    this.view?.refresh(
      credits,
      this.evaluate(),
      upgradeKey,
      `${evaluation.upgrade.name} upgraded to level ${this.state.upgrades[upgradeKey]}. ${credits} credits remaining.`
    );
  }

  private continueToNextLevel(): void {
    if (this.transitioning || this.dialog) return;
    this.transitioning = true;
    this.specialGunIntroClosed = false;
    audioManager.playUi();
    this.view?.leave();

    if (this.isFinalMissionComplete) {
      const runSummary = getRunSummary(this.registry);
      setRunSummary(this.registry, { finalScore: runSummary.finalScore, levelReached: this.state.level });
      startRegisteredScene(this, 'Victory');
      return;
    }

    this.transitionToNextGameLevel();
  }

  private transitionToNextGameLevel(): void {
    this.warpTransition.play(() => {
      advanceToNextLevel(this.registry);
      // Saving progress is manual from the pause panel, so closing the tab would lose this refit's
      // picks and purchases without it. Best effort: a failed write must not block the next sector.
      writeSaveSlot(
        createSaveSlotRecord(AUTOSAVE_SLOT_ID, getPlayerState(this.registry), getRunSummary(this.registry))
      );
      startRegisteredScene(this, 'Game');
    });
  }
}
