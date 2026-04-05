import Phaser from 'phaser';
import { ASTEROID_HP } from '../utils/constants';

export class Asteroid extends Phaser.Physics.Arcade.Sprite {
  hp: number = ASTEROID_HP;
  maxHp: number = ASTEROID_HP;
  private rotSpeed: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'asteroid-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      g.fillStyle(0x886644, 1);
      g.beginPath();
      g.moveTo(20, 0);
      g.lineTo(35, 5);
      g.lineTo(40, 20);
      g.lineTo(35, 35);
      g.lineTo(20, 40);
      g.lineTo(8, 35);
      g.lineTo(0, 20);
      g.lineTo(5, 5);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0x665533, 0.5);
      g.strokePath();
      g.generateTexture(key, 40, 40);
      g.destroy();
    }

    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(2);
  }

  spawn(x: number, y: number, speed: number = 80): void {
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.hp = this.maxHp;
    this.setActive(true);
    this.setVisible(true);
    this.setVelocityY(speed);
    this.rotSpeed = Phaser.Math.FloatBetween(-2, 2);
    this.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.die();
    }
  }

  die(): void {
    this.scene.events.emit('enemy-death', 50, this.x, this.y);
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    this.setScale(1);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.active) {
      this.angle += this.rotSpeed;
      if (this.y > this.scene.cameras.main.height + 50) {
        this.setActive(false);
        this.setVisible(false);
        this.setVelocity(0, 0);
        this.setScale(1);
        (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
      }
    }
  }
}
