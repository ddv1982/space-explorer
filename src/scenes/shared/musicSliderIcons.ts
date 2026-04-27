import type { MusicSliderIconDrawer } from './musicSliderControl';

const ICON_COLOR = 0xbfefff;
const ICON_STROKE = 0x5bd8ff;

export const drawBrainIcon: MusicSliderIconDrawer = (g, cx, cy, size) => {
  const s = size * 0.5;
  const lobeRadius = s * 0.28;
  const lowerRadius = s * 0.23;
  const upperY = cy - s * 0.28;
  const lowerY = cy + s * 0.02;
  const outerX = s * 0.34;
  const innerX = s * 0.12;

  // Filled multi-lobe silhouette so it reads as a brain at small sizes.
  g.fillStyle(ICON_COLOR, 0.2);
  g.fillCircle(cx - outerX, upperY, lobeRadius);
  g.fillCircle(cx - innerX, upperY - s * 0.06, lobeRadius);
  g.fillCircle(cx - outerX + s * 0.02, lowerY, lowerRadius);
  g.fillCircle(cx + outerX, upperY, lobeRadius);
  g.fillCircle(cx + innerX, upperY - s * 0.06, lobeRadius);
  g.fillCircle(cx + outerX - s * 0.02, lowerY, lowerRadius);
  g.fillCircle(cx, cy + s * 0.16, s * 0.18);

  g.lineStyle(1.5, ICON_STROKE, 1);
  g.strokeCircle(cx - outerX, upperY, lobeRadius);
  g.strokeCircle(cx - innerX, upperY - s * 0.06, lobeRadius);
  g.strokeCircle(cx - outerX + s * 0.02, lowerY, lowerRadius);
  g.strokeCircle(cx + outerX, upperY, lobeRadius);
  g.strokeCircle(cx + innerX, upperY - s * 0.06, lobeRadius);
  g.strokeCircle(cx + outerX - s * 0.02, lowerY, lowerRadius);

  // Lower stem / base.
  g.beginPath();
  g.moveTo(cx - s * 0.2, cy + s * 0.24);
  g.lineTo(cx - s * 0.12, cy + s * 0.46);
  g.lineTo(cx + s * 0.12, cy + s * 0.46);
  g.lineTo(cx + s * 0.2, cy + s * 0.24);
  g.closePath();
  g.fillStyle(ICON_COLOR, 0.16);
  g.fillPath();
  g.strokePath();

  // Central seam.
  g.lineStyle(1, ICON_STROKE, 0.85);
  g.lineBetween(cx, cy - s * 0.52, cx, cy + s * 0.34);

  // Inner folds.
  g.lineStyle(1, ICON_COLOR, 0.6);
  g.beginPath();
  g.arc(cx - s * 0.28, cy - s * 0.05, s * 0.14, Math.PI * 1.75, Math.PI * 0.95, true);
  g.strokePath();
  g.beginPath();
  g.arc(cx - s * 0.15, cy + s * 0.16, s * 0.1, Math.PI * 1.6, Math.PI * 0.95, true);
  g.strokePath();
  g.beginPath();
  g.arc(cx + s * 0.28, cy - s * 0.05, s * 0.14, Math.PI * 1.05, Math.PI * 0.25, false);
  g.strokePath();
  g.beginPath();
  g.arc(cx + s * 0.15, cy + s * 0.16, s * 0.1, Math.PI * 0.05, Math.PI * 1.45, false);
  g.strokePath();
};

export const drawBoltIcon: MusicSliderIconDrawer = (g, cx, cy, size) => {
  const s = size * 0.5;
  g.fillStyle(ICON_COLOR, 0.95);
  g.beginPath();
  g.moveTo(cx - s * 0.15, cy - s * 0.85);
  g.lineTo(cx + s * 0.45, cy - s * 0.85);
  g.lineTo(cx + s * 0.05, cy - s * 0.1);
  g.lineTo(cx + s * 0.45, cy - s * 0.1);
  g.lineTo(cx - s * 0.35, cy + s * 0.9);
  g.lineTo(cx, cy + s * 0.15);
  g.lineTo(cx - s * 0.45, cy + s * 0.15);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.5, ICON_STROKE, 1);
  g.strokePath();
};

export const drawWaveformIcon: MusicSliderIconDrawer = (g, cx, cy, size) => {
  const s = size * 0.5;
  g.lineStyle(2, ICON_STROKE, 1);
  g.beginPath();
  g.moveTo(cx - s * 0.9, cy);
  g.lineTo(cx - s * 0.55, cy);
  g.lineTo(cx - s * 0.35, cy - s * 0.75);
  g.lineTo(cx - s * 0.1, cy + s * 0.55);
  g.lineTo(cx + s * 0.15, cy - s * 0.6);
  g.lineTo(cx + s * 0.35, cy + s * 0.35);
  g.lineTo(cx + s * 0.55, cy);
  g.lineTo(cx + s * 0.9, cy);
  g.strokePath();
};

export const drawNoteIcon: MusicSliderIconDrawer = (g, cx, cy, size) => {
  const s = size * 0.5;
  // Stem
  g.lineStyle(2, ICON_STROKE, 1);
  g.lineBetween(cx + s * 0.25, cy - s * 0.75, cx + s * 0.25, cy + s * 0.5);
  // Flag
  g.beginPath();
  g.moveTo(cx + s * 0.25, cy - s * 0.75);
  g.lineTo(cx + s * 0.8, cy - s * 0.55);
  g.lineTo(cx + s * 0.8, cy - s * 0.15);
  g.lineTo(cx + s * 0.25, cy - s * 0.35);
  g.strokePath();
  // Note head
  g.fillStyle(ICON_COLOR, 1);
  g.fillCircle(cx - s * 0.1, cy + s * 0.5, s * 0.28);
  g.lineStyle(1.5, ICON_STROKE, 1);
  g.strokeCircle(cx - s * 0.1, cy + s * 0.5, s * 0.28);
};
