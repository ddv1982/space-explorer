import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { SPLITTER_HP, SPLITTER_SCORE, SPLITTER_SPEED } from '../../utils/constants';
import { ensureSplitterTexture } from '../../utils/SpriteFactory';

type SplitHandler = (x: number, y: number) => void;

export class Splitter extends EnemyBase {
  private splitHandler: SplitHandler | null = null;
  private startX: number = 0;
  private sineTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureSplitterTexture(scene);

    super(scene, x, y, 'splitter-texture');
    this.maxHp = SPLITTER_HP;
    this.hp = SPLITTER_HP;
    this.speed = SPLITTER_SPEED;
    this.scoreValue = SPLITTER_SCORE;
    this.enemyType = 'splitter';
  }

  setSplitHandler(handler: SplitHandler): void {
    this.splitHandler = handler;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.startX = x;
    this.sineTime = 0;
    this.setVelocityY(this.speed);
  }

  die(): void {
    if (this.active && this.splitHandler) {
      this.splitHandler(this.x, this.y);
    }
    super.die();
  }

  updateBehavior(_time: number, delta: number): void {
    this.sineTime = this.updateHorizontalSine(delta, this.startX, this.sineTime, 70, 0.003);
  }
}
