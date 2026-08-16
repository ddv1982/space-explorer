import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { SOWER_HP, SOWER_MINE_COOLDOWN, SOWER_SCORE, SOWER_SPEED } from '../../utils/constants';
import { Mine } from '../Mine';
import { ensureSowerTexture } from '../../utils/SpriteFactory';

export class Sower extends EnemyBase {
  private mineGroup: Phaser.Physics.Arcade.Group | null = null;
  private lastMineTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureSowerTexture(scene);

    super(scene, x, y, 'sower-texture');
    this.maxHp = SOWER_HP;
    this.hp = SOWER_HP;
    this.speed = SOWER_SPEED;
    this.scoreValue = SOWER_SCORE;
    this.enemyType = 'sower';
  }

  setMineGroup(group: Phaser.Physics.Arcade.Group): void {
    this.mineGroup = group;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.lastMineTime = 0;
    this.setVelocityY(this.speed);
  }

  updateBehavior(time: number, _delta: number): void {
    if (!this.mineGroup || time <= this.lastMineTime + SOWER_MINE_COOLDOWN) {
      return;
    }

    this.lastMineTime = time;
    const mine =
      (this.mineGroup.getFirstDead(false) as Mine | null) ?? (this.mineGroup.get(this.x, this.y + 14) as Mine | null);
    if (mine) {
      mine.launch(this.x, this.y + 14);
    }
  }
}
