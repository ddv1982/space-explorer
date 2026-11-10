import { describe, expect, mock, test } from 'bun:test';

type StubText = {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  width: number;
  style: { fontSize?: string | number };
  setPosition: (x: number, y: number) => void;
  setText: (value: string) => void;
  setColor: (_value: string) => void;
  setDepth: (_depth: number) => void;
  setVisible: (visible: boolean) => void;
  setWordWrapWidth: (_width: number) => void;
  destroy: () => void;
};

type StubGraphics = {
  visible: boolean;
  clear: () => void;
  fillStyle: (_color: number, _alpha: number) => void;
  fillRoundedRect: (_x: number, _y: number, _width: number, _height: number, _radius: number) => void;
  lineStyle: (_width: number, _color: number, _alpha: number) => void;
  strokeRoundedRect: (_x: number, _y: number, _width: number, _height: number, _radius: number) => void;
  fillRect: (_x: number, _y: number, _width: number, _height: number) => void;
  beginPath: () => void;
  moveTo: (_x: number, _y: number) => void;
  lineTo: (_x: number, _y: number) => void;
  closePath: () => void;
  fillPath: () => void;
  strokePath: () => void;
  setDepth: (_depth: number) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

type StubButton = {
  visible: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  setPosition: (_x: number, _y: number) => void;
  setDepth: (_depth: number) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

mock.module('phaser', () => ({
  default: { Math: { Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)) } },
}));
mock.module('../src/systems/AudioManager', () => ({
  audioManager: {
    getMusicRuntimeTuning: () => ({ creativity: 0.5, energy: 0.5, ambience: 0.5 }),
    getMusicVolume: () => 0.5,
    setMusicVolume: (value: number) => value,
  },
}));
mock.module('../src/scenes/shared/actionButtonControl', () => ({
  createActionButtonControl: () => {
    const button: StubButton = {
      visible: true,
      enabled: true,
      setEnabled(enabled) {
        this.enabled = enabled;
      },
      setPosition() {
        // no-op for this test
      },
      setDepth() {
        // no-op for this test
      },
      setVisible(visible) {
        this.visible = visible;
      },
      destroy() {
        // no-op for this test
      },
    };

    return button;
  },
}));

const {
  createPauseSaveSlotRows,
  setPauseSaveSlotRowsPosition,
  setPauseSaveSlotRowsState,
  setPauseSaveSlotRowsVisible,
} = await import('../src/scenes/gameScene/pauseOverlay/controls');

function createText(initialText: string): StubText {
  const text: StubText = {
    visible: true,
    x: 0,
    y: 0,
    text: initialText,
    width: 0,
    style: { fontSize: '12px' },
    setPosition(x, y) {
      this.x = x;
      this.y = y;
    },
    setText(value) {
      this.text = value;
      this.width = value.length * 7;
    },
    setColor() {
      // no-op for this test
    },
    setDepth() {
      // no-op for this test
    },
    setVisible(visible) {
      this.visible = visible;
    },
    setWordWrapWidth() {
      // no-op for this test
    },
    destroy() {
      // no-op for this test
    },
  };

  text.setText(initialText);
  return text;
}

function createGraphics(): StubGraphics {
  return {
    visible: true,
    clear() {
      // no-op for this test
    },
    fillStyle() {
      // no-op for this test
    },
    fillRoundedRect() {
      // no-op for this test
    },
    lineStyle() {
      // no-op for this test
    },
    strokeRoundedRect() {
      // no-op for this test
    },
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fillPath() {},
    strokePath() {},
    setDepth() {
      // no-op for this test
    },
    setVisible(visible) {
      this.visible = visible;
    },
    destroy() {
      // no-op for this test
    },
  };
}

function createScene(): {
  add: { graphics: () => StubGraphics; text: (_x: number, _y: number, text: string) => StubText };
} {
  return {
    add: {
      graphics: () => createGraphics(),
      text: (_x: number, _y: number, text: string) => createText(text),
    },
  };
}

