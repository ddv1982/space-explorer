import Phaser from 'phaser';

import { ensureNeonBackgroundTextures } from './neonBackgroundGenerator';
import {
  getPremiumBackgroundKeysOutsideLevelWindow,
  getPremiumBackgroundLevelWindow,
} from './premiumBackgroundManifest';

interface EnsurePremiumBackgroundAssetsOptions {
  lookAhead?: number;
  /**
   * When true, remove textures outside the level window before onReady.
   * Defaults to false so transition callers do not destroy textures still
   * displayed by the outgoing scene. Prefer releasing after Game create
   * via {@link releasePremiumBackgroundTexturesOutsideWindow}.
   */
  releaseOutsideWindow?: boolean;
}

export function releasePremiumBackgroundTexturesOutsideWindow(
  scene: Phaser.Scene,
  levelNumber: number,
  options: { lookAhead?: number } = {}
): void {
  const removableKeys = getPremiumBackgroundKeysOutsideLevelWindow(levelNumber, options);

  for (const key of removableKeys) {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
  }
}

/**
 * Ensure the active level window's premium backgrounds are in the texture cache.
 * Neon vector backgrounds are generated procedurally, so this is synchronous:
 * layers are drawn once per texture key and onReady fires immediately.
 */
export function ensurePremiumBackgroundAssets(
  scene: Phaser.Scene,
  levelNumber: number,
  onReady: () => void,
  options: EnsurePremiumBackgroundAssetsOptions = {}
): void {
  const lookAhead = options.lookAhead ?? 1;

  for (const windowLevel of getPremiumBackgroundLevelWindow(levelNumber, { lookAhead })) {
    ensureNeonBackgroundTextures(scene, windowLevel);
  }

  if (options.releaseOutsideWindow ?? false) {
    releasePremiumBackgroundTexturesOutsideWindow(scene, levelNumber, { lookAhead });
  }

  onReady();
}
