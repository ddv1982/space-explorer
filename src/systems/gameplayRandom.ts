import { createSeededRandom, type RandomSource } from '../utils/seededRandom';

/**
 * The random source for wave choices: which enemies arrive, how many and where. It is seeded per run
 * and sector, so RETRY meets the same waves and a new run meets different ones. Enemy jitter and
 * pickup drops stay on `Math.random`: they depend on how the fight goes, not on the seed.
 */
let source: RandomSource = Math.random;

/** Seeds the wave choices for one sector of one run. A seed of 0 (older saves) leaves them unseeded. */
export function seedWaveRandom(runSeed: number, level: number): void {
  source = runSeed ? createSeededRandom(`waves-${runSeed}-sector-${level}`) : Math.random;
}

export const waveRandom = {
  /** A whole number from `min` to `max`, both included (as `Phaser.Math.Between`). */
  between(min: number, max: number): number {
    return Math.floor(source() * (max - min + 1) + min);
  },
};
