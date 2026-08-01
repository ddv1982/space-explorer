import Phaser from 'phaser';
import { audioManager } from '../systems/AudioManager';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { UI_FONT_MONO } from '../utils/uiFonts';
import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { CONTINUE_PROMPT, createPromptText } from './shared/createPromptText';
import { addNeonTitle, drawNeonDivider, drawNeonFrame, NEON, NEON_TEXT } from './shared/neonUiTheme';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    audioManager.stopMusic();
    registerRestartOnResize(this);

    const layout = getViewportLayout(this);

    this.cameras.main.setBackgroundColor('#0a0308');

    const frameWidth = Math.min(560, layout.width - 48);
    const frameHeight = 300;
    const frameX = layout.centerX - frameWidth / 2;
    const frameY = layout.centerY - frameHeight / 2;

    const frame = this.add.graphics();
    drawNeonFrame(frame, frameX, frameY, frameWidth, frameHeight, {
      accentColor: NEON.red,
      fillAlpha: 0.55,
      strokeAlpha: 0.7,
      cornerCut: 22,
      glow: true,
    });
    drawNeonDivider(frame, layout.centerX, frameY + 30, frameWidth - 140, NEON.red);
    drawNeonDivider(frame, layout.centerX, frameY + frameHeight - 30, frameWidth - 140, NEON.red);

    addNeonTitle(this, layout.centerX, layout.centerY - 92, 'GAME OVER', 56, 11, {
      glowDark: '#8c1f28',
      glowMid: '#d93843',
      glowBright: '#ff756f',
    });

    const runSummary = getRunSummary(this.registry);
    this.add.text(layout.centerX, layout.centerY - 6, `SCORE: ${runSummary.finalScore}`, {
      fontSize: '30px',
      color: NEON_TEXT.primary,
      fontFamily: UI_FONT_MONO,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(12);

    this.add.text(layout.centerX, layout.centerY + 40, `REACHED LEVEL ${runSummary.levelReached}`, {
      fontSize: '17px',
      color: NEON_TEXT.danger,
      fontFamily: UI_FONT_MONO,
    }).setOrigin(0.5).setDepth(12);

    createPromptText(this, layout.centerX, layout.centerY + 96, CONTINUE_PROMPT, {
      color: '#ffd0d0',
    });

    bindProceedOnInput(this, () => {
      audioManager.playClick();
      this.scene.start('Menu');
    });
  }
}
