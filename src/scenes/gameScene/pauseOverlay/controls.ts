import Phaser from 'phaser';
import { audioManager } from '../../../systems/AudioManager';
import { createMusicSliderControl } from '../../shared/musicSliderControl';
import {
  applyMusicRuntimeTuningValue,
  destroyMusicRuntimeTuningSliders,
  type MusicTuningSliders,
} from '../../shared/musicRuntimeTuning';
import {
  PAUSE_OVERLAY_SLIDER_SPACING,
  PAUSE_OVERLAY_PANEL_WIDTH,
} from './view';
import type { PauseButton } from './types';

function drawPauseButtonBackground(
  graphic: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  state: Pick<PauseButton, 'enabled' | 'hovered'>
): void {
  graphic.clear();

  const bgColor = state.enabled ? (state.hovered ? 0x274b77 : 0x1b3555) : 0x2a2a2a;
  const borderColor = state.enabled ? (state.hovered ? 0x86b9ff : 0x5f8fda) : 0x5a5a5a;

  graphic.fillStyle(bgColor, state.enabled ? 0.95 : 0.7);
  graphic.fillRoundedRect(0, 0, width, height, 8);
  graphic.lineStyle(2, borderColor, 1);
  graphic.strokeRoundedRect(0, 0, width, height, 8);
}

export function createPauseButton(
  scene: Phaser.Scene,
  label: string,
  onClick: () => void,
  width: number,
  height: number
): PauseButton {
  const background = scene.add.graphics();
  const text = scene.add.text(0, 0, label, {
    fontSize: '17px',
    color: '#f6fbff',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  const hitArea = scene.add.zone(0, 0, width, height).setOrigin(0);

  const button: PauseButton = {
    background,
    label: text,
    hitArea,
    hovered: false,
    enabled: true,
  };

  hitArea.setInteractive({ useHandCursor: true });
  hitArea.on('pointerover', () => {
    if (!button.enabled) {
      return;
    }
    button.hovered = true;
    redrawPauseButton(button, width, height);
  });
  hitArea.on('pointerout', () => {
    button.hovered = false;
    redrawPauseButton(button, width, height);
  });
  hitArea.on('pointerdown', () => {
    if (!button.enabled) {
      return;
    }
    onClick();
  });

  redrawPauseButton(button, width, height);

  return button;
}

export function redrawPauseButton(button: PauseButton, width: number, height: number): void {
  drawPauseButtonBackground(button.background, width, height, button);
  button.label.setColor(button.enabled ? '#f6fbff' : '#9aa1a8');
}

export function setPauseButtonEnabled(button: PauseButton, width: number, height: number, enabled: boolean): void {
  button.enabled = enabled;
  if (!enabled) {
    button.hovered = false;
  }

  button.hitArea.disableInteractive();
  if (enabled) {
    button.hitArea.setInteractive({ useHandCursor: true });
  }

  redrawPauseButton(button, width, height);
}

export function setPauseButtonPosition(button: PauseButton, width: number, height: number, x: number, y: number): void {
  button.background.setPosition(x, y);
  button.label.setPosition(x + width / 2, y + height / 2);
  button.hitArea.setPosition(x, y);
  button.hitArea.setSize(width, height);
}

export function setPauseButtonDepth(button: PauseButton, depth: number): void {
  button.background.setDepth(depth);
  button.label.setDepth(depth + 1);
  button.hitArea.setDepth(depth + 2);
}

export function setPauseButtonVisible(button: PauseButton, visible: boolean): void {
  button.background.setVisible(visible);
  button.label.setVisible(visible);
  button.hitArea.setVisible(visible);

  button.hitArea.disableInteractive();
  if (visible && button.enabled) {
    button.hitArea.setInteractive({ useHandCursor: true });
  }
}

export function destroyPauseButton(button: PauseButton | null): void {
  if (!button) {
    return;
  }

  button.background.destroy();
  button.label.destroy();
  button.hitArea.destroy();
}

export function createPauseMusicSliders(
  scene: Phaser.Scene,
  getSliders: () => MusicTuningSliders | null
): MusicTuningSliders {
  const tuning = audioManager.getMusicRuntimeTuning();

  return {
    creativity: createMusicSliderControl(scene, {
      label: 'CREATIVITY',
      value: tuning.creativity,
      width: PAUSE_OVERLAY_PANEL_WIDTH - 90,
      onChange: (value) => applyMusicRuntimeTuningValue('creativity', value, getSliders()),
    }),
    energy: createMusicSliderControl(scene, {
      label: 'ENERGY',
      value: tuning.energy,
      width: PAUSE_OVERLAY_PANEL_WIDTH - 90,
      onChange: (value) => applyMusicRuntimeTuningValue('energy', value, getSliders()),
    }),
    ambience: createMusicSliderControl(scene, {
      label: 'AMBIENCE',
      value: tuning.ambience,
      width: PAUSE_OVERLAY_PANEL_WIDTH - 90,
      onChange: (value) => applyMusicRuntimeTuningValue('ambience', value, getSliders()),
    }),
  };
}

export function setPauseMusicSlidersPosition(sliders: MusicTuningSliders, x: number, y: number): void {
  sliders.creativity.setPosition(x, y);
  sliders.energy.setPosition(x, y + PAUSE_OVERLAY_SLIDER_SPACING);
  sliders.ambience.setPosition(x, y + PAUSE_OVERLAY_SLIDER_SPACING * 2);
}

export function setPauseMusicSlidersDepth(sliders: MusicTuningSliders, depth: number): void {
  sliders.creativity.setDepth(depth);
  sliders.energy.setDepth(depth);
  sliders.ambience.setDepth(depth);
}

export function setPauseMusicSlidersVisible(sliders: MusicTuningSliders, visible: boolean): void {
  sliders.creativity.setVisible(visible);
  sliders.energy.setVisible(visible);
  sliders.ambience.setVisible(visible);
}

export function destroyPauseMusicSliders(sliders: MusicTuningSliders | null): void {
  destroyMusicRuntimeTuningSliders(sliders);
}
