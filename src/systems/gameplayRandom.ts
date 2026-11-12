import { createSeededRandom, type RandomSource } from '../utils/seededRandom';

/**
 * Random sources for wave choices: which enemies arrive, how many and where. They are seeded per run
 * and sector, so RETRY draws the same choices in the same order and a new run draws different ones.
 *
 * Each subsystem has its own stream, so one extra asteroid cannot shift every enemy choice after it.
 * Within a stream the order is fixed, but how far a run gets through it depends on play (a death that
 * eases the next wave skips a draw). Enemy jitter and pickup drops stay on `Math.random`: they
 * depend on how the fight goes, not on the seed.
 */
const STREAMS = ['enemies', 'asteroids', 'wormholes'] as const;
type WaveStream = (typeof STREAMS)[number];

const sources: Record<WaveStream, RandomSource> = {
  enemies: Math.random,
  asteroids: Math.random,
  wormholes: Math.random,
};

/** Seeds the wave choices for one sector of one run. A seed of 0 (older saves) leaves them unseeded. */
export function seedWaveRandom(runSeed: number, level: number): void {
  for (const stream of STREAMS) {
    sources[stream] = runSeed ? createSeededRandom(`waves-${runSeed}-sector-${level}-${stream}`) : Math.random;
  }
}

function createStream(stream: WaveStream) {
  return {
    /** A whole number from `min` to `max`, both included (as `Phaser.Math.Between`). */
    between(min: number, max: number): number {
      return Math.floor(sources[stream]() * (max - min + 1) + min);
    },
  };
}

/** Enemy types, counts and spawn positions. */
export const waveRandom = createStream('enemies');
/** Asteroid fields and rock corridors. */
export const asteroidRandom = createStream('asteroids');
/** Where wormhole packs open. */
export const wormholeRandom = createStream('wormholes');
