import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { audioManager } from '../systems/AudioManager';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { UI_FONT_MONO } from '../utils/uiFonts';
import { createActionButtonControl } from './shared/actionButtonControl';
import { startFreshRun } from './shared/startRun';
import { createGameOverLayout } from './gameOverScene/layout';
import { mountAccessibleActionLayer, type AccessibleActionLayerHandle } from './shared/accessibleActionLayer';
import { addNeonTitle, drawNeonDivider, drawNeonFrame, NEON, NEON_TEXT } from './shared/neonUiTheme';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class GameOverScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private transitionQueued = false;
  private teardownAccessibleActions?: AccessibleActionLayerHandle;

  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    audioManager.stopMusic();
    this.transitionQueued = false;
    registerRestartOnResize(this, () => !this.transitionQueued);

    const layout = getViewportLayout(this);
    const runSummary = getRunSummary(this.registry);

    this.cameras.main.setBackgroundColor('#0a0308');
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, getLevelConfig(runSummary.levelReached));

    const frame = this.createFrame(layout);
    const nextGoal = this.createSummary(frame, runSummary);
    this.createActions(frame, runSummary, nextGoal);
  }

  private createFrame(layout: ReturnType<typeof getViewportLayout>) {
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

    const plan = createGameOverLayout(layout);
    const frameWidth = plan.width;
    const frameHeight = plan.height;
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
    drawNeonDivider(frame, layout.centerX, frameY + 18, frameWidth - 140, NEON.red);
    drawNeonDivider(frame, layout.centerX, frameY + frameHeight - 14, frameWidth - 140, NEON.red);

    return { plan, frameX, frameY, centerX: layout.centerX };
  }

  private createSummary(
    { plan, frameY, centerX }: ReturnType<GameOverScene['createFrame']>,
    runSummary: ReturnType<typeof getRunSummary>
  ): string {
    addNeonTitle(this, centerX, frameY + plan.titleY, 'GAME OVER', plan.titleSize, 11, {
      glowDark: '#8c1f28',
      glowMid: '#d93843',
      glowBright: '#ff756f',
    });

    this.add
      .text(centerX, frameY + plan.scoreY, `SCORE: ${runSummary.finalScore}`, {
        fontSize: '30px',
        color: NEON_TEXT.primary,
        fontFamily: UI_FONT_MONO,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.add
      .text(centerX, frameY + plan.progressY, `REACHED LEVEL ${runSummary.levelReached}`, {
        fontSize: '17px',
        color: NEON_TEXT.danger,
        fontFamily: UI_FONT_MONO,
      })
      .setOrigin(0.5)
      .setDepth(12);

    const nextGoal =
      runSummary.finalScore > 0
        ? `NEXT RUN: BEAT ${runSummary.finalScore}`
        : `NEXT RUN: CLEAR LEVEL ${runSummary.levelReached}`;
    this.add
      .text(centerX, frameY + plan.goalY, nextGoal, {
        fontSize: '15px',
        color: NEON_TEXT.primary,
        fontFamily: UI_FONT_MONO,
      })
      .setOrigin(0.5)
      .setDepth(12);

    return nextGoal;
  }

  private createActions(
    { plan, frameX, frameY, centerX }: ReturnType<GameOverScene['createFrame']>,
    runSummary: ReturnType<typeof getRunSummary>,
    nextGoal: string
  ): void {
    const activate = (action: 'retry' | 'menu'): void => {
      if (this.transitionQueued) return;
      this.transitionQueued = true;
      audioManager.resumeFromUserGesture();
      audioManager.playClick();
      retry.setEnabled(false);
      menu.setEnabled(false);
      this.teardownAccessibleActions?.();
      this.teardownAccessibleActions = undefined;
      if (action === 'retry') startFreshRun(this);
      else this.scene.start('Menu');
    };
    const retry = createActionButtonControl(this, {
      label: 'RETRY',
      width: plan.buttonWidth,
      height: plan.buttonHeight,
      variant: 'primary',
      onClick: () => activate('retry'),
    });
    const menu = createActionButtonControl(this, {
      label: 'MENU',
      width: plan.buttonWidth,
      height: plan.buttonHeight,
      variant: 'secondary',
      onClick: () => activate('menu'),
    });
    retry.setPosition(frameX + plan.retry.x, frameY + plan.retry.y);
    menu.setPosition(frameX + plan.menu.x, frameY + plan.menu.y);
    retry.setDepth(12);
    menu.setDepth(12);
    this.add
      .text(centerX, frameY + plan.hintY, 'ENTER / R: RETRY   ESC / M: MENU', {
        fontSize: '10px',
        color: '#ffd0d0',
        fontFamily: UI_FONT_MONO,
      })
      .setOrigin(0.5)
      .setDepth(12);

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      // Native buttons own Enter and Space when focused, including the Menu action.
      if (event.target instanceof Element) {
        if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
        if (event.target.closest('button') && (event.code === 'Enter' || event.code === 'Space')) return;
      }
      if (event.code === 'Enter' || event.code === 'KeyR') {
        event.preventDefault();
        activate('retry');
      } else if (event.code === 'Escape' || event.code === 'KeyM') {
        event.preventDefault();
        activate('menu');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    this.teardownAccessibleActions = mountAccessibleActionLayer({
      label: 'Game over',
      summary: `Final score ${runSummary.finalScore}. Reached level ${runSummary.levelReached}. ${nextGoal}.`,
      actions: [
        { name: 'retry', label: 'Retry from level 1', activate: () => activate('retry') },
        { name: 'menu', label: 'Continue to command deck', activate: () => activate('menu') },
      ],
    });

    const cleanup = (): void => {
      this.transitionQueued = true;
      window.removeEventListener('keydown', handleKeyDown);
      this.teardownAccessibleActions?.();
      this.teardownAccessibleActions = undefined;
      this.parallax.destroy();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  update(_time: number, delta: number): void {
    this.parallax?.update(delta * 0.45);
  }
}
