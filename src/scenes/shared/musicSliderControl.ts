import Phaser from 'phaser';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import { NEON, NEON_TEXT, neonLabelStyle, neonReadoutStyle } from './neonUiTheme';

export interface MusicSliderControl {
  setPosition: (x: number, y: number) => void;
  setDepth: (depth: number) => void;
  setVisible: (visible: boolean) => void;
  setValue: (value: number) => void;
  destroy: () => void;
}

interface CreateMusicSliderControlConfig {
  label: string;
  value: number;
  width?: number;
  onChange: (value: number) => void;
}

/** Vertical space one slider row claims; the whole row height is the touch target. */
export const ROW_HEIGHT = 52;
/** Narrower than this, the label and readout move above the track so the track keeps its length. */
const STACKED_BELOW_WIDTH = 260;
const TRACK_HEIGHT = 6;
const THUMB_RADIUS = 8;
const READOUT_WIDTH = 46;
const TRACK_COLOR = 0x0b2038;
const TRACK_EDGE_COLOR = 0x2f6ea0;
const THUMB_COLOR = 0xeafaff;

/**
 * A labelled 0–100% slider: label, track with a lit fill and a round thumb, and a percent readout.
 * Dragging anywhere on the row's track sets the value.
 */
export function createMusicSliderControl(
  scene: Phaser.Scene,
  config: CreateMusicSliderControlConfig
): MusicSliderControl {
  const totalWidth = config.width ?? 260;
  const stacked = totalWidth < STACKED_BELOW_WIDTH;
  const labelWidth = stacked ? 0 : Math.max(96, Math.min(128, totalWidth * 0.34));
  const trackLeft = stacked ? THUMB_RADIUS : labelWidth + 10;
  const trackRight = stacked ? totalWidth - THUMB_RADIUS : totalWidth - READOUT_WIDTH - 12;
  const trackWidth = Math.max(30, trackRight - trackLeft);
  const trackCenterY = stacked ? 36 : ROW_HEIGHT / 2;
  const captionY = stacked ? 14 : ROW_HEIGHT / 2;

  const track = scene.add.graphics();
  const labelText = scene.add
    .text(0, 0, config.label, neonLabelStyle(stacked ? 12 : 14, NEON_TEXT.secondary))
    .setOrigin(0, 0.5);
  const valueText = scene.add.text(0, 0, '', neonReadoutStyle(stacked ? 12 : 14, NEON_TEXT.cyan)).setOrigin(1, 0.5);
  const hitArea = scene.add.zone(0, 0, trackWidth, ROW_HEIGHT).setOrigin(0).setInteractive({ useHandCursor: true });

  let originX = 0;
  let originY = 0;
  let value = Phaser.Math.Clamp(config.value, 0, 1);
  let draggingPointerId: number | null = null;

  const redraw = (): void => {
    const x = originX + trackLeft;
    const y = originY + trackCenterY - TRACK_HEIGHT / 2;
    const fillWidth = trackWidth * value;
    const thumbX = x + fillWidth;
    const thumbY = originY + trackCenterY;

    track.clear();
    track.fillStyle(TRACK_COLOR, 1);
    track.fillRoundedRect(x, y, trackWidth, TRACK_HEIGHT, TRACK_HEIGHT / 2);
    track.lineStyle(1, TRACK_EDGE_COLOR, 0.55);
    track.strokeRoundedRect(x, y, trackWidth, TRACK_HEIGHT, TRACK_HEIGHT / 2);
    if (fillWidth > TRACK_HEIGHT) {
      track.fillStyle(NEON.cyan, 1);
      track.fillRoundedRect(x, y, fillWidth, TRACK_HEIGHT, TRACK_HEIGHT / 2);
      track.fillStyle(0xffffff, 0.35);
      track.fillRect(x + TRACK_HEIGHT / 2, y + 1, fillWidth - TRACK_HEIGHT, 1.5);
    }
    track.fillStyle(NEON.cyan, scaleUiGlowAlpha(0.22));
    track.fillCircle(thumbX, thumbY, THUMB_RADIUS + 5);
    track.fillStyle(THUMB_COLOR, 1);
    track.fillCircle(thumbX, thumbY, THUMB_RADIUS);
    track.lineStyle(2, NEON.cyan, 1);
    track.strokeCircle(thumbX, thumbY, THUMB_RADIUS);

    labelText.setPosition(originX, originY + captionY);
    valueText.setPosition(originX + totalWidth, originY + captionY);
    valueText.setText(`${Math.round(value * 100)}%`);

    hitArea.setPosition(x - THUMB_RADIUS, originY);
    hitArea.setSize(trackWidth + THUMB_RADIUS * 2, ROW_HEIGHT);
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
    setValue((pointerX - (originX + trackLeft)) / trackWidth);
  };

  hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    draggingPointerId = pointer.id;
    setFromPointer(pointer.x);
  });

  const handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (draggingPointerId === pointer.id) setFromPointer(pointer.x);
  };

  const handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (draggingPointerId === pointer.id) draggingPointerId = null;
  };

  scene.input.on('pointermove', handlePointerMove);
  scene.input.on('pointerup', handlePointerUp);
  scene.input.on('pointerupoutside', handlePointerUp);

  redraw();

  return {
    setPosition(nextX, nextY) {
      originX = nextX;
      originY = nextY;
      redraw();
    },
    setDepth(depth) {
      track.setDepth(depth);
      labelText.setDepth(depth + 1);
      valueText.setDepth(depth + 1);
      hitArea.setDepth(depth + 2);
    },
    setVisible(visible) {
      track.setVisible(visible);
      labelText.setVisible(visible);
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
    destroy() {
      scene.input.off('pointermove', handlePointerMove);
      scene.input.off('pointerup', handlePointerUp);
      scene.input.off('pointerupoutside', handlePointerUp);
      track.destroy();
      labelText.destroy();
      valueText.destroy();
      hitArea.destroy();
    },
  };
}
