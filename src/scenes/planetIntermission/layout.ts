import Phaser from 'phaser';

import { getViewportLayout } from '../../utils/layout';
import { classifyIntermissionViewport } from '../shared/responsiveViewport';
import { getUpgradeGridLayout, type IntermissionViewportMode, type UpgradeGridLayout } from './shared';

export interface IntermissionLayoutMetrics {
  mode: IntermissionViewportMode;
  portrait: boolean;
  showDestination: boolean;
  showJourneyNote: boolean;
  showOrbitLabels: boolean;
  planetX: number;
  planetY: number;
  planetDiameter: number;
  contentX: number;
  contentWidth: number;
  eyebrowY: number;
  planetNameY: number;
  destinationY: number;
  journeyNoteY: number;
  statusY: number;
  upgradeLabelY: number;
  promptY: number;
  gridLeft: number;
  gridTop: number;
  gridBottom: number;
  nextMissionY: number;
  gridLayout: UpgradeGridLayout;
}

function getGridHeight(buttonCount: number, gridLayout: UpgradeGridLayout): number {
  const rows = buttonCount > 0 ? Math.ceil(buttonCount / gridLayout.columns) : 0;
  return rows > 0 ? rows * gridLayout.buttonHeight + (rows - 1) * gridLayout.spacingY : 0;
}

/** Where the planet and the header column sit, before the upgrade grid is placed under them. */
interface HeaderColumn {
  planetX: number;
  planetY: number;
  planetDiameter: number;
  contentX: number;
  contentWidth: number;
  eyebrowY: number;
  planetNameY: number;
  destinationY: number;
  journeyNoteY: number;
  statusY: number;
  upgradeLabelY: number;
  gridTop: number;
  columns: number;
}

type ViewportLayout = ReturnType<typeof getViewportLayout>;

function layoutDesktopColumn(viewport: ViewportLayout, margin: number): HeaderColumn {
  const artWidth = viewport.width * 0.44;
  const planetX = viewport.left + artWidth * 0.55;
  const planetY = viewport.top + viewport.height * 0.43;
  const planetDiameter = Math.min(430, artWidth * 0.78, viewport.height * 0.58);
  const contentX = viewport.left + artWidth + 22;
  const contentWidth = viewport.right - margin - contentX;
  const eyebrowY = viewport.top + 52;
  const planetNameY = eyebrowY + 30;
  const destinationY = planetNameY + 58;
  const journeyNoteY = destinationY + 34;
  const statusY = journeyNoteY + 72;
  const upgradeLabelY = statusY + 48;
  const gridTop = upgradeLabelY + 28;
  const columns = 2;
  return {
    planetX,
    planetY,
    planetDiameter,
    contentX,
    contentWidth,
    eyebrowY,
    planetNameY,
    destinationY,
    journeyNoteY,
    statusY,
    upgradeLabelY,
    gridTop,
    columns,
  };
}

function layoutLandscapeColumn(viewport: ViewportLayout, margin: number, compactGrid: boolean): HeaderColumn {
  const artWidth = Math.max(152, viewport.width * 0.34);
  const planetX = viewport.left + artWidth * 0.52;
  const planetY = viewport.top + viewport.height * 0.43;
  const planetDiameter = Math.min(244, artWidth * 0.8, viewport.height * 0.63);
  const contentX = viewport.left + artWidth + 8;
  const contentWidth = viewport.right - margin - contentX;
  const eyebrowY = viewport.top + 18;
  const planetNameY = eyebrowY + 24;
  const destinationY = planetNameY + 34;
  const journeyNoteY = compactGrid ? destinationY : destinationY + 26;
  const statusY = compactGrid ? destinationY + 30 : journeyNoteY + 48;
  const upgradeLabelY = statusY + (compactGrid ? 26 : 30);
  const gridTop = upgradeLabelY + (compactGrid ? 18 : 20);
  const columns = 2;
  return {
    planetX,
    planetY,
    planetDiameter,
    contentX,
    contentWidth,
    eyebrowY,
    planetNameY,
    destinationY,
    journeyNoteY,
    statusY,
    upgradeLabelY,
    gridTop,
    columns,
  };
}

function layoutPortraitColumn(viewport: ViewportLayout, margin: number, compactGrid: boolean): HeaderColumn {
  const roomy = viewport.height >= 760 && !compactGrid;
  const planetX = viewport.centerX;
  const planetY = viewport.top + (roomy ? 146 : compactGrid ? 100 : 108);
  const planetDiameter = Math.min(viewport.width * 0.56, roomy ? 204 : compactGrid ? 140 : 164);
  const contentX = viewport.left + margin;
  const contentWidth = viewport.width - margin * 2;
  const eyebrowY = viewport.top + 18;
  const planetNameY = planetY + planetDiameter * 0.6;
  const destinationY = planetNameY + (roomy ? 40 : compactGrid ? 28 : 32);
  const journeyNoteY = compactGrid ? destinationY : destinationY + (roomy ? 30 : 25);
  const statusY = compactGrid ? destinationY + 40 : journeyNoteY + (roomy ? 56 : 46);
  const upgradeLabelY = statusY + (compactGrid ? 24 : 28);
  const gridTop = upgradeLabelY + (compactGrid ? 18 : 20);
  const columns = 1;
  return {
    planetX,
    planetY,
    planetDiameter,
    contentX,
    contentWidth,
    eyebrowY,
    planetNameY,
    destinationY,
    journeyNoteY,
    statusY,
    upgradeLabelY,
    gridTop,
    columns,
  };
}

