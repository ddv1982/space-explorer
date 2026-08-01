import { describe, expect, test } from 'bun:test';

import {
  getAllPremiumBackgroundPreloadQueue,
  getPremiumBackgroundKeysOutsideLevelWindow,
  getPremiumBackgroundLevelWindow,
  getPremiumBackgroundPreloadQueueForLevelWindow,
  getStartupPremiumBackgroundPreloadQueue,
} from '../src/systems/parallax/premiumBackgroundManifest';

const LEVEL_LAYER_SUFFIXES = ['', '_nebula', '_mid', '_near', '_overlay', '_composite'];

function levelKeys(...levelNumbers: number[]): string[] {
  return levelNumbers.flatMap((levelNumber) => {
    const prefix = `bg_level${String(levelNumber).padStart(2, '0')}`;
    return LEVEL_LAYER_SUFFIXES.map((suffix) => `${prefix}${suffix}`);
  });
}

describe('premium background preload queues', () => {
  test('startup queue warms only the first level', () => {
    const startup = getStartupPremiumBackgroundPreloadQueue();

    expect(startup).toEqual(levelKeys(1));
  });

  test('level window retains the active level by default and clamps at campaign end', () => {
    expect(getPremiumBackgroundLevelWindow(1)).toEqual([1]);
    expect(getPremiumBackgroundLevelWindow(5)).toEqual([5]);
    expect(getPremiumBackgroundLevelWindow(10)).toEqual([10]);
    expect(getPremiumBackgroundLevelWindow(99)).toEqual([10]);
    expect(getPremiumBackgroundLevelWindow(0)).toEqual([1]);
    expect(getPremiumBackgroundLevelWindow(5, { lookAhead: 1 })).toEqual([5, 6]);
  });

  test('windowed queue returns matching layer keys for mid-campaign levels', () => {
    const queue = getPremiumBackgroundPreloadQueueForLevelWindow(6);

    expect(queue).toEqual(levelKeys(6));
  });

  test('keys outside the window cover the rest of the campaign pack', () => {
    const outside = getPremiumBackgroundKeysOutsideLevelWindow(3);

    expect(outside).toEqual(levelKeys(1, 2, 4, 5, 6, 7, 8, 9, 10));
    expect(outside).not.toContain('bg_level03');
    expect(outside).toContain('bg_level04_mid');
  });

  test('full campaign queue still lists all ten background sets', () => {
    const all = getAllPremiumBackgroundPreloadQueue();

    expect(all).toHaveLength(60);
    expect(all[0]).toBe('bg_level01');
    expect(all[59]).toBe('bg_level10_composite');
  });
});
