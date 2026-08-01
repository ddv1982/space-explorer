import Phaser from 'phaser';
import { ensurePremiumBackgroundAssets } from '../systems/parallax/premiumBackgroundLoading';
import { getViewportLayout } from '../utils/layout';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class PreloadScene extends Phaser.Scene {
  private menuTransitionStarted = false;
  private cleanupLoaderProgress?: () => void;
  private fontsReady: Promise<unknown> | null = null;

  constructor() {
    super({ key: 'Preload' });
  }

  init(): void {
    // Defensive cleanup also covers an interrupted run that is re-initialized
    // without the normal shutdown notification.
    this.cleanupLoaderProgress?.();
    this.menuTransitionStarted = false;
    this.cleanupLoaderProgress = undefined;
    this.fontsReady = null;
  }

  preload(): void {
    registerRestartOnResize(this);

    const layout = getViewportLayout(this);
    const loadingText = this.add.text(layout.centerX, layout.centerY, 'LOADING... 0%', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const updateProgress = (progress: number): void => {
      const normalizedProgress = Math.min(1, Math.max(0, progress));
      loadingText.setText(`LOADING... ${Math.round(normalizedProgress * 100)}%`);
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

    // Neon backgrounds are generated procedurally: warm Level 1 only; later
    // levels generate just-in-time during the preceding intermission.
    ensurePremiumBackgroundAssets(this, 1, () => {});

    // Kick off the bundled UI faces so the Menu transition can wait for them.
    const fontFaceSet = typeof document !== 'undefined' ? document.fonts : undefined;
    if (fontFaceSet?.load) {
      this.fontsReady = Promise.all([
        fontFaceSet.load('700 32px Orbitron', 'SPACE EXPLORER'),
        fontFaceSet.load('400 16px "Share Tech Mono"', 'SCORE 0123456789'),
      ]).catch((): unknown[] => []);
    }
  }

  create(): void {
    // create is Phaser's completion boundary for preload, including an empty or
    // already-cached queue. Do not report completion or advance before it runs.
    this.cleanupLoaderProgress?.();

    if (this.menuTransitionStarted) {
      return;
    }

    this.menuTransitionStarted = true;

    // Hold the transition briefly for the bundled UI faces so menus never
    // flash fallback fonts; the timeout keeps us moving if loading stalls.
    if (!this.fontsReady) {
      this.scene.start('Menu');
      return;
    }

    let advanced = false;
    const advance = (): void => {
      if (advanced) {
        return;
      }
      advanced = true;
      this.scene.start('Menu');
    };

    this.fontsReady.then(advance, advance);
    this.time?.delayedCall?.(2500, advance);
  }
}
