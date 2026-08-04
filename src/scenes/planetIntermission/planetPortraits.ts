import type Phaser from 'phaser';

import { getTotalLevels } from '../../config/LevelsConfig';

/**
 * Authored raster planet portraits (approved art-direction exception; see
 * docs/art-direction.md). Ten painterly 512x512 WebP worlds live under
 * public/assets/planets and are loaded as regular image textures instead of
 * the retired procedural intermission disc.
 */

const PORTRAIT_URL_BASE = '/assets/planets';

export function getPlanetPortraitKey(level: number): string {
  return `planet-portrait-${String(level).padStart(2, '0')}`;
}

export function getPlanetPortraitUrl(level: number): string {
  return `${PORTRAIT_URL_BASE}/planet-${String(level).padStart(2, '0')}.webp`;
}

function isPortraitLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= getTotalLevels();
}

export function hasPlanetPortrait(scene: Phaser.Scene, level: number): boolean {
  return isPortraitLevel(level) && scene.textures.exists(getPlanetPortraitKey(level));
}

/**
 * Queue the portrait for `level` unless it is already cached. Returns true
 * when a file was queued. Call from a scene's preload() so Phaser runs the
 * loader to completion before create(); this keeps direct/dev scene starts
 * and resize restarts as robust as the normal boot-preload flow.
 */
export function queuePlanetPortrait(scene: Phaser.Scene, level: number): boolean {
  if (!isPortraitLevel(level) || hasPlanetPortrait(scene, level)) {
    return false;
  }

  scene.load.image(getPlanetPortraitKey(level), getPlanetPortraitUrl(level));
  return true;
}

/**
 * Queue every campaign portrait that is not already cached (boot preload).
 * Returns the number of files queued.
 */
export function queueAllPlanetPortraits(scene: Phaser.Scene): number {
  let queued = 0;

  for (let level = 1; level <= getTotalLevels(); level += 1) {
    if (queuePlanetPortrait(scene, level)) {
      queued += 1;
    }
  }

  return queued;
}
