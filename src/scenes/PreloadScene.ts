import Phaser from 'phaser';
import { getAllPremiumBackgroundPreloadQueue } from '../systems/parallax/premiumBackgroundManifest';
import { getViewportLayout } from '../utils/layout';
import { registerRestartOnResize } from './shared/registerRestartOnResize';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    for (const asset of getAllPremiumBackgroundPreloadQueue()) {
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
