import { beforeEach, describe, expect, test, mock } from 'bun:test';

type SliderConfig = {
  label: string;
  width?: number;
  onChange: (value: number) => void;
};

type SliderStub = {
  setPositionCalls: Array<{ x: number; y: number }>;
  setDepthCalls: number[];
  setVisibleCalls: boolean[];
  setValueCalls: number[];
  destroyCalls: number;
  setPosition: (x: number, y: number) => void;
  setDepth: (depth: number) => void;
  setVisible: (visible: boolean) => void;
  setValue: (value: number) => void;
  getValue: () => number;
  destroy: () => void;
};

const createdConfigs = new Map<string, SliderConfig>();
const createdSliders = new Map<string, SliderStub>();
const applyCalls: Array<{ key: string; value: number; sliders: unknown }> = [];
const setMusicVolumeCalls: number[] = [];

mock.module('phaser', () => ({ default: {} }));
mock.module('../src/systems/AudioManager', () => ({
  audioManager: {
    getMusicRuntimeTuning: () => ({ creativity: 0.25, energy: 0.5, ambience: 0.75 }),
    getMusicVolume: () => 0.6,
    setMusicVolume: (value: number) => {
      setMusicVolumeCalls.push(value);
      return 0.42;
    },
  },
}));
mock.module('../src/scenes/shared/musicRuntimeTuning', () => ({
  applyMusicRuntimeTuningValue: (key: string, value: number, sliders: unknown) => {
    applyCalls.push({ key, value, sliders });
    return { creativity: 0.4, energy: 0.5, ambience: 0.6 };
  },
}));
mock.module('../src/scenes/shared/musicSliderControl', () => ({
  ROW_HEIGHT: 52,
  createMusicSliderControl: (_scene: unknown, config: SliderConfig) => {
    createdConfigs.set(config.label, config);

    const slider: SliderStub = {
      setPositionCalls: [],
      setDepthCalls: [],
      setVisibleCalls: [],
      setValueCalls: [],
      destroyCalls: 0,
      setPosition(x, y) {
        this.setPositionCalls.push({ x, y });
      },
      setDepth(depth) {
        this.setDepthCalls.push(depth);
      },
      setVisible(visible) {
        this.setVisibleCalls.push(visible);
      },
      setValue(value) {
        this.setValueCalls.push(value);
      },
      getValue() {
        return 0;
      },
      destroy() {
        this.destroyCalls += 1;
      },
    };

    createdSliders.set(config.label, slider);
    return slider;
  },
}));

const {
  createMusicSliderCluster,
  destroyMusicSliderCluster,
  setMusicSliderClusterDepth,
  setMusicSliderClusterPosition,
  setMusicSliderClusterVisible,
} = await import('../src/scenes/shared/musicSliderCluster');

beforeEach(() => {
  createdConfigs.clear();
  createdSliders.clear();
  applyCalls.length = 0;
  setMusicVolumeCalls.length = 0;
});

describe('musicSliderCluster', () => {
  test('wires runtime tuning and volume callbacks through shared cluster', () => {
    let sliders: ReturnType<typeof createMusicSliderCluster> | null = null;
    sliders = createMusicSliderCluster({} as never, {
      width: 320,
      getSliders: () => sliders,
    });

    expect(Array.from(createdConfigs.keys())).toEqual(['CREATIVITY', 'ENERGY', 'AMBIENCE', 'MUSIC VOLUME']);

    createdConfigs.get('CREATIVITY')?.onChange(0.9);
    expect(applyCalls).toHaveLength(1);
    expect(applyCalls[0]).toEqual({ key: 'creativity', value: 0.9, sliders });

    createdConfigs.get('MUSIC VOLUME')?.onChange(0.8);
    expect(setMusicVolumeCalls).toEqual([0.8]);
    expect(createdSliders.get('MUSIC VOLUME')?.setValueCalls).toEqual([0.42]);
  });

  test('destroys all four sliders and supports shared position/depth/visible helpers', () => {
    let sliders: ReturnType<typeof createMusicSliderCluster> | null = null;
    sliders = createMusicSliderCluster({} as never, {
      width: 280,
      getSliders: () => sliders,
    });

    setMusicSliderClusterPosition(sliders, 10, 20, 30);
    setMusicSliderClusterDepth(sliders, 99);
    setMusicSliderClusterVisible(sliders, false);

    expect(createdSliders.get('CREATIVITY')?.setPositionCalls.at(-1)).toEqual({ x: 10, y: 20 });
    expect(createdSliders.get('ENERGY')?.setPositionCalls.at(-1)).toEqual({ x: 10, y: 50 });
    expect(createdSliders.get('AMBIENCE')?.setPositionCalls.at(-1)).toEqual({ x: 10, y: 80 });
    expect(createdSliders.get('MUSIC VOLUME')?.setPositionCalls.at(-1)).toEqual({ x: 10, y: 110 });
    expect(createdSliders.get('MUSIC VOLUME')?.setDepthCalls.at(-1)).toBe(99);
    expect(createdSliders.get('MUSIC VOLUME')?.setVisibleCalls.at(-1)).toBe(false);

    destroyMusicSliderCluster(sliders);
    expect(createdSliders.get('CREATIVITY')?.destroyCalls).toBe(1);
    expect(createdSliders.get('ENERGY')?.destroyCalls).toBe(1);
    expect(createdSliders.get('AMBIENCE')?.destroyCalls).toBe(1);
    expect(createdSliders.get('MUSIC VOLUME')?.destroyCalls).toBe(1);
    expect(() => destroyMusicSliderCluster(null)).not.toThrow();
  });
});
