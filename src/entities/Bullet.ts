import Phaser from 'phaser';
import { BULLET_SPEED } from '../utils/constants';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'player-bullet';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      // Core bright bullet
      g.fillStyle(0x00ffff, 1);
      g.fillRect(2, 0, 4, 16);
      // Outer glow
      g.fillStyle(0x00aaff, 0.6);
      g.fillRect(0, 2, 8, 12);
      // Bright tip
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(3, 0, 2, 4);
      g.generateTexture(key, 8, 16);
      g.destroy();
    }

    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(4);

    // Add glow effect
    if (this.preFX) {
      this.preFX.addGlow(0x00ffff, 2, 2, false);
    }
  }

  fire(x: number, y: number): void {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.setVelocityY(BULLET_SPEED);
  }

  kill(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.y < -20 || this.y > (this.scene.cameras.main.height + 20)) {
      this.kill();
    }
  }
}
