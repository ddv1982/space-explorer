import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { EnemyBullet } from '../EnemyBullet';
import { ENEMY_BULLET_SPEED } from '../../utils/constants';

export class Gunship extends EnemyBase {
  startX: number = 0;
  private sineTime: number = 0;
  private sineAmplitude: number = 80;
  private sineFrequency: number = 0.0015;
  lastFireTime: number = 0;
  fireCooldown: number = 2500;
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'gunship-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      g.fillStyle(0x4488ff, 1);
      g.fillRect(4, 0, 8, 8);
      g.fillRect(24, 0, 8, 8);
      g.fillStyle(0x2266cc, 1);
      g.fillRect(0, 8, 36, 20);
      g.fillStyle(0x4488ff, 1);
      g.fillRect(12, 28, 12, 8);
      g.generateTexture(key, 36, 36);
      g.destroy();
    }

    super(scene, x, y, key);
    this.maxHp = 6;
    this.hp = 6;
    this.speed = 70;
    this.scoreValue = 400;
    this.enemyType = 'gunship';
  }

  setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bulletGroup = group;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.startX = x;
    this.sineTime = 0;
    this.lastFireTime = 0;
    this.setVelocityY(this.speed);
  }

  updateBehavior(time: number, delta: number): void {
    this.sineTime = this.updateHorizontalSine(
      delta,
      this.startX,
      this.sineTime,
      this.sineAmplitude,
      this.sineFrequency
    );

    if (this.bulletGroup && time > this.lastFireTime + this.fireCooldown) {
      this.lastFireTime = time;
      this.fireSpread();
    }
  }

  private fireSpread(): void {
    if (!this.bulletGroup) return;
    const angles = [-20, 0, 20];
    for (const angleDeg of angles) {
      const bullet =
        (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
        (this.bulletGroup.get(this.x, this.y + 20) as EnemyBullet | null);
      if (bullet) {
        const rad = Phaser.Math.DegToRad(angleDeg + 90);
        bullet.fire(this.x, this.y + 20);
        bullet.setVelocity(
          Math.cos(rad) * ENEMY_BULLET_SPEED,
          Math.sin(rad) * ENEMY_BULLET_SPEED
        );
      }
    }
  }
}
