import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

export class HUD {
  private scene!: Phaser.Scene;
  private topBarPanel!: Phaser.GameObjects.Graphics;
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private hpLabel!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private livesLabel!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private sectorText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private shieldIcons: Phaser.GameObjects.Graphics[] = [];
  private progressBg!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private bossBarBg!: Phaser.GameObjects.Graphics;
  private bossBarFill!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;
  private announcementText!: Phaser.GameObjects.Text;

  private hpBarWidth = 200;
  private hpBarHeight = 16;
  private hpBarX = 16;
  private hpBarY = 16;
  private progressWidth = 300;
  private progressHeight = 6;
  private bossBarWidth = 400;
  private bossBarHeight = 10;
  private bossVisible: boolean = false;
  private currentShields: number | null = null;
  private currentHp: number | null = null;
  private currentMaxHp: number | null = null;
  private currentLives: number | null = null;
  private currentScore: number | null = null;
  private currentProgress: number | null = null;
  private currentBossHp: number | null = null;
  private currentBossMaxHp: number | null = null;
  private panelStrokeColor = 0x3f6b8b;
  private hpBorderColor = 0x8ee8ff;
  private progressBorderColor = 0x7fdcff;
  private progressFillColor = 0x54dcff;

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.scene = scene;
    this.currentHp = null;
    this.currentMaxHp = null;
    this.currentLives = null;
    this.currentScore = null;
    this.currentProgress = null;
    this.currentBossHp = null;
    this.currentBossMaxHp = null;

    const accentColor = levelConfig?.accentColor ?? 0x54dcff;
    const labelColor = colorToHexString(mixColor(0xd8f4ff, accentColor, 0.28));
    const sectorColor = colorToHexString(mixColor(0x7fdcff, accentColor, 0.62));
    this.panelStrokeColor = mixColor(0x334466, accentColor, 0.42);
    this.hpBorderColor = mixColor(0x8ee8ff, accentColor, 0.48);
    this.progressBorderColor = mixColor(0x7fdcff, accentColor, 0.72);
    this.progressFillColor = mixColor(0x54dcff, accentColor, 0.86);

