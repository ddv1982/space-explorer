import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { DIVER_DIVE_SPEED, DIVER_HP, DIVER_SCORE, DIVER_SPEED } from '../../utils/constants';
import { ensureDiverTexture } from '../../utils/SpriteFactory';

type DiverPhase = 'enter' | 'dive';

export class Diver extends EnemyBase {
  private phase: DiverPhase = 'enter';
  private startX: number = 0;
  private sineTime: number = 0;
  private diveY: number = 180;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureDiverTexture(scene);

    super(scene, x, y, 'diver-texture');
    this.maxHp = DIVER_HP;
    this.hp = DIVER_HP;
    this.speed = DIVER_SPEED;
    this.scoreValue = DIVER_SCORE;
    this.enemyType = 'diver';
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.phase = 'enter';
    this.startX = x;
    this.sineTime = 0;
    this.diveY = Phaser.Math.Between(140, 220);
    this.setVelocityY(this.speed);
    this.setVelocityX(0);
  }

  updateBehavior(_time: number, delta: number): void {
    if (this.phase === 'enter') {
      this.sineTime = this.updateHorizontalSine(delta, this.startX, this.sineTime, 90, 0.004);
      if (this.y >= this.diveY) {
        this.phase = 'dive';
        this.setVelocityY(DIVER_DIVE_SPEED);
      }
    }
  }
}
