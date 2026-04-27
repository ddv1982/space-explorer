import { describe, expect, test } from 'bun:test';
import { applyModulation } from '../src/systems/audio/procedural/modulationLfo';

type Event = { method: string; value?: number; time?: number; target?: unknown };

function createHarness() {
  const events: Event[] = [];
  const target = {
    setValueAtTime(value: number, time: number) {
      events.push({ method: 'target.setValueAtTime', value, time });
    },
  } as unknown as AudioParam;

  const lfo = {
    type: 'sine',
    frequency: {
      setValueAtTime(value: number, time: number) {
        events.push({ method: 'lfo.frequency.setValueAtTime', value, time });
      },
    },
    connect(node: unknown) {
      events.push({ method: 'lfo.connect', target: node });
    },
    start(time: number) {
      events.push({ method: 'lfo.start', time });
    },
    stop(time: number) {
      events.push({ method: 'lfo.stop', time });
    },
  } as unknown as OscillatorNode;

  const lfoGain = {
    gain: {
      setValueAtTime(value: number, time: number) {
        events.push({ method: 'lfoGain.gain.setValueAtTime', value, time });
      },
    },
    connect(node: unknown) {
      events.push({ method: 'lfoGain.connect', target: node });
    },
  } as unknown as GainNode;

  const ctx = {
    createOscillator: () => lfo,
    createGain: () => lfoGain,
  } as unknown as AudioContext;

  return { ctx, target, lfo, lfoGain, events };
}

describe('applyModulation', () => {
  test('uses triangle waveform when modulation waveform is random and wires the LFO', () => {
    const { ctx, target, lfo, lfoGain, events } = createHarness();

    applyModulation(
      ctx,
      { target: 'gain', depth: 2, rateHz: 3, waveform: 'random' },
      target,
      5,
      10,
      4,
      0.5
    );

    expect(lfo.type).toBe('triangle');
    expect(events).toEqual([
      { method: 'lfo.frequency.setValueAtTime', value: 3, time: 10 },
      { method: 'lfoGain.gain.setValueAtTime', value: 1, time: 10 },
      { method: 'target.setValueAtTime', value: 5, time: 10 },
      { method: 'lfo.connect', target: lfoGain },
      { method: 'lfoGain.connect', target },
      { method: 'lfo.start', time: 10 },
      { method: 'lfo.stop', time: 14.08 },
    ]);
  });

  test('does nothing when modulation is incomplete', () => {
    const { ctx, target, events } = createHarness();

    applyModulation(ctx, { target: 'gain', depth: 1 }, target, 2, 0, 1);

    expect(events).toEqual([]);
  });
});
