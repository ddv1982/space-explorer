import Phaser from 'phaser';
import { finishShipyardLoading, queueShipyardAssets } from '../utils/shipyardAssets';
import { getViewportLayout } from '../utils/layout';
import { queueAllPlanetPortraits } from './planetIntermission/planetPortraits';
import { addNeonTitle, fitNeonTitleFontSize, NEON, NEON_TEXT, neonLabelStyle } from './shared/neonUiTheme';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

const RAIL_OFFSET_Y = 30;
const RAIL_HEIGHT = 3;
const TITLE = 'SPACE EXPLORER';
const TITLE_OFFSET_Y = -24;

export class PreloadScene extends Phaser.Scene {
  private menuTransitionStarted = false;
  private cleanupLoaderProgress?: () => void;
  private fontsReady: Promise<unknown> | null = null;
  private lifecycleGeneration = 0;

  constructor() {
    super({ key: 'Preload' });
  }

  init(): void {
    // Defensive cleanup also covers an interrupted run that is re-initialized
    // without the normal shutdown notification.
    this.cleanupLoaderProgress?.();
    this.lifecycleGeneration += 1;
    this.menuTransitionStarted = false;
    this.cleanupLoaderProgress = undefined;
    this.fontsReady = null;
  }

  preload(): void {
    registerRestartOnResize(this);
    queueShipyardAssets(this);

    const layout = getViewportLayout(this);
    const railWidth = Math.min(280, layout.width - 96);
    const railX = layout.centerX - railWidth / 2;
    const railY = layout.centerY + RAIL_OFFSET_Y;
    // Mirrors the HTML boot splash in index.html, so the hand-over from page to canvas is seamless.
    const loadingText = this.add
      .text(layout.centerX, railY + 22, 'LOADING... 0%', neonLabelStyle(13, NEON_TEXT.secondary, 3))
      .setOrigin(0.5);
    const rail = this.add.graphics();

    const drawRail = (progress: number): void => {
      rail.clear();
      rail.fillStyle(NEON.cyan, 0.18);
      rail.fillRect(railX, railY, railWidth, RAIL_HEIGHT);
      rail.fillStyle(NEON.cyan, 1);
      rail.fillRect(railX, railY, railWidth * progress, RAIL_HEIGHT);
      rail.fillStyle(0xffffff, 1);
      rail.fillRect(railX + railWidth * progress - 2, railY - 1, 4, RAIL_HEIGHT + 2);
    };
    drawRail(0);

    const updateProgress = (progress: number): void => {
      const normalizedProgress = Math.min(1, Math.max(0, progress));
      loadingText.setText(`LOADING... ${Math.round(normalizedProgress * 100)}%`);
      drawRail(normalizedProgress);
    };

    const cleanupLoaderProgress = (): void => {
      this.load.off(Phaser.Loader.Events.PROGRESS, updateProgress);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanupLoaderProgress);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanupLoaderProgress);

      if (this.cleanupLoaderProgress === cleanupLoaderProgress) {
        this.cleanupLoaderProgress = undefined;
      }
    };

    this.cleanupLoaderProgress = cleanupLoaderProgress;
    this.load.on(Phaser.Loader.Events.PROGRESS, updateProgress);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanupLoaderProgress);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanupLoaderProgress);

    // Authored planet portraits are real raster files (~18 kB each): cache
    // the full campaign set now so intermissions never hit the network
    // mid-run. The intermission scene re-queues its own portrait on direct
    // starts or after the texture has been released.
    queueAllPlanetPortraits(this);

    // Kick off the bundled UI faces so the Menu transition can wait for them.
    const fontFaceSet = typeof document !== 'undefined' ? document.fonts : undefined;
    if (fontFaceSet?.load) {
      const lifecycleGeneration = this.lifecycleGeneration;
      const displayFace = fontFaceSet.load('700 32px Orbitron', TITLE);
      // The wordmark can only be drawn once its face has arrived; canvas text never re-renders on swap.
      void displayFace.then(() => {
        if (this.lifecycleGeneration !== lifecycleGeneration || this.menuTransitionStarted) return;
        const titleSize = fitNeonTitleFontSize(this, TITLE, 44, layout.width - 48);
        addNeonTitle(this, layout.centerX, layout.centerY + TITLE_OFFSET_Y, TITLE, titleSize, 1);
      });
      this.fontsReady = Promise.all([
        displayFace,
        fontFaceSet.load('400 16px Rajdhani', 'Choose a run'),
        fontFaceSet.load('700 16px Rajdhani', 'NEW RUN'),
        fontFaceSet.load('400 16px "Share Tech Mono"', 'SCORE 0123456789'),
      ]).catch((): unknown[] => []);
    }
  }

  create(): void {
    // create is Phaser's completion boundary for preload, including an empty or
    // already-cached queue. Do not report completion or advance before it runs.
    this.cleanupLoaderProgress?.();
    if (!finishShipyardLoading(this)) return;

    if (this.menuTransitionStarted) {
      return;
    }

    this.menuTransitionStarted = true;
    const lifecycleGeneration = this.lifecycleGeneration;
    const invalidateLifecycle = (): void => {
      if (this.lifecycleGeneration === lifecycleGeneration) {
        this.lifecycleGeneration += 1;
      }
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, invalidateLifecycle);
    this.events.once(Phaser.Scenes.Events.DESTROY, invalidateLifecycle);

    // Hold the transition briefly for the bundled UI faces so menus never
    // flash fallback fonts; the timeout keeps us moving if loading stalls.
    if (!this.fontsReady) {
      this.scene.start('Menu');
      return;
    }

    let advanced = false;
    const advance = (): void => {
      if (advanced || this.lifecycleGeneration !== lifecycleGeneration) {
        return;
      }
      advanced = true;
      this.scene.start('Menu');
    };

    this.fontsReady.then(advance, advance);
    this.time?.delayedCall?.(2500, advance);
  }
}
