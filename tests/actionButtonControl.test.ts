import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({ default: {} }));

const { createActionButtonControl } = await import('../src/scenes/shared/actionButtonControl');

type Handler = () => void;

class GraphicsStub {
  setPosition(): this {
    return this;
  }

  setDepth(): this {
    return this;
  }

  setVisible(): this {
    return this;
  }

  clear(): this {
    return this;
  }

  fillStyle(): this {
    return this;
  }

  fillRoundedRect(): this {
    return this;
  }

  lineStyle(): this {
    return this;
  }

  strokeRoundedRect(): this {
    return this;
  }

  lineBetween(): this {
    return this;
  }

  fillRect(): this {
    return this;
  }

  beginPath(): this {
    return this;
  }

  moveTo(): this {
    return this;
  }

  lineTo(): this {
    return this;
  }

  closePath(): this {
    return this;
  }

  fillPath(): this {
    return this;
  }

  strokePath(): this {
    return this;
  }

  arc(): this {
    return this;
  }

  fillCircle(): this {
    return this;
  }

  strokeCircle(): this {
    return this;
  }

  destroy(): void {}
}

class TextStub {
  color = '#f6fbff';

  setOrigin(): this {
    return this;
  }

  setPosition(): this {
    return this;
  }

  setDepth(): this {
    return this;
  }

  setVisible(): this {
    return this;
  }

  setText(): this {
    return this;
  }

  setColor(color: string): this {
    this.color = color;
    return this;
  }

  destroy(): void {}
}

class ZoneStub {
  interactive = false;
  handlers = new Map<string, Handler>();

  setOrigin(): this {
    return this;
  }

  setPosition(): this {
    return this;
  }

  setSize(): this {
    return this;
  }

  setDepth(): this {
    return this;
  }

  setVisible(): this {
    return this;
  }

  setInteractive(): this {
    this.interactive = true;
    return this;
  }

  disableInteractive(): this {
    this.interactive = false;
    return this;
  }

  on(event: string, handler: Handler): this {
    this.handlers.set(event, handler);
    return this;
  }

  trigger(event: string): void {
    this.handlers.get(event)?.();
  }

  destroy(): void {}
}

function createScene() {
  const zone = new ZoneStub();

  return {
    scene: {
      add: {
        graphics: () => new GraphicsStub(),
        text: () => new TextStub(),
        zone: () => zone,
      },
    },
    zone,
  };
}

describe('actionButtonControl', () => {
  test('disabled variant is non-interactive on creation', () => {
    let clicked = 0;
    const { scene, zone } = createScene();

    createActionButtonControl(scene as never, {
      label: 'LOAD',
      width: 120,
      height: 40,
      variant: 'disabled',
      onClick: () => {
        clicked += 1;
      },
    });

    expect(zone.interactive).toBe(false);
    zone.trigger('pointerdown');
    expect(clicked).toBe(0);
  });

  test('switching to disabled variant removes interactivity until restored', () => {
    let clicked = 0;
    const { scene, zone } = createScene();

    const control = createActionButtonControl(scene as never, {
      label: 'SAVE',
      width: 120,
      height: 40,
      variant: 'primary',
      onClick: () => {
        clicked += 1;
      },
    });

    expect(zone.interactive).toBe(true);
    zone.trigger('pointerdown');
    expect(clicked).toBe(1);

    control.setVariant('disabled');
    expect(zone.interactive).toBe(false);
    zone.trigger('pointerdown');
    expect(clicked).toBe(1);

    control.setVariant('primary');
    expect(zone.interactive).toBe(true);
    zone.trigger('pointerdown');
    expect(clicked).toBe(2);
  });
});
