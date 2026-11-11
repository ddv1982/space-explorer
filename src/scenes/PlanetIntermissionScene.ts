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
  type PlayerStateData,
} from '@/systems/PlayerState';
import { WarpTransition } from '@/systems/WarpTransition';
import { measureInGame } from '@/ui/dom';
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
    audioManager.stopMusic();
    audioManager.playSfx('levelComplete');
    this.state = getPlayerState(this.registry);
    this.isFinalMissionComplete = isLastLevel(this.state.level);
    this.transitioning = false;
    this.cameras.main.setBackgroundColor('#000011');

    const { level, score } = this.state;
    const levelConfig = getLevelConfig(level);
    const profile = getPlanetIntermissionProfile(level);
    const nextLevelName = this.isFinalMissionComplete ? null : getLevelConfig(level + 1).name;
    this.view = createRefitView({
      levelConfig,
      profile,
      level,
      totalLevels: getTotalLevels(),
      score,
      nextLevelName,
      continueLabel: nextLevelName ? `Continue to ${nextLevelName}` : 'Review campaign record',
      summary: nextLevelName
        ? `Level ${level} complete. ${score} credits available for upgrades.`
        : `Campaign complete. Final score ${score}.`,
      evaluations: this.evaluate(),
      onBuy: (key) => this.tryBuyUpgrade(key),
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
  }

  private evaluate(): UpgradeEvaluation[] {
    return this.isFinalMissionComplete ? [] : evaluateUpgrades(this.state.level, this.state.score, this.state.upgrades);
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
      if (this.transitioning || event.repeat || NON_PROCEED_KEYS.has(event.code)) return;
      if (event.target instanceof Element && event.target.closest('input, select, textarea')) return;
      if (!this.view?.handleUnfocusedKey(event.code)) this.continueToNextLevel();
    };
    this.input.on('pointerdown', this.pointerdownHandler);
    this.input.keyboard?.on('keydown', this.keydownHandler);
  }

  private handleSceneShutdown(): void {
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

    this.state.score -= evaluation.cost;
    this.state.upgrades[upgradeKey] += 1;
    setPlayerState(this.registry, this.state);
    audioManager.playUi('uiConfirm');
    this.view?.refresh(
      this.state.score,
      this.evaluate(),
      upgradeKey,
      `${evaluation.upgrade.name} upgraded to level ${this.state.upgrades[upgradeKey]}. ${this.state.score} credits remaining.`
    );
  }

  private continueToNextLevel(): void {
    if (this.transitioning) return;
    this.transitioning = true;
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
      startRegisteredScene(this, 'Game');
    });
  }
}
