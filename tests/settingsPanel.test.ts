import { beforeEach, describe, expect, mock, test } from 'bun:test';

const createdSliderWidths: number[] = [];
const destroyedClusters: unknown[] = [];

mock.module('phaser', () => ({ default: {} }));
mock.module('../src/scenes/shared/tierSelectorControl', () => ({
  createTierSelectorControl: () => ({
    setLayout() {},
    setDepth() {},
    setVisible() {},
    destroy() {},
  }),
}));
mock.module('../src/scenes/shared/musicSliderCluster', () => ({
  createMusicSliderCluster: (_scene: unknown, config: { width: number }) => {
    createdSliderWidths.push(config.width);
    const createSlider = () => ({
      setPosition() {},
      setDepth() {},
      setVisible() {},
      setValue() {},
      getValue: () => 0,
      destroy() {},
    });
    return {
      creativity: createSlider(),
      energy: createSlider(),
      ambience: createSlider(),
      volume: createSlider(),
    };
  },
  destroyMusicSliderCluster: (cluster: unknown) => {
    if (cluster) destroyedClusters.push(cluster);
  },
  setMusicSliderClusterDepth() {},
  setMusicSliderClusterVisible() {},
}));

const { createSettingsPanel } = await import('../src/scenes/shared/settingsPanel');

const createLayout = (sliderWidth: number) => ({
  x: 20,
  width: 320,
  sliderWidth,
  difficultyY: 40,
  qualityY: 76,
  tierHeight: 28,
  sliderPositions: [
    { x: 20, y: 112 },
    { x: 180, y: 112 },
    { x: 20, y: 168 },
    { x: 180, y: 168 },
  ],
});

beforeEach(() => {
  createdSliderWidths.length = 0;
  destroyedClusters.length = 0;
});

describe('settingsPanel responsive slider lifecycle', () => {
  test('recreates sliders when orientation relayout changes their width', () => {
    const panel = createSettingsPanel({} as never, {
      layout: createLayout(248),
      difficulty: 'normal',
      quality: 'standard',
      onSelectDifficulty: () => true,
      onSelectQuality: () => true,
    });

    panel.setDepth(903);
    panel.setVisible(true);
    panel.setLayout(createLayout(161));

    expect(createdSliderWidths).toEqual([248, 161]);
    expect(destroyedClusters).toHaveLength(1);

    panel.setLayout(createLayout(161));
    expect(createdSliderWidths).toEqual([248, 161]);
    expect(destroyedClusters).toHaveLength(1);
  });
});
