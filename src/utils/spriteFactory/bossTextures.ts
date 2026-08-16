import Phaser from 'phaser';
import type { BossAttackStyle } from '../../config/levels/types';
import { withGeneratedEntityTexture } from '../generatedTexture';
import { fillHotCore, fillNeonCircle, fillNeonPolygon, strokeNeonLine, type NeonPalette } from './neonStyle';

const BOSS_PALETTES: Record<BossAttackStyle, NeonPalette> = {
  barrage: { body: 0x330a16, outline: 0xff6688, glow: 0x991833, hot: 0xffd7e0 },
  bulwark: { body: 0x1e1444, outline: 0xb49cff, glow: 0x5740a6, hot: 0xecdfff },
  carrier: { body: 0x33190a, outline: 0xffb066, glow: 0x8d4f22, hot: 0xffe8cc },
  pursuit: { body: 0x330d14, outline: 0xff7892, glow: 0x9c2338, hot: 0xffdee6 },
  maelstrom: { body: 0x0e2440, outline: 0x8fd3ff, glow: 0x2b6ca3, hot: 0xe0f3ff },
  pressure: { body: 0x33150c, outline: 0xff9a66, glow: 0xb64d29, hot: 0xffe3d1 },
};

export function ensureBossTextureVariant(
  scene: Phaser.Scene,
  attackStyle: BossAttackStyle = 'barrage',
  bossName: string = 'boss'
): string {
  const motifVariant = Array.from(bossName).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  const textureKey = `boss-texture-${attackStyle}-${motifVariant}`;

  return withGeneratedEntityTexture(scene, textureKey, 88, 56, (g) => {
    const palette = BOSS_PALETTES[attackStyle];

    switch (attackStyle) {
      case 'pursuit':
        fillNeonPolygon(
          g,
          [
            { x: 44, y: 2 },
            { x: 57, y: 13 },
            { x: 62, y: 29 },
            { x: 51, y: 54 },
            { x: 37, y: 54 },
            { x: 26, y: 29 },
            { x: 31, y: 13 },
          ],
          palette,
          { haloScale: 1.06 }
        );
        fillNeonPolygon(
          g,
          [
            { x: 31, y: 16 },
            { x: 12, y: 35 },
            { x: 29, y: 28 },
          ],
          palette,
          { haloScale: 1.08, outlineWidth: 1 }
        );
        fillNeonPolygon(
          g,
          [
            { x: 57, y: 16 },
            { x: 76, y: 35 },
            { x: 59, y: 28 },
          ],
          palette,
          { haloScale: 1.08, outlineWidth: 1 }
        );
        break;
      case 'bulwark':
        fillNeonPolygon(
          g,
          [
            { x: 20, y: 8 },
            { x: 68, y: 8 },
            { x: 72, y: 16 },
            { x: 72, y: 40 },
            { x: 66, y: 46 },
            { x: 22, y: 46 },
            { x: 16, y: 40 },
            { x: 16, y: 16 },
          ],
          palette,
          { haloScale: 1.06 }
        );
        fillNeonCircle(g, 14, 28, 8, palette, { haloScale: 1.5, midScale: 1.25 });
        fillNeonCircle(g, 74, 28, 8, palette, { haloScale: 1.5, midScale: 1.25 });
        break;
      case 'carrier':
        fillNeonPolygon(
          g,
          [
            { x: 20, y: 6 },
            { x: 68, y: 6 },
            { x: 70, y: 46 },
            { x: 18, y: 46 },
          ],
          palette,
          { haloScale: 1.06 }
        );
        fillNeonPolygon(
          g,
          [
            { x: 12, y: 12 },
            { x: 26, y: 12 },
            { x: 26, y: 32 },
            { x: 12, y: 32 },
          ],
          palette,
          { haloScale: 1.08, outlineWidth: 1 }
        );
        fillNeonPolygon(
          g,
          [
            { x: 62, y: 12 },
            { x: 76, y: 12 },
            { x: 76, y: 32 },
            { x: 62, y: 32 },
          ],
          palette,
          { haloScale: 1.08, outlineWidth: 1 }
        );
        // Hangar bays.
        strokeNeonLine(g, 14, 20, 24, 20, palette.hot, 1.5);
        strokeNeonLine(g, 64, 20, 74, 20, palette.hot, 1.5);
        break;
      case 'maelstrom':
        fillNeonPolygon(
          g,
          [
            { x: 44, y: 3 },
            { x: 65, y: 11 },
            { x: 76, y: 24 },
            { x: 67, y: 49 },
            { x: 21, y: 52 },
            { x: 10, y: 34 },
            { x: 15, y: 15 },
          ],
          palette,
          { haloScale: 1.06 }
        );
        g.lineStyle(2.5, palette.outline, 0.28);
        g.beginPath();
        g.arc(44, 28, 19, -0.5, 3.6);
        g.strokePath();
        g.lineStyle(1.25, palette.outline, 0.8);
        g.beginPath();
        g.arc(44, 28, 19, -0.5, 3.6);
        g.strokePath();
        break;
      case 'pressure':
        fillNeonPolygon(
          g,
          [
            { x: 44, y: 2 },
            { x: 69, y: 15 },
            { x: 72, y: 30 },
            { x: 59, y: 50 },
            { x: 29, y: 50 },
            { x: 16, y: 30 },
            { x: 19, y: 15 },
          ],
          palette,
          { haloScale: 1.06 }
        );
        fillNeonPolygon(
          g,
          [
            { x: 10, y: 26 },
            { x: 22, y: 26 },
            { x: 22, y: 36 },
            { x: 10, y: 36 },
          ],
          palette,
          { haloScale: 1.08, outlineWidth: 1 }
        );
        fillNeonPolygon(
          g,
          [
            { x: 66, y: 26 },
            { x: 78, y: 26 },
            { x: 78, y: 36 },
            { x: 66, y: 36 },
          ],
          palette,
          { haloScale: 1.08, outlineWidth: 1 }
        );
        break;
      case 'barrage':
      default:
        fillNeonPolygon(
          g,
          [
            { x: 44, y: 2 },
            { x: 67, y: 13 },
            { x: 75, y: 28 },
            { x: 78, y: 43 },
            { x: 71, y: 54 },
            { x: 17, y: 54 },
            { x: 10, y: 43 },
            { x: 13, y: 28 },
            { x: 21, y: 13 },
          ],
          palette,
          { haloScale: 1.06 }
        );
        fillNeonPolygon(
          g,
          [
            { x: 22, y: 13 },
            { x: 6, y: 35 },
            { x: 25, y: 21 },
          ],
          palette,
          { haloScale: 1.08, outlineWidth: 1 }
        );
        fillNeonPolygon(
          g,
          [
            { x: 66, y: 13 },
            { x: 82, y: 35 },
            { x: 63, y: 21 },
          ],
          palette,
          { haloScale: 1.08, outlineWidth: 1 }
        );
        break;
    }

    // Command core: hot slit flanked by sensor dots.
    strokeNeonLine(g, 38, 9, 50, 9, palette.outline, 2);
    fillHotCore(g, 40, 12, 1.4, palette.hot);
    fillHotCore(g, 48, 12, 1.4, palette.hot);

    if (motifVariant === 0) {
      strokeNeonLine(g, 26, 22, 62, 22, palette.outline, 1.5);
      strokeNeonLine(g, 32, 36, 56, 36, palette.outline, 1.5);
    } else if (motifVariant === 1) {
      g.lineStyle(2.5, palette.outline, 0.2);
      g.strokeCircle(44, 28, 10);
      g.strokeCircle(44, 28, 16);
      g.lineStyle(1.25, palette.outline, 0.7);
      g.strokeCircle(44, 28, 10);
      g.strokeCircle(44, 28, 16);
    } else {
      strokeNeonLine(g, 44, 8, 44, 46, palette.outline, 1.5);
      strokeNeonLine(g, 34, 18, 54, 30, palette.outline, 1.5);
      strokeNeonLine(g, 54, 18, 34, 30, palette.outline, 1.5);
    }

    // Engine row.
    fillNeonCircle(g, 32, 52, 2.4, palette, { haloScale: 1.6, midScale: 1.3, outlineWidth: 0 });
    fillNeonCircle(g, 44, 52, 2.4, palette, { haloScale: 1.6, midScale: 1.3, outlineWidth: 0 });
    fillNeonCircle(g, 56, 52, 2.4, palette, { haloScale: 1.6, midScale: 1.3, outlineWidth: 0 });
    fillHotCore(g, 32, 52, 1, palette.hot);
    fillHotCore(g, 44, 52, 1, palette.hot);
    fillHotCore(g, 56, 52, 1, palette.hot);

    // Hull seams.
    strokeNeonLine(g, 26, 24, 62, 24, palette.glow, 1);
    strokeNeonLine(g, 30, 38, 58, 38, palette.glow, 1);
  });
}