    const topBarRight = GAME_WIDTH - 16;
    const topBarPanelHeight = 60;

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '11px',
      color: labelColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    };
    const valueStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '12px',
      color: '#f6fbff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    };

    this.topBarPanel = scene.add.graphics();
    this.topBarPanel.setDepth(99);
    this.topBarPanel.fillStyle(0x030915, 0.58);
    this.topBarPanel.fillRoundedRect(10, 6, GAME_WIDTH - 20, topBarPanelHeight, 10);
    this.topBarPanel.lineStyle(1, this.panelStrokeColor, 0.34);
    this.topBarPanel.strokeRoundedRect(10, 6, GAME_WIDTH - 20, topBarPanelHeight, 10);

    // HP label and bar
    this.hpLabel = scene.add.text(this.hpBarX, this.hpBarY - 2, 'HP', labelStyle).setDepth(100);

    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.setDepth(100);
    this.hpBarBg.fillStyle(0x091521, 0.92);
    this.hpBarBg.fillRoundedRect(this.hpBarX + 22, this.hpBarY, this.hpBarWidth - 22, this.hpBarHeight, 3);
    this.hpBarBg.lineStyle(1, this.hpBorderColor, 0.35);
    this.hpBarBg.strokeRoundedRect(this.hpBarX + 22, this.hpBarY, this.hpBarWidth - 22, this.hpBarHeight, 3);

    this.hpBarFill = scene.add.graphics();
    this.hpBarFill.setDepth(101);

    // HP text (e.g. "5/5")
    this.hpText = scene.add.text(this.hpBarX + this.hpBarWidth + 6, this.hpBarY, '', valueStyle).setDepth(100);

    this.livesLabel = scene.add.text(this.hpBarX + this.hpBarWidth + 6, this.hpBarY + 24, 'LIVES', labelStyle).setDepth(100);

    this.livesText = scene.add.text(this.hpBarX + this.hpBarWidth + 48, this.hpBarY + 22, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    }).setDepth(100);

    // Score text only (no label)
    this.scoreText = scene.add.text(topBarRight, this.hpBarY - 3, '0', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    });
    this.scoreText.setOrigin(1, 0);
    this.scoreText.setLetterSpacing(1.5);
    this.scoreText.setDepth(100);

    // Sector and level title (below score, top-right area)
    this.sectorText = scene.add.text(topBarRight, this.hpBarY + 18, '', {
      fontSize: '10px',
      color: sectorColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    }).setDepth(100);
    this.sectorText.setOrigin(1, 0);
    this.sectorText.setLetterSpacing(1.5);

    this.levelText = scene.add.text(topBarRight, this.hpBarY + 30, '', {
      fontSize: '13px',
      color: '#eefaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    }).setDepth(100);
    this.levelText.setOrigin(1, 0);
    this.levelText.setLetterSpacing(0.5);

    // Progress bar (center top)
    const progressX = (GAME_WIDTH - this.progressWidth) / 2;
    this.progressBg = scene.add.graphics();
    this.progressBg.setDepth(100);
    this.progressBg.fillStyle(0x08141f, 0.82);
    this.progressBg.fillRect(progressX, 8, this.progressWidth, this.progressHeight);
    this.progressBg.lineStyle(1, this.progressBorderColor, 0.36);
    this.progressBg.strokeRect(progressX, 8, this.progressWidth, this.progressHeight);

    this.progressFill = scene.add.graphics();
    this.progressFill.setDepth(101);

    // Announcement text (center, for level name flash)
    this.announcementText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    // Boss health bar (hidden by default)
    this.bossBarBg = scene.add.graphics();
    this.bossBarBg.setDepth(100);
    this.bossBarBg.setVisible(false);

    this.bossBarFill = scene.add.graphics();
    this.bossBarFill.setDepth(101);
    this.bossBarFill.setVisible(false);

    this.bossNameText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'BOSS', {
      fontSize: '14px',
      color: '#ff8c8c',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#140406',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this.setScrollFactor(0);
  }

  showLevelAnnouncement(levelName: string, levelNumber: number): void {
    this.sectorText.setText(`SECTOR ${levelNumber.toString().padStart(2, '0')}`);
    this.levelText.setText(levelName);
    this.announcementText.setText(`SECTOR ${levelNumber}`);
    this.announcementText.setAlpha(1);

    this.scene.tweens.add({
      targets: this.announcementText,
      alpha: { from: 1, to: 0 },
      y: { from: GAME_HEIGHT / 2 - 60, to: GAME_HEIGHT / 2 - 100 },
      duration: 2000,
      delay: 1000,
      ease: 'Power2',
    });
  }

  updateShields(shields: number): void {
    if (this.currentShields === shields) {
      return;
    }

    this.clearShieldIcons();
    this.currentShields = shields;

    if (shields <= 0) return;

    for (let i = 0; i < shields; i++) {
      const icon = this.scene.add.graphics();
      icon.setDepth(100);
      icon.setScrollFactor(0);
      const ix = this.hpBarX + i * 20;
      const iy = this.hpBarY + this.hpBarHeight + 4;

      // Shield bubble icon
      icon.fillStyle(0x4488ff, 0.8);
      icon.fillCircle(ix + 8, iy + 8, 7);
      icon.lineStyle(1.5, 0x88ccff, 1);
      icon.strokeCircle(ix + 8, iy + 8, 7);
      icon.fillStyle(0xaaddff, 0.6);
      icon.fillCircle(ix + 6, iy + 6, 3);

      this.shieldIcons.push(icon);
    }
  }

  private clearShieldIcons(): void {
    for (const icon of this.shieldIcons) {
      icon.destroy();
    }
    this.shieldIcons = [];
  }

  private setScrollFactor(factor: number): void {
    this.topBarPanel.setScrollFactor(factor);
    this.hpBarBg.setScrollFactor(factor);
    this.hpBarFill.setScrollFactor(factor);
    this.hpLabel.setScrollFactor(factor);
    this.hpText.setScrollFactor(factor);
    this.livesLabel.setScrollFactor(factor);
    this.livesText.setScrollFactor(factor);
    this.scoreText.setScrollFactor(factor);
    this.sectorText.setScrollFactor(factor);
    this.levelText.setScrollFactor(factor);
    this.progressBg.setScrollFactor(factor);
    this.progressFill.setScrollFactor(factor);
    this.bossBarBg.setScrollFactor(factor);
    this.bossBarFill.setScrollFactor(factor);
    this.bossNameText.setScrollFactor(factor);
    this.announcementText.setScrollFactor(factor);
  }

  showBossBar(name: string = 'BOSS'): void {
    if (this.bossVisible) return;
    this.bossVisible = true;
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossNameText.setVisible(true);
    this.bossNameText.setText(name.toUpperCase());

    const bx = (GAME_WIDTH - this.bossBarWidth) / 2;
    const by = GAME_HEIGHT - 28;
    this.bossBarBg.clear();
    this.bossBarBg.fillStyle(0x442222, 0.8);
    this.bossBarBg.fillRect(bx, by, this.bossBarWidth, this.bossBarHeight);
    this.bossBarBg.lineStyle(1, 0x882222, 1);
    this.bossBarBg.strokeRect(bx, by, this.bossBarWidth, this.bossBarHeight);
  }

  hideBossBar(): void {
    this.bossVisible = false;
    this.currentBossHp = null;
    this.currentBossMaxHp = null;
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossNameText.setVisible(false);
  }

  updateBossHp(hp: number, maxHp: number): void {
    if (!this.bossVisible) return;

    if (this.currentBossHp === hp && this.currentBossMaxHp === maxHp) {
      return;
    }

    this.bossBarFill.clear();
    const ratio = hp / maxHp;
    const bx = (GAME_WIDTH - this.bossBarWidth) / 2;
    const by = GAME_HEIGHT - 28;
    const color = ratio > 0.5 ? 0xff4444 : ratio > 0.25 ? 0xff8800 : 0xffff00;
    this.bossBarFill.fillStyle(color, 1);
    this.bossBarFill.fillRect(bx + 1, by + 1, (this.bossBarWidth - 2) * ratio, this.bossBarHeight - 2);
    this.currentBossHp = hp;
    this.currentBossMaxHp = maxHp;
  }

  update(hp: number, maxHp: number, score: number, progress: number, lives: number): void {
    const progressX = (GAME_WIDTH - this.progressWidth) / 2;
    const progressStep = 1 / this.progressWidth;
    const hpChanged = this.currentHp !== hp || this.currentMaxHp !== maxHp;

    if (hpChanged) {
      this.hpBarFill.clear();
      const hpRatio = hp / maxHp;
      const hpColor = hpRatio > 0.5 ? 0x00ff44 : hpRatio > 0.25 ? 0xffaa00 : 0xff2222;
      this.hpBarFill.fillStyle(hpColor, 1);
      this.hpBarFill.fillRoundedRect(
        this.hpBarX + 24,
        this.hpBarY + 2,
        (this.hpBarWidth - 26) * hpRatio,
        this.hpBarHeight - 4,
        2
      );

      this.hpText.setText(`${hp}/${maxHp}`);
      this.currentHp = hp;
      this.currentMaxHp = maxHp;
    }

    if (this.currentLives !== lives) {
      this.livesText.setText(lives.toString());
      this.currentLives = lives;
    }

    if (this.currentScore !== score) {
      this.scoreText.setText(score.toString().padStart(8, '0'));
      this.currentScore = score;
    }

    const clampedProgress = Math.min(progress, 1);
    if (
      this.currentProgress === null ||
      Math.abs(clampedProgress - this.currentProgress) >= progressStep ||
      clampedProgress === 0 ||
      clampedProgress === 1
    ) {
      this.progressFill.clear();
      this.progressFill.fillStyle(this.progressFillColor, 0.95);
      this.progressFill.fillRect(progressX, 8, this.progressWidth * clampedProgress, this.progressHeight);
      this.currentProgress = clampedProgress;
    }
  }

  showBossWarning(): void {
    this.announcementText.setText('⚠ WARNING: BOSS INCOMING ⚠');
    this.announcementText.setColor('#ff4444');
    this.announcementText.setAlpha(1);
    this.announcementText.setY(GAME_HEIGHT / 2 - 60);

    this.scene.tweens.add({
      targets: this.announcementText,
      alpha: { from: 1, to: 0 },
      duration: 2500,
      ease: 'Power2',
    });
  }
}

function mixColor(baseColor: number, accentColor: number, weight: number): number {
  const clampedWeight = Phaser.Math.Clamp(weight, 0, 1);

  const baseR = (baseColor >> 16) & 0xff;
  const baseG = (baseColor >> 8) & 0xff;
  const baseB = baseColor & 0xff;

  const accentR = (accentColor >> 16) & 0xff;
  const accentG = (accentColor >> 8) & 0xff;
  const accentB = accentColor & 0xff;

  const r = Math.round(baseR + (accentR - baseR) * clampedWeight);
  const g = Math.round(baseG + (accentG - baseG) * clampedWeight);
  const b = Math.round(baseB + (accentB - baseB) * clampedWeight);

  return (r << 16) | (g << 8) | b;
}

function colorToHexString(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
