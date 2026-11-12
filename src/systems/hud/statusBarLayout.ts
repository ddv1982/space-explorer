import Phaser from 'phaser';
import { getViewportBounds } from '../../utils/layout';

const EDGE_INSET = 16;
/** Below this width the centre rail cannot sit between the two corner clusters. */
const COMPACT_WIDTH = 600;

export const HULL_CELL_HEIGHT = 10;
export const SURGE_BAR_HEIGHT = 3;
export const RESERVE_ICON_HEIGHT = 9;
export const BOSS_BAR_HEIGHT = 12;

/**
 * Where every HUD instrument sits. Two floating clusters hold the top corners (hull, surge, shields and
 * reserve ships on the left; score and chain on the right) and a flight-vector rail runs along the top:
 * between the clusters on wide viewports, edge to edge above them on phones.
 */
export interface HudLayoutMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  compact: boolean;
  hullX: number;
  hullWidth: number;
  hullLabelY: number;
  hullCellsY: number;
  surgeY: number;
  reserveY: number;
  reserveIconsX: number;
  scoreRight: number;
  scoreLabelY: number;
  scoreY: number;
  /** Sector number and level name: over the rail when wide, under the score when compact. */
  sectorX: number;
  sectorY: number;
  sectorOriginX: number;
  levelX: number;
  levelY: number;
  chainX: number;
  chainY: number;
  chainOriginX: number;
  progressX: number;
  progressY: number;
  progressWidth: number;
  progressHeight: number;
  bossBarX: number;
  bossBarY: number;
  bossBarWidth: number;
  bossNameY: number;
  announcementY: number;
  announcementExitY: number;
  announcementMaxWidth: number;
}

export function getLayoutMetrics(scene: Phaser.Scene): HudLayoutMetrics {
  const viewport = getViewportBounds(scene);
  const compact = viewport.width < COMPACT_WIDTH;
  const clusterTop = viewport.top + (compact ? 22 : 12);
  const hullX = viewport.left + EDGE_INSET;
  const hullWidth = Math.round(Phaser.Math.Clamp(viewport.width * 0.2, 140, 210));
  const hullCellsY = clusterTop + 17;
  const surgeY = hullCellsY + HULL_CELL_HEIGHT + 4;
  const reserveY = surgeY + SURGE_BAR_HEIGHT + 7;
  const scoreRight = viewport.right - EDGE_INSET;
  const progressWidth = compact
    ? viewport.width - EDGE_INSET * 2
    : Math.round(Phaser.Math.Clamp(viewport.width * 0.32, 220, 360));
  const progressX = viewport.left + (viewport.width - progressWidth) / 2;
  const bossBarWidth = Math.round(Phaser.Math.Clamp(viewport.width - 80, 220, 520));

  return {
    ...viewport,
    compact,
    hullX,
    hullWidth,
    hullLabelY: clusterTop,
    hullCellsY,
    surgeY,
    reserveY,
    reserveIconsX: hullX + 32,
    scoreRight,
    scoreLabelY: clusterTop,
    scoreY: compact ? clusterTop - 3 : clusterTop + 11,
    sectorX: compact ? scoreRight : progressX,
    sectorY: compact ? clusterTop + 23 : viewport.top + 10,
    sectorOriginX: compact ? 1 : 0,
    levelX: compact ? scoreRight : progressX + progressWidth,
    levelY: compact ? clusterTop + 36 : viewport.top + 9,
    chainX: compact ? hullX : scoreRight,
    chainY: compact ? reserveY + RESERVE_ICON_HEIGHT + 10 : clusterTop + 44,
    chainOriginX: compact ? 0 : 1,
    progressX,
    progressY: viewport.top + (compact ? 9 : 28),
    progressWidth,
    progressHeight: compact ? 3 : 4,
    bossBarX: viewport.left + (viewport.width - bossBarWidth) / 2,
    bossBarY: viewport.bottom - 30,
    bossBarWidth,
    bossNameY: viewport.bottom - 43,
    announcementY: viewport.centerY - 60,
    announcementExitY: viewport.centerY - 100,
    announcementMaxWidth: viewport.width - EDGE_INSET * 2,
  };
}

/**
 * Quantize meter redraws to visible pixels while still drawing endpoint
 * transitions exactly once. In particular, a settled empty meter must not
 * clear its Graphics object again on every gameplay frame.
 */
export function shouldRenderMeterRatio(currentRatio: number | null, nextRatio: number, renderStep: number): boolean {
  if (currentRatio === null) {
    return true;
  }
  if (currentRatio === nextRatio) {
    return false;
  }

  return nextRatio === 0 || nextRatio === 1 || Math.abs(nextRatio - currentRatio) >= renderStep;
}
