import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

export class HUD {
  private scene!: Phaser.Scene;
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private progressBg!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private bossBarBg!: Phaser.GameObjects.Graphics;
  private bossBarFill!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;

  private hpBarWidth = 200;
  private hpBarHeight = 16;
  private hpBarX = 16;
  private hpBarY = 16;
  private progressWidth = 300;
  private progressHeight = 6;
  private bossBarWidth = 400;
  private bossBarHeight = 10;
  private bossVisible: boolean = false;

  create(scene: Phaser.Scene): void {
    this.scene = scene;

    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.setDepth(100);
    this.hpBarBg.fillStyle(0x333333, 0.8);
    this.hpBarBg.fillRoundedRect(this.hpBarX, this.hpBarY, this.hpBarWidth, this.hpBarHeight, 3);

    this.hpBarFill = scene.add.graphics();
    this.hpBarFill.setDepth(101);

    this.scoreText = scene.add.text(GAME_WIDTH - 16, this.hpBarY, '0', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    this.scoreText.setOrigin(1, 0);
    this.scoreText.setDepth(100);

    const progressX = (GAME_WIDTH - this.progressWidth) / 2;
    this.progressBg = scene.add.graphics();
    this.progressBg.setDepth(100);
    this.progressBg.fillStyle(0x333333, 0.6);
    this.progressBg.fillRect(progressX, 8, this.progressWidth, this.progressHeight);

    this.progressFill = scene.add.graphics();
    this.progressFill.setDepth(101);

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

  private setScrollFactor(factor: number): void {
    this.hpBarBg.setScrollFactor(factor);
    this.hpBarFill.setScrollFactor(factor);
    this.scoreText.setScrollFactor(factor);
    this.progressBg.setScrollFactor(factor);
    this.progressFill.setScrollFactor(factor);
    this.bossBarBg.setScrollFactor(factor);
    this.bossBarFill.setScrollFactor(factor);
    this.bossNameText.setScrollFactor(factor);
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
      this.hpBarX + 2,
      this.hpBarY + 2,
      (this.hpBarWidth - 4) * hpRatio,
      this.hpBarHeight - 4,
      2
    );

    this.scoreText.setText(score.toString().padStart(8, '0'));

    this.progressFill.clear();
    const progressX = (GAME_WIDTH - this.progressWidth) / 2;
    this.progressFill.fillStyle(0x00ccff, 0.8);
    this.progressFill.fillRect(progressX, 8, this.progressWidth * Math.min(progress, 1), this.progressHeight);
  }
}
