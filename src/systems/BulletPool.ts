import Phaser from 'phaser';
import { Bullet } from '../entities/Bullet';
import { BULLET_POOL_SIZE } from '../utils/constants';

export class BulletPool {
  private group!: Phaser.Physics.Arcade.Group;

  create(scene: Phaser.Scene): void {
    this.group = scene.physics.add.group({
      maxSize: BULLET_POOL_SIZE,
      classType: Bullet,
      runChildUpdate: true,
    });
  }

  fire(x: number, y: number): Bullet | null {
    const bullet = this.group.getFirstDead(false) as Bullet | null;
    if (bullet) {
      bullet.fire(x, y);
      return bullet;
    }
    return null;
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }
}
