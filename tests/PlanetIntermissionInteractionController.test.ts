import { describe, expect, mock, test } from 'bun:test';

import type Phaser from 'phaser';

import type { UpgradeEvaluation } from '../src/config/UpgradesConfig';
import type { UpgradeButton } from '../src/scenes/planetIntermission/shared';

mock.module('phaser', () => {
  class Rectangle {
    static Contains = () => true;

    constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number
    ) {}
  }

  return {
    default: {
      Geom: {
        Rectangle,
      },
    },
  };
});

const { PlanetIntermissionInteractionController } = await import(
  '../src/scenes/planetIntermission/interactionController'
);

type EventHandler<T = unknown> = (event?: T) => void;

class ButtonBgStub {
  private handlers = new Map<string, EventHandler[]>();

  setInteractive(): this {
    return this;
  }

  on(event: string, handler: EventHandler): this {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler);
    this.handlers.set(event, existing);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      existing.filter((candidate) => candidate !== handler)
    );
    return this;
  }

  trigger(event: string): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler();
    }
  }

  handlerCount(event: string): number {
    return (this.handlers.get(event) ?? []).length;
  }
}

function createGraphicsStub(): Phaser.GameObjects.Graphics {
  return {
    clear: () => undefined,
    lineStyle: () => undefined,
    strokeRoundedRect: () => undefined,
    fillStyle: () => undefined,
    fillRoundedRect: () => undefined,
  } as unknown as Phaser.GameObjects.Graphics;
}

type KeyboardMap = Map<string, EventHandler<KeyboardEvent>[]>;

type InputHarness = {
  input: Phaser.Input.InputPlugin;
  keyboardHandlers: KeyboardMap;
  pointerHandlers: Map<string, EventHandler[]>;
  cursorHistory: string[];
};

function createInputHarness(): InputHarness {
  const keyboardHandlers: KeyboardMap = new Map();
  const pointerHandlers = new Map<string, EventHandler[]>();
  const cursorHistory: string[] = [];

  const input = {
    keyboard: {
      on: (event: string, handler: EventHandler<KeyboardEvent>) => {
        const existing = keyboardHandlers.get(event) ?? [];
        existing.push(handler);
        keyboardHandlers.set(event, existing);
      },
      off: (event: string, handler: EventHandler<KeyboardEvent>) => {
        const existing = keyboardHandlers.get(event) ?? [];
        keyboardHandlers.set(
          event,
          existing.filter((candidate) => candidate !== handler)
        );
      },
    },
    on: (event: string, handler: EventHandler) => {
      const existing = pointerHandlers.get(event) ?? [];
      existing.push(handler);
      pointerHandlers.set(event, existing);
    },
    off: (event: string, handler: EventHandler) => {
      const existing = pointerHandlers.get(event) ?? [];
      pointerHandlers.set(
        event,
        existing.filter((candidate) => candidate !== handler)
      );
    },
    setDefaultCursor: (cursor: string) => {
      cursorHistory.push(cursor);
    },
  } as unknown as Phaser.Input.InputPlugin;

  return {
    input,
    keyboardHandlers,
    pointerHandlers,
    cursorHistory,
  };
}

type PurchaseState = {
  canPurchase: boolean;
  cost: number;
};

type ControllerHarness = {
  controller: PlanetIntermissionInteractionController;
  buttons: Array<{ bg: ButtonBgStub; upgradeKey: string }>;
  keyboardHandlers: KeyboardMap;
  pointerHandlers: Map<string, EventHandler[]>;
  cursorHistory: string[];
  purchases: string[];
  continueCalls: number;
  purchaseState: Map<string, PurchaseState>;
};

function createControllerHarness(initialPurchasable: boolean[]): ControllerHarness {
  const inputHarness = createInputHarness();
  const focusGraphics = createGraphicsStub();
  const hoverGraphics = createGraphicsStub();

  const buttons: Array<{ bg: ButtonBgStub; upgradeKey: string; button: UpgradeButton }> = initialPurchasable.map((canPurchase, index) => {
    const bg = new ButtonBgStub();
    return {
      bg,
      upgradeKey: `upgrade-${index}`,
      button: {
        bg,
        text: {},
        costText: {},
        levelText: {},
        upgradeKey: `upgrade-${index}`,
        x: index * 100,
        y: 100,
        width: 80,
        height: 40,
        borderRadius: 8,
        layout: {
          top: 100,
          columns: 3,
          buttonWidth: 80,
          buttonHeight: 40,
          spacingX: 20,
          spacingY: 10,
          textInsetX: 0,
          titleOffsetY: 0,
          descriptionOffsetY: 0,
          costInsetX: 0,
          borderRadius: 8,
          titleFontSize: '12px',
          descriptionFontSize: '10px',
          costFontSize: '12px',
        },
      },
    };
  });

  const purchaseState = new Map<string, PurchaseState>(
    buttons.map((entry, index) => [entry.upgradeKey, { canPurchase: initialPurchasable[index], cost: 100 }])
  );

  const purchases: string[] = [];
  let continueCalls = 0;

  const scene = {
    input: inputHarness.input,
  } as unknown as Phaser.Scene;

  const controller = new PlanetIntermissionInteractionController({
    scene,
    buttons: buttons.map((entry) => entry.button),
    focusGraphics,
    hoverGraphics,
    evaluateButton: (button): UpgradeEvaluation => purchaseState.get(button.upgradeKey) as UpgradeEvaluation,
    tryBuyUpgrade: (upgradeKey) => {
      const state = purchaseState.get(upgradeKey);
      if (!state || !state.canPurchase) {
        return false;
      }

      state.canPurchase = false;
      purchases.push(upgradeKey);
      return true;
    },
    continueToNextLevel: () => {
      continueCalls += 1;
    },
  });

  return {
    controller,
    buttons: buttons.map((entry) => ({ bg: entry.bg, upgradeKey: entry.upgradeKey })),
    keyboardHandlers: inputHarness.keyboardHandlers,
    pointerHandlers: inputHarness.pointerHandlers,
    cursorHistory: inputHarness.cursorHistory,
    purchases,
    get continueCalls() {
      return continueCalls;
    },
    purchaseState,
  };
}

