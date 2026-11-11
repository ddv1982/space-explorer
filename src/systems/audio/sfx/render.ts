/**
 * Renders a sound effect recipe into mono samples with plain arithmetic, so the same code runs in
 * the browser (once per variant, then played back as a buffer) and in unit tests without Web Audio.
 */
export type SfxWave = 'sine' | 'triangle' | 'saw' | 'square';

export interface SfxLayer {
  source: SfxWave | 'noise';
  /** Pitch in Hz, swept exponentially from the first value to the second over the layer. */
  freq?: readonly [number, number];
  /** Above 1 the sweep finishes early (a fast drop that settles); below 1 it finishes late. */
  sweepRate?: number;
  /** Phase modulation for sine layers: modulator at `ratio` x pitch, depth fading with the envelope. */
  fm?: { ratio: number; index: number };
  filter?: { type: 'lowpass' | 'highpass' | 'bandpass'; freq: readonly [number, number]; q?: number };
  /** Seconds. `decay` is the time to fall 60 dB after the attack and hold. */
  attack: number;
  hold?: number;
  decay: number;
  gain: number;
  /** Start offset in seconds. */
  at?: number;
  /** Saturation amount; 0 leaves the layer clean. */
  drive?: number;
}

export interface SfxRenderOptions {
  sampleRate: number;
  seed: number;
  /** Multiplies every pitch and filter frequency; 1 is the recipe as written. */
  pitchScale?: number;
}

const TWO_PI = Math.PI * 2;
const DECAY_TO_SILENCE = Math.log(1000);
const FILTER_UPDATE_INTERVAL = 16;
const PEAK_CEILING = 0.98;

function createRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layerSeconds(layer: SfxLayer): number {
  return layer.attack + (layer.hold ?? 0) + layer.decay;
}

export function getSfxSeconds(layers: readonly SfxLayer[]): number {
  return layers.reduce((longest, layer) => Math.max(longest, (layer.at ?? 0) + layerSeconds(layer)), 0);
}

function sweep(range: readonly [number, number], position: number): number {
  return range[0] * Math.pow(range[1] / range[0], position);
}

function waveSample(wave: SfxWave, phase: number): number {
  const cycle = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(cycle * TWO_PI);
    case 'triangle':
      return 1 - 4 * Math.abs(cycle - 0.5);
    case 'saw':
      return 2 * cycle - 1;
    case 'square':
      return cycle < 0.5 ? 1 : -1;
  }
}

function renderLayer(layer: SfxLayer, output: Float32Array, options: SfxRenderOptions, random: () => number): void {
  const { sampleRate } = options;
  const pitchScale = options.pitchScale ?? 1;
  const seconds = layerSeconds(layer);
  const sampleCount = Math.floor(seconds * sampleRate);
  const startSample = Math.floor((layer.at ?? 0) * sampleRate);
  const holdEnd = layer.attack + (layer.hold ?? 0);
  const fadeSeconds = Math.min(0.004, seconds / 4);
  const sweepRate = layer.sweepRate ?? 1;
  const filter = layer.filter;
  const nyquistLimit = sampleRate * 0.45;

  let phase = 0;
  let modulatorPhase = 0;
  let state1 = 0;
  let state2 = 0;
  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  let damping = 0;

  for (let i = 0; i < sampleCount && startSample + i < output.length; i++) {
    const t = i / sampleRate;
    const position = Math.min(1, Math.pow(t / seconds, 1 / sweepRate));

    let envelope: number;
    if (t < layer.attack) {
      envelope = t / layer.attack;
    } else if (t < holdEnd) {
      envelope = 1;
    } else {
      envelope = Math.exp((-DECAY_TO_SILENCE * (t - holdEnd)) / layer.decay);
    }
    envelope *= Math.min(1, (seconds - t) / fadeSeconds);

    let sample: number;
    if (layer.source === 'noise') {
      sample = random() * 2 - 1;
    } else {
      const frequency = sweep(layer.freq ?? [440, 440], position) * pitchScale;
      phase += frequency / sampleRate;
      if (layer.fm && layer.source === 'sine') {
        modulatorPhase += (frequency * layer.fm.ratio) / sampleRate;
        sample = Math.sin(phase * TWO_PI + layer.fm.index * envelope * Math.sin(modulatorPhase * TWO_PI));
      } else {
        sample = waveSample(layer.source, phase);
      }
    }

    if (filter) {
      if (i % FILTER_UPDATE_INTERVAL === 0) {
        const cutoff = Math.min(nyquistLimit, sweep(filter.freq, position) * pitchScale);
        const g = Math.tan((Math.PI * cutoff) / sampleRate);
        damping = 1 / (filter.q ?? 0.707);
        a1 = 1 / (1 + g * (g + damping));
        a2 = g * a1;
        a3 = g * a2;
      }
      const v3 = sample - state2;
      const v1 = a1 * state1 + a2 * v3;
      const v2 = state2 + a2 * state1 + a3 * v3;
      state1 = 2 * v1 - state1;
      state2 = 2 * v2 - state2;
      sample = filter.type === 'lowpass' ? v2 : filter.type === 'bandpass' ? v1 : sample - damping * v1 - v2;
    }

    if (layer.drive) {
      sample = Math.tanh(sample * (1 + layer.drive)) / Math.tanh(1 + layer.drive);
    }

    output[startSample + i] += sample * envelope * layer.gain;
  }
}

/** Mixes every layer and scales the result down only if it would clip. */
export function renderSfx(layers: readonly SfxLayer[], options: SfxRenderOptions): Float32Array {
  const output = new Float32Array(Math.max(1, Math.ceil(getSfxSeconds(layers) * options.sampleRate)));
  const random = createRandom(options.seed);
  for (const layer of layers) {
    renderLayer(layer, output, options, random);
  }

  let peak = 0;
  for (let i = 0; i < output.length; i++) {
    peak = Math.max(peak, Math.abs(output[i]));
  }
  if (peak > PEAK_CEILING) {
    const scale = PEAK_CEILING / peak;
    for (let i = 0; i < output.length; i++) {
      output[i] *= scale;
    }
  }

  return output;
}
