import Phaser from 'phaser';
import { BULLET_SPEED } from '../utils/constants';
import { despawnEntity, isArcadeSimulationPaused } from '../utils/entityUtils';
import { ensurePlayerBulletTexture } from '../utils/SpriteFactory';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensurePlayerBulletTexture(scene);

    super(scene, x, y, 'player-bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(4);

  }

  fire(x: number, y: number, velocityX: number = 0, velocityY?: number): void {
    const resolvedVelocityY = velocityY ?? BULLET_SPEED;

    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.setVelocity(velocityX, resolvedVelocityY);
    this.setRotation(Phaser.Math.Angle.Between(0, 0, velocityX, resolvedVelocityY) + Phaser.Math.DegToRad(90));
  }

  kill(): void {
    despawnEntity(this);
    this.setRotation(0);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    const { width, height } = this.scene.cameras.main;
    if (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) {
      this.kill();
    }
  }
}
