import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { SCOUT_SPEED, SCOUT_HP } from '../../utils/constants';

export class Scout extends EnemyBase {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'scout-texture');
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

  updateBehavior(_time: number, _delta: number): void {}
}
