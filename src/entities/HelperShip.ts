import Phaser from 'phaser';
import { BULLET_SPEED } from '../utils/constants';
import { BulletPool } from '../systems/BulletPool';
import { EffectsManager } from '../systems/EffectsManager';
import { Player } from './Player';
import { ensureHelperShipTexture } from '../utils/SpriteFactory';

export type HelperShipDamageResult = 'ignored' | 'active' | 'respawning' | 'depleted';

interface HelperShipLoadout {
  maxHp: number;
  lives: number;
  fireRateMs: number;
  respawnDelayMs: number;
  followOffsetX: number;
  followOffsetY: number;
}

export class HelperShip extends Phaser.Physics.Arcade.Sprite {
  hp = 1;
  maxHp = 1;
  remainingLives = 0;

  private fireRateMs = 240;
  private respawnDelayMs = 700;
  private followOffsetX = 0;
  private followOffsetY = 16;
  private followLerp = 0.18;
  private lastFireTime = 0;
  private respawnAt = -1;
  private depleted = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureHelperShipTexture(scene);

    super(scene, x, y, 'helper-ship');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(5);
    this.setActive(false);
    this.setVisible(false);
    this.setAlpha(0.96);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 18);
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.enable = false;
  }

  configure(loadout: HelperShipLoadout): void {
    this.maxHp = Math.max(1, Math.round(loadout.maxHp));
    this.hp = this.maxHp;
    this.remainingLives = Math.max(1, Math.floor(loadout.lives));
    this.fireRateMs = Math.max(80, Math.floor(loadout.fireRateMs));
    this.respawnDelayMs = Math.max(120, Math.floor(loadout.respawnDelayMs));
    this.followOffsetX = loadout.followOffsetX;
    this.followOffsetY = loadout.followOffsetY;
    this.lastFireTime = 0;
    this.respawnAt = -1;
    this.depleted = false;
    this.setRotation(0);
    this.clearTint();
  }

  deployNearPlayer(player: Player, time: number): void {
    if (this.depleted || this.remainingLives <= 0) {
      return;
    }

    this.spawn(player.x + this.followOffsetX, player.y + this.followOffsetY, time);
  }

  updateWithPlayer(player: Player, time: number, bulletPool: BulletPool, effectsManager: EffectsManager): void {
    if (this.depleted) {
      return;
    }

    if (!this.active) {
      if (this.respawnAt > 0 && time >= this.respawnAt && this.remainingLives > 0 && player.isAlive) {
        this.spawn(player.x + this.followOffsetX, player.y + this.followOffsetY, time);
      }
      return;
    }

    if (!player.isAlive) {
      return;
    }

    const targetX = player.x + this.followOffsetX;
    const targetY = player.y + this.followOffsetY;
    const nextX = Phaser.Math.Linear(this.x, targetX, this.followLerp);
    const nextY = Phaser.Math.Linear(this.y, targetY, this.followLerp);
    this.setPosition(nextX, nextY);
    this.rotation = Phaser.Math.Linear(this.rotation, player.rotation * 0.75, 0.12);

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.updateFromGameObject();

    if (time >= this.lastFireTime + this.fireRateMs) {
      this.lastFireTime = time;
      this.fireShot(bulletPool, effectsManager);
    }
  }

  takeDamage(amount: number, time: number, effectsManager: EffectsManager): HelperShipDamageResult {
    if (!this.active || this.depleted) {
      return 'ignored';
    }

    this.hp -= amount;

    if (this.hp > 0) {
      this.flashHit();
      effectsManager.createSparkBurst(this.x, this.y);
      return 'active';
    }

    effectsManager.createExplosion(this.x, this.y, 0.65);
    this.remainingLives -= 1;

    if (this.remainingLives > 0) {
      this.deactivateToRespawn(time);
      return 'respawning';
    }

    this.deplete();
    return 'depleted';
  }

  isDepleted(): boolean {
    return this.depleted;
  }

  private spawn(x: number, y: number, time: number): void {
    this.enableBody(true, x, y, true, true);
    this.hp = this.maxHp;
    this.lastFireTime = time - Phaser.Math.Between(0, Math.floor(this.fireRateMs * 0.6));
    this.respawnAt = -1;
    this.clearTint();
    this.setScale(1);
    this.setAlpha(0.96);

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
  }

  private deactivateToRespawn(time: number): void {
    this.respawnAt = time + this.respawnDelayMs;
    this.disableBody(true, true);
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.enable = false;
    }
    this.clearTint();
  }

  private deplete(): void {
    this.depleted = true;
    this.respawnAt = -1;
    this.disableBody(true, true);

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.enable = false;
    }

    this.clearTint();
  }

  private flashHit(): void {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.active && !this.depleted) {
        this.clearTint();
      }
    });
  }

  private fireShot(bulletPool: BulletPool, effectsManager: EffectsManager): void {
    const speed = Math.abs(BULLET_SPEED);
    const angleAdjustment = Phaser.Math.Clamp(-this.followOffsetX * 0.08, -8, 8);
    const angleRad = Phaser.Math.DegToRad(-90 + angleAdjustment);
    const velocityX = Math.cos(angleRad) * speed;
    const velocityY = Math.sin(angleRad) * speed;

    const muzzleX = this.x;
    const muzzleY = this.y - 12;
    const bullet = bulletPool.fire(muzzleX, muzzleY, velocityX, velocityY);
    if (!bullet) {
      return;
    }

    effectsManager.createMuzzleFlash(muzzleX, muzzleY);
  }
}
