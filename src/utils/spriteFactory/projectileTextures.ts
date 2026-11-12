import type Phaser from 'phaser';
import { BEAM_TEXTURE_WIDTH } from '../../entities/hazardBeamGeometry';
import { withCanvasTexture } from '../generatedTexture';

/**
 * Projectiles are light, so they are painted with soft gradients rather than lit 3D models. Textures
 * are larger than the Arcade bodies to hold their glow; each entity sets its own body size.
 */
const DENSITY = 4;

type Rgb = readonly [number, number, number];

function rgba([r, g, b]: Rgb, alpha: number): string {
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Soft elliptical glow stretched along Y. */
function glowEllipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  color: Rgb,
  alpha: number
): void {
  context.save();
  context.translate(x, y);
  context.scale(1, radiusY / radiusX);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX);
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.45, rgba(color, alpha * 0.4));
  gradient.addColorStop(1, rgba(color, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radiusX, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function capsule(context: CanvasRenderingContext2D, x: number, top: number, bottom: number, radius: number): void {
  context.beginPath();
  context.arc(x, top + radius, radius, Math.PI, 0);
  context.lineTo(x + radius, bottom - radius);
  context.arc(x, bottom - radius, radius, 0, Math.PI);
  context.closePath();
}

/** Hot plasma lance: a white core in a cyan sheath, brightest at the leading tip. */
function paintBolt(context: CanvasRenderingContext2D, width: number, height: number, color: Rgb, core: Rgb): void {
  const x = width / 2;
  glowEllipse(context, x, height * 0.45, width / 2, height / 2, color, 0.55);
  const sheath = context.createLinearGradient(0, 0, 0, height);
  sheath.addColorStop(0, rgba(core, 1));
  sheath.addColorStop(0.35, rgba(color, 0.95));
  sheath.addColorStop(1, rgba(color, 0));
  context.fillStyle = sheath;
  capsule(context, x, height * 0.14, height * 0.92, width * 0.2);
  context.fill();
  context.fillStyle = rgba([255, 255, 255], 1);
  capsule(context, x, height * 0.16, height * 0.6, width * 0.09);
  context.fill();
  glowEllipse(context, x, height * 0.2, width * 0.3, width * 0.3, [255, 255, 255], 0.9);
}

export function ensurePlayerBulletTexture(scene: Phaser.Scene): string {
  return withCanvasTexture(
    scene,
    'player-bullet',
    14,
    30,
    (context, width, height) => paintBolt(context, width, height, [70, 200, 255], [225, 250, 255]),
    DENSITY
  );
}

/** Turret fire: a slimmer, warmer bolt so it never reads as the player's shot. */
export function ensurePicketBoltTexture(scene: Phaser.Scene): string {
  return withCanvasTexture(
    scene,
    'picket-bolt',
    10,
    22,
    (context, width, height) => paintBolt(context, width, height, [255, 190, 80], [255, 246, 220]),
    DENSITY
  );
}

/**
 * Hostile plasma orb, readable by shape and brightness as well as colour: a white-hot core and a
 * bright ring, separated and framed by dark bands, inside a magenta glow. Background stars are plain
 * points, so the ring sets shots apart even in grayscale or with red-green colour blindness.
 */
export function ensureEnemyBulletTexture(scene: Phaser.Scene): string {
  return withCanvasTexture(
    scene,
    'enemy-bullet',
    22,
    22,
    (context, width) => {
      const c = width / 2;
      const disc = (radius: number, fill: string | CanvasGradient): void => {
        context.fillStyle = fill;
        context.beginPath();
        context.arc(c, c, radius, 0, Math.PI * 2);
        context.fill();
      };
      glowEllipse(context, c, c, c, c, [255, 60, 140], 0.55);
      disc(7.4, 'rgba(18,2,14,0.94)');
      context.strokeStyle = 'rgba(255,175,220,1)';
      context.lineWidth = 1.7;
      context.beginPath();
      context.arc(c, c, 5.6, 0, Math.PI * 2);
      context.stroke();
      const core = context.createRadialGradient(c - 0.6, c - 0.6, 0, c, c, 3.1);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(0.55, 'rgba(255,215,236,1)');
      core.addColorStop(1, 'rgba(255,90,160,1)');
      disc(3.1, core);
    },
    DENSITY
  );
}

/** Armed ordnance: dark shell, glowing charge band and a pulsing fuse at the nose. */
export function ensureBomberBombTexture(scene: Phaser.Scene): string {
  return withCanvasTexture(
    scene,
    'bomber-bomb',
    14,
    18,
    (context, width, height) => {
      const x = width / 2;
      glowEllipse(context, x, height / 2, width / 2, height / 2, [255, 150, 60], 0.45);
      const shell = context.createLinearGradient(x - 5, 0, x + 5, 0);
      shell.addColorStop(0, '#3a3a44');
      shell.addColorStop(0.35, '#9a9aa8');
      shell.addColorStop(1, '#1c1c24');
      context.fillStyle = shell;
      context.beginPath();
      context.ellipse(x, height / 2 + 0.5, 4.6, 7, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffb14b';
      context.fillRect(x - 4.6, height / 2, 9.2, 1.6);
      glowEllipse(context, x, height / 2 + 0.8, 6, 2.5, [255, 200, 120], 0.8);
      glowEllipse(context, x, 3.2, 3, 3, [255, 240, 200], 1);
    },
    DENSITY
  );
}

/**
 * Laser hazard bar, tinted at runtime: a long smooth falloff around a white core. Width matches
 * BEAM_TEXTURE_WIDTH so the bright core lines up with BEAM_HIT_FRACTION.
 */
export function ensureBeamTexture(scene: Phaser.Scene): string {
  return withCanvasTexture(scene, 'hazard-beam', BEAM_TEXTURE_WIDTH, 128, (context, width, height) => {
    const profile = context.createLinearGradient(0, 0, width, 0);
    // The bright band (alpha >= 0.45) spans exactly the hurting core, 0.28-0.72 of the width.
    for (const [offset, alpha] of [
      [0, 0],
      [0.14, 0.1],
      [0.28, 0.45],
      [0.42, 0.85],
      [0.5, 1],
      [0.58, 0.85],
      [0.72, 0.45],
      [0.86, 0.1],
      [1, 0],
    ] as const) {
      profile.addColorStop(offset, `rgba(255,255,255,${alpha})`);
    }
    context.fillStyle = profile;
    context.fillRect(0, 0, width, height);
  });
}
