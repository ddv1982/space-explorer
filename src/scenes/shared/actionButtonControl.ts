import Phaser from 'phaser';
import { drawAngledRectPath, NEON, NEON_FONT } from './neonUiTheme';

export type ActionButtonVariant = 'primary' | 'secondary' | 'danger' | 'disabled';

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
  onClick: () => void;
  variant?: ActionButtonVariant;
  fontSize?: string;
  icon?: string;
}

const BUTTON_PALETTE: Record<Exclude<ActionButtonVariant, 'disabled'>, {
  background: number;
  hoverBackground: number;
  border: number;
  hoverBorder: number;
  accent: number;
  glow: number;
  text: string;
}> = {
  primary: {
    background: 0x061f42,
    hoverBackground: 0x0b3f7d,
    border: NEON.cyan,
    hoverBorder: NEON.cyanBright,
    accent: NEON.blue,
    glow: NEON.cyan,
    text: '#f2fbff',
  },
  secondary: {
    background: 0x0a1730,
    hoverBackground: 0x17275e,
    border: NEON.purple,
    hoverBorder: NEON.cyanBright,
    accent: NEON.cyan,
    glow: NEON.purple,
    text: '#e2f3ff',
  },
  danger: {
    background: 0x32111a,
    hoverBackground: 0x5a1f2a,
    border: NEON.red,
    hoverBorder: 0xffc0bd,
    accent: 0xff9d8a,
    glow: NEON.red,
    text: '#fff4ef',
  },
};

function drawButtonBackground(
  graphic: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  variant: ActionButtonVariant,
  enabled: boolean,
  hovered: boolean
): void {
  graphic.clear();

  const cornerCut = Math.min(8, Math.max(3, Math.min(width, height) * 0.08));

  if (!enabled || variant === 'disabled') {
    drawAngledRectPath(graphic, 0, 0, width, height, cornerCut);
    graphic.fillStyle(0x0a101a, 0.55);
    graphic.fillPath();
    drawAngledRectPath(graphic, 0, 0, width, height, cornerCut);
    graphic.lineStyle(1, 0x344556, 0.35);
    graphic.strokePath();
    return;
  }

  const palette = BUTTON_PALETTE[variant];
  const background = hovered ? palette.hoverBackground : palette.background;
  const border = hovered ? palette.hoverBorder : palette.border;

  // Subtle outer glow
  if (hovered) {
    drawAngledRectPath(graphic, -1, -1, width + 2, height + 2, cornerCut + 0.5);
    graphic.lineStyle(1.5, palette.glow, 0.18);
    graphic.strokePath();
  }

  // Fill
  drawAngledRectPath(graphic, 0, 0, width, height, cornerCut);
  graphic.fillStyle(background, hovered ? 0.85 : 0.7);
  graphic.fillPath();

  // Border
  drawAngledRectPath(graphic, 0, 0, width, height, cornerCut);
  graphic.lineStyle(1, border, hovered ? 0.95 : 0.72);
  graphic.strokePath();
}

export function createActionButtonControl(
  scene: Phaser.Scene,
  config: CreateActionButtonConfig
): ActionButtonControl {
  const width = config.width;
  const height = config.height;
  let variant = config.variant ?? 'secondary';
  let visible = true;

  const background = scene.add.graphics();
  const label = scene.add.text(0, 0, config.label, {
    fontSize: config.fontSize ?? '16px',
    color: '#f7feff',
    fontFamily: NEON_FONT.mono,
    fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5);
  const hitArea = scene.add.zone(0, 0, width, height).setOrigin(0);

  const control: ActionButtonControl = {
    background,
    label,
    hitArea,
    hovered: false,
    enabled: true,
    setPosition(x: number, y: number) {
      background.setPosition(x, y);
      label.setPosition(x + width / 2, y + height / 2);
      hitArea.setPosition(x, y);
      hitArea.setSize(width, height);
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
    label.setColor(control.enabled && palette ? palette.text : '#9ba6b3');
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
