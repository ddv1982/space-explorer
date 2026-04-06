import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { FIGHTER_HP, FIGHTER_SPEED, FIGHTER_FIRE_RATE } from '../../utils/constants';
import { EnemyBullet } from '../EnemyBullet';
import { ensureFighterTexture } from '../../utils/SpriteFactory';

export class Fighter extends EnemyBase {
  startX: number = 0;
  sineTime: number = 0;
  sineAmplitude: number = 100;
  sineFrequency: number = 0.002;
  lastFireTime: number = 0;
  fireCooldown: number = FIGHTER_FIRE_RATE;
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureFighterTexture(scene);

    super(scene, x, y, 'fighter-texture');
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