/** Ultra-compact, too narrow for a side-by-side split: planet stacked over the column. */
function layoutStackedUltraColumn(viewport: ViewportLayout, margin: number): HeaderColumn {
  const planetX = viewport.centerX;
  const planetY = viewport.top + 58;
  const planetDiameter = 92;
  const contentX = viewport.left + margin;
  const contentWidth = viewport.width - margin * 2;
  const eyebrowY = viewport.top + 10;
  const planetNameY = viewport.top + 112;
  const destinationY = planetNameY + 20;
  const journeyNoteY = destinationY;
  const statusY = planetNameY + 25;
  const upgradeLabelY = statusY + 22;
  const gridTop = upgradeLabelY + 18;
  const columns = 2;
  return {
    planetX,
    planetY,
    planetDiameter,
    contentX,
    contentWidth,
    eyebrowY,
    planetNameY,
    destinationY,
    journeyNoteY,
    statusY,
    upgradeLabelY,
    gridTop,
    columns,
  };
}

function layoutSideUltraColumn(viewport: ViewportLayout, margin: number): HeaderColumn {
  const artWidth = viewport.width * 0.31;
  const planetX = viewport.left + artWidth * 0.52;
  const planetY = viewport.top + viewport.height * 0.36;
  const planetDiameter = Math.min(130, viewport.height * 0.42);
  const contentX = viewport.left + artWidth + 8;
  const contentWidth = viewport.right - margin - contentX;
  const eyebrowY = viewport.top + 12;
  const planetNameY = eyebrowY + 21;
  const destinationY = planetNameY + 25;
  const journeyNoteY = destinationY;
  const statusY = destinationY + 24;
  const upgradeLabelY = statusY + 22;
  const gridTop = upgradeLabelY + 17;
  const columns = 2;
  return {
    planetX,
    planetY,
    planetDiameter,
    contentX,
    contentWidth,
    eyebrowY,
    planetNameY,
    destinationY,
    journeyNoteY,
    statusY,
    upgradeLabelY,
    gridTop,
    columns,
  };
}

function layoutHeaderColumn(
  viewport: ViewportLayout,
  mode: IntermissionViewportMode,
  compactGrid: boolean
): HeaderColumn {
  switch (mode) {
    case 'desktop':
      return layoutDesktopColumn(viewport, Math.max(36, viewport.width * 0.035));
    case 'landscape':
      return layoutLandscapeColumn(viewport, 18, compactGrid);
    case 'portrait':
      return layoutPortraitColumn(viewport, 14, compactGrid);
    default:
      return viewport.width < 400 ? layoutStackedUltraColumn(viewport, 14) : layoutSideUltraColumn(viewport, 14);
  }
}

export function getIntermissionLayout(scene: Phaser.Scene, buttonCount: number): IntermissionLayoutMetrics {
  const viewport = getViewportLayout(scene);
  const mode: IntermissionViewportMode = classifyIntermissionViewport(viewport);
  const portrait = mode === 'portrait';
  // Five upgrade cards need a tighter stack on short viewports: compress the
  // header, drop the journey note, and shrink buttons so the grid never clamps
  // up into the status band.
  const compactGrid = buttonCount >= 5 && (mode === 'landscape' || (portrait && viewport.height < 760));
  const { gridTop: preferredGridTop, columns, ...column } = layoutHeaderColumn(viewport, mode, compactGrid);

  const gridLayout = getUpgradeGridLayout(viewport.height, viewport.width, {
    availableWidth: column.contentWidth,
    columns,
    mode,
    compact: compactGrid,
  });
  const gridWidth = gridLayout.buttonWidth * gridLayout.columns + gridLayout.spacingX * (gridLayout.columns - 1);
  const gridLeft = column.contentX + Math.max(0, (column.contentWidth - gridWidth) / 2);
  const gridHeight = getGridHeight(buttonCount, gridLayout);
  const promptY = viewport.bottom - (mode === 'desktop' || portrait ? 34 : 26);
  const maxGridTop = promptY - gridHeight - (mode === 'desktop' ? 96 : portrait ? 44 : 28);
  const gridTop = Math.min(preferredGridTop, maxGridTop);
  const gridBottom = gridTop + gridHeight;
  const nextMissionY = Math.min(promptY - (portrait ? 30 : 34), gridBottom + (mode === 'desktop' ? 52 : 24));

  return {
    mode,
    portrait,
    showDestination: mode !== 'ultra-compact',
    showJourneyNote:
      !compactGrid && (mode === 'desktop' || portrait || (mode === 'landscape' && viewport.width >= 700)),
    showOrbitLabels: mode === 'desktop' || mode === 'landscape',
    ...column,
    promptY,
    gridLeft,
    gridTop,
    gridBottom,
    nextMissionY,
    gridLayout,
  };
}
