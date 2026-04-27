import Phaser from 'phaser';
import { drawAngledRectPath, NEON, NEON_FONT } from './neonUiTheme';

export type MusicSliderIconDrawer = (
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  size: number
) => void;

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
  icon?: MusicSliderIconDrawer;
}

export const ROW_HEIGHT = 52;
const ROW_PADDING_X = 16;
const ICON_BOX_SIZE = 46;
const ICON_TO_LABEL_GAP = 16;
const LABEL_WIDTH = 170;
const LABEL_TO_TRACK_GAP = 18;
const TRACK_HEIGHT = 12;
const KNOB_RADIUS = 12;
const VALUE_BOX_WIDTH = 74;
const VALUE_BOX_HEIGHT = 34;
const VALUE_BOX_GAP = 18;

const COLOR_PILL_FILL = NEON.panel;
const COLOR_PILL_STROKE = NEON.cyan;
const COLOR_PILL_STROKE_SOFT = NEON.blue;
const COLOR_ICON_BG = NEON.navySoft;
const COLOR_TRACK_BG = 0x07162a;
const COLOR_TRACK_STROKE = NEON.blue;
const COLOR_FILL_DEEP = NEON.blueDeep;
const COLOR_FILL_BRIGHT = NEON.cyan;
const COLOR_KNOB_INNER = 0xe8f9ff;
const COLOR_KNOB_RING = NEON.cyan;

