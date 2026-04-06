import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { FIGHTER_HP, FIGHTER_SPEED, FIGHTER_FIRE_RATE } from '../../utils/constants';
import { EnemyBullet } from '../EnemyBullet';

export class Fighter extends EnemyBase {
  startX: number = 0;
  sineTime: number = 0;
  sineAmplitude: number = 100;
  sineFrequency: number = 0.002;
  lastFireTime: number = 0;
  fireCooldown: number = FIGHTER_FIRE_RATE;
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'fighter-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      g.fillStyle(0x44ff88, 1);
      g.fillRect(4, 0, 24, 8);
      g.fillStyle(0x22cc66, 1);
      g.fillRect(0, 8, 32, 16);
      g.fillStyle(0x44ff88, 1);
      g.fillRect(8, 24, 16, 8);
      g.generateTexture(key, 32, 32);
      g.destroy();
    }

    super(scene, x, y, key);
    this.maxHp = FIGHTER_HP;
    this.hp = FIGHTER_HP;
    this.speed = FIGHTER_SPEED;
    this.scoreValue = 250;
    this.enemyType = 'fighter';
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
      const bullet =
        (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
        (this.bulletGroup.get(this.x, this.y + 16) as EnemyBullet | null);
      if (bullet) {
        bullet.fire(this.x, this.y + 16);
      }
    }
  }
}
