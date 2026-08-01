import Phaser from 'phaser';
import { UI_FONT_DISPLAY, UI_FONT_MONO } from '../../utils/uiFonts';

export const NEON = {
  cyan: 0x5bd8ff,
  cyanBright: 0xbff6ff,
  blue: 0x2f94ff,
  blueDeep: 0x0a2d5c,
  navy: 0x020816,
  navySoft: 0x061529,
  panel: 0x030a18,
  panelSoft: 0x071a32,
  purple: 0x8f6bff,
  teal: 0x58f0d8,
  red: 0xff756f,
  amber: 0xffc36e,
  white: 0xf4fdff,
} as const;

export const NEON_TEXT = {
  title: '#f4fdff',
  titleGlow: '#5bd8ff',
  primary: '#f6feff',
  secondary: '#b9d7f2',
  muted: '#6f92b8',
  cyan: '#5bd8ff',
  danger: '#ff9b8f',
} as const;

export const NEON_FONT = {
  display: UI_FONT_DISPLAY,
  mono: UI_FONT_MONO,
} as const;

interface NeonFrameOptions {
  fillAlpha?: number;
  strokeAlpha?: number;
  cornerCut?: number;
  accentColor?: number;
  inner?: boolean;
  glow?: boolean;
}

export function drawAngledRectPath(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerCut: number,
): void {
  const cut = Math.max(0, Math.min(cornerCut, width / 2, height / 2));
  graphics.beginPath();
  graphics.moveTo(x + cut, y);
  graphics.lineTo(x + width - cut, y);
  graphics.lineTo(x + width, y + cut);
  graphics.lineTo(x + width, y + height - cut);
  graphics.lineTo(x + width - cut, y + height);
  graphics.lineTo(x + cut, y + height);
  graphics.lineTo(x, y + height - cut);
  graphics.lineTo(x, y + cut);
  graphics.closePath();
}

export function drawNeonFrame(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  options: NeonFrameOptions = {},
): void {
  const accent = options.accentColor ?? NEON.cyan;
  const cut = options.cornerCut ?? Math.min(14, Math.max(4, Math.min(width, height) * 0.04));
  const fillAlpha = options.fillAlpha ?? 0.75;
  const strokeAlpha = options.strokeAlpha ?? 0.85;

  if (options.glow) {
    drawAngledRectPath(graphics, x - 1, y - 1, width + 2, height + 2, cut + 0.5);
    graphics.lineStyle(1.5, accent, 0.12);
    graphics.strokePath();
  }

  drawAngledRectPath(graphics, x, y, width, height, cut);
  graphics.fillStyle(NEON.panel, fillAlpha);
  graphics.fillPath();

  drawAngledRectPath(graphics, x, y, width, height, cut);
  graphics.lineStyle(1, accent, strokeAlpha);
  graphics.strokePath();
}

export function drawNeonDivider(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  y: number,
  width: number,
  color: number = NEON.cyan,
): void {
  const gap = 32;
  const wing = Math.max(32, width / 2 - gap);
  graphics.lineStyle(1, color, 0.24);
  graphics.lineBetween(centerX - wing, y, centerX - gap, y);
  graphics.lineBetween(centerX + gap, y, centerX + wing, y);
  
  graphics.fillStyle(NEON.cyanBright, 0.8);
  graphics.fillCircle(centerX, y, 2.5);
  graphics.lineStyle(1, color, 0.6);
  graphics.strokeCircle(centerX, y, 6);
}

interface NeonTitleColors {
  glowDark?: string;
  glowMid?: string;
  glowBright?: string;
  textColor?: string;
}

/**
 * Shrinks a neon title font size until the rendered text fits maxWidth.
 * Measures with a scratch Text so layered glow copies stay in sync.
 */
export function fitNeonTitleFontSize(
  scene: Phaser.Scene,
  text: string,
  desiredFontSize: number,
  maxWidth: number,
  minFontSize = 18,
): number {
  const probe = scene.add
    .text(0, 0, text, {
      fontSize: `${desiredFontSize}px`,
      fontStyle: 'bold',
      fontFamily: NEON_FONT.display,
    })
    .setVisible(false);
  const width = probe.width;
  probe.destroy();

  if (width <= 0 || width <= maxWidth) {
    return desiredFontSize;
  }

  const scaled = Math.floor((desiredFontSize * maxWidth) / width);
  return Math.max(minFontSize, Math.min(desiredFontSize, scaled));
}

export function addNeonTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  depth: number,
  colors: NeonTitleColors = {},
): Phaser.GameObjects.Text {
  const {
    glowDark = '#145fb2',
    glowMid = '#3aa0ff',
    glowBright = NEON_TEXT.titleGlow,
    textColor = NEON_TEXT.title,
  } = colors;

  scene.add
    .text(x, y + 2, text, {
      fontSize: `${fontSize}px`,
      color: glowDark,
      fontStyle: 'bold',
      fontFamily: NEON_FONT.display,
      stroke: '#00152f',
      strokeThickness: Math.max(4, Math.round(fontSize * 0.06)),
    })
    .setOrigin(0.5)
    .setAlpha(0.5)
    .setDepth(depth);

  scene.add
    .text(x, y + 1, text, {
      fontSize: `${fontSize}px`,
      color: glowMid,
      fontStyle: 'bold',
      fontFamily: NEON_FONT.display,
      stroke: glowBright,
      strokeThickness: Math.max(2, Math.round(fontSize * 0.04)),
    })
    .setOrigin(0.5)
    .setAlpha(0.35)
    .setDepth(depth + 1);

  return scene.add
    .text(x, y, text, {
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: 'bold',
      fontFamily: NEON_FONT.display,
      stroke: glowBright,
      strokeThickness: 1,
    })
    .setOrigin(0.5)
    .setDepth(depth + 2);
}
