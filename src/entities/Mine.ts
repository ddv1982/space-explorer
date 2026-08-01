import Phaser from 'phaser';
import { MINE_DRIFT_SPEED } from '../utils/constants';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../utils/entityUtils';
import { ensureMineTexture } from '../utils/SpriteFactory';

export class Mine extends Phaser.Physics.Arcade.Sprite {
  hp: number = 1;
  private driftPhase: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureMineTexture(scene);

    super(scene, x, y, 'sower-mine');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    despawnEntity(this);
    this.setDepth(3);
  }

  launch(x: number, y: number): void {
    spawnEntity(this, x, y);
    this.hp = 1;
    this.driftPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.setVelocityY(MINE_DRIFT_SPEED);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.kill();
    }
  }

  kill(): void {
    despawnEntity(this);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

    if (!this.active) {
      return;
    }

    this.driftPhase += delta * 0.0015;
    this.setVelocityX(Math.sin(this.driftPhase) * 24);

    if (this.y > this.scene.cameras.main.height + 30) {
      this.kill();
    }
  }
}
