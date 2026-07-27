import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private preloadTransitionStarted = false;

  constructor() {
    super({ key: 'Boot' });
  }

  init(): void {
    this.preloadTransitionStarted = false;
  }

  create(): void {
    // Phaser only calls create after this scene's loader has completed, including
    // the empty-queue case, so no synthetic boot delay is needed.
    if (this.preloadTransitionStarted) {
      return;
    }

    this.preloadTransitionStarted = true;
    this.scene.start('Preload');
  }
}
