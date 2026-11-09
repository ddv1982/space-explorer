import type Phaser from 'phaser';
import { withCanvasTexture } from '../generatedTexture';

const DENSITY = 4;
const SIZE = 20;

interface PowerUpLook {
  /** Rim glow and glyph colour. */
  accent: string;
  /** Glass body gradient, centre to edge. */
  inner: string;
  outer: string;
}

const LOOKS = {
  health: { accent: '#5dffa0', inner: '#1d7a45', outer: '#06210f' },
  shield: { accent: '#9cd6ff', inner: '#2a5ea8', outer: '#061430' },
  rapidfire: { accent: '#ffe066', inner: '#9a7410', outer: '#2a1d02' },
} as const satisfies Record<string, PowerUpLook>;

type PowerUpKind = keyof typeof LOOKS;

/** Glossy glass orb with a glowing rim, a specular highlight and an emissive glyph. */
function paintOrb(context: CanvasRenderingContext2D, look: PowerUpLook, glyph: (c: CanvasRenderingContext2D) => void) {
  const c = SIZE / 2;
  const halo = context.createRadialGradient(c, c, 6, c, c, c);
  halo.addColorStop(0, look.accent);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  context.globalAlpha = 0.55;
  context.fillStyle = halo;
  context.fillRect(0, 0, SIZE, SIZE);
  context.globalAlpha = 1;

  const glass = context.createRadialGradient(c - 2, c - 2.5, 0.5, c, c, 8);
  glass.addColorStop(0, look.inner);
  glass.addColorStop(1, look.outer);
  context.fillStyle = glass;
  context.beginPath();
  context.arc(c, c, 7.6, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = look.accent;
  context.lineWidth = 1.2;
  context.stroke();

  context.save();
  context.shadowColor = look.accent;
  context.shadowBlur = 3;
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';
  glyph(context);
  context.restore();

  const shine = context.createLinearGradient(c, c - 7, c, c - 1);
  shine.addColorStop(0, 'rgba(255,255,255,0.55)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = shine;
  context.beginPath();
  context.ellipse(c - 1, c - 4, 4.6, 2.6, -0.3, 0, Math.PI * 2);
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
