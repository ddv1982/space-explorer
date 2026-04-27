import { describe, expect, test } from 'bun:test';
import { createPanner } from '../src/systems/audio/procedural/createPanner';

describe('createPanner', () => {
  test('returns null when stereo is absent or pan/width are effectively zero', () => {
    let createStereoPannerCalls = 0;
    const ctx = {
      createStereoPanner() {
        createStereoPannerCalls += 1;
        return {} as StereoPannerNode;
      },
    } as unknown as AudioContext;

    const noStereo = createPanner(ctx, 0.2, undefined, 1, 2, 0.3, 0.4);
    const effectivelyZero = createPanner(ctx, 0, { width: 0 }, 1, 2, 0.3, 0.4);

    expect(noStereo).toBeNull();
    expect(effectivelyZero).toBeNull();
    expect(createStereoPannerCalls).toBe(0);
  });

  test('creates panner and wires pan LFO with expected frequency/depth and timing', () => {
    const panSetCalls: Array<{ value: number; time: number }> = [];
    const lfoFrequencyCalls: Array<{ value: number; time: number }> = [];
    const panDepthCalls: Array<{ value: number; time: number }> = [];
    const connectCalls: Array<{ from: string; to: unknown }> = [];
    const lfoStartCalls: number[] = [];
    const lfoStopCalls: number[] = [];

    const pan = {
      setValueAtTime(value: number, time: number) {
        panSetCalls.push({ value, time });
      },
    } as unknown as AudioParam;

    const panner = { pan } as unknown as StereoPannerNode;

    const panDepth = {
      gain: {
        setValueAtTime(value: number, time: number) {
          panDepthCalls.push({ value, time });
        },
      },
      connect(node: unknown) {
        connectCalls.push({ from: 'panDepth', to: node });
      },
    } as unknown as GainNode;

    const panLfo = {
      type: 'sawtooth',
      frequency: {
        setValueAtTime(value: number, time: number) {
          lfoFrequencyCalls.push({ value, time });
        },
      },
      connect(node: unknown) {
        connectCalls.push({ from: 'panLfo', to: node });
      },
      start(time: number) {
        lfoStartCalls.push(time);
      },
      stop(time: number) {
        lfoStopCalls.push(time);
      },
    } as unknown as OscillatorNode;

    const ctx = {
      createStereoPanner: () => panner,
      createOscillator: () => panLfo,
      createGain: () => panDepth,
    } as unknown as AudioContext;

    const created = createPanner(ctx, 0.2, { width: 0.5, phaseOffset: 0.25, rateHz: 2 }, 10, 4, 0.4, 0.3);

    expect(created).toBe(panner);
    expect(panLfo.type).toBe('sine');
    expect(panSetCalls).toHaveLength(1);
    expect(panSetCalls[0]?.time).toBe(10);
    expect(panSetCalls[0]?.value).toBeCloseTo(0.3379, 4);

    expect(lfoFrequencyCalls).toHaveLength(1);
    expect(lfoFrequencyCalls[0]?.time).toBe(10);
    expect(lfoFrequencyCalls[0]?.value).toBeCloseTo(1.956, 6);
    expect(panDepthCalls).toHaveLength(1);
    expect(panDepthCalls[0]?.time).toBe(10);
    expect(panDepthCalls[0]?.value).toBeCloseTo(0.18912, 6);
    expect(connectCalls).toEqual([
      { from: 'panLfo', to: panDepth },
      { from: 'panDepth', to: pan },
    ]);
    expect(lfoStartCalls).toEqual([10]);
    expect(lfoStopCalls).toEqual([14.08]);
  });
});
