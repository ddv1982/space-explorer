import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ensureSwarmTexture } from '../../utils/SpriteFactory';

export class Swarm extends EnemyBase {
  private wobbleAngle: number = 0;
  private angularSpeed: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureSwarmTexture(scene);

    super(scene, x, y, 'swarm-texture');
    this.maxHp = 1;
    this.hp = 1;
    this.speed = 220;
    this.scoreValue = 50;
    this.enemyType = 'swarm';
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.angularSpeed = Phaser.Math.FloatBetween(-3, 3);
    this.wobbleAngle = 0;
    this.setVelocityY(this.speed);
  }

  updateBehavior(time: number, delta: number): void {
    this.wobbleAngle += this.angularSpeed * delta / 1000;
    this.setVelocityY(this.speed);
    this.setVelocityX(Math.sin(this.wobbleAngle) * 100);
  }
}
