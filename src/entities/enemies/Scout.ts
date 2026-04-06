import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { SCOUT_SPEED, SCOUT_HP } from '../../utils/constants';

export class Scout extends EnemyBase {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'scout-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      g.fillStyle(0xff4444, 1);
      g.beginPath();
      g.moveTo(12, 24);
      g.lineTo(24, 0);
      g.lineTo(12, 6);
      g.lineTo(0, 0);
      g.closePath();
      g.fillPath();
      g.generateTexture(key, 24, 24);
      g.destroy();
    }

    super(scene, x, y, key);
    this.maxHp = SCOUT_HP;
    this.hp = SCOUT_HP;
    this.speed = SCOUT_SPEED;
    this.scoreValue = 100;
    this.enemyType = 'scout';
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.setVelocityY(this.speed);
  }

  updateBehavior(_time: number, _delta: number): void {
  }
}
