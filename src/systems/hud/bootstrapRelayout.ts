import type Phaser from 'phaser';
import { NEON, NEON_FONT, NEON_TEXT, neonLabelStyle, neonReadoutStyle } from '../../scenes/shared/neonUiTheme';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { renderGunChargeTrack, renderProgressTrack, renderSurgeTrack } from './meterRenderers';
import type { HudLayoutMetrics } from './statusBarLayout';

const SWAP_HINT_TEXT = 'Q  SPECIAL GUN';

interface CreateHudWidgetsParams {
  scene: Phaser.Scene;
  labelColor: string;
  sectorColor: string;
}

export interface HudWidgets {
  plates: Phaser.GameObjects.Graphics;
  hullLabel: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  hullCells: Phaser.GameObjects.Graphics;
  shieldPips: Phaser.GameObjects.Graphics;
  surgeTrack: Phaser.GameObjects.Graphics;
  surgeFill: Phaser.GameObjects.Graphics;
  reserveLabel: Phaser.GameObjects.Text;
  reserveIcons: Phaser.GameObjects.Graphics;
  /** From sector 3: the current gun's name and the special-gun charge. Hidden before then. */
  gunName: Phaser.GameObjects.Text;
  gunChargeTrack: Phaser.GameObjects.Graphics;
  gunChargeFill: Phaser.GameObjects.Graphics;
  /** `Q  SPECIAL GUN` beside the charge bar, until the first swap of sector 3 (keyboard only). */
  gunHint: Phaser.GameObjects.Text;
  scoreLabel: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  sectorText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  progressTrack: Phaser.GameObjects.Graphics;
  progressFill: Phaser.GameObjects.Graphics;
  bossBarBg: Phaser.GameObjects.Graphics;
  bossBarFill: Phaser.GameObjects.Graphics;
  bossNameText: Phaser.GameObjects.Text;
  announcementRule: Phaser.GameObjects.Graphics;
  announcementText: Phaser.GameObjects.Text;
  chainBadge: Phaser.GameObjects.Graphics;
  chainText: Phaser.GameObjects.Text;
}

/** Room the announcement title keeps around its letters so the glow is never clipped. */
export const ANNOUNCEMENT_GLOW_PADDING = 18;

/** Dark outline that keeps HUD text legible over bright scenery and explosions. */
const OUTLINE = { stroke: '#030a14', strokeThickness: 3 } as const;

