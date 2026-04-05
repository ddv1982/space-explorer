import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

export class HUD {
  private scene!: Phaser.Scene;
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private hpLabel!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private scoreLabel!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
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
  private currentShields: number = 0;

  create(scene: Phaser.Scene): void {
    this.scene = scene;

    // HP label and bar
    this.hpLabel = scene.add.text(this.hpBarX, this.hpBarY - 2, 'HP', {
      fontSize: '11px',
      color: '#88aacc',
      fontFamily: 'monospace',
    }).setDepth(100);

    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.setDepth(100);
    this.hpBarBg.fillStyle(0x333333, 0.8);
    this.hpBarBg.fillRoundedRect(this.hpBarX + 22, this.hpBarY, this.hpBarWidth - 22, this.hpBarHeight, 3);

    this.hpBarFill = scene.add.graphics();
    this.hpBarFill.setDepth(101);

    // HP text (e.g. "5/5")
    this.hpText = scene.add.text(this.hpBarX + this.hpBarWidth + 6, this.hpBarY, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setDepth(100);

    // Score label and text
    this.scoreLabel = scene.add.text(GAME_WIDTH - 100, this.hpBarY - 2, 'SCORE', {
      fontSize: '11px',
      color: '#88aacc',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(100);

    this.scoreText = scene.add.text(GAME_WIDTH - 16, this.hpBarY, '0', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    this.scoreText.setOrigin(1, 0);
    this.scoreText.setDepth(100);

    // Level name text (below score, top-right area)
    this.levelText = scene.add.text(GAME_WIDTH - 16, this.hpBarY + 24, '', {
      fontSize: '12px',
      color: '#667788',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(100);

    // Progress bar (center top)
    const progressX = (GAME_WIDTH - this.progressWidth) / 2;
    this.progressBg = scene.add.graphics();
    this.progressBg.setDepth(100);
    this.progressBg.fillStyle(0x333333, 0.6);
    this.progressBg.fillRect(progressX, 8, this.progressWidth, this.progressHeight);

    this.progressFill = scene.add.graphics();
    this.progressFill.setDepth(101);

    // Announcement text (center, for level name flash)
    this.announcementText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
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
      color: '#ff4444',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this.setScrollFactor(0);
  }

  showLevelAnnouncement(levelName: string, levelNumber: number): void {
    this.levelText.setText(`SECTOR ${levelNumber} - ${levelName}`);
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
    // Remove old icons
    for (const icon of this.shieldIcons) {
      icon.destroy();
    }
    this.shieldIcons = [];
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

  private setScrollFactor(factor: number): void {
    this.hpBarBg.setScrollFactor(factor);
    this.hpBarFill.setScrollFactor(factor);
    this.hpLabel.setScrollFactor(factor);
    this.hpText.setScrollFactor(factor);
    this.scoreLabel.setScrollFactor(factor);
    this.scoreText.setScrollFactor(factor);
    this.levelText.setScrollFactor(factor);
    this.progressBg.setScrollFactor(factor);
    this.progressFill.setScrollFactor(factor);
    this.bossBarBg.setScrollFactor(factor);
    this.bossBarFill.setScrollFactor(factor);
    this.bossNameText.setScrollFactor(factor);
    this.announcementText.setScrollFactor(factor);
  }

  showBossBar(): void {
    if (this.bossVisible) return;
    this.bossVisible = true;
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossNameText.setVisible(true);

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
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossNameText.setVisible(false);
  }

  updateBossHp(hp: number, maxHp: number): void {
    if (!this.bossVisible) return;
    this.bossBarFill.clear();
    const ratio = hp / maxHp;
    const bx = (GAME_WIDTH - this.bossBarWidth) / 2;
    const by = GAME_HEIGHT - 28;
    const color = ratio > 0.5 ? 0xff4444 : ratio > 0.25 ? 0xff8800 : 0xffff00;
    this.bossBarFill.fillStyle(color, 1);
    this.bossBarFill.fillRect(bx + 1, by + 1, (this.bossBarWidth - 2) * ratio, this.bossBarHeight - 2);
  }

  update(hp: number, maxHp: number, score: number, progress: number): void {
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
    this.scoreText.setText(score.toString().padStart(8, '0'));

    this.progressFill.clear();
    const progressX = (GAME_WIDTH - this.progressWidth) / 2;
    this.progressFill.fillStyle(0x00ccff, 0.8);
    this.progressFill.fillRect(progressX, 8, this.progressWidth * Math.min(progress, 1), this.progressHeight);
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
