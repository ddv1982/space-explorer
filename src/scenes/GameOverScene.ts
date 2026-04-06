import Phaser from 'phaser';
import { audioManager } from '../systems/AudioManager';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { createPromptText } from './shared/createPromptText';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    audioManager.stopMusic();

    const layout = getViewportLayout(this);

    this.cameras.main.setBackgroundColor('#110000');

    this.add.text(layout.centerX, layout.centerY - 80, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff0000',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const runSummary = getRunSummary(this.registry);
    const finalScore = runSummary.finalScore;
    this.add.text(layout.centerX, layout.centerY, `SCORE: ${finalScore}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const levelReached = runSummary.levelReached;
    this.add.text(layout.centerX, layout.centerY + 45, `REACHED LEVEL ${levelReached}`, {
      fontSize: '20px',
      color: '#ff8844',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    createPromptText(this, layout.centerX, layout.centerY + 110, 'Click to Restart', {
      color: '#ffd0d0',
    });

    this.input.once('pointerdown', () => {
      audioManager.playClick();
      this.scene.start('Menu');
    });
  }
}
