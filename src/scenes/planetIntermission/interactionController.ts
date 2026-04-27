import Phaser from 'phaser';

import type { UpgradeEvaluation, UpgradeKey } from '../../config/UpgradesConfig';
import {
  drawFocusIndicator,
  drawHoverIndicator,
  findButtonIndexAtPoint,
  findColumnFocusIndex,
  findFirstPurchasableButton,
  findLinearFocusIndex,
  findNextPurchasableAfter,
  findRowFocusIndex,
} from './navigation';
import type { UpgradeButton } from './shared';

type KeyboardEventHandler = { event: string; callback: (event?: KeyboardEvent) => void };

type PlanetIntermissionInteractionControllerOptions = {
  scene: Phaser.Scene;
  buttons: UpgradeButton[];
  focusGraphics: Phaser.GameObjects.Graphics;
  hoverGraphics: Phaser.GameObjects.Graphics;
  evaluateButton: (button: UpgradeButton) => UpgradeEvaluation;
  tryBuyUpgrade: (upgradeKey: UpgradeKey) => boolean;
  continueToNextLevel: () => void;
};

export class PlanetIntermissionInteractionController {
  private readonly scene: Phaser.Scene;
  private readonly buttons: UpgradeButton[];
  private readonly focusGraphics: Phaser.GameObjects.Graphics;
  private readonly hoverGraphics: Phaser.GameObjects.Graphics;
  private readonly evaluateButton: (button: UpgradeButton) => UpgradeEvaluation;
  private readonly tryBuyUpgrade: (upgradeKey: UpgradeKey) => boolean;
  private readonly continueToNextLevel: () => void;

  private focusedButtonIndex = -1;
  private hoveredButtonIndex = -1;
  private showKeyboardFocus = false;
  private keyboardEventHandlers: KeyboardEventHandler[] = [];
  private pointermoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private buttonPointerHandlers: Map<number, { over: () => void; out: () => void }> = new Map();
  private initialized = false;

  constructor(options: PlanetIntermissionInteractionControllerOptions) {
    this.scene = options.scene;
    this.buttons = options.buttons;
    this.focusGraphics = options.focusGraphics;
    this.hoverGraphics = options.hoverGraphics;
    this.evaluateButton = options.evaluateButton;
    this.tryBuyUpgrade = options.tryBuyUpgrade;
    this.continueToNextLevel = options.continueToNextLevel;
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.setupKeyboardNavigation();
    this.setupHoverEffects();
    this.setInitialFocus();
    this.initialized = true;
  }

  destroy(): void {
    for (const handler of this.keyboardEventHandlers) {
      this.scene.input.keyboard?.off(handler.event, handler.callback);
    }
    this.keyboardEventHandlers = [];

    if (this.pointermoveHandler) {
      this.scene.input.off('pointermove', this.pointermoveHandler);
      this.pointermoveHandler = undefined;
    }

    for (const [index, handlers] of this.buttonPointerHandlers) {
      const button = this.buttons[index];
      if (!button) {
        continue;
      }

      button.bg.off('pointerover', handlers.over);
      button.bg.off('pointerout', handlers.out);
    }
    this.buttonPointerHandlers.clear();
    this.focusedButtonIndex = -1;
    this.hoveredButtonIndex = -1;
    this.showKeyboardFocus = false;
    this.initialized = false;
    this.refreshIndicators();
    this.scene.input.setDefaultCursor('default');
  }

  refreshIndicators(): void {
    this.updateFocusIndicator();
    this.updateHoverIndicator();
  }

  isFocusedButton(index: number): boolean {
    return this.focusedButtonIndex === index;
  }

  private setupKeyboardNavigation(): void {
    const handlers: KeyboardEventHandler[] = [
      {
        event: 'keydown-TAB',
        callback: (event?: KeyboardEvent) => {
          if (event) {
            event.preventDefault();
            this.setKeyboardFocusVisible(true);
            if (event.shiftKey) {
              this.moveFocus(-1);
            } else {
              this.moveFocus(1);
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

    for (const handler of handlers) {
      this.scene.input.keyboard?.on(handler.event, handler.callback);
      this.keyboardEventHandlers.push(handler);
    }
  }

  private setInitialFocus(): void {
    this.focusedButtonIndex = findFirstPurchasableButton(this.buttons, (button) => this.evaluateButton(button));
    this.updateFocusIndicator();
  }

  private moveFocus(direction: number): void {
    this.focusButton(
      findLinearFocusIndex(this.buttons, this.focusedButtonIndex, direction, (button) => this.evaluateButton(button))
    );
  }

  private moveFocusInRow(direction: number): void {
    this.focusButton(
      findRowFocusIndex(this.buttons, this.focusedButtonIndex, direction, (button) => this.evaluateButton(button))
    );
  }

  private moveFocusInColumn(direction: number): void {
    this.focusButton(
      findColumnFocusIndex(this.buttons, this.focusedButtonIndex, direction, (button) => this.evaluateButton(button))
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
    const evaluation = this.evaluateButton(button);

    if (evaluation.canPurchase) {
      const success = this.tryBuyUpgrade(button.upgradeKey);
      if (success) {
        this.moveFocusAfterPurchase();
      }
    }
  }

  moveFocusAfterPurchase(): void {
    this.focusButton(findNextPurchasableAfter(this.buttons, this.focusedButtonIndex, (button) => this.evaluateButton(button)));
  }

  private setupHoverEffects(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      const buttonBg = button.bg;

      buttonBg.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, button.width, button.height),
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
      this.buttonPointerHandlers.set(i, { over: overHandler, out: outHandler });
    }

    this.pointermoveHandler = (pointer: Phaser.Input.Pointer) => {
      this.updateCursorFromPointer(pointer);
    };
    this.scene.input.on('pointermove', this.pointermoveHandler);
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
    if (!button || !this.evaluateButton(button).canPurchase) {
      drawHoverIndicator(this.hoverGraphics, undefined);
      return;
    }

    drawHoverIndicator(this.hoverGraphics, button);
  }

  private updateCursorForButton(index: number): void {
    if (index === -1 || index >= this.buttons.length) {
      this.scene.input.setDefaultCursor('default');
      return;
    }

    const button = this.buttons[index];
    const evaluation = this.evaluateButton(button);

    if (evaluation.canPurchase) {
      this.scene.input.setDefaultCursor('pointer');
    } else {
      this.scene.input.setDefaultCursor('not-allowed');
    }
  }

  private updateCursorFromPointer(pointer: Phaser.Input.Pointer): void {
    const buttonIndex = findButtonIndexAtPoint(this.buttons, pointer.x, pointer.y);
    if (buttonIndex === -1) {
      this.scene.input.setDefaultCursor('default');
    } else if (buttonIndex !== this.hoveredButtonIndex) {
      this.updateCursorForButton(buttonIndex);
    }
  }
}
