import Phaser from 'phaser';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';
import { isArcadeSimulationPaused } from '../../utils/entityUtils';

export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  hp: number = 1;
  maxHp: number = 1;
  speed: number = 100;
  scoreValue: number = 100;
  enemyType: string = 'base';
  despawnOffscreen: boolean = true;

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
    this.despawn();
  }

  despawn(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
    }
  }

  spawn(x: number, y: number): void {
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.hp = this.maxHp;
    this.setActive(true);
    this.setVisible(true);
  }

  protected updateHorizontalSine(
    delta: number,
    startX: number,
    sineTime: number,
    amplitude: number,
    frequency: number
  ): number {
    const nextSineTime = sineTime + delta;
    this.x = startX + Math.sin(nextSineTime * frequency) * amplitude;
    return nextSineTime;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    if (this.active) {
      if (this.despawnOffscreen && this.y > this.scene.cameras.main.height + 50) {
        this.despawn();
        return;
      }
      this.updateBehavior(time, delta);
    }
  }

  abstract updateBehavior(time: number, delta: number): void;
}
