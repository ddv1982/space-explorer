import Phaser from 'phaser';
import { withGeneratedEntityTexture } from '../generatedTexture';
import { NEON_ENTITY, fillHotCore, fillNeonCircle, fillNeonPolygon, strokeNeonLine } from './neonStyle';

export function ensurePlayerBulletTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'player-bullet', 8, 18, (g) => {
    const palette = NEON_ENTITY.player;

    // Layered glow capsule with a hot tip.
    g.fillStyle(palette.glow, 0.22);
    g.fillRect(1, 5, 6, 13);
    g.fillStyle(palette.glow, 0.45);
    g.fillRect(2, 2, 4, 15);

    strokeNeonLine(g, 4, 2, 4, 17, palette.outline, 1.5);

    g.fillStyle(palette.hot, 1);
    g.fillRect(3, 1, 2, 5);
    fillHotCore(g, 4, 2, 1, 0xffffff);
  });
}

export function ensureEnemyBulletTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'enemy-bullet', 8, 8, (g) => {
    const palette = NEON_ENTITY.enemyFire;

    fillNeonCircle(g, 4, 4, 2.2, palette, {
      haloScale: 1.9,
      midScale: 1.45,
      outlineWidth: 0,
      solidCore: true,
    });
    fillHotCore(g, 4, 4, 0.9, palette.hot);
  });
}

export function ensureBomberBombTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'bomber-bomb', 14, 18, (g) => {
    const palette = NEON_ENTITY.bomber;

    // Faceted ordnance shell.
    fillNeonPolygon(
      g,
      [
        { x: 7, y: 1 },
        { x: 11, y: 4 },
        { x: 13, y: 10 },
        { x: 11, y: 15 },
        { x: 7, y: 17 },
        { x: 3, y: 15 },
        { x: 1, y: 10 },
        { x: 3, y: 4 },
      ],
      palette,
      { haloScale: 1.12, outlineWidth: 1 }
    );

    // Armed charge band and fuse.
    strokeNeonLine(g, 3, 9, 11, 9, palette.hot, 1.5);
    fillNeonCircle(g, 7, 3, 1.6, palette, { haloScale: 1.6, midScale: 1.25, outlineWidth: 0 });
    fillHotCore(g, 7, 3, 0.7, 0xffffff);
  });
}

export function ensureMineTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'sower-mine', 16, 16, (g) => {
    const palette = NEON_ENTITY.mine;

    // Spiked proximity orb.
    fillNeonCircle(g, 8, 8, 4, palette, { haloScale: 1.4, midScale: 1.2 });

    strokeNeonLine(g, 8, 1, 8, 4, palette.outline, 1);
    strokeNeonLine(g, 8, 12, 8, 15, palette.outline, 1);
    strokeNeonLine(g, 1, 8, 4, 8, palette.outline, 1);
    strokeNeonLine(g, 12, 8, 15, 8, palette.outline, 1);
    strokeNeonLine(g, 3, 3, 5, 5, palette.glow, 1);
    strokeNeonLine(g, 13, 3, 11, 5, palette.glow, 1);
    strokeNeonLine(g, 3, 13, 5, 11, palette.glow, 1);
    strokeNeonLine(g, 13, 13, 11, 11, palette.glow, 1);

    fillHotCore(g, 8, 8, 1.4, palette.hot);
  });
}

export function ensureBeamTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'hazard-beam', 32, 128, (g) => {
    // Soft beam bar tinted at runtime: wide glow falloff with a hot core.
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(0, 0, 32, 128);
    g.fillStyle(0xffffff, 0.18);
    g.fillRect(5, 0, 22, 128);
    g.fillStyle(0xffffff, 0.36);
    g.fillRect(10, 0, 12, 128);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(13, 0, 6, 128);
    g.fillStyle(0xffffff, 1);
    g.fillRect(15, 0, 2, 128);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(8, 0, 1, 128);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(23, 0, 1, 128);
  });
}
