import Phaser from 'phaser';
import { withGeneratedEntityTexture } from '../generatedTexture';
import { NEON_ENTITY, fillHotCore, fillNeonCircle, fillNeonPolygon, strokeNeonLine } from './neonStyle';

export function ensurePicketTurretTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'picket-turret', 24, 24, (g) => {
    const palette = NEON_ENTITY.picket;

    // Octagonal hardpoint housing.
    fillNeonPolygon(
      g,
      [
        { x: 12, y: 5 },
        { x: 17, y: 7 },
        { x: 20, y: 12 },
        { x: 17, y: 17 },
        { x: 12, y: 19 },
        { x: 7, y: 17 },
        { x: 4, y: 12 },
        { x: 7, y: 7 },
      ],
      palette,
      { haloScale: 1.18, outlineWidth: 1.25 }
    );

    // Barrel spine and hot chamber core.
    strokeNeonLine(g, 12, 11, 12, 2, palette.outline, 1.5);
    fillNeonCircle(g, 12, 12, 2.6, palette, { haloScale: 1.5, midScale: 1.25, outlineWidth: 0 });
    fillHotCore(g, 12, 12, 1.1, palette.hot);
  });
}

export function ensurePicketBoltTexture(scene: Phaser.Scene): string {
  return withGeneratedEntityTexture(scene, 'picket-bolt', 6, 12, (g) => {
    const palette = NEON_ENTITY.picketFire;

    // Slim glow capsule, deliberately smaller and dimmer than the player bullet.
    g.fillStyle(palette.glow, 0.2);
    g.fillRect(0, 3, 6, 9);
    g.fillStyle(palette.glow, 0.4);
    g.fillRect(1, 1, 4, 10);

    strokeNeonLine(g, 3, 1, 3, 11, palette.outline, 1.2);

    g.fillStyle(palette.hot, 1);
    g.fillRect(2, 0, 2, 4);
    fillHotCore(g, 3, 1, 0.8, 0xffffff);
  });
}
