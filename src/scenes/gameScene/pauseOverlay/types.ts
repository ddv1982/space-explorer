import Phaser from 'phaser';

export interface PauseOverlayHandlers {
  onResume: () => void;
  onMainMenu: () => void;
}

export interface PauseOverlayState {
  visible: boolean;
  orientationBlocked: boolean;
  canResume: boolean;
}

export interface PauseButton {
  background: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Zone;
  hovered: boolean;
  enabled: boolean;
}

export interface PauseOverlayMessage {
  title: string;
  subtitle: string;
  hint: string;
  resumeLabel: string;
}

export interface PauseOverlayLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  panelX: number;
  panelY: number;
  buttonsX: number;
  buttonY: number;
  sliderX: number;
  sliderStartY: number;
}
