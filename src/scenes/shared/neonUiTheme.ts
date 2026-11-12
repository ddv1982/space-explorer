import Phaser from 'phaser';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import { colorToHexString, mixColor } from '../../utils/colorUtils';
import { UI_FONT_DISPLAY, UI_FONT_LABEL, UI_FONT_MONO } from '../../utils/uiFonts';

export const NEON = {
  cyan: 0x5bd8ff,
  cyanBright: 0xbff6ff,
  blue: 0x2f94ff,
  blueDeep: 0x0a2d5c,
  navySoft: 0x061529,
  panel: 0x030a18,
  purple: 0x8f6bff,
  teal: 0x58f0d8,
  red: 0xff756f,
  amber: 0xffc36e,
  gold: 0xffd27a,
  /** Unlit glass: the body of every panel and ghost button. */
  glass: 0x0a1c36,
  /** Text and icons that sit on a solid accent fill. */
  ink: 0x021020,
} as const;

export const NEON_TEXT = {
  title: '#f4fdff',
  titleGlow: '#5bd8ff',
  primary: '#f6feff',
  secondary: '#b9d7f2',
  muted: '#6f92b8',
  cyan: '#5bd8ff',
  danger: '#ff9b8f',
  gold: '#ffd27a',
  ink: '#021020',
} as const;

export const NEON_FONT = {
  /** Titles and big numerals. */
  display: UI_FONT_DISPLAY,
  /** Labels, buttons and body copy. */
  label: UI_FONT_LABEL,
  /** Tabular readouts only: scores, credits, percentages. */
  mono: UI_FONT_MONO,
} as const;

/** Uppercase label / body copy in the UI sans face, tracked out so it reads as instrumentation. */
export function neonLabelStyle(
  fontSize: number,
  color: string = NEON_TEXT.secondary,
  letterSpacing = Math.max(0.5, fontSize * 0.09)
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: `${fontSize}px`, color, fontFamily: NEON_FONT.label, fontStyle: 'bold', letterSpacing };
}

/** Tabular numeric readout. */
export function neonReadoutStyle(
  fontSize: number,
  color: string = NEON_TEXT.primary
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontSize: `${fontSize}px`, color, fontFamily: NEON_FONT.mono };
}

function getMenuAtmosphere(): number {
  return getVisualQualityProfile().menuAtmosphere;
}

interface NeonFrameOptions {
  fillAlpha?: number;
  strokeAlpha?: number;
  cornerCut?: number;
  accentColor?: number;
  glow?: boolean;
}

/**
 * The signature panel outline: a rectangle whose top-left and bottom-right corners are cut away.
 * Every frame, tile and button shares it, so the whole UI reads as one family.
 */
export function drawAngledRectPath(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerCut: number
): void {
  const cut = Math.max(0, Math.min(cornerCut, width / 2, height / 2));
  graphics.beginPath();
  graphics.moveTo(x + cut, y);
  graphics.lineTo(x + width, y);
  graphics.lineTo(x + width, y + height - cut);
  graphics.lineTo(x + width - cut, y + height);
  graphics.lineTo(x, y + height);
  graphics.lineTo(x, y + cut);
  graphics.closePath();
}

const SHEEN_BANDS = 6;

/** Lighter glass over the top of a panel body: stacked translucent bands stand in for a vertical gradient. */
function fillGlassSheen(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  cut: number,
  color: number,
  alpha: number
): void {
  const reach = Math.min(height * 0.55, 150);
  for (let band = SHEEN_BANDS; band >= 1; band--) {
    const bandHeight = Math.max(cut, (reach * band) / SHEEN_BANDS);
    graphics.fillStyle(color, alpha);
    graphics.beginPath();
    graphics.moveTo(x + cut, y);
    graphics.lineTo(x + width, y);
    graphics.lineTo(x + width, y + bandHeight);
    graphics.lineTo(x, y + bandHeight);
    graphics.lineTo(x, y + cut);
    graphics.closePath();
    graphics.fillPath();
  }
}

function defaultCornerCut(width: number, height: number): number {
  return Math.min(18, Math.max(5, Math.min(width, height) * 0.07));
}

