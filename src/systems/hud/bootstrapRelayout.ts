import Phaser from 'phaser';
import { getLayoutMetrics } from './statusBarLayout';

interface CreateHudWidgetsParams {
  scene: Phaser.Scene;
  labelStyle: Phaser.Types.GameObjects.Text.TextStyle;
  valueStyle: Phaser.Types.GameObjects.Text.TextStyle;
  sectorColor: string;
}

interface HudWidgets {
  topBarPanel: Phaser.GameObjects.Graphics;
  hpBarBg: Phaser.GameObjects.Graphics;
  hpBarFill: Phaser.GameObjects.Graphics;
  hpLabel: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  livesLabel: Phaser.GameObjects.Text;
  livesText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  sectorText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  progressBg: Phaser.GameObjects.Graphics;
  progressFill: Phaser.GameObjects.Graphics;
  bossBarBg: Phaser.GameObjects.Graphics;
  bossBarFill: Phaser.GameObjects.Graphics;
  bossNameText: Phaser.GameObjects.Text;
  announcementText: Phaser.GameObjects.Text;
}

export function createHudWidgets({ scene, labelStyle, valueStyle, sectorColor }: CreateHudWidgetsParams): HudWidgets {
  const topBarPanel = scene.add.graphics().setDepth(99);
  const hpBarBg = scene.add.graphics().setDepth(100);
  const hpBarFill = scene.add.graphics().setDepth(101);
  const hpLabel = scene.add.text(0, 0, 'HP', labelStyle).setDepth(100);
  const hpText = scene.add.text(0, 0, '', valueStyle).setDepth(100);
  const livesLabel = scene.add.text(0, 0, 'LIVES', labelStyle).setDepth(100);
  const livesText = scene.add
    .text(0, 0, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    })
    .setDepth(100);

  const scoreText = scene.add
    .text(0, 0, '0', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    })
    .setOrigin(1, 0)
    .setDepth(100);
  scoreText.setLetterSpacing(1.5);

  const sectorText = scene.add
    .text(0, 0, '', {
      fontSize: '10px',
      color: sectorColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    })
    .setOrigin(1, 0)
    .setDepth(100);
  sectorText.setLetterSpacing(1.5);

  const levelText = scene.add
    .text(0, 0, '', {
      fontSize: '13px',
      color: '#eefaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    })
    .setOrigin(1, 0)
    .setDepth(100);
  levelText.setLetterSpacing(0.5);

  const progressBg = scene.add.graphics().setDepth(100);
  const progressFill = scene.add.graphics().setDepth(101);
  const announcementText = scene.add
    .text(0, 0, '', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(200)
    .setAlpha(0);
  const bossBarBg = scene.add.graphics().setDepth(100).setVisible(false);
  const bossBarFill = scene.add.graphics().setDepth(101).setVisible(false);
  const bossNameText = scene.add
    .text(0, 0, 'BOSS', {
      fontSize: '14px',
      color: '#ff8c8c',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#140406',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(100)
    .setVisible(false);

  return {
    topBarPanel,
    hpBarBg,
    hpBarFill,
    hpLabel,
    hpText,
    livesLabel,
    livesText,
    scoreText,
    sectorText,
    levelText,
    progressBg,
    progressFill,
    announcementText,
    bossBarBg,
    bossBarFill,
    bossNameText,
  };
}

interface RelayoutHudWidgetsParams {
  scene: Phaser.Scene;
  baseHpBarWidth: number;
  baseProgressWidth: number;
  baseBossBarWidth: number;
  topBarPanel: Phaser.GameObjects.Graphics;
  hpBarBg: Phaser.GameObjects.Graphics;
  hpLabel: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  livesLabel: Phaser.GameObjects.Text;
  livesText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  sectorText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  progressBg: Phaser.GameObjects.Graphics;
  announcementText: Phaser.GameObjects.Text;
  bossNameText: Phaser.GameObjects.Text;
  hpBarHeight: number;
  progressHeight: number;
  panelStrokeColor: number;
  hpBorderColor: number;
  progressBorderColor: number;
  announcementTween: Phaser.Tweens.Tween | null;
  setAnnouncementTween: (tween: Phaser.Tweens.Tween | null) => void;
}

export function relayoutHudWidgets({
  scene,
  baseHpBarWidth,
  baseProgressWidth,
  baseBossBarWidth,
  topBarPanel,
  hpBarBg,
  hpLabel,
  hpText,
  livesLabel,
  livesText,
  scoreText,
  sectorText,
  levelText,
  progressBg,
  announcementText,
  bossNameText,
  hpBarHeight,
  progressHeight,
  panelStrokeColor,
  hpBorderColor,
  progressBorderColor,
  announcementTween,
  setAnnouncementTween,
}: RelayoutHudWidgetsParams): Phaser.Tweens.Tween | null {
  const layout = getLayoutMetrics(scene, baseHpBarWidth, baseProgressWidth, baseBossBarWidth);

  topBarPanel.clear();
  topBarPanel.fillStyle(0x030915, 0.58);
  topBarPanel.fillRoundedRect(layout.left + 10, layout.top + 6, layout.topBarWidth, 60, 10);
  topBarPanel.lineStyle(1, panelStrokeColor, 0.34);
  topBarPanel.strokeRoundedRect(layout.left + 10, layout.top + 6, layout.topBarWidth, 60, 10);

  hpLabel.setPosition(layout.hpBarX, layout.hpBarY - 2);

  hpBarBg.clear();
  hpBarBg.fillStyle(0x091521, 0.92);
  hpBarBg.fillRoundedRect(layout.hpBarX + 22, layout.hpBarY, layout.hpBarWidth - 22, hpBarHeight, 3);
  hpBarBg.lineStyle(1, hpBorderColor, 0.35);
  hpBarBg.strokeRoundedRect(layout.hpBarX + 22, layout.hpBarY, layout.hpBarWidth - 22, hpBarHeight, 3);

  hpText.setPosition(layout.hpBarX + layout.hpBarWidth + 6, layout.hpBarY);
  livesLabel.setPosition(layout.hpBarX + layout.hpBarWidth + 6, layout.hpBarY + 24);
  livesText.setPosition(layout.hpBarX + layout.hpBarWidth + 48, layout.hpBarY + 22);

  scoreText.setPosition(layout.topBarRight, layout.hpBarY - 3);
  sectorText.setPosition(layout.topBarRight, layout.hpBarY + 18);
  levelText.setPosition(layout.topBarRight, layout.hpBarY + 30);

  progressBg.clear();
  progressBg.fillStyle(0x08141f, 0.82);
  progressBg.fillRect(layout.progressX, layout.progressY, layout.progressWidth, progressHeight);
  progressBg.lineStyle(1, progressBorderColor, 0.36);
  progressBg.strokeRect(layout.progressX, layout.progressY, layout.progressWidth, progressHeight);

  announcementText.setPosition(layout.centerX, layout.announcementY);
  if (announcementTween && announcementText.alpha > 0) {
    announcementTween.stop();
    announcementTween = scene.tweens.add({
      targets: announcementText,
      alpha: { from: announcementText.alpha, to: 0 },
      duration: 900,
      ease: 'Power2',
      onComplete: () => {
        setAnnouncementTween(null);
      },
    });
  }

  bossNameText.setPosition(layout.centerX, layout.bossNameY);

  return announcementTween;
}
