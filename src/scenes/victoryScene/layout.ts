import type { ViewportDimensions } from '../shared/responsiveViewport';

/**
 * Lays the Victory summary out as one centred column: eyebrow, title, subtitle, score cell, sector
 * pips, continue prompt. Coordinates are relative to the content block's top-left corner.
 */
export function createVictoryLayout(viewport: ViewportDimensions) {
  const stacked = viewport.width < 560 && viewport.height > 480;
  const short = viewport.height < 360;
  const roomy = !stacked && viewport.height >= 560;
  const width = Math.min(stacked ? 420 : 820, viewport.width - 32);
  const gap = roomy ? 24 : short ? 8 : stacked ? 20 : 12;
  const titleSize = roomy ? 72 : short ? 40 : 50;
  const cellHeight = roomy ? 116 : short ? 62 : stacked ? 96 : 76;
  const cellWidth = Math.min(460, width);
  const pipHeight = roomy ? 14 : 10;

  let y = 0;
  const eyebrowY = y + 8;
  y += 16 + Math.max(gap * 0.5, 12);
  const titleY = y + titleSize * 0.55;
  y += titleSize * 1.1 + gap * 0.4;
  const subtitleY = y + 10;
  y += 20 + gap;
  const score = { x: (width - cellWidth) / 2, y, width: cellWidth, height: cellHeight };
  y += cellHeight + gap;
  const pipsY = y;
  y += pipHeight + 8;
  const pipLabelY = y + 8;
  y += 16 + gap * 1.2;
  const promptSize = roomy ? 22 : 18;
  const promptY = y + promptSize / 2;
  y += promptSize + 4;

  return {
    width,
    height: y,
    titleSize,
    eyebrowY,
    titleY,
    subtitleY,
    score,
    pips: { y: pipsY, width: cellWidth, height: pipHeight },
    pipLabelY,
    promptY,
    promptSize,
  };
}
