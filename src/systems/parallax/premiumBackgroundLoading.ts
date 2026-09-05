import Phaser from 'phaser';
import { selectLivingWorld } from './livingBackgroundProfile';
import { getLevelConfig } from '../../config/LevelsConfig';

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
 * Prepares legacy planes only for development comparisons, then calls onReady
 * synchronously. Cinematic assets load at each scene preload boundary.
 */
export function ensurePremiumBackgroundAssets(
  scene: Phaser.Scene,
  levelNumber: number,
  onReady: () => void,
  options: EnsurePremiumBackgroundAssetsOptions = {}
): void {
  const lookAhead = options.lookAhead ?? 0;

  if (import.meta.env.DEV) {
    for (const windowLevel of getPremiumBackgroundLevelWindow(levelNumber, { lookAhead })) {
      if (!selectLivingWorld(getLevelConfig(windowLevel).name)) ensureNeonBackgroundTextures(scene, windowLevel);
    }
  }

  if (options.releaseOutsideWindow ?? false) {
    releasePremiumBackgroundTexturesOutsideWindow(scene, levelNumber, { lookAhead });
  }

  onReady();
}
