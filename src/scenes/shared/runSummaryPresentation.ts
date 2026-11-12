import Phaser from 'phaser';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { generateEffectsParticleTextures, PARTICLE } from '../../systems/effects/particleTextureFactory';
import { withCanvasTexture } from '../../utils/generatedTexture';
import { prefersReducedMotion } from '../../utils/device';

/** Canvas atmosphere shared by the run-summary screens (Game Over and Victory). */

const VIGNETTE_KEY = 'run-summary-vignette';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Screen-edge wash in one colour; the centre stays clear so the summary reads. */
export function addEdgeVignette(
  scene: Phaser.Scene,
  bounds: Bounds,
  color: number,
  alpha: number
): Phaser.GameObjects.Image {
  withCanvasTexture(scene, VIGNETTE_KEY, 128, 128, (context, size) => {
    const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.72);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(255,255,255,1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
  return scene.add
    .image(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, VIGNETTE_KEY)
    .setDisplaySize(bounds.width, bounds.height)
    .setTint(color)
    .setAlpha(alpha)
    .setDepth(1);
}

/** Slow motes of light drifting up the screen. Skipped entirely under reduced motion. */
export function addDriftingMotes(scene: Phaser.Scene, bounds: Bounds, tints: number[], density: number): void {
  if (prefersReducedMotion()) return;
  generateEffectsParticleTextures(scene);
  const quantityScale = getVisualQualityProfile().particleQuantityScale;
  scene.add
    .particles(0, 0, PARTICLE.glow, {
      x: { min: bounds.x, max: bounds.x + bounds.width },
      y: bounds.y + bounds.height + 12,
      lifespan: { min: 5200, max: 9000 },
      speedY: { min: -70, max: -24 },
      speedX: { min: -14, max: 14 },
      scale: { start: 0.2, end: 0.03 },
      alpha: { start: 0.55, end: 0 },
      tint: tints,
      blendMode: Phaser.BlendModes.ADD,
      frequency: Math.round(260 / (density * quantityScale)),
      advance: 6000,
    })
    .setDepth(2);
}
