import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { audioManager } from '../systems/AudioManager';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { UI_FONT_MONO } from '../utils/uiFonts';
import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { mountAccessibleActionLayer, type AccessibleActionLayerHandle } from './shared/accessibleActionLayer';
import { CONTINUE_PROMPT, createPromptText } from './shared/createPromptText';
import { addNeonTitle, drawNeonDivider, drawNeonFrame, NEON, NEON_FONT, NEON_TEXT } from './shared/neonUiTheme';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class GameOverScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private teardownAccessibleActions?: AccessibleActionLayerHandle;

  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    audioManager.stopMusic();
    registerRestartOnResize(this);

    const layout = getViewportLayout(this);
    const runSummary = getRunSummary(this.registry);

    this.cameras.main.setBackgroundColor('#0a0308');
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, getLevelConfig(runSummary.levelReached));

    const telemetry = this.add.graphics().setDepth(0);
    telemetry.fillStyle(0x120109, 0.48);
    telemetry.fillRect(layout.left, layout.top, layout.width, layout.height);
    telemetry.lineStyle(1, NEON.red, 0.06);
    for (let y = layout.top + 28; y < layout.bottom; y += 54) {
      telemetry.lineBetween(layout.left, y, layout.right, y);
    }
    telemetry.lineStyle(2, NEON.red, 0.13);
    telemetry.strokeCircle(layout.centerX, layout.centerY, Math.min(layout.width, layout.height) * 0.31);
    telemetry.lineStyle(1, NEON.red, 0.09);
    telemetry.strokeCircle(layout.centerX, layout.centerY, Math.min(layout.width, layout.height) * 0.38);

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

    this.add
      .text(layout.centerX, layout.centerY - 124, 'COMMAND LOSS', {
        fontSize: '12px',
        color: NEON_TEXT.danger,
        fontFamily: NEON_FONT.mono,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);

    addNeonTitle(this, layout.centerX, layout.centerY - 92, 'GAME OVER', 56, 11, {
      glowDark: '#8c1f28',
      glowMid: '#d93843',
      glowBright: '#ff756f',
    });

    this.add
      .text(layout.centerX, layout.centerY - 6, `SCORE: ${runSummary.finalScore}`, {
        fontSize: '30px',
        color: NEON_TEXT.primary,
        fontFamily: UI_FONT_MONO,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.add
      .text(layout.centerX, layout.centerY + 40, `REACHED LEVEL ${runSummary.levelReached}`, {
        fontSize: '17px',
        color: NEON_TEXT.danger,
        fontFamily: UI_FONT_MONO,
      })
      .setOrigin(0.5)
      .setDepth(12);

    createPromptText(this, layout.centerX, layout.centerY + 96, CONTINUE_PROMPT, {
      color: '#ffd0d0',
    });

    const continueToMenu = () => {
      audioManager.playClick();
      this.scene.start('Menu');
    };
    bindProceedOnInput(this, continueToMenu);
    this.teardownAccessibleActions = mountAccessibleActionLayer({
      label: 'Game over',
      summary: `Final score ${runSummary.finalScore}. Reached level ${runSummary.levelReached}.`,
      actions: [{ name: 'continue', label: 'Continue to command deck', activate: continueToMenu }],
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.teardownAccessibleActions?.();
      this.teardownAccessibleActions = undefined;
      this.parallax.destroy();
    });
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta * 0.45);
  }
}
