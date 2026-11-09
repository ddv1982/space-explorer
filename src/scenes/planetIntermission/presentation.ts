import Phaser from 'phaser';

import type { LevelConfig } from '../../config/LevelsConfig';
import { getViewportLayout } from '../../utils/layout';
import { colorToHexString, mixColor } from '../../utils/colorUtils';
import { createActionButtonControl } from '../shared/actionButtonControl';
import {
  addNeonTitle,
  drawAngledRectPath,
  drawNeonFrame,
  NEON,
  NEON_FONT,
  NEON_TEXT,
  neonLabelStyle,
} from '../shared/neonUiTheme';
import { MIN_TOUCH_TARGET_PX } from '../shared/touchTarget';
import type { IntermissionLayoutMetrics } from './layout';
import type { PlanetIntermissionProfile } from './planetProfiles';

interface IntermissionHeaderConfig {
  levelConfig: LevelConfig;
  profile: PlanetIntermissionProfile;
  level: number;
  totalLevels: number;
  score: number;
  nextLevelName: string | null;
}

function drawContentFrame(scene: Phaser.Scene, layout: IntermissionLayoutMetrics, accentColor: number): void {
  const viewport = getViewportLayout(scene);
  const graphics = scene.add.graphics().setDepth(1);

  if (layout.mode === 'desktop') {
    const top = viewport.top + 26;
    const bottom = layout.nextMissionY + 28;
    drawNeonFrame(graphics, layout.contentX - 24, top, layout.contentWidth + 48, bottom - top, {
      accentColor,
      fillAlpha: 0.62,
      strokeAlpha: 0.7,
      cornerCut: 20,
      glow: true,
    });
  } else if (layout.mode === 'portrait') {
    drawNeonFrame(
      graphics,
      layout.contentX - 6,
      layout.planetNameY - 24,
      layout.contentWidth + 12,
      layout.gridBottom - layout.planetNameY + 32,
      {
        accentColor,
        fillAlpha: 0.78,
        strokeAlpha: 0.6,
        cornerCut: 14,
        glow: true,
      }
    );
  }
}

/** Gold chip behind the credits readout, sized once so it never jitters as the balance changes. */
function drawCreditsChip(scene: Phaser.Scene, credits: Phaser.GameObjects.Text): void {
  const padX = 10;
  const padY = 5;
  const chip = scene.add.graphics().setDepth(2);
  const left = credits.x - credits.width - padX;
  const top = credits.y - credits.height / 2 - padY;
  drawAngledRectPath(chip, left, top, credits.width + padX * 2, credits.height + padY * 2, 6);
  chip.fillStyle(NEON.gold, 0.1);
  chip.fillPath();
  drawAngledRectPath(chip, left, top, credits.width + padX * 2, credits.height + padY * 2, 6);
  chip.lineStyle(1, NEON.gold, 0.55);
  chip.strokePath();
}

interface HeaderTint {
  accent: number;
  /** Planet accents can be deep; this lifts them so small labels stay readable on the glass. */
  accentCss: string;
}

function getHeaderTint(levelConfig: LevelConfig): HeaderTint {
  const accent = levelConfig.planetPalette[1];
  return { accent, accentCss: colorToHexString(mixColor(accent, 0xffffff, 0.3)) };
}

/** Eyebrow, planet name, destination and journey note. */
function addArrivalTitleBlock(
  scene: Phaser.Scene,
  intermissionLayout: IntermissionLayoutMetrics,
  config: IntermissionHeaderConfig,
  { accent, accentCss }: HeaderTint
): void {
  const viewport = getViewportLayout(scene);
  const desktop = intermissionLayout.mode === 'desktop';
  const centered = intermissionLayout.portrait || (intermissionLayout.mode === 'ultra-compact' && viewport.width < 400);
  const textX = centered ? viewport.centerX : intermissionLayout.contentX;
  const originX = centered ? 0.5 : 0;
  const align = centered ? 'center' : 'left';

  scene.add
    .text(
      textX,
      intermissionLayout.eyebrowY,
      `// ${config.profile.approachCode} · ARRIVAL CONFIRMED`,
      neonLabelStyle(desktop ? 14 : 11, accentCss, desktop ? 2.4 : 1.4)
    )
    .setOrigin(originX, 0.5)
    .setDepth(3);

  const title = addNeonTitle(
    scene,
    textX,
    intermissionLayout.planetNameY,
    config.levelConfig.planetName.toUpperCase(),
    desktop ? 44 : intermissionLayout.mode === 'portrait' ? 28 : intermissionLayout.mode === 'landscape' ? 25 : 18,
    3,
    { glow: colorToHexString(accent), base: colorToHexString(mixColor(0xffffff, accent, 0.45)) }
  ).setOrigin(originX, 0.5);
  // The glow padding sits inside the text frame: pull a left-aligned title back onto the column edge.
  if (!centered) title.setX(textX - (title.padding.left ?? 0));

  if (intermissionLayout.showDestination) {
    scene.add
      .text(textX, intermissionLayout.destinationY, config.levelConfig.destination.toUpperCase(), {
        ...neonLabelStyle(desktop ? 15 : 12, '#a9c5d8'),
        wordWrap: { width: intermissionLayout.contentWidth },
        align,
      })
      .setOrigin(originX, 0.5)
      .setDepth(3);
  }

  if (intermissionLayout.showJourneyNote) {
    scene.add
      .text(textX, intermissionLayout.journeyNoteY, `“${config.levelConfig.journeyNote}”`, {
        fontSize: desktop ? '17px' : '13px',
        color: '#dbe8f1',
        fontFamily: NEON_FONT.label,
        lineSpacing: desktop ? 4 : 2,
        wordWrap: { width: intermissionLayout.contentWidth },
        align,
      })
      .setOrigin(originX, 0.5)
      .setDepth(3);
  }
}

