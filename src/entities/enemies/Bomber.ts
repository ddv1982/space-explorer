import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { BomberBomb } from '../BomberBomb';
import { ensureBomberTexture } from '../../utils/SpriteFactory';

export class Bomber extends EnemyBase {
  private lastBombTime: number = 0;
  private bombCooldown: number = 3000;
  private bombGroup: Phaser.Physics.Arcade.Group | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureBomberTexture(scene);

    super(scene, x, y, 'bomber-texture');
    this.maxHp = 5;
    this.hp = 5;
    this.speed = 60;
    this.scoreValue = 300;
    this.enemyType = 'bomber';
  }

  setBombGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bombGroup = group;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    this.lastBombTime = 0;
    this.setVelocityY(this.speed);
  }

  updateBehavior(time: number, _delta: number): void {
    if (this.bombGroup && time > this.lastBombTime + this.bombCooldown) {
      this.lastBombTime = time;
      this.dropBomb();
    }
  }

  private dropBomb(): void {
    if (!this.bombGroup) return;
    const bomb =
      (this.bombGroup.getFirstDead(false) as BomberBomb | null) ??
      (this.bombGroup.get(this.x, this.y + 20) as BomberBomb | null);
    if (bomb) {
      bomb.drop(this.x, this.y + 20);
    }
  }
}
