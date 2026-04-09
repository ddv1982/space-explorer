import Phaser from 'phaser';
import type { LastLifeHelperWingConfig } from '../config/LevelsConfig';
import { Player } from '../entities/Player';
import { BulletPool } from './BulletPool';
import { EnemyPool } from './EnemyPool';
import { EffectsManager } from './EffectsManager';
import { HelperShip } from '../entities/HelperShip';
import { EnemyBullet } from '../entities/EnemyBullet';
import { BomberBomb } from '../entities/BomberBomb';
import { EnemyBase } from '../entities/enemies/EnemyBase';
import { GAME_SCENE_EVENTS } from './GameplayFlow';

interface LastLifeHelperWingContext {
  scene: Phaser.Scene;
  player: Player;
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  effectsManager: EffectsManager;
  config: LastLifeHelperWingConfig | null | undefined;
}

export class LastLifeHelperWing {
  private scene!: Phaser.Scene;
  private player!: Player;
  private bulletPool!: BulletPool;
  private enemyPool!: EnemyPool;
  private effectsManager!: EffectsManager;

  private config: LastLifeHelperWingConfig | null = null;
  private helperGroup: Phaser.Physics.Arcade.Group | null = null;
  private overlapColliders: Phaser.Physics.Arcade.Collider[] = [];
  private helpers: HelperShip[] = [];
  private activated = false;
  private depletedAnnounced = false;

  create(context: LastLifeHelperWingContext): void {
    this.scene = context.scene;
    this.player = context.player;
    this.bulletPool = context.bulletPool;
    this.enemyPool = context.enemyPool;
    this.effectsManager = context.effectsManager;
    this.config = context.config ?? null;

    this.activated = false;
    this.depletedAnnounced = false;
    this.destroyOverlaps();
    this.helpers = [];

    if (!this.config || this.config.shipCount <= 0) {
      this.helperGroup = null;
      return;
    }

    this.helperGroup = this.scene.physics.add.group({
      maxSize: Math.max(1, this.config.shipCount),
      classType: HelperShip,
      runChildUpdate: false,
    });

    this.prewarmHelpers(this.config);
    this.registerOverlaps();
  }

  updateLastLifeState(remainingLives: number): void {
    if (!this.config || this.activated || remainingLives !== 1) {
      return;
    }

    this.activateWing();
  }

  update(time: number): void {
    if (!this.activated || !this.config || this.helpers.length === 0) {
      return;
    }

    for (const helper of this.helpers) {
      helper.updateWithPlayer(this.player, time, this.bulletPool, this.effectsManager);
    }

    if (!this.depletedAnnounced && this.helpers.every((helper) => helper.isDepleted())) {
      this.depletedAnnounced = true;
      this.scene.events.emit(GAME_SCENE_EVENTS.helperWingDepleted);
    }
  }

  destroy(): void {
    this.suspendForTransition();
    this.destroyOverlaps();
    this.helpers = [];
    this.helperGroup?.clear(true, true);
    this.helperGroup = null;
    this.config = null;
    this.activated = false;
    this.depletedAnnounced = false;
  }

  suspendForTransition(): void {
    this.activated = false;
    this.depletedAnnounced = false;

    for (const helper of this.helpers) {
      if (!helper.active) {
        continue;
      }

      helper.disableBody(true, true);
      helper.clearTint();
    }
  }

  private prewarmHelpers(config: LastLifeHelperWingConfig): void {
    if (!this.helperGroup) {
      return;
    }

    const shipCount = Math.max(1, Math.floor(config.shipCount));
    for (let i = 0; i < shipCount; i++) {
      const helper = this.helperGroup.get(-200, -200) as HelperShip | null;
      if (!helper) {
        continue;
      }

      helper.disableBody(true, true);
      this.helpers.push(helper);
    }
  }

