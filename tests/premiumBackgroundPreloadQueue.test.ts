import { describe, expect, test } from 'bun:test';

import {
  getAllPremiumBackgroundPreloadQueue,
  getPremiumBackgroundKeysOutsideLevelWindow,
  getPremiumBackgroundLevelWindow,
  getPremiumBackgroundPreloadQueueForLevelWindow,
  getStartupPremiumBackgroundPreloadQueue,
} from '../src/systems/parallax/premiumBackgroundManifest';

describe('premium background preload queues', () => {
  test('startup queue warms only the first level window', () => {
    const startup = getStartupPremiumBackgroundPreloadQueue();

    expect(startup.map((asset) => asset.key)).toEqual(['bg_level01', 'bg_level02']);
    expect(startup.every((asset) => asset.url.startsWith('/assets/backgrounds/'))).toBe(true);
  });

  test('level window covers current and look-ahead levels, clamping at campaign end', () => {
    expect(getPremiumBackgroundLevelWindow(1)).toEqual([1, 2]);
    expect(getPremiumBackgroundLevelWindow(5)).toEqual([5, 6]);
    expect(getPremiumBackgroundLevelWindow(10)).toEqual([10]);
    expect(getPremiumBackgroundLevelWindow(99)).toEqual([10]);
    expect(getPremiumBackgroundLevelWindow(0)).toEqual([1, 2]);
  });

  test('windowed queue returns matching asset keys for mid-campaign levels', () => {
    const queue = getPremiumBackgroundPreloadQueueForLevelWindow(6);

    expect(queue.map((asset) => asset.key)).toEqual(['bg_level06', 'bg_level07']);
  });

  test('keys outside the window cover the rest of the campaign pack', () => {
    const outside = getPremiumBackgroundKeysOutsideLevelWindow(3);

    expect(outside).toEqual([
      'bg_level01',
      'bg_level02',
      'bg_level05',
      'bg_level06',
      'bg_level07',
      'bg_level08',
      'bg_level09',
      'bg_level10',
    ]);
    expect(outside).not.toContain('bg_level03');
    expect(outside).not.toContain('bg_level04');
  });

  test('full campaign queue still lists all ten backgrounds', () => {
    const all = getAllPremiumBackgroundPreloadQueue();

    expect(all).toHaveLength(10);
    expect(all[0]?.key).toBe('bg_level01');
    expect(all[9]?.key).toBe('bg_level10');
  });
});