/**
 * Glass panel: dark translucent body with a top sheen, a hairline outline, a bright accent rail along
 * the top edge and a bracket on the cut bottom-right corner.
 */
export function drawNeonFrame(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  options: NeonFrameOptions = {}
): void {
  const accent = options.accentColor ?? NEON.cyan;
  const cut = options.cornerCut ?? defaultCornerCut(width, height);
  const fillAlpha = options.fillAlpha ?? 0.82;
  const strokeAlpha = options.strokeAlpha ?? 0.85;

  if (options.glow) {
    if (getMenuAtmosphere() >= 2) {
      drawAngledRectPath(graphics, x - 4, y - 4, width + 8, height + 8, cut + 2);
      graphics.lineStyle(4, accent, scaleUiGlowAlpha(0.06));
      graphics.strokePath();
    }
    drawAngledRectPath(graphics, x - 1.5, y - 1.5, width + 3, height + 3, cut + 0.75);
    graphics.lineStyle(2, accent, scaleUiGlowAlpha(0.14));
    graphics.strokePath();
  }

  drawAngledRectPath(graphics, x, y, width, height, cut);
  graphics.fillStyle(NEON.panel, fillAlpha);
  graphics.fillPath();
  fillGlassSheen(graphics, x, y, width, height, cut, mixColor(NEON.glass, accent, 0.22), fillAlpha * 0.075);

  drawAngledRectPath(graphics, x, y, width, height, cut);
  graphics.lineStyle(1, accent, strokeAlpha * 0.42);
  graphics.strokePath();

  // Accent rail: the top edge, with a heavier tab where it leaves the cut corner.
  graphics.lineStyle(1.5, accent, strokeAlpha);
  graphics.lineBetween(x + cut, y, x + width, y);
  graphics.lineStyle(3, mixColor(accent, 0xffffff, 0.35), strokeAlpha);
  graphics.lineBetween(x + cut, y + 1, x + cut + Math.min(64, width * 0.18), y + 1);

  // Bracket hugging the cut bottom-right corner.
  const reach = Math.min(cut * 1.6, width * 0.2, height * 0.3);
  graphics.lineStyle(1.5, accent, strokeAlpha);
  graphics.beginPath();
  graphics.moveTo(x + width, y + height - cut - reach);
  graphics.lineTo(x + width, y + height - cut);
  graphics.lineTo(x + width - cut, y + height);
  graphics.lineTo(x + width - cut - reach, y + height);
  graphics.strokePath();
}

interface NeonTitleColors {
  /** Colour of the soft glow behind the letters. */
  glow?: string;
  /** Colour the letters fall to at their baseline; the cap line is always white-hot. */
  base?: string;
}

/**
 * Shrinks a neon title font size until the rendered text fits maxWidth.
 */
export function fitNeonTitleFontSize(
  scene: Phaser.Scene,
  text: string,
  desiredFontSize: number,
  maxWidth: number,
  minFontSize = 18
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

/** Display title: white-hot letters cooling toward the accent at the baseline, over a soft glow. */
export function addNeonTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  depth: number,
  colors: NeonTitleColors = {}
): Phaser.GameObjects.Text {
  const glow = colors.glow ?? NEON_TEXT.titleGlow;
  const blur = Math.round(fontSize * 0.42 * getVisualQualityProfile().uiGlowStrength);
  const title = scene.add
    .text(x, y, text, {
      fontSize: `${fontSize}px`,
      color: NEON_TEXT.title,
      fontStyle: 'bold',
      fontFamily: NEON_FONT.display,
      padding: { x: blur, y: blur },
      shadow: { offsetX: 0, offsetY: 0, color: glow, blur, fill: true },
    })
    .setOrigin(0.5)
    .setDepth(depth);

  const gradient = title.context.createLinearGradient(0, blur, 0, blur + fontSize * 1.1);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.55, NEON_TEXT.title);
  gradient.addColorStop(1, colors.base ?? colorToHexString(mixColor(0xffffff, NEON.cyan, 0.55)));
  return title.setFill(gradient);
}
