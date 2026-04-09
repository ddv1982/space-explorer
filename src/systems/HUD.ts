import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';
import { colorToHexString, mixColor } from '../utils/colorUtils';
import { getViewportBounds } from '../utils/layout';

interface HudLayoutMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  topBarRight: number;
  topBarWidth: number;
  hpBarX: number;
  hpBarY: number;
  hpBarWidth: number;
  progressX: number;
  progressY: number;
  progressWidth: number;
  bossBarX: number;
  bossBarY: number;
  bossBarWidth: number;
  bossNameY: number;
  announcementY: number;
  announcementExitY: number;
}

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
  private announcementTween: Phaser.Tweens.Tween | null = null;

  private readonly baseHpBarWidth = 200;
  private readonly hpBarHeight = 16;
  private readonly baseProgressWidth = 300;
  private readonly progressHeight = 6;
  private readonly baseBossBarWidth = 400;
  private readonly bossBarHeight = 10;
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
    this.currentShields = null;
    this.currentHp = null;
    this.currentMaxHp = null;
    this.currentLives = null;
    this.currentScore = null;
    this.currentProgress = null;
    this.currentBossHp = null;
    this.currentBossMaxHp = null;
    this.bossVisible = false;
    this.announcementTween = null;

    const accentColor = levelConfig?.accentColor ?? 0x54dcff;
    const labelColor = colorToHexString(mixColor(0xd8f4ff, accentColor, 0.28));
    const sectorColor = colorToHexString(mixColor(0x7fdcff, accentColor, 0.62));
    this.panelStrokeColor = mixColor(0x334466, accentColor, 0.42);
    this.hpBorderColor = mixColor(0x8ee8ff, accentColor, 0.48);
    this.progressBorderColor = mixColor(0x7fdcff, accentColor, 0.72);
    this.progressFillColor = mixColor(0x54dcff, accentColor, 0.86);

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

    this.topBarPanel = scene.add.graphics().setDepth(99);
    this.hpBarBg = scene.add.graphics().setDepth(100);
    this.hpBarFill = scene.add.graphics().setDepth(101);
    this.hpLabel = scene.add.text(0, 0, 'HP', labelStyle).setDepth(100);
    this.hpText = scene.add.text(0, 0, '', valueStyle).setDepth(100);
    this.livesLabel = scene.add.text(0, 0, 'LIVES', labelStyle).setDepth(100);
    this.livesText = scene.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    }).setDepth(100);

    this.scoreText = scene.add.text(0, 0, '0', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(100);
    this.scoreText.setLetterSpacing(1.5);

    this.sectorText = scene.add.text(0, 0, '', {
      fontSize: '10px',
      color: sectorColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(100);
    this.sectorText.setLetterSpacing(1.5);

    this.levelText = scene.add.text(0, 0, '', {
      fontSize: '13px',
      color: '#eefaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(100);
    this.levelText.setLetterSpacing(0.5);

    this.progressBg = scene.add.graphics().setDepth(100);
    this.progressFill = scene.add.graphics().setDepth(101);
    this.announcementText = scene.add.text(0, 0, '', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    this.bossBarBg = scene.add.graphics().setDepth(100).setVisible(false);
    this.bossBarFill = scene.add.graphics().setDepth(101).setVisible(false);
    this.bossNameText = scene.add.text(0, 0, 'BOSS', {
      fontSize: '14px',
      color: '#ff8c8c',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#140406',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this.setScrollFactor(0);
    this.relayout();
  }

  relayout(): void {
    if (!this.scene) {
      return;
    }

    const layout = this.getLayoutMetrics();

    this.topBarPanel.clear();
    this.topBarPanel.fillStyle(0x030915, 0.58);
    this.topBarPanel.fillRoundedRect(layout.left + 10, layout.top + 6, layout.topBarWidth, 60, 10);
    this.topBarPanel.lineStyle(1, this.panelStrokeColor, 0.34);
    this.topBarPanel.strokeRoundedRect(layout.left + 10, layout.top + 6, layout.topBarWidth, 60, 10);

    this.hpLabel.setPosition(layout.hpBarX, layout.hpBarY - 2);

    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x091521, 0.92);
    this.hpBarBg.fillRoundedRect(layout.hpBarX + 22, layout.hpBarY, layout.hpBarWidth - 22, this.hpBarHeight, 3);
    this.hpBarBg.lineStyle(1, this.hpBorderColor, 0.35);
    this.hpBarBg.strokeRoundedRect(layout.hpBarX + 22, layout.hpBarY, layout.hpBarWidth - 22, this.hpBarHeight, 3);

    this.hpText.setPosition(layout.hpBarX + layout.hpBarWidth + 6, layout.hpBarY);
    this.livesLabel.setPosition(layout.hpBarX + layout.hpBarWidth + 6, layout.hpBarY + 24);
    this.livesText.setPosition(layout.hpBarX + layout.hpBarWidth + 48, layout.hpBarY + 22);

    this.scoreText.setPosition(layout.topBarRight, layout.hpBarY - 3);
    this.sectorText.setPosition(layout.topBarRight, layout.hpBarY + 18);
    this.levelText.setPosition(layout.topBarRight, layout.hpBarY + 30);

    this.progressBg.clear();
    this.progressBg.fillStyle(0x08141f, 0.82);
    this.progressBg.fillRect(layout.progressX, layout.progressY, layout.progressWidth, this.progressHeight);
    this.progressBg.lineStyle(1, this.progressBorderColor, 0.36);
    this.progressBg.strokeRect(layout.progressX, layout.progressY, layout.progressWidth, this.progressHeight);

    this.announcementText.setPosition(layout.centerX, layout.announcementY);
    if (this.announcementTween && this.announcementText.alpha > 0) {
      this.announcementTween.stop();
      this.announcementTween = this.scene.tweens.add({
        targets: this.announcementText,
        alpha: { from: this.announcementText.alpha, to: 0 },
        duration: 900,
        ease: 'Power2',
        onComplete: () => {
          this.announcementTween = null;
        },
      });
    }

    this.bossNameText.setPosition(layout.centerX, layout.bossNameY);

    this.renderHpBar();
    this.renderProgressBar();
    this.renderShieldIcons();
    this.renderBossBar();
  }

  showLevelAnnouncement(levelName: string, levelNumber: number): void {
    const layout = this.getLayoutMetrics();

    this.sectorText.setText(`SECTOR ${levelNumber.toString().padStart(2, '0')}`);
    this.levelText.setText(levelName);
    this.announcementText.setText(`SECTOR ${levelNumber}`);
    this.announcementText.setColor('#ffffff');
    this.announcementText.setAlpha(1);
    this.announcementText.setPosition(layout.centerX, layout.announcementY);
    this.announcementTween?.stop();

    this.announcementTween = this.scene.tweens.add({
      targets: this.announcementText,
      alpha: { from: 1, to: 0 },
      y: { from: layout.announcementY, to: layout.announcementExitY },
      duration: 2000,
      delay: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.announcementTween = null;
      },
    });
  }

  updateShields(shields: number): void {
    if (this.currentShields === shields) {
      return;
    }

    this.currentShields = shields;
    this.renderShieldIcons();
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
    this.renderBossBar();
  }

  hideBossBar(): void {
    this.bossVisible = false;
    this.currentBossHp = null;
    this.currentBossMaxHp = null;
    this.bossBarBg.clear();
    this.bossBarFill.clear();
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossNameText.setVisible(false);
  }

  updateBossHp(hp: number, maxHp: number): void {
    if (!this.bossVisible) return;

    if (this.currentBossHp === hp && this.currentBossMaxHp === maxHp) {
      return;
    }

    this.currentBossHp = hp;
    this.currentBossMaxHp = maxHp;
    this.renderBossBar();
  }

  update(hp: number, maxHp: number, score: number, progress: number, lives: number): void {
    const hpChanged = this.currentHp !== hp || this.currentMaxHp !== maxHp;

    if (hpChanged) {
      this.currentHp = hp;
      this.currentMaxHp = maxHp;
      this.hpText.setText(`${hp}/${maxHp}`);
      this.renderHpBar();
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
    const progressStep = 1 / this.getLayoutMetrics().progressWidth;
    if (
      this.currentProgress === null ||
      Math.abs(clampedProgress - this.currentProgress) >= progressStep ||
      clampedProgress === 0 ||
      clampedProgress === 1
    ) {
      this.currentProgress = clampedProgress;
      this.renderProgressBar();
    }
  }

  showBossWarning(): void {
    const layout = this.getLayoutMetrics();

    this.announcementText.setText('⚠ WARNING: BOSS INCOMING ⚠');
    this.announcementText.setColor('#ff4444');
    this.announcementText.setAlpha(1);
    this.announcementText.setPosition(layout.centerX, layout.announcementY);
    this.announcementTween?.stop();

    this.announcementTween = this.scene.tweens.add({
      targets: this.announcementText,
      alpha: { from: 1, to: 0 },
      duration: 2500,
      ease: 'Power2',
      onComplete: () => {
        this.announcementTween = null;
      },
    });
  }

  showBossPhaseAnnouncement(phase: number): void {
    const layout = this.getLayoutMetrics();

    this.announcementText.setText(`⚠ BOSS PHASE ${phase} ⚠`);
    this.announcementText.setColor('#ffcc44');
    this.announcementText.setAlpha(1);
    this.announcementText.setPosition(layout.centerX, layout.announcementY - 8);
    this.announcementTween?.stop();

    this.announcementTween = this.scene.tweens.add({
      targets: this.announcementText,
      alpha: { from: 1, to: 0 },
      y: { from: layout.announcementY - 8, to: layout.announcementY - 34 },
      duration: 1400,
      ease: 'Power2',
      onComplete: () => {
        this.announcementTween = null;
      },
    });
  }

  private getLayoutMetrics(): HudLayoutMetrics {
    const viewport = getViewportBounds(this.scene);
    const hpBarWidth = Math.round(Phaser.Math.Clamp(viewport.width * 0.22, 150, this.baseHpBarWidth));
    const progressWidth = Math.round(Phaser.Math.Clamp(viewport.width * 0.24, 160, this.baseProgressWidth));
    const bossBarWidth = Math.round(Phaser.Math.Clamp(viewport.width - 80, 220, this.baseBossBarWidth));

    return {
      ...viewport,
      topBarRight: viewport.right - 16,
      topBarWidth: Math.max(0, viewport.width - 20),
      hpBarX: viewport.left + 16,
      hpBarY: viewport.top + 16,
      hpBarWidth,
      progressX: viewport.left + (viewport.width - progressWidth) / 2,
      progressY: viewport.top + 8,
      progressWidth,
      bossBarX: viewport.left + (viewport.width - bossBarWidth) / 2,
      bossBarY: viewport.bottom - 28,
      bossBarWidth,
      bossNameY: viewport.bottom - 40,
      announcementY: viewport.centerY - 60,
      announcementExitY: viewport.centerY - 100,
    };
  }

  private renderHpBar(): void {
    const layout = this.getLayoutMetrics();

    this.hpBarFill.clear();

    if (this.currentHp === null || this.currentMaxHp === null || this.currentMaxHp <= 0) {
      return;
    }

    const hpRatio = this.currentHp / this.currentMaxHp;
    const barWidth = (layout.hpBarWidth - 26) * hpRatio;
    const barX = layout.hpBarX + 24;
    const barY = layout.hpBarY + 2;
    const barH = this.hpBarHeight - 4;

    // Gradient HP bar: multi-stop fill for depth
    const hpColor = hpRatio > 0.5 ? 0x00ff44 : hpRatio > 0.25 ? 0xffaa00 : 0xff2222;
    const hpHighlight = hpRatio > 0.5 ? 0x66ff88 : hpRatio > 0.25 ? 0xffcc44 : 0xff6666;
    const hpDark = hpRatio > 0.5 ? 0x00aa22 : hpRatio > 0.25 ? 0xaa7700 : 0xaa1111;

    // Dark base
    this.hpBarFill.fillStyle(hpDark, 1);
    this.hpBarFill.fillRoundedRect(barX, barY, barWidth, barH, 2);

    // Main color (upper portion)
    this.hpBarFill.fillStyle(hpColor, 1);
    this.hpBarFill.fillRoundedRect(barX, barY, barWidth, barH * 0.65, 2);

    // Highlight strip (top edge)
    this.hpBarFill.fillStyle(hpHighlight, 0.6);
    this.hpBarFill.fillRect(barX + 2, barY + 1, Math.max(0, barWidth - 4), 2);

    // Shine line (horizontal gloss)
    this.hpBarFill.fillStyle(0xffffff, 0.12);
    this.hpBarFill.fillRect(barX + 2, barY + barH * 0.3, Math.max(0, barWidth - 4), 1);
  }

  private renderProgressBar(): void {
    const layout = this.getLayoutMetrics();

    this.progressFill.clear();

    if (this.currentProgress === null) {
      return;
    }

    const fillWidth = layout.progressWidth * this.currentProgress;

    // Dark base
    const darkFill = mixColor(this.progressFillColor, 0x000000, 0.3);
    this.progressFill.fillStyle(darkFill, 0.95);
    this.progressFill.fillRect(layout.progressX, layout.progressY, fillWidth, this.progressHeight);

    // Main color (upper portion)
    this.progressFill.fillStyle(this.progressFillColor, 0.95);
    this.progressFill.fillRect(layout.progressX, layout.progressY, fillWidth, this.progressHeight * 0.6);

    // Highlight strip at top
    const highlightColor = mixColor(this.progressFillColor, 0xffffff, 0.4);
    this.progressFill.fillStyle(highlightColor, 0.5);
    this.progressFill.fillRect(layout.progressX + 1, layout.progressY, Math.max(0, fillWidth - 2), 1);

    // Pulse glow at the leading edge
    if (fillWidth > 4) {
      this.progressFill.fillStyle(0xffffff, 0.3);
      this.progressFill.fillRect(layout.progressX + fillWidth - 3, layout.progressY, 3, this.progressHeight);
    }
  }

  private renderShieldIcons(): void {
    this.clearShieldIcons();

    if (!this.scene || !this.currentShields || this.currentShields <= 0) {
      return;
    }

    const layout = this.getLayoutMetrics();

    for (let i = 0; i < this.currentShields; i++) {
      const icon = this.scene.add.graphics();
      icon.setDepth(100).setScrollFactor(0);

      const ix = layout.hpBarX + i * 20;
      const iy = layout.hpBarY + this.hpBarHeight + 4;

      // Outer glow
      icon.fillStyle(0x4488ff, 0.3);
      icon.fillCircle(ix + 8, iy + 8, 9);

      // Main shield body
      icon.fillStyle(0x4488ff, 0.8);
      icon.beginPath();
      icon.moveTo(ix + 8, iy + 1);
      icon.lineTo(ix + 14, iy + 4);
      icon.lineTo(ix + 14, iy + 10);
      icon.lineTo(ix + 8, iy + 16);
      icon.lineTo(ix + 2, iy + 10);
      icon.lineTo(ix + 2, iy + 4);
      icon.closePath();
      icon.fillPath();

      // Inner highlight
      icon.fillStyle(0x88ccff, 0.5);
      icon.beginPath();
      icon.moveTo(ix + 8, iy + 3);
      icon.lineTo(ix + 12, iy + 5);
      icon.lineTo(ix + 12, iy + 9);
      icon.lineTo(ix + 8, iy + 13);
      icon.lineTo(ix + 5, iy + 9);
      icon.lineTo(ix + 5, iy + 5);
      icon.closePath();
      icon.fillPath();

      // Bright center
      icon.fillStyle(0xaaddff, 0.6);
      icon.fillCircle(ix + 8, iy + 8, 3);

      // Border ring
      icon.lineStyle(1, 0x88ccff, 0.6);
      icon.beginPath();
      icon.moveTo(ix + 8, iy + 1);
      icon.lineTo(ix + 14, iy + 4);
      icon.lineTo(ix + 14, iy + 10);
      icon.lineTo(ix + 8, iy + 16);
      icon.lineTo(ix + 2, iy + 10);
      icon.lineTo(ix + 2, iy + 4);
      icon.closePath();
      icon.strokePath();

      this.shieldIcons.push(icon);
    }
  }

  private renderBossBar(): void {
    this.bossBarBg.clear();
    this.bossBarFill.clear();

    if (!this.bossVisible) {
      return;
    }

    const layout = this.getLayoutMetrics();
    this.bossBarBg.fillStyle(0x442222, 0.8);
    this.bossBarBg.fillRect(layout.bossBarX, layout.bossBarY, layout.bossBarWidth, this.bossBarHeight);
    this.bossBarBg.lineStyle(1, 0x882222, 1);
    this.bossBarBg.strokeRect(layout.bossBarX, layout.bossBarY, layout.bossBarWidth, this.bossBarHeight);

    if (this.currentBossHp === null || this.currentBossMaxHp === null || this.currentBossMaxHp <= 0) {
      return;
    }

    const ratio = this.currentBossHp / this.currentBossMaxHp;
    const color = ratio > 0.5 ? 0xff4444 : ratio > 0.25 ? 0xff8800 : 0xffff00;
    const darkColor = ratio > 0.5 ? 0xaa2222 : ratio > 0.25 ? 0xaa5500 : 0xaaaa00;
    const fillWidth = (layout.bossBarWidth - 2) * ratio;

    // Dark base
    this.bossBarFill.fillStyle(darkColor, 1);
    this.bossBarFill.fillRect(layout.bossBarX + 1, layout.bossBarY + 1, fillWidth, this.bossBarHeight - 2);

    // Main color upper portion
    this.bossBarFill.fillStyle(color, 1);
    this.bossBarFill.fillRect(layout.bossBarX + 1, layout.bossBarY + 1, fillWidth, (this.bossBarHeight - 2) * 0.6);

    // Highlight strip
    const highlightColor = ratio > 0.5 ? 0xff8888 : ratio > 0.25 ? 0xffaa44 : 0xffff66;
    this.bossBarFill.fillStyle(highlightColor, 0.5);
    this.bossBarFill.fillRect(layout.bossBarX + 2, layout.bossBarY + 1, Math.max(0, fillWidth - 2), 1);

    // Leading edge pulse
    if (fillWidth > 4) {
      this.bossBarFill.fillStyle(0xffffff, 0.25);
      this.bossBarFill.fillRect(layout.bossBarX + 1 + fillWidth - 3, layout.bossBarY + 1, 3, this.bossBarHeight - 2);
    }
  }
}
