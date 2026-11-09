import type Phaser from 'phaser';
import { withCanvasTexture } from '../generatedTexture';

const DENSITY = 4;
/** Painted canvas, halo included. The pickup's Arcade body stays `POWER_UP_BODY_SIZE` square. */
const SIZE = 44;
export const POWER_UP_BODY_SIZE = 20;
const ORB_RADIUS = 10;
/** Glyphs are authored in a 20-unit box around the orb centre. */
const GLYPH_BOX = 20;
const GLYPH_SCALE = 1.25;

interface PowerUpLook {
  /** Rim, halo and bracket colour. */
  accent: string;
  /** Glass body gradient, centre to edge. */
  inner: string;
  outer: string;
}

const LOOKS = {
  health: { accent: '#5dffa0', inner: '#1f8a4d', outer: '#04180b' },
  shield: { accent: '#9cd6ff', inner: '#2f68b8', outer: '#040f26' },
  rapidfire: { accent: '#ffe066', inner: '#a67c12', outer: '#211702' },
} as const satisfies Record<string, PowerUpLook>;

type PowerUpKind = keyof typeof LOOKS;

/**
 * Luminous pickup: a wide soft halo, a pair of orbit brackets, a glass orb with a hot rim and a
 * specular highlight, and a white emissive glyph.
 */
function paintOrb(context: CanvasRenderingContext2D, look: PowerUpLook, glyph: (c: CanvasRenderingContext2D) => void) {
  const c = SIZE / 2;

  const halo = context.createRadialGradient(c, c, ORB_RADIUS * 0.5, c, c, c);
  halo.addColorStop(0, look.accent);
  halo.addColorStop(0.45, look.accent);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  context.globalAlpha = 0.42;
  context.fillStyle = halo;
  context.fillRect(0, 0, SIZE, SIZE);

  // Orbit brackets: two arcs left open at the sides.
  context.globalAlpha = 0.7;
  context.strokeStyle = look.accent;
  context.lineWidth = 1;
  context.lineCap = 'round';
  for (const start of [-Math.PI * 0.82, Math.PI * 0.18]) {
    context.beginPath();
    context.arc(c, c, ORB_RADIUS + 4.5, start, start + Math.PI * 0.64);
    context.stroke();
  }
  context.globalAlpha = 1;

  const glass = context.createRadialGradient(c - 2.5, c - 3, 0.5, c, c, ORB_RADIUS);
  glass.addColorStop(0, look.inner);
  glass.addColorStop(1, look.outer);
  context.fillStyle = glass;
  context.beginPath();
  context.arc(c, c, ORB_RADIUS, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.shadowColor = look.accent;
  context.shadowBlur = 5;
  context.strokeStyle = look.accent;
  context.lineWidth = 1.6;
  context.stroke();
  context.restore();
  context.strokeStyle = 'rgba(255,255,255,0.55)';
  context.lineWidth = 0.6;
  context.stroke();

  context.save();
  context.translate(c, c);
  context.scale(GLYPH_SCALE, GLYPH_SCALE);
  context.translate(-GLYPH_BOX / 2, -GLYPH_BOX / 2);
  context.shadowColor = look.accent;
  context.shadowBlur = 4;
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';
  glyph(context);
  context.restore();

  const shine = context.createLinearGradient(c, c - ORB_RADIUS, c, c - 1);
  shine.addColorStop(0, 'rgba(255,255,255,0.5)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = shine;
  context.beginPath();
  context.ellipse(c - 1, c - ORB_RADIUS * 0.52, ORB_RADIUS * 0.6, ORB_RADIUS * 0.32, -0.3, 0, Math.PI * 2);
  context.fill();
}

const GLYPHS: Record<PowerUpKind, (context: CanvasRenderingContext2D) => void> = {
  health: (context) => {
    context.fillRect(8.8, 5.5, 2.4, 9);
    context.fillRect(5.5, 8.8, 9, 2.4);
  },
  shield: (context) => {
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(10, 5);
    context.lineTo(14.2, 6.8);
    context.lineTo(13.6, 10.8);
    context.lineTo(10, 15);
    context.lineTo(6.4, 10.8);
    context.lineTo(5.8, 6.8);
    context.closePath();
    context.stroke();
  },
  rapidfire: (context) => {
    context.beginPath();
    context.moveTo(11.6, 4.5);
    context.lineTo(6.8, 10.6);
    context.lineTo(9.8, 10.6);
    context.lineTo(8.4, 15.5);
    context.lineTo(13.3, 9.3);
    context.lineTo(10.3, 9.3);
    context.lineTo(12.6, 4.5);
    context.closePath();
    context.fill();
  },
};

export function ensurePowerUpTextures(scene: Phaser.Scene): void {
  for (const kind of Object.keys(LOOKS) as PowerUpKind[]) {
    withCanvasTexture(
      scene,
      `powerup-${kind}`,
      SIZE,
      SIZE,
      (context) => paintOrb(context, LOOKS[kind], GLYPHS[kind]),
      DENSITY
    );
  }
}
