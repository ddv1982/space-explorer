import Phaser from 'phaser';
import { getStartupPremiumBackgroundPreloadQueue } from '../systems/parallax/premiumBackgroundManifest';
import { getViewportLayout } from '../utils/layout';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    // Only warm the first campaign window; later levels load just-in-time before Game starts.
    for (const asset of getStartupPremiumBackgroundPreloadQueue()) {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, asset.url);
      }
    }
  }

  create(): void {
    registerRestartOnResize(this);

    const layout = getViewportLayout(this);

    this.add.text(layout.centerX, layout.centerY, 'LOADING...', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this.scene.start('Menu');
    });
  }
}
