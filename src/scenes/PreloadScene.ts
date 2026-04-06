import Phaser from 'phaser';
import { getViewportLayout } from '../utils/layout';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
  }

  create(): void {
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
