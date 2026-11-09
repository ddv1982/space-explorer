import Phaser from 'phaser';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import { drawAngledRectPath, NEON, NEON_FONT, NEON_TEXT } from './neonUiTheme';

type ActionButtonVariant = 'primary' | 'secondary' | 'danger' | 'disabled';

export interface ActionButtonControl {
  background: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Zone;
  hovered: boolean;
  enabled: boolean;
  setPosition: (x: number, y: number) => void;
  setDepth: (depth: number) => void;
  setVisible: (visible: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setLabel: (label: string) => void;
  setVariant: (variant: ActionButtonVariant) => void;
  destroy: () => void;
}

interface CreateActionButtonConfig {
  label: string;
  width: number;
  height: number;
  hitWidth?: number;
  hitHeight?: number;
  onClick: () => void;
  variant?: ActionButtonVariant;
  fontSize?: string;
}

interface ButtonPalette {
  fill: number;
  fillAlpha: number;
  hoverFill: number;
  hoverFillAlpha: number;
  border: number;
  hoverBorder: number;
  text: string;
}

/**
 * Primary is the one solid, lit control on a surface; secondary and danger are ghost glass so they
 * never compete with it.
 */
const BUTTON_PALETTE: Record<Exclude<ActionButtonVariant, 'disabled'>, ButtonPalette> = {
  primary: {
    fill: NEON.cyan,
    fillAlpha: 0.94,
    hoverFill: NEON.cyanBright,
    hoverFillAlpha: 1,
    border: NEON.cyanBright,
    hoverBorder: 0xffffff,
    text: NEON_TEXT.ink,
  },
  secondary: {
    fill: NEON.glass,
    fillAlpha: 0.62,
    hoverFill: 0x14365f,
    hoverFillAlpha: 0.9,
    border: 0x6fb4e0,
    hoverBorder: NEON.cyanBright,
    text: '#d9eeff',
  },
  danger: {
    fill: 0x2c0f19,
    fillAlpha: 0.7,
    hoverFill: 0x5a1f2a,
    hoverFillAlpha: 0.92,
    border: NEON.red,
    hoverBorder: 0xffc0bd,
    text: '#ffe1dc',
  },
};

const DISABLED_TEXT = '#7f8c9b';

function drawButtonBackground(
  graphic: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  variant: ActionButtonVariant,
  enabled: boolean,
  hovered: boolean
): void {
  graphic.clear();

  const cornerCut = Math.min(10, Math.max(4, Math.min(width, height) * 0.24));

  if (!enabled || variant === 'disabled') {
    drawAngledRectPath(graphic, 0, 0, width, height, cornerCut);
    graphic.fillStyle(0x0a101a, 0.5);
    graphic.fillPath();
    drawAngledRectPath(graphic, 0, 0, width, height, cornerCut);
    graphic.lineStyle(1, 0x3a4c5e, 0.4);
    graphic.strokePath();
    return;
  }

  const palette = BUTTON_PALETTE[variant];
  const solid = variant === 'primary';

  if (hovered || solid) {
    drawAngledRectPath(graphic, -2.5, -2.5, width + 5, height + 5, cornerCut + 1.25);
    graphic.lineStyle(3, palette.border, scaleUiGlowAlpha(hovered ? 0.26 : 0.12));
    graphic.strokePath();
  }

  drawAngledRectPath(graphic, 0, 0, width, height, cornerCut);
  graphic.fillStyle(hovered ? palette.hoverFill : palette.fill, hovered ? palette.hoverFillAlpha : palette.fillAlpha);
  graphic.fillPath();

  // Top half catches the light.
  graphic.fillStyle(0xffffff, solid ? 0.2 : 0.045);
  graphic.beginPath();
  graphic.moveTo(cornerCut, 0);
  graphic.lineTo(width, 0);
  graphic.lineTo(width, height * 0.46);
  graphic.lineTo(0, height * 0.46);
  graphic.lineTo(0, cornerCut);
  graphic.closePath();
  graphic.fillPath();

  drawAngledRectPath(graphic, 0, 0, width, height, cornerCut);
  graphic.lineStyle(1, hovered ? palette.hoverBorder : palette.border, hovered ? 1 : solid ? 0.9 : 0.55);
  graphic.strokePath();
}

export function createActionButtonControl(scene: Phaser.Scene, config: CreateActionButtonConfig): ActionButtonControl {
  const width = config.width;
  const height = config.height;
  const hitWidth = Math.max(width, config.hitWidth ?? width);
  const hitHeight = Math.max(height, config.hitHeight ?? height);
  let variant = config.variant ?? 'secondary';
  let visible = true;

  const background = scene.add.graphics();
  const label = scene.add
    .text(0, 0, config.label, {
      fontSize: config.fontSize ?? '16px',
      color: NEON_TEXT.primary,
      fontFamily: NEON_FONT.label,
      fontStyle: 'bold',
      letterSpacing: 1.5,
      align: 'center',
    })
    .setOrigin(0.5);
  const hitArea = scene.add.zone(0, 0, hitWidth, hitHeight).setOrigin(0);

  const control: ActionButtonControl = {
    background,
    label,
    hitArea,
    hovered: false,
    enabled: true,
    setPosition(x: number, y: number) {
      background.setPosition(x, y);
      label.setPosition(x + width / 2, y + height / 2);
      hitArea.setPosition(x - (hitWidth - width) / 2, y - (hitHeight - height) / 2);
      hitArea.setSize(hitWidth, hitHeight);
    },
    setDepth(depth: number) {
      background.setDepth(depth);
      label.setDepth(depth + 1);
      hitArea.setDepth(depth + 2);
    },
    setVisible(nextVisible: boolean) {
      visible = nextVisible;
      background.setVisible(nextVisible);
      label.setVisible(nextVisible);
      hitArea.setVisible(nextVisible);
      refreshInteractiveState();
    },
    setEnabled(enabled: boolean) {
      control.enabled = enabled;
      if (!enabled) {
        control.hovered = false;
      }
      refreshInteractiveState();
      redraw();
    },
    setLabel(nextLabel: string) {
      label.setText(nextLabel);
    },
    setVariant(nextVariant: ActionButtonVariant) {
      variant = nextVariant;
      if (variant === 'disabled') {
        control.hovered = false;
      }
      refreshInteractiveState();
      redraw();
    },
    destroy() {
      background.destroy();
      label.destroy();
      hitArea.destroy();
    },
  };

  const redraw = (): void => {
    const enabledVariant = control.enabled ? variant : 'disabled';
    drawButtonBackground(background, width, height, enabledVariant, control.enabled, control.hovered);
    const palette = enabledVariant === 'disabled' ? null : BUTTON_PALETTE[enabledVariant];
    label.setColor(control.enabled && palette ? palette.text : DISABLED_TEXT);
  };

  const refreshInteractiveState = (): void => {
    hitArea.disableInteractive();
    if (visible && control.enabled && variant !== 'disabled') {
      hitArea.setInteractive({ useHandCursor: true });
    }
  };

  hitArea.on('pointerover', () => {
    if (!control.enabled || variant === 'disabled') {
      return;
    }
    control.hovered = true;
    redraw();
  });
  hitArea.on('pointerout', () => {
    control.hovered = false;
    redraw();
  });
  hitArea.on('pointerdown', () => {
    if (!control.enabled || variant === 'disabled') {
      return;
    }
    config.onClick();
  });

  refreshInteractiveState();
  redraw();

  return control;
}
