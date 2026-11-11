import { describe, expect, test } from 'bun:test';

import { SFX, type SfxDefinition } from '../src/systems/audio/sfx/recipes';
import { getSfxSeconds, renderSfx } from '../src/systems/audio/sfx/render';

const SAMPLE_RATE = 44100;
const definitions = Object.entries(SFX) as Array<[string, SfxDefinition]>;

function rms(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, to - from));
}

describe('sound effect recipes', () => {
  test.each(definitions)('%s renders audible, finite, unclipped audio that ends in silence', (_id, definition) => {
    const samples = renderSfx(definition.layers, { sampleRate: SAMPLE_RATE, seed: 7 });
    let peak = 0;
    let finite = true;
    for (const sample of samples) {
      finite &&= Number.isFinite(sample);
      peak = Math.max(peak, Math.abs(sample));
    }

    expect(finite).toBe(true);
    expect(samples.length).toBe(Math.ceil(getSfxSeconds(definition.layers) * SAMPLE_RATE));
    expect(peak).toBeGreaterThan(0.2);
    expect(peak).toBeLessThanOrEqual(0.98 + 1e-6);
    // No click at the cut: the last millisecond is far below the body of the sound.
    const tail = Math.floor(SAMPLE_RATE / 1000);
    expect(rms(samples, samples.length - tail, samples.length)).toBeLessThan(0.02);
    expect(definition.gain * peak).toBeLessThanOrEqual(0.75);
  });

  test('a sound renders identically for one seed and differently across seeds and pitches', () => {
    const { layers } = SFX.explosionSmall;
    const first = renderSfx(layers, { sampleRate: SAMPLE_RATE, seed: 1 });
    expect(renderSfx(layers, { sampleRate: SAMPLE_RATE, seed: 1 })).toEqual(first);
    expect(renderSfx(layers, { sampleRate: SAMPLE_RATE, seed: 2 })).not.toEqual(first);
    expect(renderSfx(layers, { sampleRate: SAMPLE_RATE, seed: 1, pitchScale: 1.1 })).not.toEqual(first);
  });

  test('frequent sounds are short, throttled and quieter than one-off events', () => {
    for (const id of ['playerShot', 'helperShot', 'picketShot', 'enemyShot', 'graze'] as const) {
      const definition: SfxDefinition = SFX[id];
      expect(getSfxSeconds(definition.layers)).toBeLessThan(0.2);
      expect(definition.minIntervalMs).toBeGreaterThan(0);
      expect(definition.gain).toBeLessThan(SFX.explosionSmall.gain);
    }
  });
});
