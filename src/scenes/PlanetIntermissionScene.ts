import Phaser from 'phaser';
import { getPlayerState, setPlayerState, advanceToNextLevel, PlayerStateData, getRunSummary, setRunSummary } from '../systems/PlayerState';
import { getLevelConfig, isLastLevel } from '../config/LevelsConfig';
import { UpgradeEvaluation, UpgradeKey, evaluateUpgrade, evaluateUpgrades, getUpgradeByKey } from '../config/UpgradesConfig';
import { centerHorizontally, getViewportLayout } from '../utils/layout';
import { WarpTransition } from '../systems/WarpTransition';
import { audioManager } from '../systems/AudioManager';
import { createPromptText } from './shared/createPromptText';
import {
  drawFocusIndicator,
  drawHoverIndicator,
  findButtonIndexAtPoint,
  findColumnFocusIndex,
  findFirstPurchasableButton,
  findLinearFocusIndex,
  findNextPurchasableAfter,
  findRowFocusIndex,
} from './planetIntermission/navigation';
import { createUpgradeButton, updateUpgradeButton } from './planetIntermission/upgradeButtons';
import { UPGRADE_GRID_LAYOUT, type UpgradeButton } from './planetIntermission/shared';

export class PlanetIntermissionScene extends Phaser.Scene {
  private state!: PlayerStateData;
  private scoreText!: Phaser.GameObjects.Text;
  private buttons: UpgradeButton[] = [];
  private warpTransition!: WarpTransition;
  private focusedButtonIndex: number = -1;
  private focusGraphics!: Phaser.GameObjects.Graphics;
  private hoveredButtonIndex: number = -1;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private isFinalMissionComplete: boolean = false;
  private showKeyboardFocus = false;
  private transitioning = false;
  // Event listener tracking for proper cleanup
  private keyboardEventHandlers: { event: string; callback: (event?: KeyboardEvent) => void }[] = [];
  private pointerdownHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pointermoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private buttonPointerHandlers: Map<number, { over: () => void; out: () => void }> = new Map();

  constructor() {
    super({ key: 'PlanetIntermission' });
  }

  create(): void {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.handleSceneDestroy, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneDestroy, this);

    audioManager.init();
    audioManager.stopMusic();
    this.state = getPlayerState(this.registry);
    this.isFinalMissionComplete = isLastLevel(this.state.level);
    this.showKeyboardFocus = false;
    this.transitioning = false;
    this.cameras.main.setBackgroundColor('#000011');
    const layout = getViewportLayout(this);

    const completedLevelConfig = getLevelConfig(this.state.level);

    this.generatePlanetTexture(completedLevelConfig.planetPalette);

    this.add.text(layout.centerX, 50, completedLevelConfig.planetName, {
      fontSize: '20px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(layout.centerX, 85, 'PLANET APPROACHED', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(layout.centerX, 130, `LEVEL ${this.state.level} COMPLETE`, {
      fontSize: '18px',
      color: '#44ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(layout.centerX, 170, `CREDITS: ${this.state.score}`, {
      fontSize: '24px',
      color: '#ffcc00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Initialize focus graphics for keyboard navigation
    this.focusGraphics = this.add.graphics();
    this.focusGraphics.setDepth(10);

    // Initialize hover graphics for mouse interaction
    this.hoverGraphics = this.add.graphics();
    this.hoverGraphics.setDepth(9);

    if (!this.isFinalMissionComplete) {
      this.createUpgradeButtons();
      this.setupKeyboardNavigation();
      this.setupHoverEffects();
      // Set initial focus to first available button
      this.setInitialFocus();
    }

    this.warpTransition = new WarpTransition();
    this.warpTransition.create(this);

    const nextLevelLabel = this.isFinalMissionComplete
      ? null
      : getLevelConfig(this.state.level + 1).name;

    const continueLabel = this.isFinalMissionComplete
      ? 'CAMPAIGN COMPLETE - Click for Victory'
      : `NEXT: ${nextLevelLabel} - Click to Continue`;

    createPromptText(this, layout.centerX, layout.bottom - 60, continueLabel, {
      color: '#b8c8dd',
      fontSize: '20px',
    });

    this.pointerdownHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.transitioning) {
        return;
      }

      if (!this.isFinalMissionComplete && this.handleUpgradeClick(pointer)) {
        return;
      }

      this.continueToNextLevel();
    };

