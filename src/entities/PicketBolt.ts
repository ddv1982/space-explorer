import Phaser from 'phaser';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../utils/entityUtils';
import { getViewportBounds } from '../utils/layout';
import { ensurePicketBoltTexture } from '../utils/SpriteFactory';

/**
 * AEGIS Picket turret projectile. Deliberately leaner than the player Bullet:
 * flat damage, no trail emission, no score events of its own.
 */
export class PicketBolt extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensurePicketBoltTexture(scene);

    super(scene, x, y, 'picket-bolt');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    despawnEntity(this);
    this.setDepth(4);
  }

  fire(x: number, y: number, velocityX: number, velocityY: number): void {
    spawnEntity(this, x, y);
    this.setVelocity(velocityX, velocityY);
    this.setRotation(Phaser.Math.Angle.Between(0, 0, velocityX, velocityY) + Phaser.Math.DegToRad(90));
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

    const viewport = getViewportBounds(this.scene);
    const padding = 24;
    if (
      this.x < viewport.left - padding
      || this.x > viewport.right + padding
      || this.y < viewport.top - padding
      || this.y > viewport.bottom + padding
    ) {
      this.kill();
    }
  }
}
