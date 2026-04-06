import Phaser from 'phaser';
import { despawnEntity } from '../utils/entityUtils';

const BOMBER_BOMB_SPEED = 200;

export class BomberBomb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'bomber-bomb';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      g.fillStyle(0xffcc55, 1);
      g.fillCircle(6, 6, 6);
      g.fillStyle(0xaa5522, 1);
      g.fillCircle(6, 8, 3);
      g.generateTexture(key, 12, 14);
      g.destroy();
    }

    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(3);
  }

  drop(x: number, y: number): void {
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setVelocityY(BOMBER_BOMB_SPEED);
  }

  kill(): void {
    despawnEntity(this);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.y > this.scene.cameras.main.height + 20) {
      this.kill();
    }
  }
}
