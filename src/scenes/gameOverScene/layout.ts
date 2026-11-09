import type { ViewportDimensions } from '../shared/responsiveViewport';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Lays the Game Over summary out as one column flowing from the top of a content block: title,
 * cause, stat cells, next-run goal, actions, key hint. All coordinates are relative to the block's
 * top-left corner; the scene centres the block in the viewport.
 */
export function createGameOverLayout(viewport: ViewportDimensions) {
  const stacked = viewport.width < 560 && viewport.height > 480;
  const short = viewport.height < 360;
  const roomy = !stacked && viewport.height >= 560;
  const width = Math.min(stacked ? 420 : 760, viewport.width - 32);
  const gap = roomy ? 22 : short ? 8 : 12;
  const titleSize = roomy ? 88 : stacked ? (width < 340 ? 40 : 50) : short ? 44 : 54;
  const cellHeight = roomy ? 104 : short ? 62 : 72;
  const cellGap = 12;
  const buttonHeight = roomy ? 54 : 48;
  const buttonWidth = stacked ? width : Math.min(250, (width - cellGap) / 2);

  let y = 0;
  const eyebrowY = short ? null : y + 8;
  if (!short) y += 16 + gap * 0.5;
  const titleY = y + titleSize * 0.55;
  y += titleSize * 1.1 + gap * 0.4;
  const causeY = y + 9;
  y += 18 + gap;

  const cellWidth = stacked ? width : (width - cellGap) / 2;
  const score: Rect = { x: 0, y, width: cellWidth, height: cellHeight };
  const sector: Rect = stacked
    ? { x: 0, y: y + cellHeight + cellGap, width: cellWidth, height: cellHeight }
    : { x: cellWidth + cellGap, y, width: cellWidth, height: cellHeight };
  y = sector.y + cellHeight + gap;

  const goalY = y + 9;
  y += 18 + gap;

  const buttonsLeft = stacked ? 0 : (width - buttonWidth * 2 - cellGap) / 2;
  const retry = { x: buttonsLeft, y };
  const menu = stacked ? { x: 0, y: y + buttonHeight + cellGap } : { x: buttonsLeft + buttonWidth + cellGap, y };
  y = menu.y + buttonHeight + gap;

  const hintY = y + 7;
  y += 14;

  return {
    width,
    height: y,
    titleSize,
    eyebrowY,
    titleY,
    causeY,
    score,
    sector,
    goalY,
    buttonWidth,
    buttonHeight,
    retry,
    menu,
    hintY,
  };
}
