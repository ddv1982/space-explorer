import Phaser from 'phaser';
import { getTotalLevels } from '../config/LevelsConfig';
import { audioManager } from '../systems/AudioManager';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Victory' });
  }

  create(): void {
    audioManager.init();
    audioManager.stopMusic();

    const layout = getViewportLayout(this);

    this.cameras.main.setBackgroundColor('#000822');

    // Animated star background
    this.createStarBackground();

    // Victory text with glow effect
    this.add.text(layout.centerX, layout.centerY - 120, 'MISSION COMPLETE', {
      fontSize: '52px',
      color: '#ffcc00',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(layout.centerX, layout.centerY - 60, 'ALL SECTORS CLEARED', {
      fontSize: '24px',
      color: '#44ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const finalScore = getRunSummary(this.registry).finalScore;
    this.add.text(layout.centerX, layout.centerY, `FINAL SCORE: ${finalScore}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const totalLevels = getTotalLevels();
    this.add.text(layout.centerX, layout.centerY + 50, `${totalLevels}/${totalLevels} LEVELS COMPLETED`, {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Pulsing continue text
    const continueText = this.add.text(layout.centerX, layout.centerY + 130, 'Click to Play Again', {
      fontSize: '24px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: continueText,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      audioManager.playClick();
      this.scene.start('Menu');
    });

    // Play victory fanfare
    audioManager.playPowerUp();
    this.time.delayedCall(400, () => audioManager.playPowerUp());
    this.time.delayedCall(800, () => audioManager.playPowerUp());
  }

  private createStarBackground(): void {
    const layout = getViewportLayout(this);
    const g = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(layout.left, layout.right);
      const y = Phaser.Math.Between(layout.top, layout.bottom);
      const size = Math.random() * 2;
      const alpha = Math.random() * 0.8 + 0.2;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(x, y, size);
    }
    g.setDepth(-10);
  }
}