/** Sector status and credits, then the captions above and below the upgrade grid. Returns the credits readout. */
function addStatusBand(
  scene: Phaser.Scene,
  intermissionLayout: IntermissionLayoutMetrics,
  config: IntermissionHeaderConfig,
  { accent, accentCss }: HeaderTint
): Phaser.GameObjects.Text {
  const viewport = getViewportLayout(scene);
  const desktop = intermissionLayout.mode === 'desktop';
  const sector = `SECTOR ${String(config.level).padStart(2, '0')} / ${String(config.totalLevels).padStart(2, '0')}`;
  const statusLeft = intermissionLayout.contentX;
  const statusRight = statusLeft + intermissionLayout.contentWidth;
  const rules = scene.add.graphics().setDepth(2);
  rules.lineStyle(1, accent, 0.3);
  rules.lineBetween(statusLeft, intermissionLayout.statusY - 17, statusRight, intermissionLayout.statusY - 17);

  scene.add
    .text(
      statusLeft,
      intermissionLayout.statusY,
      intermissionLayout.mode === 'ultra-compact' ? sector : `${sector}  ·  ${config.profile.signalLabel}`,
      neonLabelStyle(desktop ? 14 : 11, '#73f5be')
    )
    .setOrigin(0, 0.5)
    .setDepth(3);

  const scoreText = scene.add
    .text(statusRight - 10, intermissionLayout.statusY, `CREDITS ${config.score}`, {
      fontSize: desktop ? '17px' : '12px',
      color: NEON_TEXT.gold,
      fontFamily: NEON_FONT.display,
      fontStyle: 'bold',
      letterSpacing: 1,
    })
    .setOrigin(1, 0.5)
    .setDepth(3);
  drawCreditsChip(scene, scoreText);

  // The tightest viewports clamp the grid up under these labels; the cards and CONTINUE carry on without them.
  if (intermissionLayout.gridTop - intermissionLayout.upgradeLabelY >= 14) {
    const sectionLabel = scene.add
      .text(
        statusLeft,
        intermissionLayout.upgradeLabelY,
        config.nextLevelName ? 'REFIT BAY // SELECT AN UPGRADE' : 'MISSION ARCHIVE // JOURNEY COMPLETE',
        neonLabelStyle(desktop ? 13 : 11, '#8fb0c6', desktop ? 2 : 1.2)
      )
      .setOrigin(0, 0.5)
      .setDepth(3);
    rules.lineStyle(1, accent, 0.18);
    rules.lineBetween(
      statusLeft + sectionLabel.width + 12,
      intermissionLayout.upgradeLabelY,
      statusRight,
      intermissionLayout.upgradeLabelY
    );
  }

  if (intermissionLayout.nextMissionY - intermissionLayout.gridBottom >= 14) {
    const nextLabel = config.nextLevelName
      ? `NEXT VECTOR  ·  ${config.nextLevelName.toUpperCase()}`
      : 'ALL TEN SECTORS CLEARED  ·  RETURNING TO COMMAND';
    const nextLabelX = intermissionLayout.portrait
      ? viewport.centerX
      : intermissionLayout.contentX + intermissionLayout.contentWidth / 2;
    scene.add
      .text(nextLabelX, intermissionLayout.nextMissionY, nextLabel, {
        ...neonLabelStyle(desktop ? 14 : 11, accentCss, desktop ? 2 : 1.2),
        wordWrap: { width: intermissionLayout.portrait ? viewport.width - 32 : intermissionLayout.contentWidth },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(3);
  }

  return scoreText;
}

export function createIntermissionHeader(
  scene: Phaser.Scene,
  intermissionLayout: IntermissionLayoutMetrics,
  config: IntermissionHeaderConfig
): Phaser.GameObjects.Text {
  const tint = getHeaderTint(config.levelConfig);
  drawContentFrame(scene, intermissionLayout, tint.accent);
  addArrivalTitleBlock(scene, intermissionLayout, config, tint);
  return addStatusBand(scene, intermissionLayout, config, tint);
}

/** The one solid, lit control on the screen: carry on to the next sector. */
export function createIntermissionPrompt(
  scene: Phaser.Scene,
  intermissionLayout: IntermissionLayoutMetrics,
  label: string,
  onContinue: () => void
): void {
  const viewport = getViewportLayout(scene);
  const desktop = intermissionLayout.mode === 'desktop';
  const width = Math.min(
    desktop ? 460 : intermissionLayout.mode === 'portrait' ? viewport.width - 28 : 420,
    viewport.width - 24
  );
  const height = desktop ? 46 : 36;
  const button = createActionButtonControl(scene, {
    label: label.toUpperCase(),
    width,
    height,
    hitHeight: MIN_TOUCH_TARGET_PX,
    variant: 'primary',
    fontSize: desktop ? '17px' : '14px',
    onClick: onContinue,
  });
  button.setPosition(viewport.centerX - width / 2, intermissionLayout.promptY - height / 2);
  button.setDepth(4);
}
