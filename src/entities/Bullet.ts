import Phaser from 'phaser';
import { BULLET_SPEED } from '../utils/constants';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../utils/entityUtils';
import { GAME_SCENE_EVENTS } from '../systems/GameplayFlow';
import { ensurePlayerBulletTexture } from '../utils/SpriteFactory';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  private lastTrailTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensurePlayerBulletTexture(scene);

    super(scene, x, y, 'player-bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    despawnEntity(this);
    this.setDepth(4);

  }

  fire(x: number, y: number, velocityX: number = 0, velocityY?: number): void {
    const resolvedVelocityY = velocityY ?? BULLET_SPEED;

    spawnEntity(this, x, y);
    this.lastTrailTime = 0;
    this.setVelocity(velocityX, resolvedVelocityY);
    this.setRotation(Phaser.Math.Angle.Between(0, 0, velocityX, resolvedVelocityY) + Phaser.Math.DegToRad(90));
  }

  kill(): void {
    despawnEntity(this);
    this.lastTrailTime = 0;
    this.setRotation(0);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    if (this.active && time >= this.lastTrailTime + 18) {
      this.lastTrailTime = time;
      this.scene.events.emit(GAME_SCENE_EVENTS.playerBulletTrail, this.x, this.y + 6);
    }

    const { width, height } = this.scene.cameras.main;
    if (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) {
      this.kill();
    }
  }
}
