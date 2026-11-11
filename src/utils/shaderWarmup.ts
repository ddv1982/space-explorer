import Phaser from 'phaser';
import { withCanvasTexture } from './generatedTexture';
import { applyHazardTelegraphGlow } from './renderingCompat';

const WARMUP_TEXTURE_PREFIX = 'shader-warmup-';
/** Low enough to be invisible, high enough that Phaser still draws the object. */
const WARMUP_ALPHA = 0.004;

let warmedRenderer: Phaser.Renderer.WebGL.WebGLRenderer | null = null;

/**
 * Compiles the gameplay shaders behind the loading screen.
 *
 * Phaser builds a separate sprite shader for each number of textures that share a batch, and compiles
 * it the first time that number comes up. Every floating score is its own texture, so new counts kept
 * turning up mid-fight and each one froze the game while its shader compiled. Drawing one batch of
 * every size here moves all of those compiles to the loading screen, together with the hazard glow.
 */
export function warmGameplayShaders(scene: Phaser.Scene): void {
  const renderer = scene.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) || warmedRenderer === renderer) return;
  warmedRenderer = renderer;

  const textureKeys: string[] = [];
  for (let index = 0; index < renderer.maxTextures; index += 1) {
    const key = `${WARMUP_TEXTURE_PREFIX}${index}`;
    withCanvasTexture(scene, key, 2, 2, (context) => {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, 2, 2);
    });
    textureKeys.push(key);
  }

  const objects: Phaser.GameObjects.GameObject[] = [];
  for (let batchSize = 1; batchSize <= textureKeys.length; batchSize += 1) {
    // A change of blend mode ends the batch, so each group reaches the shader as its own size.
    const blendMode = batchSize % 2 === 0 ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL;
    for (const key of textureKeys.slice(0, batchSize)) {
      objects.push(scene.add.image(1, 1, key).setAlpha(WARMUP_ALPHA).setBlendMode(blendMode));
    }
  }

  const glow = scene.add.graphics().setAlpha(WARMUP_ALPHA);
  glow.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
  applyHazardTelegraphGlow(glow, 0xffffff);
  objects.push(glow);

  const release = (): void => {
    scene.game.events.off(Phaser.Core.Events.POST_RENDER, release);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, release);
    for (const object of objects) object.destroy();
    for (const key of textureKeys) scene.textures.remove(key);
  };
  scene.game.events.once(Phaser.Core.Events.POST_RENDER, release);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, release);
}
