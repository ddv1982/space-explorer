import Phaser from 'phaser';
import { createActionButtonControl, type ActionButtonControl } from './actionButtonControl';
import { NEON_TEXT, neonLabelStyle } from './neonUiTheme';
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

const SEGMENT_GAP = 4;

interface SegmentPlan {
  labels: string[];
  widths: number[];
}

function getLabelWidth(layout: TierSelectorLayout): number {
  return layout.compact ? 128 : 152;
}

/** Rough rendered width of an uppercase button label, with breathing room on both sides. */
function estimateButtonLabelWidth(label: string, fontSize: number): number {
  return label.length * (fontSize * 0.6 + 1.5) + 12;
}

/**
 * Splits the row among the tiers in proportion to their label lengths. When a full label would not
 * fit its segment, every tier that has a short label falls back to it.
 */
function planSegments<T extends string>(
  tiers: readonly T[],
  shortLabels: Partial<Record<T, string>>,
  available: number,
  fontSize: number
): SegmentPlan {
  const share = (labels: string[]): number[] => {
    const weights = labels.map((label) => label.length + 3);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const room = available - SEGMENT_GAP * (labels.length - 1);
    return weights.map((weight) => (room * weight) / total);
  };
  const full = tiers.map((tier) => tier.toUpperCase());
  const fullWidths = share(full);
  if (full.every((label, index) => estimateButtonLabelWidth(label, fontSize) <= (fullWidths[index] ?? 0))) {
    return { labels: full, widths: fullWidths };
  }
  const short = tiers.map((tier) => shortLabels[tier] ?? tier.toUpperCase());
  return { labels: short, widths: share(short) };
}

/**
 * A segmented selector: `LABEL: VALUE` on the left, one segment per tier on the right, the selected
 * tier drawn as the solid primary.
 */
export function createTierSelectorControl<T extends string>(
  scene: Phaser.Scene,
  config: {
    label: string;
    tiers: readonly T[];
    /** Abbreviations used when the row is too narrow for the full tier names. */
    shortLabels?: Partial<Record<T, string>>;
    value: T;
    layout: TierSelectorLayout;
    onSelect: (tier: T) => boolean;
  }
): TierSelectorControl<T> {
  let value = config.value;
  const compact = Boolean(config.layout.compact);
  const fontSize = compact ? 11 : 13;
  const label = scene.add.text(0, 0, '', neonLabelStyle(compact ? 12 : 13, NEON_TEXT.secondary, 1)).setOrigin(0, 0.5);
  // Action buttons cannot be resized after construction, so segment sizes are fixed by the first layout.
  const segments = planSegments(
    config.tiers,
    config.shortLabels ?? {},
    config.layout.width - getLabelWidth(config.layout),
    fontSize
  );
  const buttons: ActionButtonControl[] = config.tiers.map((tier, index) =>
    createActionButtonControl(scene, {
      label: segments.labels[index] ?? tier.toUpperCase(),
      width: segments.widths[index] ?? 0,
      height: config.layout.height,
      hitHeight: Math.max(config.layout.height, MIN_TOUCH_TARGET_PX),
      fontSize: `${fontSize}px`,
      onClick: () => {
        if (tier === value || !config.onSelect(tier)) return;
        value = tier;
        refresh();
      },
    })
  );

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
      label.setPosition(layout.x, layout.y + layout.height / 2);
      let x = layout.x + getLabelWidth(layout);
      buttons.forEach((button, index) => {
        button.setPosition(x, layout.y);
        x += (segments.widths[index] ?? 0) + SEGMENT_GAP;
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

  control.setLayout(config.layout);
  refresh();
  return control;
}
