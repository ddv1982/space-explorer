import Phaser from 'phaser';
import type { GameplayDifficultyTier } from '../../config/gameplayDifficulty';
import type { VisualQualityTier } from '../../config/visualQuality';
import {
  createMusicSliderCluster,
  destroyMusicSliderCluster,
  setMusicSliderClusterDepth,
  setMusicSliderClusterVisible,
  type MusicSliderCluster,
} from './musicSliderCluster';
import { createTierSelectorControl, type TierSelectorControl, type TierSelectorLayout } from './tierSelectorControl';

export interface SettingsPanelLayout {
  x: number;
  width: number;
  sliderWidth?: number;
  difficultyY: number;
  qualityY: number;
  tierHeight: number;
  compact?: boolean;
  sliderPositions: Array<{ x: number; y: number }>;
}

export interface SettingsPanel {
  setDifficulty: (tier: GameplayDifficultyTier) => void;
  setQuality: (tier: VisualQualityTier) => void;
  setMusicValue: (key: 'creativity' | 'energy' | 'ambience' | 'volume', value: number) => void;
  setLayout: (layout: SettingsPanelLayout) => void;
  setDepth: (depth: number) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
}

function tierRowLayout(layout: SettingsPanelLayout, y: number): TierSelectorLayout {
  return { x: layout.x, y, width: layout.width, height: layout.tierHeight, compact: layout.compact };
}

export function createSettingsPanel(
  scene: Phaser.Scene,
  config: {
    layout: SettingsPanelLayout;
    difficulty: GameplayDifficultyTier;
    quality: VisualQualityTier;
    onSelectDifficulty: (tier: GameplayDifficultyTier) => boolean;
    onSelectQuality: (tier: VisualQualityTier) => boolean;
    onMusicValueChanged?: () => void;
  }
): SettingsPanel {
  let sliders: MusicSliderCluster | null = null;
  let sliderWidth = config.layout.sliderWidth ?? config.layout.width;
  let currentDepth = 0;
  let currentVisible = true;
  const difficulty: TierSelectorControl<GameplayDifficultyTier> = createTierSelectorControl(scene, {
    label: 'DIFFICULTY',
    tiers: ['low', 'normal', 'high'],
    value: config.difficulty,
    layout: tierRowLayout(config.layout, config.layout.difficultyY),
    onSelect: config.onSelectDifficulty,
  });
  const quality: TierSelectorControl<VisualQualityTier> = createTierSelectorControl(scene, {
    label: 'QUALITY',
    tiers: ['low', 'standard', 'high', 'auto'],
    shortLabels: { standard: 'STD' },
    value: config.quality,
    layout: tierRowLayout(config.layout, config.layout.qualityY),
    onSelect: config.onSelectQuality,
  });
  const createSliders = (): MusicSliderCluster =>
    createMusicSliderCluster(scene, {
      width: sliderWidth,
      getSliders: () => sliders,
      onValueChanged: config.onMusicValueChanged,
    });
  sliders = createSliders();

  const panel: SettingsPanel = {
    setDifficulty(tier) {
      difficulty.setValue(tier);
    },
    setQuality(tier) {
      quality.setValue(tier);
    },
    setMusicValue(key, value) {
      sliders?.[key].setValue(value);
    },
    setLayout(layout) {
      difficulty.setLayout(tierRowLayout(layout, layout.difficultyY));
      quality.setLayout(tierRowLayout(layout, layout.qualityY));
      const nextSliderWidth = layout.sliderWidth ?? layout.width;
      if (nextSliderWidth !== sliderWidth) {
        destroyMusicSliderCluster(sliders);
        sliderWidth = nextSliderWidth;
        sliders = createSliders();
        setMusicSliderClusterDepth(sliders, currentDepth);
        setMusicSliderClusterVisible(sliders, currentVisible);
      }
      const controls = sliders ? [sliders.creativity, sliders.energy, sliders.ambience, sliders.volume] : [];
      controls.forEach((control, index) => {
        const position = layout.sliderPositions[index];
        if (position) control.setPosition(position.x, position.y);
      });
    },
    setDepth(depth) {
      currentDepth = depth;
      difficulty.setDepth(depth);
      quality.setDepth(depth);
      if (sliders) setMusicSliderClusterDepth(sliders, depth);
    },
    setVisible(visible) {
      currentVisible = visible;
      difficulty.setVisible(visible);
      quality.setVisible(visible);
      if (sliders) setMusicSliderClusterVisible(sliders, visible);
    },
    destroy() {
      difficulty.destroy();
      quality.destroy();
      destroyMusicSliderCluster(sliders);
      sliders = null;
    },
  };
  panel.setLayout(config.layout);
  return panel;
}
