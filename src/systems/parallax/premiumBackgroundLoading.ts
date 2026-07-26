import Phaser from 'phaser';

import {
  getPremiumBackgroundKeysOutsideLevelWindow,
  getPremiumBackgroundPreloadQueueForLevelWindow,
  type PremiumBackgroundAsset,
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

function queueMissingPremiumBackgroundAssets(
  loader: Phaser.Loader.LoaderPlugin,
  textures: Phaser.Textures.TextureManager,
  assets: readonly PremiumBackgroundAsset[]
): PremiumBackgroundAsset[] {
  const missing = assets.filter((asset) => !textures.exists(asset.key));

  for (const asset of missing) {
    loader.image(asset.key, asset.url);
  }

  return missing;
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
 * Calls onReady when ready (or when the load attempt finishes, even if a file failed —
 * Game falls back to procedural starfield for missing keys).
 *
 * Aborts without calling onReady if the scene shuts down mid-load, so resize/restart
 * cannot orphan a late COMPLETE into startRegisteredScene.
 */
export function ensurePremiumBackgroundAssets(
  scene: Phaser.Scene,
  levelNumber: number,
  onReady: () => void,
  options: EnsurePremiumBackgroundAssetsOptions = {}
): void {
  const lookAhead = options.lookAhead ?? 1;
  const releaseOutsideWindow = options.releaseOutsideWindow ?? false;
  const assets = getPremiumBackgroundPreloadQueueForLevelWindow(levelNumber, { lookAhead });
  const missing = queueMissingPremiumBackgroundAssets(scene.load, scene.textures, assets);

  let settled = false;
  let guardsAttached = false;

  const onComplete = (): void => {
    finish();
  };

  const onFileLoadError = (file: { key?: string } | undefined): void => {
    const key = file && typeof file === 'object' && 'key' in file ? file.key : undefined;
    console.warn(
      `[premiumBackground] failed to load ${key ?? 'asset'}; continuing with starfield fallback if needed`
    );
  };

  const onSceneInvalidated = (): void => {
    if (settled) {
      return;
    }
    settled = true;
    detachLifecycleGuards();
  };

  const detachLifecycleGuards = (): void => {
    if (!guardsAttached) {
      return;
    }
    guardsAttached = false;
    scene.load.off(Phaser.Loader.Events.COMPLETE, onComplete);
    scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileLoadError);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onSceneInvalidated);
    scene.events.off(Phaser.Scenes.Events.DESTROY, onSceneInvalidated);
  };

  const finish = (): void => {
    if (settled) {
      return;
    }
    settled = true;
    detachLifecycleGuards();

    if (releaseOutsideWindow) {
      releasePremiumBackgroundTexturesOutsideWindow(scene, levelNumber, { lookAhead });
    }
    onReady();
  };

  if (missing.length === 0) {
    finish();
    return;
  }

  guardsAttached = true;
  scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onFileLoadError);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onSceneInvalidated);
  scene.events.once(Phaser.Scenes.Events.DESTROY, onSceneInvalidated);

  if (!scene.load.isLoading()) {
    scene.load.start();
  }
}
