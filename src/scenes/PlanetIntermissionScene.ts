import Phaser from 'phaser';

import { getLevelConfig, isLastLevel } from '@/config/LevelsConfig';
import {
  evaluateUpgrade,
  evaluateUpgrades,
  getUpgradeByKey,
  type UpgradeEvaluation,
  type UpgradeKey,
} from '@/config/UpgradesConfig';
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
import { getViewportLayout } from '@/utils/layout';
import { rebindSceneLifecycleHandlers } from '@/utils/sceneLifecycle';

import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { findButtonIndexAtPoint } from './planetIntermission/navigation';
import {
  createIntermissionHeader,
  createIntermissionPrompt,
  getIntermissionLayout,
  getUpgradeGridStartX,
  type IntermissionLayoutMetrics,
} from './planetIntermission/presentation';
import { createUpgradeButton, updateUpgradeButton } from './planetIntermission/upgradeButtons';
import type { UpgradeButton } from './planetIntermission/shared';
import { registerRestartOnResize } from './shared/registerRestartOnResize';
import { PlanetIntermissionInteractionController } from './planetIntermission/interactionController';
import { startRegisteredScene } from './sceneRegistry';

export class PlanetIntermissionScene extends Phaser.Scene {
  private state!: PlayerStateData;
  private scoreText!: Phaser.GameObjects.Text;
  private buttons: UpgradeButton[] = [];
  private warpTransition!: WarpTransition;
  private focusGraphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private interactionController?: PlanetIntermissionInteractionController;
  private isFinalMissionComplete: boolean = false;
  private transitioning = false;
  private pointerdownHandler?: (pointer: Phaser.Input.Pointer) => void;

  constructor() {
    super({ key: 'PlanetIntermission' });
  }

  create(): void {
    this.initializeSceneLifecycle();
    const intermissionLayout = this.initializeIntermissionState();
    const completedLevelConfig = getLevelConfig(this.state.level);
    this.generatePlanetTexture(completedLevelConfig.planetPalette, intermissionLayout.planetY, intermissionLayout.planetScale);
    this.scoreText = createIntermissionHeader(this, intermissionLayout, {
      planetName: completedLevelConfig.planetName,
      level: this.state.level,
      score: this.state.score,
    });
    this.initializeOverlayGraphics();
    this.initializeUpgradeFlow(intermissionLayout);
    this.initializeWarpTransition();
    this.createContinuePrompt(intermissionLayout);
    this.bindContinueInputs();
  }

  private initializeSceneLifecycle(): void {
    rebindSceneLifecycleHandlers(this, {
      onShutdown: this.handleSceneShutdown,
      context: this,
    });
    registerRestartOnResize(this, () => !this.transitioning);
  }

  private initializeIntermissionState(): IntermissionLayoutMetrics {
    audioManager.init();
    audioManager.stopMusic();
    this.state = getPlayerState(this.registry);
    this.isFinalMissionComplete = isLastLevel(this.state.level);
    this.interactionController = undefined;
    this.transitioning = false;
    this.cameras.main.setBackgroundColor('#000011');

    return getIntermissionLayout(this, this.getUpgradeCount());
  }

  private getUpgradeCount(): number {
    if (this.isFinalMissionComplete) {
      return 0;
    }

    return evaluateUpgrades(this.state.level, this.state.score, this.state.upgrades).length;
  }

  private initializeOverlayGraphics(): void {
    this.focusGraphics = this.add.graphics();
    this.focusGraphics.setDepth(10);

    this.hoverGraphics = this.add.graphics();
    this.hoverGraphics.setDepth(9);
  }

  private initializeUpgradeFlow(intermissionLayout: IntermissionLayoutMetrics): void {
    if (this.isFinalMissionComplete) {
      return;
    }

    this.createUpgradeButtons(intermissionLayout);
    this.interactionController = this.createInteractionController();
    this.interactionController.initialize();
  }

  private createInteractionController(): PlanetIntermissionInteractionController {
    return new PlanetIntermissionInteractionController({
      scene: this,
      buttons: this.buttons,
      focusGraphics: this.focusGraphics,
      hoverGraphics: this.hoverGraphics,
      evaluateButton: (button) => this.getButtonEvaluation(button),
      tryBuyUpgrade: (upgradeKey) => this.tryBuyUpgrade(upgradeKey),
      continueToNextLevel: () => this.continueToNextLevel(),
    });
  }

  private initializeWarpTransition(): void {
    this.warpTransition = new WarpTransition();
    this.warpTransition.create(this);
  }

  private createContinuePrompt(intermissionLayout: IntermissionLayoutMetrics): void {
    createIntermissionPrompt(this, intermissionLayout, this.getContinueLabel());
  }

  private getContinueLabel(): string {
    if (this.isFinalMissionComplete) {
      return 'CAMPAIGN COMPLETE - Click, Tap, or Press Any Key';
    }

    const nextLevelLabel = getLevelConfig(this.state.level + 1).name;
    return `NEXT: ${nextLevelLabel} - Click, Tap, or Press a Key`;
  }

  private bindContinueInputs(): void {
    if (this.isFinalMissionComplete) {
      bindProceedOnInput(this, () => this.continueToNextLevel());
      return;
    }

    this.pointerdownHandler = this.createPointerDownHandler();
    this.input.on('pointerdown', this.pointerdownHandler);
    bindProceedOnInput(this, () => this.continueToNextLevel(), {
      includePointer: false,
      shouldProceedKey: (event) => this.shouldProceedFromKeyboard(event),
    });
  }

  private createPointerDownHandler(): (pointer: Phaser.Input.Pointer) => void {
    return (pointer: Phaser.Input.Pointer) => {
      if (this.transitioning) {
        return;
      }

      if (this.handleUpgradeClick(pointer)) {
        return;
      }

      this.continueToNextLevel();
    };
  }

