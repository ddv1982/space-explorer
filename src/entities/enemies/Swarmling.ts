import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { SWARMLING_HP, SWARMLING_SCORE, SWARMLING_SPEED } from '../../utils/constants';
import { ensureSwarmlingTexture } from '../../utils/SpriteFactory';

export class Swarmling extends EnemyBase {
  private wobbleAngle: number = 0;
  private angularSpeed: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureSwarmlingTexture(scene);

    super(scene, x, y, 'swarmling-texture');
    this.maxHp = SWARMLING_HP;
    this.hp = SWARMLING_HP;
    this.speed = SWARMLING_SPEED;
    this.scoreValue = SWARMLING_SCORE;
    this.enemyType = 'swarmling';
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.angularSpeed = Phaser.Math.FloatBetween(-4, 4);
    this.wobbleAngle = 0;
    this.setVelocityY(this.speed);
  }

  updateBehavior(_time: number, delta: number): void {
    this.wobbleAngle += (this.angularSpeed * delta) / 1000;
    this.setVelocityY(this.speed);
    this.setVelocityX(Math.sin(this.wobbleAngle) * 140);
  }
}
