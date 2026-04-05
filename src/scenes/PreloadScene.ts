import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
  }

  create(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY, 'LOADING...', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this.scene.start('Menu');
    });
  }
}
