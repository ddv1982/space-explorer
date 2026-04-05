import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { BomberBomb } from '../BomberBomb';

export class Bomber extends EnemyBase {
  private lastBombTime: number = 0;
  private bombCooldown: number = 3000;
  private bombGroup: Phaser.Physics.Arcade.Group | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'bomber-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      g.fillStyle(0xff8844, 1);
      g.fillCircle(20, 16, 16);
      g.fillStyle(0xcc6622, 1);
      g.fillRect(8, 16, 24, 16);
      g.fillStyle(0xffaa66, 1);
      g.fillCircle(12, 28, 6);
      g.fillCircle(28, 28, 6);
      g.generateTexture(key, 40, 34);
      g.destroy();
    }

    super(scene, x, y, key);
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

  updateBehavior(time: number, delta: number): void {
    if (this.y > this.scene.cameras.main.height + 50) {
      this.setActive(false);
      this.setVisible(false);
      this.setVelocity(0, 0);
      (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
      return;
    }

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
