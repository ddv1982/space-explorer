import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import {
  DODGER_FIRE_RATE,
  DODGER_HP,
  DODGER_SCORE,
  DODGER_SPEED,
  DODGER_STRAFE_FLIP_MS,
  DODGER_STRAFE_SPEED,
} from '../../utils/constants';
import { EnemyBullet } from '../EnemyBullet';
import { ensureDodgerTexture } from '../../utils/SpriteFactory';

export class Dodger extends EnemyBase {
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;
  private strafeDirection: number = 1;
  private lastStrafeFlip: number = 0;
  private lastFireTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureDodgerTexture(scene);

    super(scene, x, y, 'dodger-texture');
    this.maxHp = DODGER_HP;
    this.hp = DODGER_HP;
    this.speed = DODGER_SPEED;
    this.scoreValue = DODGER_SCORE;
    this.enemyType = 'dodger';
  }

  setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bulletGroup = group;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.strafeDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    this.lastStrafeFlip = 0;
    this.lastFireTime = 0;
    this.setVelocityY(this.speed);
    this.setVelocityX(this.strafeDirection * DODGER_STRAFE_SPEED);
  }

  updateBehavior(time: number, _delta: number): void {
    if (time > this.lastStrafeFlip + DODGER_STRAFE_FLIP_MS) {
      this.lastStrafeFlip = time;
      this.strafeDirection = -this.strafeDirection;
      this.setVelocityX(this.strafeDirection * DODGER_STRAFE_SPEED);
    }

    if (this.bulletGroup && time > this.lastFireTime + DODGER_FIRE_RATE) {
      this.lastFireTime = time;
      const bullet =
        (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
        (this.bulletGroup.get(this.x, this.y + 14) as EnemyBullet | null);
      if (bullet) {
        bullet.fire(this.x, this.y + 14);
      }
    }
  }
}
