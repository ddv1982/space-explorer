import Phaser from 'phaser';
import { audioManager } from '../systems/AudioManager';
import { getRunSummary } from '../systems/PlayerState';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    audioManager.stopMusic();

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.cameras.main.setBackgroundColor('#110000');

    this.add.text(centerX, centerY - 80, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff0000',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const runSummary = getRunSummary(this.registry);
    const finalScore = runSummary.finalScore;
    this.add.text(centerX, centerY, `SCORE: ${finalScore}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const levelReached = runSummary.levelReached;
    this.add.text(centerX, centerY + 45, `REACHED LEVEL ${levelReached}`, {
      fontSize: '20px',
      color: '#ff8844',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 110, 'Click to Restart', {
      fontSize: '24px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      audioManager.playClick();
      this.scene.start('Menu');
    });
  }
}
