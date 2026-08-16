import Phaser from 'phaser';
import { withGeneratedParticleTexture } from '../../utils/generatedTexture';

type Point = { x: number; y: number };

function fillPolygonFromCenter(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  points: Point[]
): void {
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    g.fillTriangle(cx, cy, points[i].x, points[i].y, next.x, next.y);
  }
}

/** Sharp irregular flash shard: bright core with jagged luminous edges. */
function generateExplosionTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedParticleTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.22);
    const outerPts: Point[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = r * (0.55 + 0.45 * Math.abs(Math.sin(angle * 2.7 + 1.3)));
      outerPts.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist });
    }
    fillPolygonFromCenter(g, cx, cy, outerPts);

    g.fillStyle(0xffffff, 0.55);
    const innerPts: Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.5;
      const dist = r * (0.28 + 0.2 * Math.abs(Math.sin(angle * 3.1)));
      innerPts.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist });
    }
    fillPolygonFromCenter(g, cx, cy, innerPts);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, r * 0.18);
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeCircle(cx, cy, r * 0.42);
  });
}

/** Tapered horizontal light streak (rotated at runtime by emitter angle). */
function generateSparkTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  withGeneratedParticleTexture(scene, key, width, height, (g) => {
    const cy = height / 2;

    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(width / 2, cy, width, height);

    g.fillStyle(0xffffff, 0.85);
    g.beginPath();
    g.moveTo(0, cy);
    g.lineTo(width * 0.55, cy - height * 0.3);
    g.lineTo(width, cy);
    g.lineTo(width * 0.55, cy + height * 0.3);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(width * 0.62, cy, height * 0.3);
  });
}

/** Four-point star flare. */
function generateMuzzleTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedParticleTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(cx, cy, r * 0.8);

    g.fillStyle(0xffffff, 0.7);
    g.beginPath();
    g.moveTo(cx - r, cy);
    g.lineTo(cx - r * 0.12, cy - r * 0.12);
    g.lineTo(cx, cy - r);
    g.lineTo(cx + r * 0.12, cy - r * 0.12);
    g.lineTo(cx + r, cy);
    g.lineTo(cx + r * 0.12, cy + r * 0.12);
    g.lineTo(cx, cy + r);
    g.lineTo(cx - r * 0.12, cy + r * 0.12);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, r * 0.2);
  });
}

/** Soft round puff for engine exhaust. */
function generateSmokeTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedParticleTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;

    g.fillStyle(0xffffff, 0.12);
    g.fillCircle(cx - 1, cy + 1, size * 0.45);
    g.fillCircle(cx + 1, cy - 1, size * 0.4);
    g.fillCircle(cx, cy, size * 0.5);

    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(cx, cy, size * 0.3);

    g.fillStyle(0xffffff, 0.1);
    g.fillCircle(cx, cy, size * 0.55);
  });
}

/** Tight glow dot for trails. */
function generateGlowTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedParticleTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.08);
    g.fillCircle(cx, cy, r);
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(cx, cy, r * 0.6);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(cx, cy, r * 0.3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, r * 0.12);
  });
}

/** Sharp cross flare for impacts. */
function generateHitTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedParticleTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.25);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const perp = angle + Math.PI / 2;
      const tipX = cx + Math.cos(angle) * r * 0.95;
      const tipY = cy + Math.sin(angle) * r * 0.95;
      const baseW = r * 0.16;
      g.fillTriangle(
        cx + Math.cos(perp) * baseW, cy + Math.sin(perp) * baseW,
        cx - Math.cos(perp) * baseW, cy - Math.sin(perp) * baseW,
        tipX, tipY,
      );
    }

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx, cy, r * 0.28);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, r * 0.12);
  });
}

/** Glow orb ringed by a thin halo, used for pickup bursts and flash pops. */
function generateBurstTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedParticleTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.06);
    g.fillCircle(cx, cy, r);
    g.fillStyle(0xffffff, 0.2);
    g.fillCircle(cx, cy, r * 0.7);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(cx, cy, r * 0.4);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx, cy, r * 0.15);

    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeCircle(cx, cy, r * 0.62);
  });
}

/** Small luminous shard for debris. */
function generateDebrisTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedParticleTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 1);
    const corners: Point[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + i * 0.3;
      const dist = r * (0.5 + 0.5 * Math.abs(Math.sin(angle * 1.7 + 0.8)));
      corners.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist });
    }
    fillPolygonFromCenter(g, cx, cy, corners);

    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(cx, cy, r * 0.2);
  });
}

/** Thin expanding shockwave ring. */
function generateRingTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedParticleTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2;

    g.lineStyle(6, 0xffffff, 0.1);
    g.strokeCircle(cx, cy, r);
    g.lineStyle(3, 0xffffff, 0.28);
    g.strokeCircle(cx, cy, r);
    g.lineStyle(1.25, 0xffffff, 0.95);
    g.strokeCircle(cx, cy, r);
    g.lineStyle(1, 0xffffff, 0.4);
    g.strokeCircle(cx, cy, r * 0.72);
  });
}

export function generateEffectsParticleTextures(scene: Phaser.Scene): void {
  generateExplosionTexture(scene, 'particle-explosion', 20);
  generateSparkTexture(scene, 'particle-spark', 12, 4);
  generateMuzzleTexture(scene, 'particle-muzzle', 12);
  generateSmokeTexture(scene, 'particle-exhaust', 8);
  generateGlowTexture(scene, 'particle-trail', 6);
  generateHitTexture(scene, 'particle-hit', 12);
  generateBurstTexture(scene, 'particle-burst', 14);
  generateDebrisTexture(scene, 'particle-debris', 6);
  generateRingTexture(scene, 'particle-ring', 32);
}
