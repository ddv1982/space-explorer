import Phaser from 'phaser';
import { despawnEntity } from '../utils/entityUtils';
import { ensureBomberBombTexture } from '../utils/SpriteFactory';

const BOMBER_BOMB_SPEED = 200;

export class BomberBomb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureBomberBombTexture(scene);

    super(scene, x, y, 'bomber-bomb');
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
