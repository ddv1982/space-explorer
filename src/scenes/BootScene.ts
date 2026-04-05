import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
  }

  create(): void {
    this.time.delayedCall(100, () => {
      this.scene.start('Preload');
    });
  }
}
