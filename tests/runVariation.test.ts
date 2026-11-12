import { describe, expect, test } from 'bun:test';
import { seedWaveRandom, waveRandom } from '../src/systems/gameplayRandom';
import { createRunSeed, createRunVariation } from '../src/systems/runVariation';

function waveChoices(runSeed: number, level: number): number[] {
  seedWaveRandom(runSeed, level);
  return Array.from({ length: 12 }, () => waveRandom.between(0, 99));
}

describe('run variation', () => {
  test('the same run seed gives the same sky, orientation and wave choices (RETRY)', () => {
    expect(createRunVariation(4242, 5)).toEqual(createRunVariation(4242, 5));
    expect(waveChoices(4242, 5)).toEqual(waveChoices(4242, 5));
  });

  test('a new run, or the next sector of the same run, gets something different', () => {
    expect(waveChoices(4242, 5)).not.toEqual(waveChoices(4243, 5));
    expect(waveChoices(4242, 5)).not.toEqual(waveChoices(4242, 6));
    expect(createRunVariation(4242, 5).sky.starOffsets).not.toEqual(createRunVariation(4243, 5).sky.starOffsets);
  });

  test('wave choices stay inside their range', () => {
    seedWaveRandom(7, 1);
    for (let index = 0; index < 500; index += 1) {
      const value = waveRandom.between(3, 5);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(5);
    }
  });

  test('the sky stays subtle: landmarks keep their size and the tint stays near white', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const { sky } = createRunVariation(seed, 3);
      expect(sky.landmarkScale).toBeGreaterThanOrEqual(0.9);
      expect(sky.landmarkScale).toBeLessThanOrEqual(1.12);
      expect(Math.abs(sky.landmarkRotation)).toBeLessThanOrEqual(0.35);
      for (const shift of [16, 8, 0]) expect((sky.tint >> shift) & 0xff).toBeGreaterThanOrEqual(0xe0);
      for (const [x, y] of sky.starOffsets) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(1);
        expect(y).toBeLessThan(1);
      }
    }
  });

  test('about half of all runs mirror a given sector, and the backdrop mirrors with it', () => {
    let mirrored = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const variation = createRunVariation(seed, 4);
      expect(variation.sky.mirrored).toBe(variation.mirrored);
      if (variation.mirrored) mirrored += 1;
    }
    expect(mirrored).toBeGreaterThan(150);
    expect(mirrored).toBeLessThan(250);
  });

  test('saves from before runs had seeds keep the classic sector', () => {
    const classic = createRunVariation(0, 7);
    expect(classic.mirrored).toBe(false);
    expect(classic.sky.tint).toBe(0xffffff);
    expect(classic.sky.landmarkRotation).toBe(0);
  });

  test('a new seed is always a positive whole number', () => {
    expect(createRunSeed(() => 0)).toBe(1);
    expect(createRunSeed(() => 0.999999)).toBeLessThanOrEqual(0xffffffff);
  });
});
