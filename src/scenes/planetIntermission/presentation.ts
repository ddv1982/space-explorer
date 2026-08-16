import Phaser from 'phaser';

import type { LevelConfig } from '../../config/LevelsConfig';
import { getViewportLayout } from '../../utils/layout';
import { UI_FONT_DISPLAY, UI_FONT_MONO } from '../../utils/uiFonts';
import { drawNeonFrame } from '../shared/neonUiTheme';
import type { PlanetIntermissionProfile } from './planetProfiles';
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

interface IntermissionHeaderConfig {
  levelConfig: LevelConfig;
  profile: PlanetIntermissionProfile;
  level: number;
  totalLevels: number;
  score: number;
  nextLevelName: string | null;
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function getGridHeight(buttonCount: number, gridLayout: UpgradeGridLayout): number {
  const rows = buttonCount > 0 ? Math.ceil(buttonCount / gridLayout.columns) : 0;
  return rows > 0 ? rows * gridLayout.buttonHeight + (rows - 1) * gridLayout.spacingY : 0;
}

export function getIntermissionLayout(scene: Phaser.Scene, buttonCount: number): IntermissionLayoutMetrics {
  const viewport = getViewportLayout(scene);
  const portrait = viewport.width < 700 && viewport.height >= viewport.width * 1.12;
  const ultraCompact = viewport.height < 370 && viewport.width < 560;
  const desktop = !portrait && !ultraCompact && viewport.width >= 900 && viewport.height >= 560;
  const mode: IntermissionViewportMode = ultraCompact
    ? 'ultra-compact'
    : portrait
      ? 'portrait'
      : desktop
        ? 'desktop'
        : 'landscape';
  const margin = mode === 'desktop' ? Math.max(36, viewport.width * 0.035) : mode === 'landscape' ? 18 : 14;
  const stackedUltra = mode === 'ultra-compact' && viewport.width < 400;
  // Five upgrade cards need a tighter stack on short viewports: compress the
  // header, drop the journey note, and shrink buttons so the grid never clamps
  // up into the status band.
  const compactGrid = buttonCount >= 5 && (mode === 'landscape' || (mode === 'portrait' && viewport.height < 760));

  let planetX: number;
  let planetY: number;
  let planetDiameter: number;
  let contentX: number;
  let contentWidth: number;
  let eyebrowY: number;
  let planetNameY: number;
  let destinationY: number;
  let journeyNoteY: number;
  let statusY: number;
  let upgradeLabelY: number;
  let gridTop: number;
  let columns: number;

  if (mode === 'desktop') {
    const artWidth = viewport.width * 0.44;
    planetX = viewport.left + artWidth * 0.55;
    planetY = viewport.top + viewport.height * 0.43;
    planetDiameter = Math.min(430, artWidth * 0.78, viewport.height * 0.58);
    contentX = viewport.left + artWidth + 22;
    contentWidth = viewport.right - margin - contentX;
    eyebrowY = viewport.top + 52;
    planetNameY = eyebrowY + 30;
    destinationY = planetNameY + 58;
    journeyNoteY = destinationY + 34;
    statusY = journeyNoteY + 72;
    upgradeLabelY = statusY + 48;
    gridTop = upgradeLabelY + 28;
    columns = 2;
  } else if (mode === 'landscape') {
    const artWidth = Math.max(152, viewport.width * 0.34);
    planetX = viewport.left + artWidth * 0.52;
    planetY = viewport.top + viewport.height * 0.43;
    planetDiameter = Math.min(244, artWidth * 0.8, viewport.height * 0.63);
    contentX = viewport.left + artWidth + 8;
    contentWidth = viewport.right - margin - contentX;
    eyebrowY = viewport.top + 18;
    planetNameY = eyebrowY + 24;
    destinationY = planetNameY + 34;
    journeyNoteY = compactGrid ? destinationY : destinationY + 26;
    statusY = compactGrid ? destinationY + 30 : journeyNoteY + 48;
    upgradeLabelY = statusY + (compactGrid ? 26 : 30);
    gridTop = upgradeLabelY + (compactGrid ? 18 : 20);
    columns = 2;
  } else if (mode === 'portrait') {
    const roomy = viewport.height >= 760 && !compactGrid;
    planetX = viewport.centerX;
    planetY = viewport.top + (roomy ? 132 : compactGrid ? 96 : 104);
    planetDiameter = Math.min(viewport.width * 0.59, roomy ? 220 : compactGrid ? 150 : 174);
    contentX = viewport.left + margin;
    contentWidth = viewport.width - margin * 2;
    eyebrowY = viewport.top + 18;
    planetNameY = planetY + planetDiameter * 0.55;
    destinationY = planetNameY + (roomy ? 40 : compactGrid ? 28 : 32);
    journeyNoteY = compactGrid ? destinationY : destinationY + (roomy ? 30 : 25);
    statusY = compactGrid ? destinationY + 40 : journeyNoteY + (roomy ? 66 : 50);
    upgradeLabelY = statusY + (compactGrid ? 24 : 28);
    gridTop = upgradeLabelY + (compactGrid ? 18 : 20);
    columns = 1;
  } else if (stackedUltra) {
    planetX = viewport.centerX;
    planetY = viewport.top + 58;
    planetDiameter = 92;
    contentX = viewport.left + margin;
    contentWidth = viewport.width - margin * 2;
    eyebrowY = viewport.top + 10;
    planetNameY = viewport.top + 112;
    destinationY = planetNameY + 20;
    journeyNoteY = destinationY;
    statusY = planetNameY + 25;
    upgradeLabelY = statusY + 22;
    gridTop = upgradeLabelY + 18;
    columns = 2;
  } else {
    const artWidth = viewport.width * 0.31;
    planetX = viewport.left + artWidth * 0.52;
    planetY = viewport.top + viewport.height * 0.36;
    planetDiameter = Math.min(130, viewport.height * 0.42);
    contentX = viewport.left + artWidth + 8;
    contentWidth = viewport.right - margin - contentX;
    eyebrowY = viewport.top + 12;
    planetNameY = eyebrowY + 21;
    destinationY = planetNameY + 25;
    journeyNoteY = destinationY;
    statusY = destinationY + 24;
    upgradeLabelY = statusY + 22;
    gridTop = upgradeLabelY + 17;
    columns = 2;
  }

  const gridLayout = getUpgradeGridLayout(viewport.height, viewport.width, {
    availableWidth: contentWidth,
    columns,
    mode,
    compact: compactGrid,
  });
  const gridWidth = gridLayout.buttonWidth * gridLayout.columns + gridLayout.spacingX * (gridLayout.columns - 1);
  const gridLeft = contentX + Math.max(0, (contentWidth - gridWidth) / 2);
  const gridHeight = getGridHeight(buttonCount, gridLayout);
  const promptY = viewport.bottom - (mode === 'desktop' || mode === 'portrait' ? 34 : 26);
  const maxGridTop = promptY - gridHeight - (mode === 'desktop' ? 96 : mode === 'portrait' ? 44 : 28);
  gridTop = Math.min(gridTop, maxGridTop);
  const gridBottom = gridTop + gridHeight;
  const nextMissionY = Math.min(promptY - 34, gridBottom + (mode === 'desktop' ? 52 : 24));

  return {
    mode,
    portrait,
    showDestination: mode !== 'ultra-compact',
    showJourneyNote:
      !compactGrid && (mode === 'desktop' || mode === 'portrait' || (mode === 'landscape' && viewport.width >= 700)),
    showOrbitLabels: mode === 'desktop' || mode === 'landscape',
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
    promptY,
    gridLeft,
    gridTop,
    gridBottom,
    nextMissionY,
    gridLayout,
  };
}

function drawContentFrame(scene: Phaser.Scene, layout: IntermissionLayoutMetrics, accentColor: number): void {
  const viewport = getViewportLayout(scene);
  const graphics = scene.add.graphics().setDepth(1);

  if (layout.mode === 'desktop') {
    const top = viewport.top + 30;
    const bottom = layout.nextMissionY + 30;
    drawNeonFrame(graphics, layout.contentX - 22, top, layout.contentWidth + 44, bottom - top, {
      accentColor,
      fillAlpha: 0.58,
      strokeAlpha: 0.32,
      cornerCut: 18,
      glow: true,
    });
    graphics.fillStyle(accentColor, 0.65);
    graphics.fillRect(layout.contentX - 22, top + 34, 3, 64);
  } else if (layout.mode === 'portrait') {
    drawNeonFrame(
      graphics,
      layout.contentX - 4,
      layout.planetNameY - 15,
      layout.contentWidth + 8,
      layout.gridBottom - layout.planetNameY + 24,
      {
        accentColor,
        fillAlpha: 0.76,
        strokeAlpha: 0.25,
        cornerCut: 14,
        glow: true,
      }
    );
  }
}

export function createIntermissionHeader(
  scene: Phaser.Scene,
  intermissionLayout: IntermissionLayoutMetrics,
  config: IntermissionHeaderConfig
): Phaser.GameObjects.Text {
  const viewport = getViewportLayout(scene);
  const accentCss = colorToCss(config.levelConfig.planetPalette[1]);
  const textX =
    intermissionLayout.portrait || (intermissionLayout.mode === 'ultra-compact' && viewport.width < 400)
      ? viewport.centerX
      : intermissionLayout.contentX;
  const originX = textX === viewport.centerX ? 0.5 : 0;

  drawContentFrame(scene, intermissionLayout, config.levelConfig.planetPalette[1]);

  scene.add
    .text(textX, intermissionLayout.eyebrowY, `// ${config.profile.approachCode} · ARRIVAL CONFIRMED`, {
      fontSize: intermissionLayout.mode === 'desktop' ? '13px' : '10px',
      color: accentCss,
      fontFamily: UI_FONT_MONO,
      letterSpacing: 1.4,
    })
    .setOrigin(originX, 0.5)
    .setDepth(3);

  scene.add
    .text(textX, intermissionLayout.planetNameY, config.levelConfig.planetName.toUpperCase(), {
      fontSize:
        intermissionLayout.mode === 'desktop'
          ? '42px'
          : intermissionLayout.mode === 'portrait'
            ? '27px'
            : intermissionLayout.mode === 'landscape'
              ? '25px'
              : '18px',
      color: '#f4fbff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_DISPLAY,
      stroke: '#071523',
      strokeThickness: 4,
    })
    .setOrigin(originX, 0.5)
    .setDepth(3);

  if (intermissionLayout.showDestination) {
    scene.add
      .text(textX, intermissionLayout.destinationY, config.levelConfig.destination.toUpperCase(), {
        fontSize: intermissionLayout.mode === 'desktop' ? '14px' : '10px',
        color: '#a9c5d8',
        fontFamily: UI_FONT_MONO,
        wordWrap: { width: intermissionLayout.contentWidth },
        align: originX === 0.5 ? 'center' : 'left',
      })
      .setOrigin(originX, 0.5)
      .setDepth(3);
  }

  if (intermissionLayout.showJourneyNote) {
    scene.add
      .text(textX, intermissionLayout.journeyNoteY, `“${config.levelConfig.journeyNote}”`, {
        fontSize:
          intermissionLayout.mode === 'desktop' ? '15px' : intermissionLayout.mode === 'portrait' ? '11px' : '10px',
        color: '#d4e4ee',
        fontFamily: UI_FONT_MONO,
        fontStyle: 'italic',
        lineSpacing: 4,
        wordWrap: { width: intermissionLayout.contentWidth },
        align: originX === 0.5 ? 'center' : 'left',
      })
      .setOrigin(originX, 0.5)
      .setDepth(3);
  }

  const statusGraphics = scene.add.graphics().setDepth(2);
  const statusWidth = intermissionLayout.contentWidth;
  const statusLeft = intermissionLayout.contentX;
  statusGraphics.lineStyle(1, config.levelConfig.planetPalette[1], 0.28);
  statusGraphics.lineBetween(
    statusLeft,
    intermissionLayout.statusY - 15,
    statusLeft + statusWidth,
    intermissionLayout.statusY - 15
  );

  scene.add
    .text(
      statusLeft,
      intermissionLayout.statusY,
      `SECTOR ${String(config.level).padStart(2, '0')} / ${String(config.totalLevels).padStart(2, '0')}  ·  ${config.profile.signalLabel}`,
      {
        fontSize: intermissionLayout.mode === 'desktop' ? '12px' : '9px',
        color: '#73f5be',
        fontFamily: UI_FONT_MONO,
      }
    )
    .setOrigin(0, 0.5)
    .setDepth(3);

  const scoreText = scene.add
    .text(statusLeft + statusWidth, intermissionLayout.statusY, `CREDITS ${config.score}`, {
      fontSize: intermissionLayout.mode === 'desktop' ? '16px' : '11px',
      color: '#ffd36a',
      fontFamily: UI_FONT_MONO,
      fontStyle: 'bold',
    })
    .setOrigin(1, 0.5)
    .setDepth(3);

  scene.add
    .text(
      statusLeft,
      intermissionLayout.upgradeLabelY,
      config.nextLevelName ? 'REFIT BAY // SELECT AN UPGRADE' : 'MISSION ARCHIVE // JOURNEY COMPLETE',
      {
        fontSize: intermissionLayout.mode === 'desktop' ? '12px' : '9px',
        color: '#7f9eb3',
        fontFamily: UI_FONT_MONO,
        letterSpacing: 1,
      }
    )
    .setOrigin(0, 0.5)
    .setDepth(3);

  const nextLabel = config.nextLevelName
    ? `NEXT VECTOR  ·  ${config.nextLevelName.toUpperCase()}`
    : 'ALL TEN SECTORS CLEARED  ·  RETURNING TO COMMAND';
  const nextLabelX = intermissionLayout.portrait
    ? viewport.centerX
    : intermissionLayout.contentX + intermissionLayout.contentWidth / 2;
  scene.add
    .text(nextLabelX, intermissionLayout.nextMissionY, nextLabel, {
      fontSize: intermissionLayout.mode === 'desktop' ? '13px' : '10px',
      color: accentCss,
      fontFamily: UI_FONT_MONO,
      wordWrap: { width: intermissionLayout.portrait ? viewport.width - 32 : intermissionLayout.contentWidth },
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(3);

  return scoreText;
}

export function createIntermissionPrompt(
  scene: Phaser.Scene,
  intermissionLayout: IntermissionLayoutMetrics,
  label: string,
  accentColor = 0x69d8ff
): void {
  const viewport = getViewportLayout(scene);
  const width = Math.min(
    intermissionLayout.mode === 'desktop' ? 460 : intermissionLayout.mode === 'portrait' ? viewport.width - 28 : 420,
    viewport.width - 24
  );
  const height = intermissionLayout.mode === 'desktop' ? 42 : 34;
  const x = viewport.centerX - width / 2;
  const y = intermissionLayout.promptY - height / 2;
  const graphics = scene.add.graphics().setDepth(4);
  graphics.fillStyle(0x06131f, 0.92);
  graphics.fillRoundedRect(x, y, width, height, height / 2);
  graphics.lineStyle(1.5, accentColor, 0.85);
  graphics.strokeRoundedRect(x, y, width, height, height / 2);
  graphics.fillStyle(accentColor, 0.9);
  graphics.fillCircle(x + 17, intermissionLayout.promptY, 3);
  graphics.fillCircle(x + width - 17, intermissionLayout.promptY, 3);

  scene.add
    .text(viewport.centerX, intermissionLayout.promptY, label.toUpperCase(), {
      fontSize: intermissionLayout.mode === 'desktop' ? '14px' : '11px',
      color: '#eefbff',
      fontFamily: UI_FONT_MONO,
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(5);
}
