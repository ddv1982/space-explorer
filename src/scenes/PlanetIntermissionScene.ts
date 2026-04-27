import Phaser from 'phaser';
import { getPlayerState, setPlayerState, advanceToNextLevel, PlayerStateData, getRunSummary, setRunSummary } from '../systems/PlayerState';
import { getLevelConfig, isLastLevel } from '../config/LevelsConfig';
import { UpgradeEvaluation, UpgradeKey, evaluateUpgrade, evaluateUpgrades, getUpgradeByKey } from '../config/UpgradesConfig';
import { getViewportLayout } from '../utils/layout';
import { rebindSceneLifecycleHandlers } from '../utils/sceneLifecycle';
import { WarpTransition } from '../systems/WarpTransition';
import { audioManager } from '../systems/AudioManager';
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
import { type UpgradeButton } from './planetIntermission/shared';
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
    rebindSceneLifecycleHandlers(this, {
      onShutdown: this.handleSceneShutdown,
      context: this,
    });
    registerRestartOnResize(this, () => !this.transitioning);

    audioManager.init();
    audioManager.stopMusic();
    this.state = getPlayerState(this.registry);
    this.isFinalMissionComplete = isLastLevel(this.state.level);
    this.interactionController = undefined;
    this.transitioning = false;
    this.cameras.main.setBackgroundColor('#000011');
    const upgradeCount = this.isFinalMissionComplete
      ? 0
      : evaluateUpgrades(this.state.level, this.state.score, this.state.upgrades).length;
    const intermissionLayout = getIntermissionLayout(this, upgradeCount);

    const completedLevelConfig = getLevelConfig(this.state.level);

    this.generatePlanetTexture(completedLevelConfig.planetPalette, intermissionLayout.planetY, intermissionLayout.planetScale);
    this.scoreText = createIntermissionHeader(this, intermissionLayout, {
      planetName: completedLevelConfig.planetName,
      level: this.state.level,
      score: this.state.score,
    });

    // Initialize focus graphics for keyboard navigation
    this.focusGraphics = this.add.graphics();
    this.focusGraphics.setDepth(10);

    // Initialize hover graphics for mouse interaction
    this.hoverGraphics = this.add.graphics();
    this.hoverGraphics.setDepth(9);

    if (!this.isFinalMissionComplete) {
      this.createUpgradeButtons(intermissionLayout);
      this.interactionController = new PlanetIntermissionInteractionController({
        scene: this,
        buttons: this.buttons,
        focusGraphics: this.focusGraphics,
        hoverGraphics: this.hoverGraphics,
        evaluateButton: (button) => this.getButtonEvaluation(button),
        tryBuyUpgrade: (upgradeKey) => this.tryBuyUpgrade(upgradeKey),
        continueToNextLevel: () => this.continueToNextLevel(),
      });
      this.interactionController.initialize();
    }

    this.warpTransition = new WarpTransition();
    this.warpTransition.create(this);

    const nextLevelLabel = this.isFinalMissionComplete
      ? null
      : getLevelConfig(this.state.level + 1).name;

    const continueLabel = this.isFinalMissionComplete
      ? 'CAMPAIGN COMPLETE - Click, Tap, or Press Any Key'
      : `NEXT: ${nextLevelLabel} - Click, Tap, or Press a Key`;

    createIntermissionPrompt(this, intermissionLayout, continueLabel);

    if (this.isFinalMissionComplete) {
      bindProceedOnInput(this, () => this.continueToNextLevel());
    } else {
      this.pointerdownHandler = (pointer: Phaser.Input.Pointer) => {
        if (this.transitioning) {
          return;
        }

        if (this.handleUpgradeClick(pointer)) {
          return;
        }

        this.continueToNextLevel();
      };

      this.input.on('pointerdown', this.pointerdownHandler);
      bindProceedOnInput(this, () => this.continueToNextLevel(), {
        includePointer: false,
        shouldProceedKey: (event) => this.shouldProceedFromKeyboard(event),
      });
    }
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

    // After purchase, if the focused button is no longer purchasable, move focus
    const buttonIndex = this.buttons.findIndex((b) => b.upgradeKey === upgradeKey);
    if (this.interactionController?.isFocusedButton(buttonIndex)) {
      const newEval = this.getButtonEvaluation(button);
      if (!newEval.canPurchase) {
        this.interactionController.moveFocusAfterPurchase();
      }
    }

    return true;
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
    audioManager.playClick();
    if (this.pointerdownHandler) {
      this.input.off('pointerdown', this.pointerdownHandler);
      this.pointerdownHandler = undefined;
    }

    if (this.isFinalMissionComplete) {
      const runSummary = getRunSummary(this.registry);
      setRunSummary(this.registry, { finalScore: runSummary.finalScore, levelReached: this.state.level });
      startRegisteredScene(this, 'Victory');
    } else {
      this.warpTransition.play(() => {
        advanceToNextLevel(this.registry);
        startRegisteredScene(this, 'Game');
      });
    }
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
