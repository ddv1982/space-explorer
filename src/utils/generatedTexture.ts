import Phaser from 'phaser';

import { getVisualQualityProfile } from '../config/visualQuality';

interface GeneratedTextureOptions {
  resolution?: number;
}

function cleanupWithoutMasking(cleanup: () => void, primaryOperationFailed: boolean): void {
  try {
    cleanup();
  } catch (error) {
    if (!primaryOperationFailed) throw error;
  }
}

function generateResolvedTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  resolution: number,
  graphics: Phaser.GameObjects.Graphics
): void {
  const drawWidth = width * resolution;
  const drawHeight = height * resolution;
  const drawCanvas = Phaser.Display.Canvas.CanvasPool.create2D(graphics, drawWidth, drawHeight);
  let generationFailed = false;

  try {
    graphics.generateTexture(drawCanvas, drawWidth, drawHeight);
    const resolvedCanvas = Phaser.Display.Canvas.CanvasPool.create2D(scene.textures, width, height);
    let resolvedCanvasOwned = true;

    try {
      const context = resolvedCanvas.getContext('2d');
      if (!context) {
        throw new Error(`Unable to resolve generated texture: ${key}`);
      }

      context.save();
      let resolveFailed = false;
      try {
        context.clearRect(0, 0, width, height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        // drawImage performs interpolation in the browser's premultiplied-alpha
        // pipeline, avoiding the dark fringes produced by averaging raw RGBA data.
        context.drawImage(drawCanvas, 0, 0, drawWidth, drawHeight, 0, 0, width, height);
      } catch (error) {
        resolveFailed = true;
        throw error;
      } finally {
        cleanupWithoutMasking(() => context.restore(), resolveFailed);
      }

      const texture = scene.textures.addCanvas(key, resolvedCanvas);
      if (!texture) {
        throw new Error(`Unable to register generated texture: ${key}`);
      }
      resolvedCanvasOwned = false;
    } catch (error) {
      // addCanvas registers before emitting ADD. Once registered, its texture owns
      // the canvas and removing by key lets CanvasTexture release it.
      try {
        if (scene.textures.exists(key)) {
          resolvedCanvasOwned = false;
          scene.textures.remove(key);
        }
      } catch {
        // Preserve the original resolve or registration failure.
      }
      if (resolvedCanvasOwned) {
        try {
          Phaser.Display.Canvas.CanvasPool.remove(resolvedCanvas);
        } catch {
          // Preserve the original resolve or registration failure.
        }
      }
      throw error;
    }
  } catch (error) {
    generationFailed = true;
    throw error;
  } finally {
    cleanupWithoutMasking(() => Phaser.Display.Canvas.CanvasPool.remove(drawCanvas), generationFailed);
  }
}

export function withGeneratedTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
  options: GeneratedTextureOptions = {}
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const resolution = Math.max(1, Math.floor(options.resolution ?? 1));
  const graphics = scene.add.graphics();
  let generationFailed = false;
  try {
    if (resolution > 1) {
      graphics.setScale(resolution);
    }
    draw(graphics);
    if (resolution === 1) {
      graphics.generateTexture(key, width, height);
    } else {
      generateResolvedTexture(scene, key, width, height, resolution, graphics);
    }
  } catch (error) {
    generationFailed = true;
    throw error;
  } finally {
    cleanupWithoutMasking(() => graphics.destroy(), generationFailed);
  }

  return key;
}

export function withGeneratedEntityTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
): string {
  return withGeneratedTexture(scene, key, width, height, draw, {
    resolution: getVisualQualityProfile().entityTextureResolution,
  });
}

export function withGeneratedParticleTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
): string {
  return withGeneratedTexture(scene, key, width, height, draw, {
    resolution: getVisualQualityProfile().particleTextureResolution,
  });
}
