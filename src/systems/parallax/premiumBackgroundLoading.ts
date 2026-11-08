import Phaser from 'phaser';
import { selectLivingWorld } from './livingBackgroundProfile';
import { getLevelConfig } from '../../config/LevelsConfig';

import { ensureNeonBackgroundTextures } from './neonBackgroundGenerator';
import {
  getPremiumBackgroundKeysOutsideLevelWindow,
  getPremiumBackgroundLevelWindow,
} from './premiumBackgroundManifest';

interface PrepareLegacyBackgroundTexturesOptions {
  lookAhead?: number;
  /**
   * When true, remove textures outside the level window before returning.
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

export function prepareLegacyBackgroundTextures(
  scene: Phaser.Scene,
  levelNumber: number,
  options: PrepareLegacyBackgroundTexturesOptions = {}
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
}
