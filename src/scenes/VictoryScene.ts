import Phaser from 'phaser';
import { getTotalLevels, getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { audioManager } from '../systems/AudioManager';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { CONTINUE_PROMPT, createPromptText } from './shared/createPromptText';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class VictoryScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;

  constructor() {
    super({ key: 'Victory' });
  }

  create(): void {
    audioManager.init();
    audioManager.stopMusic();
    registerRestartOnResize(this);

    const layout = getViewportLayout(this);

    this.cameras.main.setBackgroundColor('#000822');

    // Animated star background via parallax
    const bgConfig = getLevelConfig(10);
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, bgConfig);

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

    createPromptText(this, layout.centerX, layout.centerY + 130, CONTINUE_PROMPT, {
      color: '#dce8ff',
    });

    bindProceedOnInput(this, () => {
      audioManager.playClick();
      this.scene.start('Menu');
    });

    // Play victory fanfare
    audioManager.playPowerUp();
    this.time.delayedCall(400, () => audioManager.playPowerUp());
    this.time.delayedCall(800, () => audioManager.playPowerUp());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.parallax.destroy());
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }
}
