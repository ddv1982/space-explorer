import { describe, expect, mock, test } from 'bun:test';

type StubZone = {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  setOrigin: (_x: number, _y?: number) => StubZone;
  setInteractive: () => StubZone;
  on: (_event: string, _handler: () => void) => StubZone;
  setPosition: (x: number, y: number) => StubZone;
  setSize: (width: number, height: number) => StubZone;
  setVisible: (visible: boolean) => StubZone;
  setDepth: (_depth: number) => StubZone;
  destroy: () => void;
};

type StubGraphics = {
  visible: boolean;
  clear: () => StubGraphics;
  fillStyle: (_color: number, _alpha: number) => StubGraphics;
  fillRect: (_x: number, _y: number, _width: number, _height: number) => StubGraphics;
  fillRoundedRect: (_x: number, _y: number, _width: number, _height: number, _radius: number) => StubGraphics;
  lineStyle: (_width: number, _color: number, _alpha: number) => StubGraphics;
  strokeRoundedRect: (_x: number, _y: number, _width: number, _height: number, _radius: number) => StubGraphics;
  lineBetween: (_x1: number, _y1: number, _x2: number, _y2: number) => StubGraphics;
  beginPath: () => StubGraphics;
  moveTo: (_x: number, _y: number) => StubGraphics;
  lineTo: (_x: number, _y: number) => StubGraphics;
  closePath: () => StubGraphics;
  strokePath: () => StubGraphics;
  fillPath: () => StubGraphics;
  fillCircle: (_x: number, _y: number, _radius: number) => StubGraphics;
  strokeCircle: (_x: number, _y: number, _radius: number) => StubGraphics;
  setDepth: (_depth: number) => StubGraphics;
  setVisible: (visible: boolean) => StubGraphics;
  destroy: () => void;
};

type StubText = {
  visible: boolean;
  text: string;
  x: number;
  y: number;
  setOrigin: (_x: number, _y?: number) => StubText;
  setDepth: (_depth: number) => StubText;
  setPosition: (x: number, y: number) => StubText;
  setWordWrapWidth: (_width: number) => StubText;
  setFontSize: (_size: string | number) => StubText;
  setVisible: (visible: boolean) => StubText;
  setText: (value: string) => StubText;
  setColor: (_value: string) => StubText;
  destroy: () => void;
};

type StubButton = {
  visible: boolean;
  enabled: boolean;
  setDepth: (_depth: number) => void;
  setVisible: (visible: boolean) => void;
  setPosition: (_x: number, _y: number) => void;
  setEnabled: (enabled: boolean) => void;
  setLabel: (_label: string) => void;
  destroy: () => void;
};

mock.module('phaser', () => ({
  default: {
    Scale: {
      Events: {
        RESIZE: 'resize',
      },
    },
  },
}));

mock.module('../src/scenes/shared/actionButtonControl', () => ({
  createActionButtonControl: () => {
    const button: StubButton = {
      visible: true,
      enabled: true,
      setDepth() {},
      setVisible(visible) {
        this.visible = visible;
      },
      setPosition() {},
      setEnabled(enabled) {
        this.enabled = enabled;
      },
      setLabel() {},
      destroy() {},
    };

    return button;
  },
}));

mock.module('../src/scenes/shared/musicSliderCluster', () => ({
  createMusicSliderCluster: () => ({ visible: true }),
  destroyMusicSliderCluster: () => {},
  setMusicSliderClusterDepth: () => {},
  setMusicSliderClusterPosition: () => {},
  setMusicSliderClusterVisible: () => {},
}));

mock.module('../src/utils/layout', () => ({
  getViewportBounds: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, centerX: 640, centerY: 360 }),
  getViewportLayout: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, centerX: 640, centerY: 360 }),
  centerHorizontally: (layout: { left: number; width: number }, width: number) => layout.left + (layout.width - width) / 2,
}));

const { PauseOverlay } = await import('../src/scenes/gameScene/PauseOverlay');

function createZone(): StubZone {
  return {
    visible: true,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    setOrigin() { return this; },
    setInteractive() { return this; },
    on() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setSize(width, height) { this.width = width; this.height = height; return this; },
    setVisible(visible) { this.visible = visible; return this; },
    setDepth() { return this; },
    destroy() {},
  };
}

function createGraphics(): StubGraphics {
  return {
    visible: true,
    clear() { return this; },
    fillStyle() { return this; },
    fillRect() { return this; },
    fillRoundedRect() { return this; },
    lineStyle() { return this; },
    strokeRoundedRect() { return this; },
    lineBetween() { return this; },
    beginPath() { return this; },
    moveTo() { return this; },
    lineTo() { return this; },
    closePath() { return this; },
    strokePath() { return this; },
    fillPath() { return this; },
    fillCircle() { return this; },
    strokeCircle() { return this; },
    setDepth() { return this; },
    setVisible(visible) { this.visible = visible; return this; },
    destroy() {},
  };
}

function createText(initialText: string): StubText {
  return {
    visible: true,
    text: initialText,
    x: 0,
    y: 0,
    setOrigin() { return this; },
    setDepth() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setWordWrapWidth() { return this; },
    setFontSize() { return this; },
    setVisible(visible) { this.visible = visible; return this; },
    setText(value) { this.text = value; return this; },
    setColor() { return this; },
    destroy() {},
  };
}

function createScene() {
  return {
    add: {
      zone: () => createZone(),
      graphics: () => createGraphics(),
      text: (_x: number, _y: number, text: string) => createText(text),
    },
    scale: {
      off() {},
      on() {},
    },
  };
}

describe('PauseOverlay relayout regression', () => {
  test('keeps save-slot row text hidden when relayout runs while overlay is hidden', () => {
    const overlay = PauseOverlay.create(createScene() as never, {
      onResume: () => {},
      onSaveSlot: () => {},
      onLoadSlot: () => {},
      onDeleteSlot: () => {},
      onMainMenu: () => {},
    });

    overlay.setState({ visible: false, saveSlots: [] });
    overlay.relayout();

    const saveSlotRows = (overlay as unknown as { saveSlotRows: { rows: Array<{ title: StubText; subtitle: StubText; savedAt: StubText }> } | null }).saveSlotRows;
    expect(saveSlotRows?.rows[0]?.title.visible).toBe(false);
    expect(saveSlotRows?.rows[0]?.subtitle.visible).toBe(false);
    expect(saveSlotRows?.rows[0]?.savedAt.visible).toBe(false);
  });
});