function triggerKeyboardEvent(
  handlers: KeyboardMap,
  eventName: string,
  event?: Partial<KeyboardEvent>
): void {
  const callbacks = handlers.get(eventName) ?? [];
  for (const callback of callbacks) {
    callback(event as KeyboardEvent);
  }
}

describe('PlanetIntermissionInteractionController', () => {
  test('keyboard activation purchases focused upgrade and advances focus to next purchasable button', () => {
    const harness = createControllerHarness([false, true, true]);

    harness.controller.initialize();

    triggerKeyboardEvent(harness.keyboardHandlers, 'keydown-ENTER');

    expect(harness.purchases).toEqual(['upgrade-1']);
    expect(harness.controller.isFocusedButton(2)).toBe(true);

    triggerKeyboardEvent(harness.keyboardHandlers, 'keydown-ENTER');

    expect(harness.purchases).toEqual(['upgrade-1', 'upgrade-2']);
    expect(harness.controller.isFocusedButton(-1)).toBe(true);

    triggerKeyboardEvent(harness.keyboardHandlers, 'keydown-ESC');
    expect(harness.continueCalls).toBe(1);
  });

  test('hover and pointer movement update cursor for purchasable/disabled/outside states', () => {
    const harness = createControllerHarness([true, false]);

    harness.controller.initialize();

    harness.buttons[1].bg.trigger('pointerover');
    expect(harness.cursorHistory.at(-1)).toBe('not-allowed');

    harness.buttons[1].bg.trigger('pointerout');
    expect(harness.cursorHistory.at(-1)).toBe('default');

    const pointerMoveHandlers = harness.pointerHandlers.get('pointermove') ?? [];
    for (const handler of pointerMoveHandlers) {
      handler({ x: 10, y: 110 });
    }
    expect(harness.cursorHistory.at(-1)).toBe('pointer');

    for (const handler of pointerMoveHandlers) {
      handler({ x: 999, y: 999 });
    }
    expect(harness.cursorHistory.at(-1)).toBe('default');
  });

  test('destroy unregisters keyboard, pointermove, and per-button hover listeners', () => {
    const harness = createControllerHarness([true, true]);

    harness.controller.initialize();

    expect((harness.pointerHandlers.get('pointermove') ?? []).length).toBe(1);
    expect(harness.buttons[0].bg.handlerCount('pointerover')).toBe(1);
    expect(harness.buttons[0].bg.handlerCount('pointerout')).toBe(1);

    harness.controller.destroy();

    for (const handlers of harness.keyboardHandlers.values()) {
      expect(handlers.length).toBe(0);
    }
    expect((harness.pointerHandlers.get('pointermove') ?? []).length).toBe(0);
    expect(harness.buttons[0].bg.handlerCount('pointerover')).toBe(0);
    expect(harness.buttons[0].bg.handlerCount('pointerout')).toBe(0);
    expect(harness.buttons[1].bg.handlerCount('pointerover')).toBe(0);
    expect(harness.buttons[1].bg.handlerCount('pointerout')).toBe(0);
    expect(harness.cursorHistory.at(-1)).toBe('default');
  });

  test('destroy is idempotent and re-initialize rebinds exactly one active handler set', () => {
    const harness = createControllerHarness([true, true]);

    harness.controller.initialize();
    harness.controller.destroy();
    harness.controller.destroy();
    harness.controller.initialize();

    expect((harness.keyboardHandlers.get('keydown-ENTER') ?? []).length).toBe(1);
    expect((harness.keyboardHandlers.get('keydown-ESC') ?? []).length).toBe(1);
    expect((harness.pointerHandlers.get('pointermove') ?? []).length).toBe(1);
    expect(harness.buttons[0].bg.handlerCount('pointerover')).toBe(1);
    expect(harness.buttons[0].bg.handlerCount('pointerout')).toBe(1);
    expect(harness.buttons[1].bg.handlerCount('pointerover')).toBe(1);
    expect(harness.buttons[1].bg.handlerCount('pointerout')).toBe(1);

    triggerKeyboardEvent(harness.keyboardHandlers, 'keydown-ESC');
    expect(harness.continueCalls).toBe(1);
  });
});
