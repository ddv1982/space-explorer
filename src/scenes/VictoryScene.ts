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
import { addNeonTitle, drawNeonDivider, drawNeonFrame, NEON, NEON_FONT, NEON_TEXT } from './shared/neonUiTheme';
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

    const frameWidth = Math.min(620, layout.width - 48);
    const frameHeight = 340;
    const frameX = layout.centerX - frameWidth / 2;
    const frameY = layout.centerY - frameHeight / 2;

    const frame = this.add.graphics();
    frame.setDepth(10);
    drawNeonFrame(frame, frameX, frameY, frameWidth, frameHeight, {
      accentColor: NEON.amber,
      fillAlpha: 0.6,
      strokeAlpha: 0.75,
      cornerCut: 24,
      glow: true,
    });
    drawNeonDivider(frame, layout.centerX, frameY + 32, frameWidth - 150, NEON.amber);
    drawNeonDivider(frame, layout.centerX, frameY + frameHeight - 32, frameWidth - 150, NEON.teal);

    this.add
      .text(layout.centerX, layout.centerY - 138, 'COMMAND DECK', {
        fontSize: '12px',
        color: NEON_TEXT.cyan,
        fontFamily: NEON_FONT.mono,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);

    addNeonTitle(this, layout.centerX, layout.centerY - 108, 'MISSION COMPLETE', 44, 11, {
      glowDark: '#8c6a1f',
      glowMid: '#d9a638',
      glowBright: '#ffc36e',
    });

    this.add
      .text(layout.centerX, layout.centerY - 52, 'ALL SECTORS CLEARED', {
        fontSize: '20px',
        color: '#58f0d8',
        fontFamily: UI_FONT_MONO,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);

    const finalScore = getRunSummary(this.registry).finalScore;
    this.add
      .text(layout.centerX, layout.centerY + 4, `FINAL SCORE: ${finalScore}`, {
        fontSize: '28px',
        color: NEON_TEXT.primary,
        fontFamily: UI_FONT_MONO,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);

    const totalLevels = getTotalLevels();
    this.add
      .text(layout.centerX, layout.centerY + 46, `${totalLevels}/${totalLevels} LEVELS COMPLETED`, {
        fontSize: '15px',
        color: NEON_TEXT.muted,
        fontFamily: UI_FONT_MONO,
      })
      .setOrigin(0.5)
      .setDepth(12);

    createPromptText(this, layout.centerX, layout.centerY + 118, CONTINUE_PROMPT, {
      color: '#dce8ff',
    });

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

  update(_time: number, delta: number): void {
    this.parallax?.update(delta);
  }
}