export function createMusicSliderControl(
  scene: Phaser.Scene,
  config: CreateMusicSliderControlConfig
): MusicSliderControl {
  const totalWidth = config.width ?? 260;
  const formatValue = config.formatValue ?? ((value) => `${Math.round(value * 100)}%`);

  // Layering: pill background → icon box → track bg → track fill → knob → value box → texts → hit zone
  const pillFrame = scene.add.graphics();
  const iconBox = scene.add.graphics();
  const iconOverlay = scene.add.graphics();
  const trackBackground = scene.add.graphics();
  const trackFill = scene.add.graphics();
  const knob = scene.add.graphics();
  const valueBox = scene.add.graphics();

  const labelText = scene.add.text(0, 0, config.label, {
    fontSize: '15px',
    color: '#e6faff',
    fontFamily: NEON_FONT.mono,
    fontStyle: 'bold',
  });
  const valueText = scene.add
    .text(0, 0, '', {
      fontSize: '13px',
      color: '#bfefff',
      fontFamily: NEON_FONT.mono,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  // Track geometry calculated relative to pill interior
  const compact = totalWidth < 520;
  const iconSize = compact ? 0 : ICON_BOX_SIZE;
  const labelWidth = compact ? Math.max(96, Math.min(132, totalWidth * 0.32)) : LABEL_WIDTH;
  const valueBoxWidth = compact ? 58 : VALUE_BOX_WIDTH;
  const trackLeft = ROW_PADDING_X + iconSize + (compact ? 0 : ICON_TO_LABEL_GAP) + labelWidth + LABEL_TO_TRACK_GAP;
  const trackRight = totalWidth - ROW_PADDING_X - valueBoxWidth - VALUE_BOX_GAP;
  const trackWidth = Math.max(30, trackRight - trackLeft);

  const hitArea = scene.add
    .zone(0, 0, trackWidth, ROW_HEIGHT)
    .setOrigin(0)
    .setInteractive({ useHandCursor: true });

  let originX = 0;
  let originY = 0;
  let value = Phaser.Math.Clamp(config.value, 0, 1);
  let draggingPointerId: number | null = null;

  const redraw = (): void => {
    const rowCenterY = originY + ROW_HEIGHT / 2;
    const trackY = rowCenterY - TRACK_HEIGHT / 2;
    const fillWidth = trackWidth * value;
    const knobX = originX + trackLeft + fillWidth;

    // ----- Outer framed row -----
    pillFrame.clear();
    const cornerCut = 10;
    drawAngledRectPath(pillFrame, originX, originY, totalWidth, ROW_HEIGHT, cornerCut);
    pillFrame.fillStyle(COLOR_PILL_FILL, 0.78);
    pillFrame.fillPath();
    drawAngledRectPath(pillFrame, originX, originY, totalWidth, ROW_HEIGHT, cornerCut);
    pillFrame.lineStyle(1, COLOR_PILL_STROKE, 0.85);
    pillFrame.strokePath();

    // ----- Icon box (rounded square inside pill left) -----
    iconBox.clear();
    iconOverlay.clear();
    const iconX = originX + ROW_PADDING_X;
    const iconY = rowCenterY - ICON_BOX_SIZE / 2;
    if (!compact) {
      drawAngledRectPath(iconBox, iconX, iconY, ICON_BOX_SIZE, ICON_BOX_SIZE, 8);
      iconBox.fillStyle(COLOR_ICON_BG, 0.85);
      iconBox.fillPath();
      drawAngledRectPath(iconBox, iconX, iconY, ICON_BOX_SIZE, ICON_BOX_SIZE, 8);
      iconBox.lineStyle(1, COLOR_PILL_STROKE, 0.75);
      iconBox.strokePath();
      if (config.icon) {
        config.icon(iconOverlay, iconX + ICON_BOX_SIZE / 2, iconY + ICON_BOX_SIZE / 2, ICON_BOX_SIZE - 14);
      } else {
        iconOverlay.lineStyle(1.5, COLOR_PILL_STROKE, 0.8);
        iconOverlay.lineBetween(iconX + 14, rowCenterY, iconX + ICON_BOX_SIZE - 14, rowCenterY);
        iconOverlay.lineBetween(iconX + ICON_BOX_SIZE / 2, iconY + 14, iconX + ICON_BOX_SIZE / 2, iconY + ICON_BOX_SIZE - 14);
      }
    }

    // ----- Label -----
    labelText.setPosition(originX + ROW_PADDING_X + iconSize + (compact ? 0 : ICON_TO_LABEL_GAP), rowCenterY - 9);

    // ----- Track backing -----
    trackBackground.clear();
    const tx = originX + trackLeft;
    trackBackground.fillStyle(COLOR_TRACK_BG, 1);
    trackBackground.fillRoundedRect(tx, trackY, trackWidth, TRACK_HEIGHT, TRACK_HEIGHT / 2);
    trackBackground.lineStyle(1, COLOR_TRACK_STROKE, 0.75);
    trackBackground.strokeRoundedRect(tx, trackY, trackWidth, TRACK_HEIGHT, TRACK_HEIGHT / 2);

    // ----- Track fill (clean blue gradient look) -----
    trackFill.clear();
    if (fillWidth > 1) {
      trackFill.fillStyle(COLOR_FILL_DEEP, 1);
      trackFill.fillRoundedRect(tx, trackY, Math.max(2, fillWidth), TRACK_HEIGHT, TRACK_HEIGHT / 2);
      trackFill.fillStyle(COLOR_FILL_BRIGHT, 0.7);
      trackFill.fillRoundedRect(tx, trackY + 1, Math.max(2, fillWidth), TRACK_HEIGHT * 0.4, TRACK_HEIGHT / 2);
      trackFill.fillStyle(0xffffff, 0.18);
      trackFill.fillRoundedRect(tx, trackY + 1, Math.max(2, fillWidth), 1.5, 0.5);
    }

    // ----- Knob -----
    knob.clear();
    const knobY = trackY + TRACK_HEIGHT / 2;
    knob.fillStyle(COLOR_KNOB_RING, 0.25);
    knob.fillCircle(knobX, knobY, KNOB_RADIUS + 4);
    knob.fillStyle(0x061222, 1);
    knob.fillCircle(knobX, knobY, KNOB_RADIUS + 1);
    knob.lineStyle(1.5, COLOR_KNOB_RING, 1);
    knob.strokeCircle(knobX, knobY, KNOB_RADIUS + 1);
    knob.fillStyle(COLOR_KNOB_INNER, 1);
    knob.fillCircle(knobX, knobY, KNOB_RADIUS - 1);
    knob.lineStyle(1, COLOR_PILL_STROKE_SOFT, 0.75);
    knob.strokeCircle(knobX, knobY, KNOB_RADIUS - 1);
    knob.lineStyle(1.5, COLOR_FILL_DEEP, 0.9);
    knob.lineBetween(knobX - 2.5, knobY - 3.5, knobX - 2.5, knobY + 3.5);
    knob.lineBetween(knobX, knobY - 3.5, knobX, knobY + 3.5);
    knob.lineBetween(knobX + 2.5, knobY - 3.5, knobX + 2.5, knobY + 3.5);

    // ----- Value capsule -----
    valueBox.clear();
    const vbx = originX + totalWidth - ROW_PADDING_X - valueBoxWidth;
    const vby = rowCenterY - VALUE_BOX_HEIGHT / 2;
    valueBox.fillStyle(COLOR_ICON_BG, 0.82);
    valueBox.fillRoundedRect(vbx, vby, valueBoxWidth, VALUE_BOX_HEIGHT, 6);
    valueBox.lineStyle(1, COLOR_PILL_STROKE, 0.85);
    valueBox.strokeRoundedRect(vbx, vby, valueBoxWidth, VALUE_BOX_HEIGHT, 6);

    valueText.setPosition(vbx + valueBoxWidth / 2, vby + VALUE_BOX_HEIGHT / 2);
    valueText.setText(formatValue(value));

    // Hit zone spans the track
    hitArea.setPosition(tx - 6, originY);
    hitArea.setSize(trackWidth + 12, ROW_HEIGHT);
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
    const ratio = (pointerX - (originX + trackLeft)) / trackWidth;
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
      originX = nextX;
      originY = nextY;
      redraw();
    },
    setDepth(depth) {
      pillFrame.setDepth(depth);
      iconBox.setDepth(depth + 1);
      iconOverlay.setDepth(depth + 2);
      labelText.setDepth(depth + 2);
      trackBackground.setDepth(depth + 1);
      trackFill.setDepth(depth + 2);
      knob.setDepth(depth + 3);
      valueBox.setDepth(depth + 1);
      valueText.setDepth(depth + 2);
      hitArea.setDepth(depth + 4);
    },
    setVisible(visible) {
      pillFrame.setVisible(visible);
      iconBox.setVisible(visible);
      iconOverlay.setVisible(visible);
      labelText.setVisible(visible);
      trackBackground.setVisible(visible);
      trackFill.setVisible(visible);
      knob.setVisible(visible);
      valueBox.setVisible(visible);
      valueText.setVisible(visible);
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
      pillFrame.destroy();
      iconBox.destroy();
      iconOverlay.destroy();
      labelText.destroy();
      trackBackground.destroy();
      trackFill.destroy();
      knob.destroy();
      valueBox.destroy();
      valueText.destroy();
      hitArea.destroy();
    },
  };
}
