import Phaser from 'phaser';
import { getLevelConfig } from '../config/LevelsConfig';
import { audioManager } from '../systems/AudioManager';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { getRunSummary } from '../systems/PlayerState';
import { getViewportLayout } from '../utils/layout';
import { isTouchMobileDevice } from '../utils/device';
import { h, liveRegion, mountUiLayer } from '../ui/dom';
import { countUp, formatScore, statCell } from '../ui/summary';
import { startFreshRun } from './shared/startRun';
import { getDeathCauseText } from './gameOverScene/deathCause';
import { addDriftingMotes, addEdgeVignette } from './shared/runSummaryPresentation';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

type TerminalAction = 'retry' | 'menu';

/** Enter / R retry and Escape / M return to the menu; held, repeated or chorded keys never do. */
function shortcutFor(event: KeyboardEvent): TerminalAction | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable="true"]')) {
    return null;
  }
  if (event.code === 'Enter' || event.code === 'KeyR') return 'retry';
  if (event.code === 'Escape' || event.code === 'KeyM') return 'menu';
  return null;
}

export class GameOverScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private transitionQueued = false;

  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    audioManager.stopMusic();
    audioManager.playSfx('gameOver');
    this.transitionQueued = false;
    registerRestartOnResize(this, () => !this.transitionQueued);

    const layout = getViewportLayout(this);
    const runSummary = getRunSummary(this.registry);

    this.cameras.main.setBackgroundColor('#0a0308');
    this.parallax = new ParallaxBackground();
    this.parallax.create(this, getLevelConfig(runSummary.levelReached));

    // Red wash, edge vignette and rising embers behind the summary.
    const bounds = { x: layout.left, y: layout.top, width: layout.width, height: layout.height };
    this.add.rectangle(layout.centerX, layout.centerY, layout.width, layout.height, 0x0c0208, 0.56).setDepth(0);
    addEdgeVignette(this, bounds, 0x7a0f1c, 0.62);
    addDriftingMotes(this, bounds, [0xff5a55, 0xff8a4a, 0xffc36e], 1);

    const cause = getDeathCauseText(runSummary.deathCause);
    const nextGoal =
      runSummary.finalScore > 0
        ? `NEXT RUN: BEAT ${runSummary.finalScore}`
        : `NEXT RUN: CLEAR LEVEL ${runSummary.levelReached}`;

    const activate = (action: TerminalAction): void => {
      if (this.transitionQueued) return;
      this.transitionQueued = true;
      audioManager.resumeFromUserGesture();
      audioManager.playUi();
      retry.disabled = menu.disabled = true;
      if (action === 'retry') startFreshRun(this);
      else this.scene.start('Menu');
    };
    const retry = h('button', { type: 'button', className: 'ui-btn ui-btn--primary' }, 'RETRY');
    const menu = h('button', { type: 'button', className: 'ui-btn' }, 'MENU');
    retry.addEventListener('click', () => activate('retry'));
    menu.addEventListener('click', () => activate('menu'));

    const score = statCell('SCORE', formatScore(runSummary.finalScore), '255 210 122');
    const sector = statCell(
      'SECTOR REACHED',
      String(runSummary.levelReached).padStart(2, '0'),
      '255 117 111',
      getLevelConfig(runSummary.levelReached).name.toUpperCase()
    );
    countUp(score.value, runSummary.finalScore, 350);

    const hint = h('p', { className: 'summary__hint', 'aria-hidden': 'true' }, 'ENTER / R  RETRY     ESC / M  MENU');
    // Touch has no keys to hint at, but keeps the row so the block sits where it always has.
    if (isTouchMobileDevice()) hint.style.visibility = 'hidden';

    const layer = mountUiLayer();
    layer.append(
      h(
        'section',
        { className: 'summary summary--defeat', 'aria-label': 'Game over' },
        h('p', { className: 'summary__eyebrow' }, 'RUN TERMINATED'),
        h('h1', { className: 'ui-title summary__title' }, 'GAME OVER'),
        h('p', { className: 'summary__line' }, cause),
        h('div', { className: 'summary__cells' }, score.element, sector.element),
        h('p', { className: 'summary__line summary__goal' }, nextGoal),
        h('div', { className: 'summary__actions' }, retry, menu),
        hint,
        liveRegion(
          `Final score ${runSummary.finalScore}. Reached level ${runSummary.levelReached}. ${cause && `${cause}. `}${nextGoal}.`
        )
      )
    );

    const handleKeyDown = (event: KeyboardEvent): void => {
      const action = shortcutFor(event);
      if (!action) return;
      event.preventDefault();
      activate(action);
    };
    window.addEventListener('keydown', handleKeyDown);

    const cleanup = (): void => {
      this.transitionQueued = true;
      window.removeEventListener('keydown', handleKeyDown);
      layer.remove();
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
