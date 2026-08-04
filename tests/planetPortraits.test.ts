import { describe, expect, test } from 'bun:test';
import type Phaser from 'phaser';

import { getTotalLevels } from '../src/config/LevelsConfig';
import {
  getPlanetPortraitKey,
  getPlanetPortraitUrl,
  hasPlanetPortrait,
  queueAllPlanetPortraits,
  queuePlanetPortrait,
} from '../src/scenes/planetIntermission/planetPortraits';

interface QueuedImage {
  key: string;
  url: string;
}

function createSceneHarness(cachedKeys: readonly string[] = []) {
  const queuedImages: QueuedImage[] = [];
  const scene = {
    textures: {
      exists: (key: string) => cachedKeys.includes(key),
    },
    load: {
      image: (key: string, url: string) => {
        queuedImages.push({ key, url });
      },
    },
  } as unknown as Phaser.Scene;

  return { scene, queuedImages };
}

describe('planet portrait assets', () => {
  test('maps every campaign level to a distinct authored portrait file', () => {
    const keys = new Set<string>();
    const urls = new Set<string>();

    for (let level = 1; level <= getTotalLevels(); level += 1) {
      keys.add(getPlanetPortraitKey(level));
      urls.add(getPlanetPortraitUrl(level));
    }

    expect(keys.size).toBe(getTotalLevels());
    expect(urls.size).toBe(getTotalLevels());
  });

  test('uses zero-padded texture keys and committed WebP urls', () => {
    expect(getPlanetPortraitKey(1)).toBe('planet-portrait-01');
    expect(getPlanetPortraitKey(10)).toBe('planet-portrait-10');
    expect(getPlanetPortraitUrl(1)).toBe('/assets/planets/planet-01.webp');
    expect(getPlanetPortraitUrl(10)).toBe('/assets/planets/planet-10.webp');
  });

  test('queues the portrait load only when the texture is not cached', () => {
    const { scene, queuedImages } = createSceneHarness();

    expect(queuePlanetPortrait(scene, 4)).toBe(true);
    expect(queuedImages).toEqual([
      { key: 'planet-portrait-04', url: '/assets/planets/planet-04.webp' },
    ]);

    const cached = createSceneHarness(['planet-portrait-04']);
    expect(queuePlanetPortrait(cached.scene, 4)).toBe(false);
    expect(cached.queuedImages).toEqual([]);
  });

  test('refuses to queue portraits for levels outside the campaign', () => {
    const { scene, queuedImages } = createSceneHarness();

    for (const level of [0, -1, getTotalLevels() + 1, 2.5, Number.NaN]) {
      expect(queuePlanetPortrait(scene, level)).toBe(false);
    }

    expect(queuedImages).toEqual([]);
  });

  test('reports cache presence only for authored portrait levels', () => {
    const { scene } = createSceneHarness(['planet-portrait-02']);

    expect(hasPlanetPortrait(scene, 2)).toBe(true);
    expect(hasPlanetPortrait(scene, 3)).toBe(false);
    expect(hasPlanetPortrait(scene, 0)).toBe(false);
    expect(hasPlanetPortrait(scene, getTotalLevels() + 1)).toBe(false);
  });

  test('queues the full campaign set during boot preload and skips cached files', () => {
    const { scene, queuedImages } = createSceneHarness();

    expect(queueAllPlanetPortraits(scene)).toBe(getTotalLevels());
    expect(queuedImages).toHaveLength(getTotalLevels());
    expect(queuedImages[0]).toEqual({
      key: 'planet-portrait-01',
      url: '/assets/planets/planet-01.webp',
    });
    expect(queuedImages.at(-1)).toEqual({
      key: `planet-portrait-${String(getTotalLevels()).padStart(2, '0')}`,
      url: `/assets/planets/planet-${String(getTotalLevels()).padStart(2, '0')}.webp`,
    });

    const allCached = createSceneHarness(
      Array.from({ length: getTotalLevels() }, (_, index) => getPlanetPortraitKey(index + 1))
    );
    expect(queueAllPlanetPortraits(allCached.scene)).toBe(0);
    expect(allCached.queuedImages).toEqual([]);
  });
});
