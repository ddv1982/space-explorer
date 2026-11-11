import { expect, test } from 'bun:test';

import { scheduleDrum } from '../src/systems/audio/procedural/drums';

test('a drum hit keeps its gain closed until the hit starts', () => {
  const gains: Array<{ value: number; events: Array<[number, number]> }> = [];
  const param = (): AudioParam =>
    ({ setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined }) as unknown as AudioParam;
  const node = { connect: () => undefined, start: () => undefined, stop: () => undefined, frequency: param() };
  const ctx = {
    createOscillator: () => node,
    createBufferSource: () => node,
    createBiquadFilter: () => node,
    createGain: () => {
      const gain = { value: 1, events: [] as Array<[number, number]> };
      gains.push(gain);
      return {
        connect: () => undefined,
        gain: Object.assign(gain, {
          setValueAtTime: (value: number, time: number) => gain.events.push([value, time]),
          exponentialRampToValueAtTime: () => undefined,
        }),
      };
    },
  } as unknown as BaseAudioContext;

  for (const voice of ['kick', 'snare', 'hat'] as const) {
    scheduleDrum(voice, { ctx, output: {} as AudioNode, noise: {} as AudioBuffer, kit: 'soft', time: 2, gain: 0.1 });
  }

  expect(gains.length).toBe(4);
  for (const gain of gains) {
    expect(gain.value).toBe(0);
    expect(gain.events[0][1]).toBe(2);
  }
});
