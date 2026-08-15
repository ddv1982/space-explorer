import Phaser from 'phaser';
import { withGeneratedEntityTexture } from '../generatedTexture';
import { fillHotCore, strokeNeonLine, type NeonPalette } from './neonStyle';

const POWERUP_PALETTES = {
  health: { body: 0x0a3317, outline: 0x44ff88, glow: 0x00b84d, hot: 0xd8ffe8 },
  shield: { body: 0x0a1e44, outline: 0x88ccff, glow: 0x2f6ed8, hot: 0xd8ecff },
  rapidfire: { body: 0x44330a, outline: 0xffdd55, glow: 0xd8a400, hot: 0xfff6d8 },
} as const satisfies Record<string, NeonPalette>;

/** Shared capsule: halo, dark cell, neon rim, then the glyph on top. */
function drawPowerUpCapsule(g: Phaser.GameObjects.Graphics, palette: NeonPalette): void {
  g.fillStyle(palette.glow, 0.18);
  g.fillCircle(10, 10, 10);
  g.fillStyle(palette.glow, 0.3);
  g.fillCircle(10, 10, 8.8);

  g.fillStyle(palette.body, 0.95);
  g.fillCircle(10, 10, 8);

  g.lineStyle(1.5, palette.outline, 0.95);
  g.strokeCircle(10, 10, 8);
}

export function ensurePowerUpTextures(scene: Phaser.Scene): void {
  withGeneratedEntityTexture(scene, 'powerup-health', 20, 20, (g) => {
    const palette = POWERUP_PALETTES.health;
    drawPowerUpCapsule(g, palette);

    // Cross glyph.
    strokeNeonLine(g, 10, 4, 10, 16, palette.outline, 2.5);
    strokeNeonLine(g, 4, 10, 16, 10, palette.outline, 2.5);
    fillHotCore(g, 10, 10, 1.4, palette.hot);
  });

  withGeneratedEntityTexture(scene, 'powerup-shield', 20, 20, (g) => {
    const palette = POWERUP_PALETTES.shield;
    drawPowerUpCapsule(g, palette);

    // Shield glyph.
    g.lineStyle(2, palette.outline, 0.9);
    g.beginPath();
    g.moveTo(10, 3);
    g.lineTo(16, 6);
    g.lineTo(15, 11);
    g.lineTo(10, 17);
    g.lineTo(5, 11);
    g.lineTo(4, 6);
    g.closePath();
    g.strokePath();
    g.fillStyle(palette.outline, 0.25);
    g.fillPath();

    fillHotCore(g, 10, 9, 1.4, palette.hot);
  });

  withGeneratedEntityTexture(scene, 'powerup-rapidfire', 20, 20, (g) => {
    const palette = POWERUP_PALETTES.rapidfire;
    drawPowerUpCapsule(g, palette);

    // Lightning glyph.
    g.fillStyle(palette.outline, 0.95);
    g.beginPath();
    g.moveTo(12, 2);
    g.lineTo(6, 10);
    g.lineTo(9.5, 10);
    g.lineTo(8, 18);
    g.lineTo(14, 9);
    g.lineTo(10.5, 9);
    g.lineTo(13, 2);
    g.closePath();
    g.fillPath();

    fillHotCore(g, 11, 10, 1.2, palette.hot);
  });
}
