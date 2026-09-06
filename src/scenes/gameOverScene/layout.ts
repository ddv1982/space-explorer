import type { ViewportDimensions } from '../shared/responsiveViewport';

const PORTRAIT = {
  height: 440,
  titleY: 78,
  scoreY: 142,
  progressY: 179,
  causeY: 212,
  goalY: 250,
  retryY: 286,
  menuY: 346,
  hintY: 414,
};
const LANDSCAPE = {
  height: 330,
  titleY: 60,
  scoreY: 110,
  progressY: 145,
  causeY: 177,
  goalY: 210,
  retryY: 244,
  menuY: 244,
  hintY: 312,
};
const SHORT = {
  height: 304,
  titleY: 54,
  scoreY: 101,
  progressY: 133,
  causeY: 164,
  goalY: 191,
  retryY: 222,
  menuY: 222,
  hintY: 288,
};

export function createGameOverLayout(viewport: ViewportDimensions) {
  const stacked = viewport.width < 560 && viewport.height > 480;
  const profile = stacked ? PORTRAIT : viewport.height < 360 ? SHORT : LANDSCAPE;
  const width = Math.min(560, viewport.width - 32);
  const buttonWidth = stacked ? width - 48 : (width - 60) / 2;
  return {
    ...profile,
    width,
    titleSize: viewport.width < 400 ? 40 : 48,
    buttonWidth,
    buttonHeight: 48,
    retry: { x: 24, y: profile.retryY },
    menu: { x: stacked ? 24 : 36 + buttonWidth, y: profile.menuY },
  };
}
