import Phaser from 'phaser';
import { createActionButtonControl, type ActionButtonControl } from './actionButtonControl';
import { NEON_FONT, NEON_TEXT } from './neonUiTheme';
import { MIN_TOUCH_TARGET_PX } from './touchTarget';

export interface TierSelectorLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  compact?: boolean;
}

export interface TierSelectorControl<T extends string> {
  setValue: (value: T) => void;
  setLayout: (layout: TierSelectorLayout) => void;
  setDepth: (depth: number) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
}

export function createTierSelectorControl<T extends string>(
  scene: Phaser.Scene,
  config: {
    label: string;
    tiers: readonly T[];
    value: T;
    layout: TierSelectorLayout;
    onSelect: (tier: T) => boolean;
  }
): TierSelectorControl<T> {
  let value = config.value;
  const label = scene.add
    .text(0, 0, '', {
      fontSize: '11px',
      color: NEON_TEXT.secondary,
      fontFamily: NEON_FONT.mono,
      fontStyle: 'bold',
    })
    .setOrigin(0, 0.5);
  const buttons: ActionButtonControl[] = [];

  const refresh = (): void => {
    label.setText(`${config.label}: ${value.toUpperCase()}`);
    config.tiers.forEach((tier, index) => {
      buttons[index]?.setVariant(tier === value ? 'primary' : 'secondary');
    });
  };

  const control: TierSelectorControl<T> = {
    setValue(nextValue) {
      value = nextValue;
      refresh();
    },
    setLayout(layout) {
      const labelWidth = layout.compact ? 82 : 116;
      const gap = 5;
      const buttonWidth = (layout.width - labelWidth - gap * config.tiers.length) / config.tiers.length;
      label.setPosition(layout.x, layout.y + layout.height / 2);
      label.setFontSize(layout.compact ? '9px' : '11px');
      buttons.forEach((button, index) => {
        // Action buttons cannot be resized after construction, so their hit areas
        // use a stable touch-safe size chosen from the smallest supported surface.
        button.setPosition(layout.x + labelWidth + gap + index * (buttonWidth + gap), layout.y);
      });
    },
    setDepth(depth) {
      label.setDepth(depth + 1);
      buttons.forEach((button) => button.setDepth(depth));
    },
    setVisible(visible) {
      label.setVisible(visible);
      buttons.forEach((button) => button.setVisible(visible));
    },
    destroy() {
      label.destroy();
      buttons.forEach((button) => button.destroy());
    },
  };

  const initialLabelWidth = config.layout.compact ? 82 : 116;
  const initialGap = 5;
  const stableButtonWidth =
    (config.layout.width - initialLabelWidth - initialGap * config.tiers.length) / config.tiers.length;
  config.tiers.forEach((tier) => {
    buttons.push(
      createActionButtonControl(scene, {
        label: tier.toUpperCase(),
        width: stableButtonWidth,
        height: config.layout.height,
        hitHeight: Math.max(config.layout.height, MIN_TOUCH_TARGET_PX),
        fontSize: config.layout.compact ? '9px' : '10px',
        onClick: () => {
          if (tier === value || !config.onSelect(tier)) return;
          value = tier;
          refresh();
        },
      })
    );
  });
  control.setLayout(config.layout);
  refresh();
  return control;
}
