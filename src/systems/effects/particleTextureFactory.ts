import type Phaser from 'phaser';
import { withCanvasTexture } from '../../utils/generatedTexture';

/**
 * Soft light textures for every combat effect, painted with Canvas 2D gradients. All are white or
 * neutral so emitters tint them per effect; additive blending turns overlapping layers into heat.
 */
export const PARTICLE = {
  glow: 'particle-glow',
  flare: 'particle-flare',
  fire: 'particle-fire',
  smoke: 'particle-smoke',
  spark: 'particle-spark',
  ring: 'particle-ring',
  debris: 'particle-debris',
} as const;

/** Deterministic PRNG so generated textures are identical every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radial(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stops: ReadonlyArray<readonly [number, string]>
): void {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

/** Gaussian-like round glow: hot centre, long soft falloff. */
function paintGlow(context: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  radial(context, c, c, c, [
    [0, 'rgba(255,255,255,1)'],
    [0.18, 'rgba(255,255,255,0.85)'],
    [0.42, 'rgba(255,255,255,0.32)'],
    [0.7, 'rgba(255,255,255,0.08)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
}

/** Lens flare: round core plus long horizontal and vertical spikes and faint diagonals. */
function paintFlare(context: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  radial(context, c, c, c * 0.42, [
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(255,255,255,0.6)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  const spike = (angle: number, length: number, width: number, alpha: number): void => {
    context.save();
    context.translate(c, c);
    context.rotate(angle);
    const gradient = context.createLinearGradient(-length, 0, length, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(-length, 0);
    context.quadraticCurveTo(0, -width, length, 0);
    context.quadraticCurveTo(0, width, -length, 0);
    context.fill();
    context.restore();
  };
  spike(0, c, 2.2, 0.95);
  spike(Math.PI / 2, c, 2.2, 0.95);
  spike(Math.PI / 4, c * 0.55, 1.4, 0.45);
  spike(-Math.PI / 4, c * 0.55, 1.4, 0.45);
}

/** Billowing fire puff: overlapping soft lobes around a bright core. */
function paintFire(context: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  const random = seeded(7);
  for (let lobe = 0; lobe < 7; lobe += 1) {
    const angle = (lobe / 7) * Math.PI * 2 + random() * 0.6;
    const distance = c * (0.18 + random() * 0.2);
    radial(context, c + Math.cos(angle) * distance, c + Math.sin(angle) * distance, c * (0.42 + random() * 0.14), [
      [0, 'rgba(255,255,255,0.55)'],
      [0.6, 'rgba(255,255,255,0.2)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
  }
  radial(context, c, c, c * 0.62, [
    [0, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(255,255,255,0.45)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
}

/** Lumpy, translucent smoke: many faint blobs so stacked puffs read as volume. */
function paintSmoke(context: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  const random = seeded(23);
  for (let blob = 0; blob < 11; blob += 1) {
    const angle = random() * Math.PI * 2;
    const distance = c * random() * 0.42;
    const shade = Math.round(200 + random() * 55);
    radial(context, c + Math.cos(angle) * distance, c + Math.sin(angle) * distance, c * (0.3 + random() * 0.25), [
      [0, `rgba(${shade},${shade},${shade},0.32)`],
      [1, `rgba(${shade},${shade},${shade},0)`],
    ]);
  }
}

/** Tapered streak, brightest just behind the leading tip (the texture points along +X). */
function paintSpark(context: CanvasRenderingContext2D, width: number, height: number): void {
  const cy = height / 2;
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.9, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(0, cy);
  context.quadraticCurveTo(width * 0.7, cy - height / 2, width, cy);
  context.quadraticCurveTo(width * 0.7, cy + height / 2, 0, cy);
  context.fill();
}

/** Shockwave: a soft-edged ring with a faint inner wash. */
function paintRing(context: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  radial(context, c, c, c, [
    [0, 'rgba(255,255,255,0)'],
    [0.55, 'rgba(255,255,255,0.05)'],
    [0.8, 'rgba(255,255,255,0.35)'],
    [0.9, 'rgba(255,255,255,1)'],
    [0.95, 'rgba(255,255,255,0.4)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
}

/** Angular hull shard with a lit edge. */
function paintDebris(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = 'rgb(150,150,156)';
  context.beginPath();
  context.moveTo(size * 0.1, size * 0.35);
  context.lineTo(size * 0.55, size * 0.05);
  context.lineTo(size * 0.95, size * 0.45);
  context.lineTo(size * 0.6, size * 0.95);
  context.lineTo(size * 0.2, size * 0.8);
  context.closePath();
  context.fill();
  context.strokeStyle = 'rgb(240,240,245)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(size * 0.1, size * 0.35);
  context.lineTo(size * 0.55, size * 0.05);
  context.lineTo(size * 0.95, size * 0.45);
  context.stroke();
}

export function generateEffectsParticleTextures(scene: Phaser.Scene): void {
  withCanvasTexture(scene, PARTICLE.glow, 64, 64, (context, size) => paintGlow(context, size));
  withCanvasTexture(scene, PARTICLE.flare, 96, 96, (context, size) => paintFlare(context, size));
  withCanvasTexture(scene, PARTICLE.fire, 64, 64, (context, size) => paintFire(context, size));
  withCanvasTexture(scene, PARTICLE.smoke, 64, 64, (context, size) => paintSmoke(context, size));
  withCanvasTexture(scene, PARTICLE.spark, 32, 6, paintSpark);
  withCanvasTexture(scene, PARTICLE.ring, 128, 128, (context, size) => paintRing(context, size));
  withCanvasTexture(scene, PARTICLE.debris, 10, 10, (context, size) => paintDebris(context, size));
}
