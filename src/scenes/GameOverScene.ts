import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { audioManager } from '../systems/AudioManager';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { isTouchMobileDevice } from '../utils/device';
import { createActionButtonControl } from './shared/actionButtonControl';
import { startFreshRun } from './shared/startRun';
import { createGameOverLayout } from './gameOverScene/layout';
import { getDeathCauseText } from './gameOverScene/deathCause';
import { mountAccessibleActionLayer, type AccessibleActionLayerHandle } from './shared/accessibleActionLayer';
import { addNeonTitle, fitNeonTitleFontSize, NEON, NEON_TEXT, neonLabelStyle } from './shared/neonUiTheme';
import {
  addDriftingMotes,
  addEdgeVignette,
  addStatCell,
  countUp,
  formatScore,
  offsetRect,
  revealInSequence,
} from './shared/runSummaryPresentation';
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

    this.createAtmosphere(layout);
    const block = this.createBlock(layout);
    const nextGoal = this.createSummary(block, runSummary);
    this.createActions(block, runSummary, nextGoal);
  }

  /** Red wash, edge vignette and rising embers behind the summary. */
  private createAtmosphere(layout: ReturnType<typeof getViewportLayout>): void {
    const bounds = { x: layout.left, y: layout.top, width: layout.width, height: layout.height };
    this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x0c0208, 0.56).setDepth(0);
    addEdgeVignette(this, bounds, 0x7a0f1c, 0.62);
    addDriftingMotes(this, bounds, [0xff5a55, 0xff8a4a, 0xffc36e], 1);
  }

  private createBlock(layout: ReturnType<typeof getViewportLayout>) {
    const plan = createGameOverLayout(layout);
    return {
      plan,
      left: layout.centerX - plan.width / 2,
      top: layout.centerY - plan.height / 2,
      centerX: layout.centerX,
    };
  }

  private createSummary(
    { plan, left, top, centerX }: ReturnType<GameOverScene['createBlock']>,
    runSummary: ReturnType<typeof getRunSummary>
  ): string {
    const level = getLevelConfig(runSummary.levelReached);
    const lines: Phaser.GameObjects.Text[] = [];
    const addLine = (y: number, text: string, size: number, color: string): void => {
      const line = this.add
        .text(centerX, top + y, text, neonLabelStyle(size, color))
        .setOrigin(0.5)
        .setDepth(12);
      line.setScale(Math.min(1, plan.width / Math.max(1, line.width)));
      lines.push(line);
    };

    if (plan.eyebrowY !== null) addLine(plan.eyebrowY, 'RUN TERMINATED', 13, NEON_TEXT.danger);

    const titleSize = fitNeonTitleFontSize(this, 'GAME OVER', plan.titleSize, plan.width - 16);
    addNeonTitle(this, centerX, top + plan.titleY, 'GAME OVER', titleSize, 11, { glow: '#ff5a55', base: '#ffb3ad' });

    addLine(plan.causeY, getDeathCauseText(runSummary.deathCause), 16, NEON_TEXT.danger);

    const score = addStatCell(this, offsetRect(plan.score, left, top), formatScore(runSummary.finalScore), {
      label: 'SCORE',
      accent: NEON.gold,
    });
    countUp(this, score, runSummary.finalScore, 350);
    addStatCell(this, offsetRect(plan.sector, left, top), runSummary.levelReached.toString().padStart(2, '0'), {
      label: 'SECTOR REACHED',
      accent: NEON.red,
      note: level.name.toUpperCase(),
    });

    const nextGoal =
      runSummary.finalScore > 0
        ? `NEXT RUN: BEAT ${runSummary.finalScore}`
        : `NEXT RUN: CLEAR LEVEL ${runSummary.levelReached}`;
    addLine(plan.goalY, nextGoal, 15, NEON_TEXT.secondary);

    revealInSequence(this, lines);
    return nextGoal;
  }

  private createActions(
    { plan, left, top, centerX }: ReturnType<GameOverScene['createBlock']>,
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
    retry.setPosition(left + plan.retry.x, top + plan.retry.y);
    menu.setPosition(left + plan.menu.x, top + plan.menu.y);
    retry.setDepth(12);
    menu.setDepth(12);
    if (!isTouchMobileDevice()) {
      this.add
        .text(centerX, top + plan.hintY, 'ENTER / R  RETRY     ESC / M  MENU', neonLabelStyle(12, NEON_TEXT.muted))
        .setOrigin(0.5)
        .setDepth(12);
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
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
      summary: `Final score ${runSummary.finalScore}. Reached level ${runSummary.levelReached}. ${getDeathCauseText(runSummary.deathCause)}. ${nextGoal}.`,
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
