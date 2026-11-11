import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { COURIER_HP, COURIER_SCORE, COURIER_SPEED, COURIER_WEAVE_SPEED, COURIER_TINT } from '../../utils/constants';

const EDGE_MARGIN = 36;

/**
 * An unarmed gold blockade runner: it weaves from edge to edge on its way down and always drops a
 * power-up when caught. Letting it escape costs nothing but the prize.
 */
export class Courier extends EnemyBase {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'helper-ship');
    this.setFlipY(true);
    this.maxHp = COURIER_HP;
    this.hp = COURIER_HP;
    this.speed = COURIER_SPEED;
    this.scoreValue = COURIER_SCORE;
    this.enemyType = 'courier';
  }

  protected alwaysDropsPowerUp(): boolean {
    return true;
  }

  spawn(x: number, y: number): void {
    super.spawn(x, y);
    const towardCentre = x < this.scene.cameras.main.width / 2 ? 1 : -1;
    this.setVelocity(towardCentre * COURIER_WEAVE_SPEED, this.speed);
    this.restoreBaseTint();
  }

  protected restoreBaseTint(): void {
    this.setTint(COURIER_TINT);
    this.setTintMode(Phaser.TintModes.MULTIPLY);
  }

  updateBehavior(): void {
    const width = this.scene.cameras.main.width;
    if (this.x < EDGE_MARGIN) this.setVelocityX(COURIER_WEAVE_SPEED);
    else if (this.x > width - EDGE_MARGIN) this.setVelocityX(-COURIER_WEAVE_SPEED);
  }
}
