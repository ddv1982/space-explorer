import Phaser from 'phaser';
import { ENEMY_BULLET_SPEED } from '../utils/constants';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../utils/entityUtils';
import { ensureEnemyBulletTexture } from '../utils/SpriteFactory';

export class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureEnemyBulletTexture(scene);

    super(scene, x, y, 'enemy-bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    despawnEntity(this);
    this.setDepth(3);
  }

  fire(x: number, y: number): void {
    spawnEntity(this, x, y);
    this.setVelocityY(ENEMY_BULLET_SPEED);
  }

  kill(): void {
    despawnEntity(this);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    const { main } = this.scene.cameras;
    const padding = 20;

    if (
      this.x < -padding ||
      this.x > main.width + padding ||
      this.y > main.height + padding ||
      this.y < -padding
    ) {
      this.kill();
    }
  }
}
