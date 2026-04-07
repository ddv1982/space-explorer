import Phaser from 'phaser';
import { centerHorizontally, getViewportLayout } from '../../../utils/layout';
import type { PauseOverlayLayout, PauseOverlayMessage, PauseOverlayState } from './types';

export const PAUSE_OVERLAY_PANEL_WIDTH = 520;
export const PAUSE_OVERLAY_PANEL_HEIGHT = 430;
export const PAUSE_OVERLAY_BUTTON_WIDTH = 190;
export const PAUSE_OVERLAY_BUTTON_HEIGHT = 52;
export const PAUSE_OVERLAY_BUTTON_GAP = 20;
export const PAUSE_OVERLAY_SLIDER_X_OFFSET = 45;
export const PAUSE_OVERLAY_SLIDER_START_Y_OFFSET = 190;
export const PAUSE_OVERLAY_SLIDER_SPACING = 52;

export function getPauseOverlayLayout(scene: Phaser.Scene): PauseOverlayLayout {
  const viewport = getViewportLayout(scene);
  const panelX = centerHorizontally(viewport, PAUSE_OVERLAY_PANEL_WIDTH);
  const panelY = viewport.centerY - PAUSE_OVERLAY_PANEL_HEIGHT / 2;
  const totalButtonsWidth = PAUSE_OVERLAY_BUTTON_WIDTH * 2 + PAUSE_OVERLAY_BUTTON_GAP;

  return {
    left: viewport.left,
    top: viewport.top,
    width: viewport.width,
    height: viewport.height,
    centerX: viewport.centerX,
    panelX,
    panelY,
    buttonsX: viewport.centerX - totalButtonsWidth / 2,
    buttonY: panelY + PAUSE_OVERLAY_PANEL_HEIGHT - PAUSE_OVERLAY_BUTTON_HEIGHT - 28,
    sliderX: panelX + PAUSE_OVERLAY_SLIDER_X_OFFSET,
    sliderStartY: panelY + PAUSE_OVERLAY_SLIDER_START_Y_OFFSET,
  };
}

export function drawPauseOverlayBackdrop(
  dimmer: Phaser.GameObjects.Graphics,
  panel: Phaser.GameObjects.Graphics,
  layout: PauseOverlayLayout
): void {
  dimmer.clear();
  dimmer.fillStyle(0x000000, 0.56);
  dimmer.fillRect(layout.left, layout.top, layout.width, layout.height);

  panel.clear();
  panel.fillStyle(0x070f19, 0.93);
  panel.fillRoundedRect(layout.panelX, layout.panelY, PAUSE_OVERLAY_PANEL_WIDTH, PAUSE_OVERLAY_PANEL_HEIGHT, 12);
  panel.lineStyle(2, 0x4f7ccb, 0.85);
  panel.strokeRoundedRect(layout.panelX, layout.panelY, PAUSE_OVERLAY_PANEL_WIDTH, PAUSE_OVERLAY_PANEL_HEIGHT, 12);
}

export function getPauseOverlayMessage(state: PauseOverlayState): PauseOverlayMessage {
  if (state.orientationBlocked) {
    return {
      title: 'PAUSED - ROTATE DEVICE',
      subtitle: 'Gameplay is paused in portrait mode.\nRotate to landscape to continue.',
      hint: 'Rotate to resume, or tune music while paused.',
      resumeLabel: 'ROTATE TO RESUME',
    };
  }

  return {
    title: 'PAUSED',
    subtitle: 'Press ESC or tap RESUME to continue.',
    hint: 'Tune music live. Changes carry into gameplay this run.',
    resumeLabel: 'RESUME',
  };
}
