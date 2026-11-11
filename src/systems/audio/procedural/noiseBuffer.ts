import type { MusicNoiseCharacterConfig } from '@/config/LevelsConfig';

const NOISE_SECONDS = 1.5;

/** A loopable stretch of white, pink or brown noise for the music's noise layer and drums. */
export function createNoiseBuffer(
  ctx: BaseAudioContext,
  color: NonNullable<MusicNoiseCharacterConfig['color']>
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Paul Kellet's pink filter state, and the running value for brown noise.
  const pink = [0, 0, 0, 0, 0, 0, 0];
  let brown = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;

    if (color === 'pink') {
      pink[0] = 0.99886 * pink[0] + white * 0.0555179;
      pink[1] = 0.99332 * pink[1] + white * 0.0750759;
      pink[2] = 0.969 * pink[2] + white * 0.153852;
      pink[3] = 0.8665 * pink[3] + white * 0.3104856;
      pink[4] = 0.55 * pink[4] + white * 0.5329522;
      pink[5] = -0.7616 * pink[5] - white * 0.016898;
      data[i] = (pink[0] + pink[1] + pink[2] + pink[3] + pink[4] + pink[5] + pink[6] + white * 0.5362) * 0.11;
      pink[6] = white * 0.115926;
    } else if (color === 'brown') {
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = brown * 3.2;
    } else {
      data[i] = white * 0.6;
    }
  }

  return buffer;
}
