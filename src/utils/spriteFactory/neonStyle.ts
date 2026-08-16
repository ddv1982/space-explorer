import Phaser from 'phaser';
import { getVisualQualityProfile } from '../../config/visualQuality';

function qualityHaloAlpha(base: number): number {
  return Math.min(0.3, base * getVisualQualityProfile().motifDensity);
}

/**
 * Neon vector drawing helpers for procedurally generated entity textures.
 *
 * Every entity follows the same recipe: a soft halo pass, a near-black body
 * fill tinted with the entity hue, a bright neon outline, and white-hot core
 * accents. Halos are baked into the texture so pooled sprites never need
 * runtime glow filters.
 */
export interface NeonPalette {
  /** Near-black body fill tinted with the entity hue. */
  body: number;
  /** Bright neon outline + primary accent. */
  outline: number;
  /** Halo / wide glow color. */
  glow: number;
  /** White-hot core accent. */
  hot: number;
}

export type NeonPoint = { x: number; y: number };

export const NEON_ENTITY = {
  player: { body: 0x0a2d3d, outline: 0x5bd8ff, glow: 0x1e7fb8, hot: 0xdffbff },
  helper: { body: 0x0a3030, outline: 0x58f0d8, glow: 0x1e9e8a, hot: 0xdcfff6 },
  scout: { body: 0x3d0a14, outline: 0xff5d73, glow: 0xb81d32, hot: 0xffd7de },
  fighter: { body: 0x0d3320, outline: 0x52f28e, glow: 0x1fa253, hot: 0xd8ffe8 },
  bomber: { body: 0x3d240a, outline: 0xffb14b, glow: 0xb8681d, hot: 0xffedd0 },
  gunship: { body: 0x0a1c3d, outline: 0x63a4ff, glow: 0x2451b8, hot: 0xd8e9ff },
  swarm: { body: 0x3d3a0a, outline: 0xffff5d, glow: 0xb8ae1d, hot: 0xffffd8 },
  diver: { body: 0x330a2e, outline: 0xff5df0, glow: 0xa31d9e, hot: 0xffd8fb },
  dodger: { body: 0x0a2d33, outline: 0x4bf0ff, glow: 0x1d9eb8, hot: 0xd8fbff },
  sower: { body: 0x2a0a3d, outline: 0xb45dff, glow: 0x6e1db8, hot: 0xead8ff },
  lancer: { body: 0x1a2333, outline: 0xd8e9ff, glow: 0x7f9cc2, hot: 0xffffff },
  splitter: { body: 0x3d1a0a, outline: 0xff7a4b, glow: 0xb84a1d, hot: 0xffe0d0 },
  swarmling: { body: 0x330a1f, outline: 0xff5db1, glow: 0xb81d6e, hot: 0xffd8ec },
  mine: { body: 0x330f0a, outline: 0xff6a3d, glow: 0xb83a1d, hot: 0xffd0b8 },
  enemyFire: { body: 0x3d0a24, outline: 0xff4d8d, glow: 0xc2205c, hot: 0xffe0ee },
  asteroid: { body: 0x17141f, outline: 0x9d8fc7, glow: 0x4a3f6e, hot: 0xe8e2ff },
  picket: { body: 0x33260a, outline: 0xffc25d, glow: 0xb8811d, hot: 0xfff3d8 },
  picketFire: { body: 0x3d2a0a, outline: 0xffd07a, glow: 0xc29220, hot: 0xfff8e8 },
} as const satisfies Record<string, NeonPalette>;

function tracePolygon(g: Phaser.GameObjects.Graphics, points: readonly NeonPoint[]): void {
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i].x, points[i].y);
  }
  g.closePath();
}

