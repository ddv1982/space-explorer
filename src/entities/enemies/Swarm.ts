import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';

export class Swarm extends EnemyBase {
  private wobbleAngle: number = 0;
  private angularSpeed: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'swarm-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      g.fillStyle(0xffff44, 1);
      g.fillTriangle(8, 0, 16, 12, 0, 12);
      g.fillStyle(0xccaa22, 1);
      g.fillRect(4, 12, 8, 4);
      g.generateTexture(key, 16, 16);
      g.destroy();
    }

    super(scene, x, y, key);
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
