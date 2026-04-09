import Phaser from 'phaser';
import { ASTEROID_HP } from '../utils/constants';
import { GAME_SCENE_EVENTS } from '../systems/GameplayFlow';
import { despawnEntity, isArcadeSimulationPaused, spawnEntity } from '../utils/entityUtils';
import { ensureAsteroidTexture } from '../utils/SpriteFactory';

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
    ensureAsteroidTexture(scene);

    super(scene, x, y, 'asteroid-texture');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    despawnEntity(this);
    this.setDepth(2);
  }

  spawn(x: number, y: number, speed: number = 80, config: AsteroidSpawnConfig = {}): void {
    spawnEntity(this, x, y);

    this.maxHp = config.hp ?? ASTEROID_HP;
    this.hp = this.maxHp;
    this.collisionDamage = config.collisionDamage ?? 1;
    this.destroyOnPlayerImpact = config.destroyOnPlayerImpact ?? true;
    this.indestructible = config.indestructible ?? false;
    this.scoreValue = config.scoreValue ?? 50;
    this.baseTint = config.tint ?? null;

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
    this.scene.time.delayedCall(80, this.restoreTintAfterCollisionFlash, undefined, this);
  }

  private restoreTintAfterCollisionFlash(): void {
    if (!this.active) {
      return;
    }

    if (this.baseTint !== null) {
      this.setTint(this.baseTint);
    } else {
      this.clearTint();
    }
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
    if (isArcadeSimulationPaused(this.scene)) {
      return;
    }

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
