import Phaser from 'phaser';
import { getTotalLevels, getLevelConfig } from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { audioManager } from '../systems/AudioManager';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { UI_FONT_MONO } from '../utils/uiFonts';
import { bindProceedOnInput } from './shared/bindProceedOnInput';
import { mountAccessibleActionLayer, type AccessibleActionLayerHandle } from './shared/accessibleActionLayer';
import { CONTINUE_PROMPT, createPromptText } from './shared/createPromptText';
import {
  addNeonTitle,
  drawNeonDivider,
  drawNeonFrame,
  fitNeonTitleFontSize,
  NEON,
  NEON_FONT,
  NEON_TEXT,
} from './shared/neonUiTheme';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class VictoryScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private teardownAccessibleActions?: AccessibleActionLayerHandle;

  constructor() {
    super({ key: 'Victory' });
  }

  create(): void {
    audioManager.init();
    audioManager.stopMusic();
    registerRestartOnResize(this);

    const layout = getViewportLayout(this);

    this.cameras.main.setBackgroundColor('#02081c');

    // Animated star background via parallax
    const bgConfig = getLevelConfig(10);
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, bgConfig);

    const { finalScore, totalLevels } = this.createSummaryPanel(layout);

    const continueToMenu = () => {
      audioManager.playClick();
      this.scene.start('Menu');
    };
    bindProceedOnInput(this, continueToMenu);
    this.teardownAccessibleActions = mountAccessibleActionLayer({
      label: 'Mission complete',
      summary: `All ${totalLevels} sectors cleared. Final score ${finalScore}.`,
      actions: [{ name: 'continue', label: 'Continue to command deck', activate: continueToMenu }],
    });

    // Play victory fanfare
    audioManager.playPowerUp();
    this.time.delayedCall(400, () => audioManager.playPowerUp());
    this.time.delayedCall(800, () => audioManager.playPowerUp());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.teardownAccessibleActions?.();
      this.teardownAccessibleActions = undefined;
      this.parallax.destroy();
    });
  }

  /** Frame, title and run summary. Returns the numbers the accessible summary repeats. */
  private createSummaryPanel(layout: ReturnType<typeof getViewportLayout>): {
    finalScore: number;
    totalLevels: number;
  } {
    // Every line is placed from the frame's top edge and fitted to its width, so nothing spills
    // past the frame on a 390 px phone or collides with the divider ornaments.
    const frameWidth = Math.min(620, layout.width - 32);
    const frameHeight = 360;
    const frameX = layout.centerX - frameWidth / 2;
    const frameY = layout.centerY - frameHeight / 2;
    const contentWidth = frameWidth - 40;
    const fitWidth = (text: Phaser.GameObjects.Text): void => {
      text.setScale(Math.min(1, contentWidth / Math.max(1, text.width)));
    };

    const frame = this.add.graphics();
    frame.setDepth(10);
    drawNeonFrame(frame, frameX, frameY, frameWidth, frameHeight, {
      accentColor: NEON.amber,
      fillAlpha: 0.6,
      strokeAlpha: 0.75,
      cornerCut: 24,
      glow: true,
    });
    drawNeonDivider(frame, layout.centerX, frameY + 22, frameWidth - 150, NEON.amber);
    drawNeonDivider(frame, layout.centerX, frameY + frameHeight - 22, frameWidth - 150, NEON.teal);

    this.add
      .text(layout.centerX, frameY + 48, 'COMMAND DECK', {
        fontSize: '12px',
        color: NEON_TEXT.cyan,
        fontFamily: NEON_FONT.mono,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);

    const titleSize = fitNeonTitleFontSize(this, 'MISSION COMPLETE', 44, contentWidth);
    addNeonTitle(this, layout.centerX, frameY + 92, 'MISSION COMPLETE', titleSize, 11, {
      glow: '#ffb84a',
      base: '#ffe2a6',
    });

    fitWidth(
      this.add
        .text(layout.centerX, frameY + 144, 'ALL SECTORS CLEARED', {
          fontSize: '20px',
          color: '#58f0d8',
          fontFamily: UI_FONT_MONO,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(12)
    );

    const finalScore = getRunSummary(this.registry).finalScore;
    fitWidth(
      this.add
        .text(layout.centerX, frameY + 192, `FINAL SCORE: ${finalScore}`, {
          fontSize: '28px',
          color: NEON_TEXT.primary,
          fontFamily: UI_FONT_MONO,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(12)
    );

    const totalLevels = getTotalLevels();
    this.add
      .text(layout.centerX, frameY + 232, `${totalLevels}/${totalLevels} LEVELS COMPLETED`, {
        fontSize: '15px',
        color: NEON_TEXT.muted,
        fontFamily: UI_FONT_MONO,
      })
      .setOrigin(0.5)
      .setDepth(12);

    const prompt = createPromptText(this, layout.centerX, frameY + 292, CONTINUE_PROMPT, {
      color: '#dce8ff',
      fontSize: frameWidth < 420 ? '18px' : '22px',
    });
    prompt.setDepth(12);
    fitWidth(prompt);

    return { finalScore, totalLevels };
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }
}
