import Phaser from 'phaser';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';

export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  hp: number = 1;
  maxHp: number = 1;
  speed: number = 100;
  scoreValue: number = 100;
  enemyType: string = 'base';

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(3);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    this.flashHit();
    if (this.hp <= 0) {
      this.die();
    }
  }

  private flashHit(): void {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });
  }

  die(): void {
    this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y);
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }

  spawn(x: number, y: number): void {
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.hp = this.maxHp;
    this.setActive(true);
    this.setVisible(true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.active) {
      this.updateBehavior(time, delta);
    }
  }

  abstract updateBehavior(time: number, delta: number): void;
}