function polygonCentroid(points: readonly NeonPoint[]): NeonPoint {
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

function scalePolygon(points: readonly NeonPoint[], scale: number): NeonPoint[] {
  const centroid = polygonCentroid(points);
  return points.map((point) => ({
    x: centroid.x + (point.x - centroid.x) * scale,
    y: centroid.y + (point.y - centroid.y) * scale,
  }));
}

interface NeonPolygonOptions {
  /** Halo expansion factor; keep small on tiny textures so glow stays in-canvas. */
  haloScale?: number;
  haloAlpha?: number;
  midScale?: number;
  midAlpha?: number;
  outlineWidth?: number;
  outlineAlpha?: number;
  bodyAlpha?: number;
}

/** Draw a polygon with baked halo, tinted body, and neon outline. */
export function fillNeonPolygon(
  g: Phaser.GameObjects.Graphics,
  points: readonly NeonPoint[],
  palette: NeonPalette,
  options: NeonPolygonOptions = {}
): void {
  const {
    haloScale = 1.14,
    haloAlpha = 0.16,
    midScale = 1.06,
    midAlpha = 0.32,
    outlineWidth = 1.25,
    outlineAlpha = 0.95,
    bodyAlpha = 1,
  } = options;

  tracePolygon(g, scalePolygon(points, haloScale));
  g.fillStyle(palette.glow, qualityHaloAlpha(haloAlpha));
  g.fillPath();

  tracePolygon(g, scalePolygon(points, midScale));
  g.fillStyle(palette.glow, qualityHaloAlpha(midAlpha));
  g.fillPath();

  tracePolygon(g, points);
  g.fillStyle(palette.body, bodyAlpha);
  g.fillPath();

  tracePolygon(g, points);
  g.lineStyle(outlineWidth, palette.outline, outlineAlpha);
  g.strokePath();
}

interface NeonCircleOptions {
  haloScale?: number;
  haloAlpha?: number;
  midScale?: number;
  midAlpha?: number;
  outlineWidth?: number;
  outlineAlpha?: number;
  bodyAlpha?: number;
  /** Fill body with the outline color instead of the dark body color. */
  solidCore?: boolean;
}

/** Draw a circle with baked halo, body, and neon rim. */
export function fillNeonCircle(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  palette: NeonPalette,
  options: NeonCircleOptions = {}
): void {
  const {
    haloScale = 1.9,
    haloAlpha = 0.16,
    midScale = 1.35,
    midAlpha = 0.3,
    outlineWidth = 1.1,
    outlineAlpha = 0.9,
    bodyAlpha = 1,
    solidCore = false,
  } = options;

  g.fillStyle(palette.glow, qualityHaloAlpha(haloAlpha));
  g.fillCircle(cx, cy, radius * haloScale);
  g.fillStyle(palette.glow, qualityHaloAlpha(midAlpha));
  g.fillCircle(cx, cy, radius * midScale);
  g.fillStyle(solidCore ? palette.outline : palette.body, bodyAlpha);
  g.fillCircle(cx, cy, radius);
  if (outlineWidth > 0) {
    g.lineStyle(outlineWidth, palette.outline, outlineAlpha);
    g.strokeCircle(cx, cy, radius);
  }
}

/** Draw a soft white-hot core dot with a tight glow. */
export function fillHotCore(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  hotColor: number
): void {
  g.fillStyle(hotColor, 0.35);
  g.fillCircle(cx, cy, radius * 1.8);
  g.fillStyle(hotColor, 1);
  g.fillCircle(cx, cy, radius);
}

/** Draw a line with a soft outer glow pass beneath a bright core pass. */
export function strokeNeonLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width: number = 1
): void {
  g.lineStyle(width * 2.4, color, qualityHaloAlpha(0.14));
  g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(width, color, 0.85);
  g.lineBetween(x1, y1, x2, y2);
}

export function fillCanopy(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  palette: NeonPalette
): void {
  g.fillStyle(palette.hot, 0.18);
  g.fillEllipse(cx, cy, width + 2, height + 2);
  g.fillStyle(palette.hot, 0.55);
  g.fillEllipse(cx, cy, width, height);
  g.lineStyle(1, palette.outline, 0.7);
  g.strokeEllipse(cx, cy, width, height);
}