  private activateWing(): void {
    if (!this.config || this.helpers.length === 0) {
      return;
    }

    this.activated = true;
    this.depletedAnnounced = false;

    const now = this.scene.time.now;
    const helperHp = Math.max(1, Math.round(this.player.maxHp * this.config.hpScaleFromPlayer));
    const spacing = this.config.spacing ?? 36;
    const followOffsetY = this.config.followOffsetY ?? 16;

    for (let i = 0; i < this.helpers.length; i++) {
      const helper = this.helpers[i];
      const offsetX = (i - (this.helpers.length - 1) / 2) * spacing;

      helper.configure({
        maxHp: helperHp,
        lives: this.config.helperLives,
        fireRateMs: this.config.fireRateMs,
        respawnDelayMs: this.config.respawnDelayMs,
        followOffsetX: offsetX,
        followOffsetY,
      });

      helper.deployNearPlayer(this.player, now);
    }

    this.scene.events.emit(GAME_SCENE_EVENTS.helperWingActivated, this.helpers.length);
  }

  private registerOverlaps(): void {
    if (!this.helperGroup) {
      return;
    }

    const enemyBulletCollider = this.scene.physics.add.overlap(
      this.enemyPool.getEnemyBulletGroup(),
      this.helperGroup,
      (a, b) => this.handleEnemyBulletOverlap(a, b)
    );
    this.overlapColliders.push(enemyBulletCollider);

    const bombCollider = this.scene.physics.add.overlap(
      this.enemyPool.getBombGroup(),
      this.helperGroup,
      (a, b) => this.handleBombOverlap(a, b)
    );
    this.overlapColliders.push(bombCollider);

    for (const { key, group } of this.enemyPool.getEnemyGroupRegistry()) {
      if (key === 'boss') {
        continue;
      }

      const enemyContactCollider = this.scene.physics.add.overlap(
        group,
        this.helperGroup,
        (a, b) => this.handleEnemyContactOverlap(a, b)
      );
      this.overlapColliders.push(enemyContactCollider);
    }
  }

  private destroyOverlaps(): void {
    if (this.overlapColliders.length === 0) {
      return;
    }

    for (const collider of this.overlapColliders) {
      collider.destroy();
    }

    this.overlapColliders = [];
  }

  private handleEnemyBulletOverlap(a: unknown, b: unknown): void {
    const bullet = this.resolveCollisionTarget(EnemyBullet, a, b);
    const helper = this.resolveCollisionTarget(HelperShip, a, b);

    if (!bullet?.active || !helper) {
      return;
    }

    bullet.kill();
    helper.takeDamage(1, this.scene.time.now, this.effectsManager);
  }

  private handleBombOverlap(a: unknown, b: unknown): void {
    const bomb = this.resolveCollisionTarget(BomberBomb, a, b);
    const helper = this.resolveCollisionTarget(HelperShip, a, b);

    if (!bomb?.active || !helper) {
      return;
    }

    const x = bomb.x;
    const y = bomb.y;
    bomb.kill();
    this.effectsManager.createExplosion(x, y, 1.1);
    helper.takeDamage(2, this.scene.time.now, this.effectsManager);
  }

  private handleEnemyContactOverlap(a: unknown, b: unknown): void {
    const enemy = this.resolveCollisionTarget(EnemyBase, a, b);
    const helper = this.resolveCollisionTarget(HelperShip, a, b);

    if (!enemy?.active || !helper) {
      return;
    }

    helper.takeDamage(1, this.scene.time.now, this.effectsManager);
  }

  private resolveCollisionTarget<T>(ctor: abstract new (...args: never[]) => T, ...values: unknown[]): T | null {
    for (const value of values) {
      if (value instanceof ctor) {
        return value;
      }

      if (!value || typeof value !== 'object' || !('gameObject' in value)) {
        continue;
      }

      const { gameObject } = value as { gameObject?: unknown };
      if (gameObject instanceof ctor) {
        return gameObject;
      }
    }

    return null;
  }
}
