import type { ProceduralMusicTrackConfig } from '../config/LevelsConfig';
import { applyMusicSpace, createMusicBus } from '../systems/audio/procedural/bus';
import { createNoiseBuffer } from '../systems/audio/procedural/noiseBuffer';
import { getMusicStepSeconds, scheduleTrackStep } from '../systems/audio/procedural/scheduleStep';

export interface TrackMeasurement {
  peak: number;
  rms: number;
  /** Share of the energy below about 200 Hz and above about 2 kHz. */
  lowShare: number;
  highShare: number;
}

/** The live chain's levels: output boost (which follows intensity above 0.9), then the music bus level. */
const LIVE_OUTPUT_BOOST = 2.9 * 0.26;
const SAMPLE_RATE = 44100;

/** Renders a track faster than real time through the real music bus and measures what comes out. */
export async function measureTrack(
  track: ProceduralMusicTrackConfig,
  seconds: number,
  intensity: number
): Promise<TrackMeasurement> {
  const ctx = new OfflineAudioContext(2, SAMPLE_RATE * seconds, SAMPLE_RATE);
  const bus = createMusicBus(ctx, ctx.destination);
  bus.output.gain.value = Math.max(0.9, intensity) * LIVE_OUTPUT_BOOST;
  applyMusicSpace(ctx, bus, track.space, getMusicStepSeconds(track), 0);
  const noise = new Map<string, AudioBuffer>();
  const output = {
    ctx,
    dry: bus.dry,
    space: bus.space,
    getNoiseBuffer: (color: 'white' | 'pink' | 'brown' = 'white') => {
      let buffer = noise.get(color);
      if (!buffer) noise.set(color, (buffer = createNoiseBuffer(ctx, color)));
      return buffer;
    },
  };

  const stepSeconds = getMusicStepSeconds(track);
  for (let step = 0; step * stepSeconds < seconds; step++) {
    scheduleTrackStep(output, track, step, 0.05 + step * stepSeconds, intensity);
  }

  const rendered = await ctx.startRendering();
  const left = rendered.getChannelData(0);
  const right = rendered.getChannelData(1);
  const lowCoefficient = 1 - Math.exp((-2 * Math.PI * 200) / SAMPLE_RATE);
  const highCoefficient = 1 - Math.exp((-2 * Math.PI * 2000) / SAMPLE_RATE);
  let peak = 0;
  let total = 0;
  let low = 0;
  let high = 0;
  let lowState = 0;
  let highState = 0;
  for (let i = 0; i < left.length; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    const mono = (left[i] + right[i]) / 2;
    lowState += lowCoefficient * (mono - lowState);
    highState += highCoefficient * (mono - highState);
    total += mono * mono;
    low += lowState * lowState;
    high += (mono - highState) * (mono - highState);
  }

  return {
    peak,
    rms: Math.sqrt(total / left.length),
    lowShare: low / Math.max(total, 1e-12),
    highShare: high / Math.max(total, 1e-12),
  };
}