  private handleSceneShutdown(): void {
    this.interactionController?.destroy();
    this.interactionController = undefined;

    if (this.pointerdownHandler) {
      this.input.off('pointerdown', this.pointerdownHandler);
      this.pointerdownHandler = undefined;
    }

    this.buttons = [];
    this.input.setDefaultCursor('default');
    this.transitioning = false;
  }

  private generatePlanetTexture(colorPair: [number, number], y: number, scale: number): void {
    const layout = getViewportLayout(this);
    const key = `planet-level-${this.state.level}`;

    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      const cx = 60;
      const cy = 60;
      const r = 50;

      g.fillStyle(colorPair[0], 1);
      g.fillCircle(cx, cy, r);

      g.fillStyle(colorPair[1], 0.6);
      g.fillCircle(cx - 10, cy - 8, r * 0.7);

      g.fillStyle(0x000000, 0.2);
      g.fillCircle(cx + 15, cy + 10, r * 0.5);

      g.lineStyle(1, colorPair[1], 0.3);
      for (let i = 0; i < 3; i++) {
        const ringY = cy - 20 + i * 20;
        g.beginPath();
        g.moveTo(cx - r + 5, ringY);
        g.lineTo(cx + r - 5, ringY);
        g.strokePath();
      }

      g.generateTexture(key, 120, 120);
      g.destroy();
    }

    this.add.image(layout.centerX, y, key).setScale(scale).setDepth(1);
  }

  private createUpgradeButtons(intermissionLayout: IntermissionLayoutMetrics): void {
    const evaluations = evaluateUpgrades(this.state.level, this.state.score, this.state.upgrades);
    const gridLayout = intermissionLayout.gridLayout;
    const startX = getUpgradeGridStartX(this, gridLayout);

    for (let i = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i];

      const col = i % gridLayout.columns;
      const row = Math.floor(i / gridLayout.columns);
      const bx = startX + col * (gridLayout.buttonWidth + gridLayout.spacingX);
      const by = intermissionLayout.gridTop + row * (gridLayout.buttonHeight + gridLayout.spacingY);

      this.buttons.push(createUpgradeButton(this, bx, by, evaluation, gridLayout));
    }
  }

  private handleUpgradeClick(pointer: Phaser.Input.Pointer): boolean {
    const buttonIndex = findButtonIndexAtPoint(this.buttons, pointer.x, pointer.y);
    if (buttonIndex === -1) {
      return false;
    }

    const button = this.buttons[buttonIndex];
    if (this.getButtonEvaluation(button).canPurchase) {
      this.tryBuyUpgrade(button.upgradeKey);
    }

    return true;
  }

  private tryBuyUpgrade(upgradeKey: UpgradeKey): boolean {
    const button = this.buttons.find((entry) => entry.upgradeKey === upgradeKey);
    if (!button) {
      return false;
    }

    const evaluation = this.getButtonEvaluation(button);
    if (!evaluation.canPurchase) {
      return false;
    }

    this.state.score -= evaluation.cost;
    this.state.upgrades[upgradeKey] += 1;
    setPlayerState(this.registry, this.state);

    audioManager.playPowerUp();

    this.scoreText.setText(`CREDITS: ${this.state.score}`);
    this.refreshButtons();
    this.handlePostPurchaseFocus(button, upgradeKey);

    return true;
  }

  private handlePostPurchaseFocus(button: UpgradeButton, upgradeKey: UpgradeKey): void {
    const buttonIndex = this.buttons.findIndex((entry) => entry.upgradeKey === upgradeKey);
    if (!this.interactionController?.isFocusedButton(buttonIndex)) {
      return;
    }

    const newEval = this.getButtonEvaluation(button);
    if (!newEval.canPurchase) {
      this.interactionController.moveFocusAfterPurchase();
    }
  }

  private refreshButtons(): void {
    for (const btn of this.buttons) {
      updateUpgradeButton(btn, this.getButtonEvaluation(btn));
    }

    this.interactionController?.refreshIndicators();
  }

  private getButtonEvaluation(button: UpgradeButton): UpgradeEvaluation {
    return evaluateUpgrade(
      getUpgradeByKey(button.upgradeKey),
      this.state.level,
      this.state.score,
      this.state.upgrades
    );
  }

  private continueToNextLevel(): void {
    if (this.transitioning) {
      return;
    }

    this.transitioning = true;
    this.beginSceneTransition();
  }

  private beginSceneTransition(): void {
    audioManager.playClick();
    this.unbindPointerDownHandler();

    if (this.isFinalMissionComplete) {
      this.transitionToVictory();
      return;
    }

    this.transitionToNextGameLevel();
  }

  private unbindPointerDownHandler(): void {
    if (!this.pointerdownHandler) {
      return;
    }

    this.input.off('pointerdown', this.pointerdownHandler);
    this.pointerdownHandler = undefined;
  }

  private transitionToVictory(): void {
    const runSummary = getRunSummary(this.registry);
    setRunSummary(this.registry, {
      finalScore: runSummary.finalScore,
      levelReached: this.state.level,
    });
    startRegisteredScene(this, 'Victory');
  }

  private transitionToNextGameLevel(): void {
    this.warpTransition.play(() => {
      advanceToNextLevel(this.registry);
      startRegisteredScene(this, 'Game');
    });
  }

  private shouldProceedFromKeyboard(event: KeyboardEvent): boolean {
    switch (event.code) {
      case 'Tab':
      case 'Enter':
      case 'Space':
      case 'Escape':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'ControlLeft':
      case 'ControlRight':
      case 'AltLeft':
      case 'AltRight':
      case 'MetaLeft':
      case 'MetaRight':
        return false;
      default:
        return true;
    }
  }

}
