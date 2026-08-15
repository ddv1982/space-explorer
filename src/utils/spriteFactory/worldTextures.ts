import Phaser from 'phaser';
import { withGeneratedEntityTexture } from '../generatedTexture';

const FACET_POINTS = [
  { x: 22, y: 1 },
  { x: 35, y: 5 },
  { x: 42, y: 16 },
  { x: 40, y: 29 },
  { x: 32, y: 41 },
  { x: 18, y: 43 },
  { x: 5, y: 37 },
  { x: 1, y: 24 },
  { x: 3, y: 12 },
  { x: 12, y: 3 },
];

function traceFacets(g: Phaser.GameObjects.Graphics, scale: number): void {
  const cx = 22;
  const cy = 22;
  g.beginPath();
  FACET_POINTS.forEach((point, index) => {
    const x = cx + (point.x - cx) * scale;
    const y = cy + (point.y - cy) * scale;
    if (index === 0) {
      g.moveTo(x, y);
    } else {
      g.lineTo(x, y);
    }
  });
  g.closePath();
}

/**
 * Faceted wireframe rock. Kept in light neutral tones so level-specific
 * MULTIPLY tints (Asteroid.spawn config.tint) recolor it cleanly.
 */
export function ensureAsteroidTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'asteroid-texture', 44, 44, (g) => {
    // Soft halo then light stone body (tint-friendly).
    traceFacets(g, 1.08);
    g.fillStyle(0x8f86b8, 0.14);
    g.fillPath();

    traceFacets(g, 1);
    g.fillStyle(0xb9b3d4, 1);
    g.fillPath();

    // Facet shading: darker lower-right planes.
    g.fillStyle(0x6e6790, 0.75);
    g.beginPath();
    g.moveTo(22, 22);
    g.lineTo(40, 29);
    g.lineTo(32, 41);
    g.lineTo(18, 43);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xd9d4ec, 0.8);
    g.beginPath();
    g.moveTo(22, 22);
    g.lineTo(22, 1);
    g.lineTo(35, 5);
    g.lineTo(30, 16);
    g.closePath();
    g.fillPath();

    // Craters.
    g.fillStyle(0x585273, 0.7);
    g.fillCircle(29, 24, 5);
    g.fillCircle(14, 30, 3.5);
    g.lineStyle(1, 0xe6e1f7, 0.35);
    g.strokeCircle(29, 24, 5);
    g.strokeCircle(14, 30, 3.5);

    // Neon facet edges.
    traceFacets(g, 1);
    g.lineStyle(1.4, 0xf0ecff, 0.85);
    g.strokePath();

    g.lineStyle(1, 0xe6e1f7, 0.4);
    g.lineBetween(22, 22, 22, 1);
    g.lineBetween(22, 22, 40, 29);
    g.lineBetween(22, 22, 18, 43);
    g.lineBetween(22, 22, 1, 24);
  });
}
