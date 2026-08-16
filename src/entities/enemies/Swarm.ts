import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { SWARM_HP, SWARM_SCORE, SWARM_SPEED } from '../../utils/constants';
import { ensureSwarmTexture } from '../../utils/SpriteFactory';

export class Swarm extends EnemyBase {
  private wobbleAngle: number = 0;
  private angularSpeed: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureSwarmTexture(scene);

    super(scene, x, y, 'swarm-texture');
    this.maxHp = SWARM_HP;
    this.hp = SWARM_HP;
    this.speed = SWARM_SPEED;
    this.scoreValue = SWARM_SCORE;
    this.enemyType = 'swarm';
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.angularSpeed = Phaser.Math.FloatBetween(-3, 3);
    this.wobbleAngle = 0;
    this.setVelocityY(this.speed);
  }

  updateBehavior(_time: number, delta: number): void {
    this.wobbleAngle += (this.angularSpeed * delta) / 1000;
    this.setVelocityY(this.speed);
    this.setVelocityX(Math.sin(this.wobbleAngle) * 100);
  }
}
