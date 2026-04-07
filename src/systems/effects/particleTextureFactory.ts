import Phaser from 'phaser';

type Point = { x: number; y: number };

function withGeneratedTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

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

function generateExplosionTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.3);
    const outerPts: Point[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = r * (0.6 + 0.4 * Math.abs(Math.sin(angle * 2.7 + 1.3)));
      outerPts.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist });
    }
    fillPolygonFromCenter(g, cx, cy, outerPts);

    g.fillStyle(0xffffff, 0.6);
    const innerPts: Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.5;
      const dist = r * (0.3 + 0.2 * Math.abs(Math.sin(angle * 3.1)));
      innerPts.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist });
    }
    fillPolygonFromCenter(g, cx, cy, innerPts);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, r * 0.2);
  });
}

function generateSparkTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  withGeneratedTexture(scene, key, width, height, (g) => {
    const cx = width / 2;
    const cy = height / 2;

    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(cx, cy, width, height);
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(cx, cy, width * 0.5, height * 0.7);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(cx, cy, width * 0.2, height * 0.4);
  });
}

function generateMuzzleTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.15);
    g.fillCircle(cx, cy, r);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(cx, cy, r * 0.7);
    g.fillStyle(0xffffff, 0);
    g.fillCircle(cx, cy, r * 0.35);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, r * 0.15);
  });
}

function generateSmokeTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;

    g.fillStyle(0xffffff, 0.15);
    g.fillCircle(cx - 1, cy + 1, size * 0.45);
    g.fillCircle(cx + 1, cy - 1, size * 0.4);
    g.fillCircle(cx, cy, size * 0.5);

    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(cx, cy, size * 0.3);

    g.fillStyle(0xffffff, 0.1);
    g.fillCircle(cx, cy, size * 0.55);
  });
}

function generateGlowTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
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

function generateHitTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.2);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const nextAngle = angle + Math.PI / 8;
      const innerR = r * 0.25;
      const outerR = r * 0.9;
      g.fillTriangle(
        cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR,
        cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR,
        cx + Math.cos(nextAngle) * innerR, cy + Math.sin(nextAngle) * innerR,
      );
    }

    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx, cy, r * 0.3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, r * 0.12);
  });
}

function generateStarBurstTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    g.fillStyle(0xffffff, 0.4);
    const points: Point[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 4;
      const dist = i % 2 === 0 ? r * 0.9 : r * 0.25;
      points.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist });
    }
    fillPolygonFromCenter(g, cx, cy, points);

    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx, cy, r * 0.15);
  });
}

function generateBurstTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
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
  });
}

function generateDebrisTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
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
  });
}

function generateSquareTexture(scene: Phaser.Scene, key: string, size: number): void {
  withGeneratedTexture(scene, key, size, size, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, size, size);
  });
}

export function generateEffectsParticleTextures(scene: Phaser.Scene): void {
  generateExplosionTexture(scene, 'particle-explosion', 20);
  generateSparkTexture(scene, 'particle-spark', 10, 4);
  generateMuzzleTexture(scene, 'particle-muzzle', 12);
  generateSmokeTexture(scene, 'particle-exhaust', 8);
  generateGlowTexture(scene, 'particle-trail', 6);
  generateHitTexture(scene, 'particle-hit', 12);
  generateStarBurstTexture(scene, 'particle-sparkle', 8);
  generateBurstTexture(scene, 'particle-burst', 14);
  generateDebrisTexture(scene, 'particle-debris', 6);
  generateSquareTexture(scene, 'particle-ember', 3);
}
