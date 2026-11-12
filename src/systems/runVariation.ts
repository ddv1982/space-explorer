import { createSeededRandom } from '../utils/seededRandom';
import { getPlayerState, type PlayerStateRegistry } from './PlayerState';

/**
 * How one run differs from the next, derived from the run's seed and the sector. A seed of 0 (saves
 * from before runs had seeds) gives the classic, unvaried sector.
 *
 * Fairness rules: `sky` is looks only and never touches spawns, timing or hitboxes. `mirrored` flips
 * the sector left to right, which is exactly as hard by symmetry.
 */
export interface RunVariation {
  mirrored: boolean;
  sky: SkyVariation;
}

export interface SkyVariation {
  /** Where each star layer starts, as a share of its tile (x, y per layer). */
  starOffsets: ReadonlyArray<readonly [number, number]>;
  /** Mirrors the backdrop (nebula, landmarks, occluder) left to right. */
  mirrored: boolean;
  /** Added to every landmark's rotation, in radians. */
  landmarkRotation: number;
  landmarkScale: number;
  /** A faint tint multiplied over the nebula: near white, so enemy shots keep their contrast. */
  tint: number;
}

const STAR_LAYER_COUNT = 3;
const CLASSIC_SKY: SkyVariation = {
  starOffsets: Array.from({ length: STAR_LAYER_COUNT }, () => [0, 0] as const),
  mirrored: false,
  landmarkRotation: 0,
  landmarkScale: 1,
  tint: 0xffffff,
};

/** The faint tints a run can take: warm, cool, rose and green casts, each within 12% of white. */
const SKY_TINTS = [0xffffff, 0xfff0e2, 0xe4f1ff, 0xffe8f4, 0xe6fff2, 0xf2e8ff] as const;

export function createRunVariation(runSeed: number, level: number): RunVariation {
  if (!runSeed) return { mirrored: false, sky: CLASSIC_SKY };
  const random = createSeededRandom(`run-${runSeed}-sector-${level}`);
  const mirrored = random() < 0.5;
  return {
    mirrored,
    sky: {
      starOffsets: Array.from({ length: STAR_LAYER_COUNT }, () => [random(), random()] as const),
      // The backdrop mirrors with the sector, so a mirrored run reads as mirrored.
      mirrored,
      landmarkRotation: (random() - 0.5) * 0.7,
      landmarkScale: 0.9 + random() * 0.22,
      tint: SKY_TINTS[Math.floor(random() * SKY_TINTS.length)]!,
    },
  };
}

/** A fresh seed for a new run: any positive 32-bit integer. */
export function createRunSeed(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 0xfffffffe);
}

/** This run's variation for the sector in play, read from the run state the scene carries. */
export function resolveRunVariation(scene: { registry?: PlayerStateRegistry }): RunVariation {
  if (!scene.registry) return createRunVariation(0, 1);
  const state = getPlayerState(scene.registry);
  return createRunVariation(state.runSeed, state.level);
}
