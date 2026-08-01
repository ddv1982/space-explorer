import Phaser from 'phaser';
import { ENEMY_BULLET_SPEED, LANCER_BOLT_SPEED } from '../utils/constants';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../utils/entityUtils';
import { GAME_SCENE_EVENTS } from '../systems/GameplayFlow';
import { ensureEnemyBulletTexture } from '../utils/SpriteFactory';

export class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  private static trailIntervalMs = 150;
  private lastTrailTime = 0;

  static setTrailIntervalMs(intervalMs: number): void {
    EnemyBullet.trailIntervalMs = Math.max(0, intervalMs);
  }

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
    this.lastTrailTime = 0;
    this.setVelocityY(ENEMY_BULLET_SPEED);
  }

  fireAimed(x: number, y: number, targetX: number, targetY: number, speed: number = LANCER_BOLT_SPEED): void {
    spawnEntity(this, x, y);
    this.lastTrailTime = 0;
    const angle = Math.atan2(targetY - y, targetX - x);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  kill(): void {
    despawnEntity(this);
    this.lastTrailTime = 0;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    if (this.active && time >= this.lastTrailTime + EnemyBullet.trailIntervalMs) {
      this.lastTrailTime = time;
      this.scene.events.emit(GAME_SCENE_EVENTS.enemyBulletTrail, this.x, this.y - 4);
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
