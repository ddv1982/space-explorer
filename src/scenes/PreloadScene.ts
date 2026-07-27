import Phaser from 'phaser';
import { getStartupPremiumBackgroundPreloadQueue } from '../systems/parallax/premiumBackgroundManifest';
import { getViewportLayout } from '../utils/layout';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class PreloadScene extends Phaser.Scene {
  private menuTransitionStarted = false;
  private cleanupLoaderProgress?: () => void;

  constructor() {
    super({ key: 'Preload' });
  }

  init(): void {
    // Defensive cleanup also covers an interrupted run that is re-initialized
    // without the normal shutdown notification.
    this.cleanupLoaderProgress?.();
    this.menuTransitionStarted = false;
    this.cleanupLoaderProgress = undefined;
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

    // Only warm the first campaign window; later levels load just-in-time before Game starts.
    for (const asset of getStartupPremiumBackgroundPreloadQueue()) {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, asset.url);
      }
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
    this.scene.start('Menu');
  }
}
