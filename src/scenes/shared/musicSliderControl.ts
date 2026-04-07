import Phaser from 'phaser';

export interface MusicSliderControl {
  setPosition: (x: number, y: number) => void;
  setDepth: (depth: number) => void;
  setVisible: (visible: boolean) => void;
  setValue: (value: number) => void;
  getValue: () => number;
  destroy: () => void;
}

interface CreateMusicSliderControlConfig {
  label: string;
  value: number;
  width?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}

const TRACK_HEIGHT = 8;
const HIT_HEIGHT = 28;
const KNOB_RADIUS = 9;

export function createMusicSliderControl(
  scene: Phaser.Scene,
  config: CreateMusicSliderControlConfig
): MusicSliderControl {
  const width = config.width ?? 260;
  const formatValue = config.formatValue ?? ((value) => `${Math.round(value * 100)}%`);

  const labelText = scene.add.text(0, 0, config.label, {
    fontSize: '14px',
    color: '#d7ebff',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  });
  const valueText = scene.add.text(0, 0, '', {
    fontSize: '13px',
    color: '#9ec4ef',
    fontFamily: 'monospace',
  }).setOrigin(1, 0);

  const trackBackground = scene.add.graphics();
  const trackFill = scene.add.graphics();
  const knob = scene.add.graphics();
  const hitArea = scene.add.zone(0, 0, width, HIT_HEIGHT).setOrigin(0).setInteractive({ useHandCursor: true });

  let x = 0;
  let y = 0;
  let value = Phaser.Math.Clamp(config.value, 0, 1);
  let draggingPointerId: number | null = null;

  const redraw = (): void => {
    const fillWidth = width * value;
    const knobX = x + fillWidth;
    const trackY = y + 22;

    labelText.setPosition(x, y);
    valueText.setPosition(x + width, y);
    valueText.setText(formatValue(value));

    trackBackground.clear();
    trackBackground.fillStyle(0x1f2d43, 0.95);
    trackBackground.fillRoundedRect(x, trackY, width, TRACK_HEIGHT, TRACK_HEIGHT / 2);
    trackBackground.lineStyle(1, 0x4c6f99, 0.9);
    trackBackground.strokeRoundedRect(x, trackY, width, TRACK_HEIGHT, TRACK_HEIGHT / 2);

    trackFill.clear();
    trackFill.fillStyle(0x78b8ff, 0.96);
    trackFill.fillRoundedRect(x, trackY, Math.max(2, fillWidth), TRACK_HEIGHT, TRACK_HEIGHT / 2);

    knob.clear();
    knob.fillStyle(0xd9eeff, 1);
    knob.fillCircle(knobX, trackY + TRACK_HEIGHT / 2, KNOB_RADIUS);
    knob.lineStyle(2, 0x4278b7, 1);
    knob.strokeCircle(knobX, trackY + TRACK_HEIGHT / 2, KNOB_RADIUS);

    hitArea.setPosition(x, y + 12);
    hitArea.setSize(width, HIT_HEIGHT);
  };

  const setValue = (nextValue: number, emit = true): void => {
    const clamped = Phaser.Math.Clamp(nextValue, 0, 1);
    if (Math.abs(clamped - value) < 0.0001) {
      return;
    }

    value = clamped;
    redraw();
    if (emit) {
      config.onChange(value);
    }
  };

  const setFromPointer = (pointerX: number): void => {
    const ratio = (pointerX - x) / width;
    setValue(ratio);
  };

  hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    draggingPointerId = pointer.id;
    setFromPointer(pointer.x);
  });

  const handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (draggingPointerId !== pointer.id) {
      return;
    }

    setFromPointer(pointer.x);
  };

  const handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (draggingPointerId !== pointer.id) {
      return;
    }

    draggingPointerId = null;
  };

  scene.input.on('pointermove', handlePointerMove);
  scene.input.on('pointerup', handlePointerUp);
  scene.input.on('pointerupoutside', handlePointerUp);

  setValue(value, false);

  return {
    setPosition(nextX, nextY) {
      x = nextX;
      y = nextY;
      redraw();
    },
    setDepth(depth) {
      labelText.setDepth(depth);
      valueText.setDepth(depth);
      trackBackground.setDepth(depth);
      trackFill.setDepth(depth + 1);
      knob.setDepth(depth + 2);
      hitArea.setDepth(depth + 3);
    },
    setVisible(visible) {
      labelText.setVisible(visible);
      valueText.setVisible(visible);
      trackBackground.setVisible(visible);
      trackFill.setVisible(visible);
      knob.setVisible(visible);
      hitArea.setVisible(visible);
      hitArea.disableInteractive();
      if (visible) {
        hitArea.setInteractive({ useHandCursor: true });
      }
    },
    setValue(nextValue) {
      setValue(nextValue, false);
    },
    getValue() {
      return value;
    },
    destroy() {
      scene.input.off('pointermove', handlePointerMove);
      scene.input.off('pointerup', handlePointerUp);
      scene.input.off('pointerupoutside', handlePointerUp);
      labelText.destroy();
      valueText.destroy();
      trackBackground.destroy();
      trackFill.destroy();
      knob.destroy();
      hitArea.destroy();
    },
  };
}