const handlers = { onSaveSlot: () => undefined, onLoadSlot: () => undefined, onDeleteSlot: () => undefined };

function occupiedState(overrides: { title?: string; subtitle?: string; savedAtLabel?: string } = {}) {
  return {
    visible: true,
    canResume: true,
    canSave: true,
    storageAvailable: true,
    statusMessage: '',
    saveSlots: [
      {
        id: 'slot-1' as const,
        index: 1,
        occupied: true,
        title: 'SLOT 1 — AURORA THRESHOLD',
        subtitle: 'LVL 1 • SCORE 0 • 3 LIVES',
        savedAtLabel: '2026-04-27 12:34',
        ...overrides,
      },
    ],
  };
}

describe('pauseOverlay slot cards', () => {
  test('a very short card keeps only its title line', () => {
    const rows = createPauseSaveSlotRows(createScene() as never, handlers);

    setPauseSaveSlotRowsPosition(rows, [{ x: 0, y: 0, width: 420, height: 38 }]);
    setPauseSaveSlotRowsState(rows, occupiedState());
    setPauseSaveSlotRowsVisible(rows, true);

    expect(rows.rows[0]?.title.visible).toBe(true);
    expect(rows.rows[0]?.subtitle.visible).toBe(false);
  });

  test('a compact card shows the run summary under its title', () => {
    const rows = createPauseSaveSlotRows(createScene() as never, handlers);

    setPauseSaveSlotRowsPosition(rows, [{ x: 0, y: 0, width: 420, height: 44 }]);
    setPauseSaveSlotRowsState(rows, occupiedState());
    setPauseSaveSlotRowsVisible(rows, true);

    expect(rows.rows[0]?.title.visible).toBe(true);
    expect(rows.rows[0]?.subtitle.visible).toBe(true);
  });

  test('the timestamp appears only on occupied cards with room for it', () => {
    const rows = createPauseSaveSlotRows(createScene() as never, handlers);

    setPauseSaveSlotRowsPosition(rows, [{ x: 0, y: 0, width: 620, height: 60 }]);
    setPauseSaveSlotRowsVisible(rows, true);
    expect(rows.rows[0]?.savedAt.visible).toBe(false);

    setPauseSaveSlotRowsState(rows, occupiedState());
    expect(rows.rows[0]?.savedAt.visible).toBe(true);
    expect(rows.rows[0]?.savedAt.text).toBe('2026-04-27 12:34');

    setPauseSaveSlotRowsPosition(rows, [{ x: 0, y: 0, width: 300, height: 60 }]);
    expect(rows.rows[0]?.savedAt.visible).toBe(false);
  });

  test('hidden cards stay hidden when their state changes', () => {
    const rows = createPauseSaveSlotRows(createScene() as never, handlers);

    setPauseSaveSlotRowsPosition(rows, [{ x: 0, y: 0, width: 620, height: 60 }]);
    setPauseSaveSlotRowsVisible(rows, false);
    setPauseSaveSlotRowsState(rows, occupiedState());

    expect(rows.rows[0]?.title.visible).toBe(false);
    expect(rows.rows[0]?.savedAt.visible).toBe(false);
  });

  test('truncates long card text so it never runs under the buttons', () => {
    const rows = createPauseSaveSlotRows(createScene() as never, handlers);

    setPauseSaveSlotRowsPosition(rows, [{ x: 0, y: 0, width: 420, height: 44 }]);
    setPauseSaveSlotRowsState(
      rows,
      occupiedState({
        title: 'SLOT 1 - THE EXTREMELY LONG CAMPAIGN LABEL THAT SHOULD BE CLIPPED',
        subtitle: 'VERY LONG SUBTITLE THAT SHOULD NOT FLOW INTO BUTTONS',
      })
    );

    expect(rows.rows[0]?.title.text.endsWith('…')).toBe(true);
    expect(rows.rows[0]?.subtitle.text.endsWith('…')).toBe(true);
  });
});
