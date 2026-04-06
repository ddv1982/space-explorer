import Phaser from 'phaser';
import { ASTEROID_HP } from '../utils/constants';
import { GAME_SCENE_EVENTS } from '../systems/GameplayFlow';
import { despawnEntity } from '../utils/entityUtils';

export interface AsteroidSpawnConfig {
  velocityX?: number;
  collisionDamage?: number;
  destroyOnPlayerImpact?: boolean;
  indestructible?: boolean;
  scoreValue?: number;
  tint?: number;
  hp?: number;
  depth?: number;
  scaleRange?: { min: number; max: number };
  angularVelocityRange?: { min: number; max: number };
}

export class Asteroid extends Phaser.Physics.Arcade.Sprite {
  hp = ASTEROID_HP;
  maxHp = ASTEROID_HP;
  private rotSpeed = 0;
  private collisionDamage = 1;
  private destroyOnPlayerImpact = true;
  private indestructible = false;
  private scoreValue = 50;
  private baseTint: number | null = null;

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

  spawn(x: number, y: number, speed: number = 80, config: AsteroidSpawnConfig = {}): void {
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);

    this.maxHp = config.hp ?? ASTEROID_HP;
    this.hp = this.maxHp;
    this.collisionDamage = config.collisionDamage ?? 1;
    this.destroyOnPlayerImpact = config.destroyOnPlayerImpact ?? true;
    this.indestructible = config.indestructible ?? false;
    this.scoreValue = config.scoreValue ?? 50;
    this.baseTint = config.tint ?? null;

    this.setActive(true);
    this.setVisible(true);
    this.setDepth(config.depth ?? 2);
    this.setVelocity(config.velocityX ?? 0, speed);
    this.rotSpeed = Phaser.Math.FloatBetween(
      config.angularVelocityRange?.min ?? -2,
      config.angularVelocityRange?.max ?? 2
    );
    this.setScale(
      Phaser.Math.FloatBetween(config.scaleRange?.min ?? 0.8, config.scaleRange?.max ?? 1.4)
    );

    if (this.baseTint !== null) {
      this.setTint(this.baseTint);
    } else {
      this.clearTint();
    }
  }

  getCollisionDamage(): number {
    return this.collisionDamage;
  }

  onPlayerCollision(): void {
    if (this.destroyOnPlayerImpact) {
      this.die();
      return;
    }

    this.setTint(0xffaa66);
    this.scene.time.delayedCall(80, () => {
      if (this.active) {
        if (this.baseTint !== null) {
          this.setTint(this.baseTint);
        } else {
          this.clearTint();
        }
      }
    });
  }

  takeDamage(amount: number): void {
    if (this.indestructible) {
      return;
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.die();
    }
  }

  die(): void {
    if (this.scoreValue > 0) {
      this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y);
    }

    this.deactivate();
  }

  clear(): void {
    this.deactivate();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) {
      return;
    }

    this.angle += this.rotSpeed;
    if (this.y > this.scene.cameras.main.height + 80) {
      this.deactivate();
    }
  }

  private deactivate(): void {
    despawnEntity(this);
    this.setScale(1);
    this.setDepth(2);
    this.clearTint();
    this.collisionDamage = 1;
    this.destroyOnPlayerImpact = true;
    this.indestructible = false;
    this.scoreValue = 50;
    this.baseTint = null;
  }
}