export function createHudWidgets({ scene, labelColor, sectorColor }: CreateHudWidgetsParams): HudWidgets {
  const label = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text =>
    scene.add.text(0, 0, text, { ...style, ...OUTLINE }).setDepth(100);
  const graphics = (depth: number): Phaser.GameObjects.Graphics => scene.add.graphics().setDepth(depth);

  const plates = graphics(99);
  const hullLabel = label('HULL', neonLabelStyle(12, labelColor));
  const hpText = label('', neonReadoutStyle(12, NEON_TEXT.primary));
  const hullCells = graphics(100);
  const shieldPips = graphics(100);
  const surgeTrack = graphics(100);
  const surgeFill = graphics(101);
  const reserveLabel = label('RES', neonLabelStyle(11, labelColor));
  const reserveIcons = graphics(100);
  const gunName = label('', neonLabelStyle(11, NEON_TEXT.cyan)).setVisible(false);
  const gunChargeTrack = graphics(100).setVisible(false);
  const gunChargeFill = graphics(101).setVisible(false);
  const gunHint = label(SWAP_HINT_TEXT, neonLabelStyle(11, NEON_TEXT.gold)).setVisible(false);

  const scoreLabel = label('SCORE', neonLabelStyle(11, NEON_TEXT.gold)).setOrigin(1, 0);
  const scoreText = label('0', neonReadoutStyle(24)).setOrigin(1, 0);
  scoreText.setLetterSpacing(1.5);
  const sectorText = label('', neonLabelStyle(11, sectorColor));
  const levelText = label('', neonLabelStyle(13, NEON_TEXT.primary, 0.6)).setOrigin(1, 0);

  const progressTrack = graphics(100);
  const progressFill = graphics(101);

  const bossBarBg = graphics(100).setVisible(false);
  const bossBarFill = graphics(101).setVisible(false);
  const bossNameText = scene.add
    .text(0, 0, 'BOSS', {
      fontSize: '13px',
      color: '#ffb1ac',
      fontFamily: NEON_FONT.display,
      fontStyle: 'bold',
      letterSpacing: 3,
      stroke: '#14040a',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(100)
    .setVisible(false);

  const announcementRule = graphics(200).setAlpha(0);
  const announcementText = scene.add
    .text(0, 0, '', {
      fontSize: '30px',
      color: NEON_TEXT.title,
      fontFamily: NEON_FONT.display,
      fontStyle: 'bold',
      letterSpacing: 2,
      padding: { x: ANNOUNCEMENT_GLOW_PADDING, y: ANNOUNCEMENT_GLOW_PADDING },
      stroke: '#030a14',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(200)
    .setAlpha(0);

  const chainBadge = graphics(100);
  const chainText = scene.add
    .text(0, 0, '', {
      fontSize: '12px',
      color: NEON_TEXT.gold,
      fontFamily: NEON_FONT.display,
      fontStyle: 'bold',
      letterSpacing: 1,
    })
    .setDepth(101)
    .setVisible(false);

  return {
    plates,
    hullLabel,
    hpText,
    hullCells,
    shieldPips,
    surgeTrack,
    surgeFill,
    reserveLabel,
    reserveIcons,
    gunName,
    gunChargeTrack,
    gunChargeFill,
    gunHint,
    scoreLabel,
    scoreText,
    sectorText,
    levelText,
    progressTrack,
    progressFill,
    bossBarBg,
    bossBarFill,
    bossNameText,
    announcementRule,
    announcementText,
    chainBadge,
    chainText,
  };
}

/** Soft dark wash behind a corner cluster: enough to seat the instruments, not enough to hide ships under it. */
function drawPlate(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: number,
  accentOnRight: boolean
): void {
  graphics.fillStyle(NEON.panel, 0.36);
  graphics.fillRect(x, y, width, height);
  graphics.fillStyle(accent, 0.85);
  graphics.fillRect(accentOnRight ? x + width - 2 : x, y, 2, height);
}

/** Positions every static HUD element and repaints the parts that only change with the viewport. */
export function relayoutHudWidgets(widgets: HudWidgets, layout: HudLayoutMetrics, accentColor: number): void {
  const clusterTop = layout.hullLabelY - 5;
  const hullClusterHeight = layout.hullClusterBottom + 6 - clusterTop;
  const scoreClusterWidth = layout.compact ? 126 : 148;
  const scoreClusterBottom = layout.compact ? layout.levelY + 19 : layout.scoreY + 31;

  widgets.plates.clear();
  if (getVisualQualityProfile().menuAtmosphere >= 2) {
    drawPlate(
      widgets.plates,
      layout.hullX - 9,
      clusterTop,
      layout.hullWidth + 18,
      hullClusterHeight,
      accentColor,
      false
    );
    drawPlate(
      widgets.plates,
      layout.scoreRight + 9 - scoreClusterWidth,
      clusterTop,
      scoreClusterWidth,
      scoreClusterBottom - clusterTop,
      accentColor,
      true
    );
  }

  widgets.hullLabel.setPosition(layout.hullX, layout.hullLabelY);
  widgets.hpText.setPosition(layout.hullX + 42, layout.hullLabelY);
  widgets.reserveLabel.setPosition(layout.hullX, layout.reserveY - 3);
  renderSurgeTrack(widgets.surgeTrack, layout);
  widgets.gunName.setPosition(layout.hullX, layout.gunY - 3);
  renderGunChargeTrack(widgets.gunChargeTrack, layout);
  widgets.gunHint.setPosition(layout.gunHintX, layout.gunY - 3);

  widgets.scoreLabel.setPosition(layout.scoreRight, layout.scoreLabelY).setVisible(!layout.compact);
  widgets.scoreText.setFontSize(layout.compact ? 22 : 24).setPosition(layout.scoreRight, layout.scoreY);
  widgets.sectorText.setOrigin(layout.sectorOriginX, 0).setPosition(layout.sectorX, layout.sectorY);
  widgets.levelText.setPosition(layout.levelX, layout.levelY);
  widgets.chainText.setOrigin(layout.chainOriginX, 0).setPosition(layout.chainX, layout.chainY);

  renderProgressTrack(widgets.progressTrack, accentColor, layout);
  widgets.bossNameText.setPosition(layout.centerX, layout.bossNameY);
  widgets.announcementText.setFontSize(layout.compact ? 22 : 30);
}