    this.input.on('pointerdown', this.pointerdownHandler);
  }

  private handleSceneShutdown(): void {
    for (const handler of this.keyboardEventHandlers) {
      this.input.keyboard?.off(handler.event, handler.callback);
    }
    this.keyboardEventHandlers = [];

    if (this.pointerdownHandler) {
      this.input.off('pointerdown', this.pointerdownHandler);
      this.pointerdownHandler = undefined;
    }

    if (this.pointermoveHandler) {
      this.input.off('pointermove', this.pointermoveHandler);
      this.pointermoveHandler = undefined;
    }

    this.buttonPointerHandlers.clear();
    this.buttons = [];
    this.input.setDefaultCursor('default');
    this.focusedButtonIndex = -1;
    this.hoveredButtonIndex = -1;
    this.showKeyboardFocus = false;
    this.transitioning = false;
  }

  private handleSceneDestroy(): void {
    this.handleSceneShutdown();
  }

  private generatePlanetTexture(colorPair: [number, number]): void {
    const layout = getViewportLayout(this);
    const key = `planet-level-${this.state.level}`;

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

    this.add.image(layout.centerX, 270, key).setScale(1.5).setDepth(1);
  }

  private createUpgradeButtons(): void {
    const layout = getViewportLayout(this);
    const evaluations = evaluateUpgrades(this.state.level, this.state.score, this.state.upgrades);
    const gridWidth =
      UPGRADE_GRID_LAYOUT.buttonWidth * UPGRADE_GRID_LAYOUT.columns +
      UPGRADE_GRID_LAYOUT.spacingX * (UPGRADE_GRID_LAYOUT.columns - 1);
    const startX = centerHorizontally(layout, gridWidth);

    for (let i = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i];

      const col = i % UPGRADE_GRID_LAYOUT.columns;
      const row = Math.floor(i / UPGRADE_GRID_LAYOUT.columns);
      const bx = startX + col * (UPGRADE_GRID_LAYOUT.buttonWidth + UPGRADE_GRID_LAYOUT.spacingX);
      const by = UPGRADE_GRID_LAYOUT.top + row * (UPGRADE_GRID_LAYOUT.buttonHeight + UPGRADE_GRID_LAYOUT.spacingY);

      this.buttons.push(createUpgradeButton(this, bx, by, evaluation));
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
    if (buttonIndex === this.focusedButtonIndex) {
      const newEval = this.getButtonEvaluation(button);
      if (!newEval.canPurchase) {
        this.moveFocusAfterPurchase();
      }
    }

    return true;
  }

  private refreshButtons(): void {
    for (const btn of this.buttons) {
      updateUpgradeButton(btn, this.getButtonEvaluation(btn));
    }

    this.updateFocusIndicator();
    this.updateHoverIndicator();
  }

  private getButtonEvaluation(button: UpgradeButton): UpgradeEvaluation {
    return evaluateUpgrade(
      getUpgradeByKey(button.upgradeKey),
      this.state.level,
      this.state.score,
      this.state.upgrades
    );
  }

  private setupKeyboardNavigation(): void {
    // Define keyboard handlers with tracking
    const handlers: { event: string; callback: (event?: KeyboardEvent) => void }[] = [
      {
        event: 'keydown-TAB',
        callback: (event?: KeyboardEvent) => {
          if (event) {
            event.preventDefault();
            this.setKeyboardFocusVisible(true);
            if (event.shiftKey) {
              this.moveFocus(-1); // Shift+Tab: move backward
            } else {
              this.moveFocus(1); // Tab: move forward
            }
          }
        },
      },
      {
        event: 'keydown-ARROW_RIGHT',
        callback: () => {
          this.setKeyboardFocusVisible(true);
          this.moveFocusInRow(1);
        },
      },
      {
        event: 'keydown-ARROW_LEFT',
        callback: () => {
          this.setKeyboardFocusVisible(true);
          this.moveFocusInRow(-1);
        },
      },
      {
        event: 'keydown-ARROW_DOWN',
        callback: () => {
          this.setKeyboardFocusVisible(true);
          this.moveFocusInColumn(1);
        },
      },
      {
        event: 'keydown-ARROW_UP',
        callback: () => {
          this.setKeyboardFocusVisible(true);
          this.moveFocusInColumn(-1);
        },
      },
      {
        event: 'keydown-ENTER',
        callback: () => {
          this.setKeyboardFocusVisible(true);
          this.activateFocusedButton();
        },
      },
      {
        event: 'keydown-SPACE',
        callback: () => {
          this.setKeyboardFocusVisible(true);
          this.activateFocusedButton();
        },
      },
      {
        event: 'keydown-ESC',
        callback: () => {
          this.continueToNextLevel();
        },
      },
    ];

    // Register handlers and track them for cleanup
    for (const handler of handlers) {
      this.input.keyboard?.on(handler.event, handler.callback);
      this.keyboardEventHandlers.push(handler);
    }
  }

  private setInitialFocus(): void {
    this.focusedButtonIndex = findFirstPurchasableButton(this.buttons, (button) => this.getButtonEvaluation(button));
    this.updateFocusIndicator();
  }

  private moveFocus(direction: number): void {
    this.focusButton(
      findLinearFocusIndex(this.buttons, this.focusedButtonIndex, direction, (button) => this.getButtonEvaluation(button))
    );
  }

  private moveFocusInRow(direction: number): void {
    this.focusButton(
      findRowFocusIndex(this.buttons, this.focusedButtonIndex, direction, (button) => this.getButtonEvaluation(button))
    );
  }

  private moveFocusInColumn(direction: number): void {
    this.focusButton(
      findColumnFocusIndex(this.buttons, this.focusedButtonIndex, direction, (button) => this.getButtonEvaluation(button))
    );
  }

  private focusButton(index: number): void {
    this.focusedButtonIndex = index;
    this.updateFocusIndicator();
  }

  private updateFocusIndicator(): void {
    drawFocusIndicator(this.focusGraphics, this.showKeyboardFocus ? this.buttons[this.focusedButtonIndex] : undefined);
  }

  private setKeyboardFocusVisible(visible: boolean): void {
    if (this.showKeyboardFocus === visible) {
      return;
    }

    this.showKeyboardFocus = visible;
    this.updateFocusIndicator();
  }

  private activateFocusedButton(): void {
    if (this.focusedButtonIndex === -1 || this.focusedButtonIndex >= this.buttons.length) {
      return;
    }

    const button = this.buttons[this.focusedButtonIndex];
    const evaluation = this.getButtonEvaluation(button);

    if (evaluation.canPurchase) {
      const success = this.tryBuyUpgrade(button.upgradeKey);
      if (success) {
        // Move focus to next available button after purchase
        this.moveFocusAfterPurchase();
      }
    }
  }

  private moveFocusAfterPurchase(): void {
    this.focusButton(findNextPurchasableAfter(this.buttons, this.focusedButtonIndex, (button) => this.getButtonEvaluation(button)));
  }

  private continueToNextLevel(): void {
    if (this.transitioning) {
      return;
    }

    this.transitioning = true;
    audioManager.playClick();
    if (this.pointerdownHandler) {
      this.input.off('pointerdown', this.pointerdownHandler);
    }

    if (this.isFinalMissionComplete) {
      const runSummary = getRunSummary(this.registry);
      setRunSummary(this.registry, { finalScore: runSummary.finalScore, levelReached: this.state.level });
      this.scene.start('Victory');
    } else {
      this.warpTransition.play(() => {
        advanceToNextLevel(this.registry);
        this.scene.start('Game');
      });
    }
  }

  private setupHoverEffects(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      const buttonBg = button.bg;

      // Set up pointer events for hover detection
      buttonBg.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, UPGRADE_GRID_LAYOUT.buttonWidth, UPGRADE_GRID_LAYOUT.buttonHeight),
        Phaser.Geom.Rectangle.Contains
      );

      const overHandler = () => {
        this.onButtonHover(i);
      };

      const outHandler = () => {
        this.onButtonUnhover();
      };

      buttonBg.on('pointerover', overHandler);
      buttonBg.on('pointerout', outHandler);

      // Track handlers for cleanup
      this.buttonPointerHandlers.set(i, { over: overHandler, out: outHandler });
    }

    // Track global pointer movement for cursor updates outside buttons
    this.pointermoveHandler = (pointer: Phaser.Input.Pointer) => {
      this.updateCursorFromPointer(pointer);
    };
    this.input.on('pointermove', this.pointermoveHandler);
  }

  private onButtonHover(index: number): void {
    this.setKeyboardFocusVisible(false);
    this.hoveredButtonIndex = index;
    this.updateHoverIndicator();
    this.updateCursorForButton(index);
  }

  private onButtonUnhover(): void {
    this.setKeyboardFocusVisible(false);
    this.hoveredButtonIndex = -1;
    this.updateHoverIndicator();
    this.updateCursorForButton(-1);
  }

  private updateHoverIndicator(): void {
    const button = this.buttons[this.hoveredButtonIndex];
    if (!button || !this.getButtonEvaluation(button).canPurchase) {
      drawHoverIndicator(this.hoverGraphics, undefined);
      return;
    }

    drawHoverIndicator(this.hoverGraphics, button);
  }

  private updateCursorForButton(index: number): void {
    if (index === -1 || index >= this.buttons.length) {
      // Default cursor when not hovering a button
      this.input.setDefaultCursor('default');
      return;
    }

    const button = this.buttons[index];
    const evaluation = this.getButtonEvaluation(button);

    if (evaluation.canPurchase) {
      this.input.setDefaultCursor('pointer');
    } else {
      // Show not-allowed cursor for disabled buttons
      this.input.setDefaultCursor('not-allowed');
    }
  }

  private updateCursorFromPointer(pointer: Phaser.Input.Pointer): void {
    const buttonIndex = findButtonIndexAtPoint(this.buttons, pointer.x, pointer.y);
    if (buttonIndex === -1) {
      this.input.setDefaultCursor('default');
    } else if (buttonIndex !== this.hoveredButtonIndex) {
      this.updateCursorForButton(buttonIndex);
    }
  }
}
