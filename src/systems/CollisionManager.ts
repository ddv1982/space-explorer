import Phaser from 'phaser';
import { Player, type PlayerDamageOutcome } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { EnemyBullet } from '../entities/EnemyBullet';
import { EnemyBase } from '../entities/enemies/EnemyBase';
import { Asteroid } from '../entities/Asteroid';
import { BulletPool } from './BulletPool';
import { EnemyPool } from './EnemyPool';
import { EffectsManager } from './EffectsManager';
import { BomberBomb } from '../entities/BomberBomb';
import { GAME_SCENE_EVENTS } from './GameplayFlow';

type CollisionTargetCtor<T> = abstract new (...args: never[]) => T;

export class CollisionManager {
  private scene!: Phaser.Scene;
  private player!: Player;
  private effectsManager!: EffectsManager;
  private enemyPool!: EnemyPool;
  private asteroidGroup!: Phaser.Physics.Arcade.Group;
  private bulletDamage: number = 1;
  private terminalTransitionActive: boolean = false;
  private respawnInProgress: boolean = false;
  private lastPlayerHitFeedbackTime: number = Number.NEGATIVE_INFINITY;
  private readonly playerHitFeedbackCooldownMs: number = 75;

  setup(
    scene: Phaser.Scene,
    player: Player,
    bulletPool: BulletPool,
    enemyPool: EnemyPool,
    asteroidGroup: Phaser.Physics.Arcade.Group
  ): void {
    this.assignSetupContext(scene, player, enemyPool, asteroidGroup);

    const bulletGroup = bulletPool.getGroup();
    const enemyGroups = enemyPool.getEnemyGroupRegistry();

    this.registerBulletEnemyOverlaps(bulletGroup, enemyGroups);
    this.registerBulletAsteroidOverlap(bulletGroup, asteroidGroup);
    this.registerEnemyBulletPlayerOverlap(enemyPool.getEnemyBulletGroup(), player);
    this.registerBombPlayerOverlap(enemyPool.getBombGroup(), player);
    this.registerEnemyPlayerOverlaps(enemyGroups);
    this.registerAsteroidPlayerOverlap(asteroidGroup, player);
  }

  private assignSetupContext(
    scene: Phaser.Scene,
    player: Player,
    enemyPool: EnemyPool,
    asteroidGroup: Phaser.Physics.Arcade.Group
  ): void {
    this.scene = scene;
    this.player = player;
    this.enemyPool = enemyPool;
    this.asteroidGroup = asteroidGroup;
    this.terminalTransitionActive = false;
    this.respawnInProgress = false;
    this.lastPlayerHitFeedbackTime = Number.NEGATIVE_INFINITY;
  }

  private registerBulletEnemyOverlaps(
    bulletGroup: Phaser.Physics.Arcade.Group,
    enemyGroups: ReturnType<EnemyPool['getEnemyGroupRegistry']>
  ): void {
    enemyGroups.forEach(({ group }) => {
      this.registerOverlap(bulletGroup, group, (_obj1, _obj2) => this.bulletVsEnemy(_obj1, _obj2));
    });
  }

  private registerBulletAsteroidOverlap(
    bulletGroup: Phaser.Physics.Arcade.Group,
    asteroidGroup: Phaser.Physics.Arcade.Group
  ): void {
    this.registerOverlap(bulletGroup, asteroidGroup, (_obj1, _obj2) => {
      this.handleBulletAsteroidOverlap(_obj1, _obj2);
    });
  }

  private registerEnemyBulletPlayerOverlap(
    enemyBulletGroup: Phaser.Physics.Arcade.Group,
    player: Player
  ): void {
    this.registerOverlap(enemyBulletGroup, player, (_obj1, _obj2) => {
      this.handleEnemyBulletPlayerOverlap(_obj1, _obj2);
    });
  }

  private registerBombPlayerOverlap(
    bombGroup: Phaser.Physics.Arcade.Group,
    player: Player
  ): void {
    this.registerOverlap(bombGroup, player, (_obj1, _obj2) => {
      this.handleBombPlayerOverlap(_obj1, _obj2);
    });
  }

  private registerEnemyPlayerOverlaps(
    enemyGroups: ReturnType<EnemyPool['getEnemyGroupRegistry']>
  ): void {
    enemyGroups.forEach(({ group, playerCollisionBehavior }) => {
      if (playerCollisionBehavior === 'none') {
        return;
      }

      this.setupEnemyPlayerCollision(group, playerCollisionBehavior);
    });
  }

  private registerAsteroidPlayerOverlap(
    asteroidGroup: Phaser.Physics.Arcade.Group,
    player: Player
  ): void {
    this.registerOverlap(asteroidGroup, player, (_obj1, _obj2) => {
      this.handleAsteroidPlayerOverlap(_obj1, _obj2);
    });
  }

  private registerOverlap(
    a: unknown,
    b: unknown,
    callback: (obj1: unknown, obj2: unknown) => void
  ): void {
    this.scene.physics.add.overlap(a as never, b as never, callback);
  }

  private setupEnemyPlayerCollision(
    group: Phaser.Physics.Arcade.Group,
    playerCollisionBehavior: 'kamikaze' | 'impact'
  ): void {
    this.registerOverlap(group, this.player, (_obj1, _obj2) => {
      this.handleEnemyPlayerCollision(_obj1, _obj2, playerCollisionBehavior);
    });
  }

  setEffectsManager(effectsManager: EffectsManager): void {
    this.effectsManager = effectsManager;
  }

  setBulletDamage(damage: number): void {
    this.bulletDamage = damage;
  }

  setTerminalTransitionActive(active: boolean): void {
    this.terminalTransitionActive = active;
  }

  setRespawnInProgress(active: boolean): void {
    this.respawnInProgress = active;
  }

  clearPlayerHazards(): void {
    this.clearHazardGroup(this.enemyPool.getEnemyBulletGroup());
    this.clearHazardGroup(this.enemyPool.getBombGroup());
    this.clearHazardGroup(this.asteroidGroup);
  }

  private bulletVsEnemy(...values: unknown[]): void {
    const bullet = this.resolveCollisionTarget(Bullet, ...values);
    const enemy = this.resolveCollisionTarget(EnemyBase, ...values);

    if (bullet?.active && enemy?.active) {
      bullet.kill();
      enemy.takeDamage(this.bulletDamage);
      this.onEnemyHit(enemy);
    }
  }

  private handleBulletAsteroidOverlap(...values: unknown[]): void {
    const bullet = this.resolveCollisionTarget(Bullet, ...values);
    const asteroid = this.resolveCollisionTarget(Asteroid, ...values);
    if (!(bullet?.active && asteroid?.active)) {
      return;
    }

    bullet.kill();
    asteroid.takeDamage(this.bulletDamage);
    this.effectsManager.createSparkBurst(asteroid.x, asteroid.y);
    if (!asteroid.active) {
      this.effectsManager.createAsteroidDebris(asteroid.x, asteroid.y);
    }
  }

  private handleEnemyBulletPlayerOverlap(...values: unknown[]): void {
    const enemyBullet = this.resolveCollisionTarget(EnemyBullet, ...values);
    if (!(enemyBullet?.active && this.canProcessPlayerCollision())) {
      return;
    }

    this.processAcceptedPlayerDamage({
      amount: 1,
      beforeDamage: () => enemyBullet.kill(),
    });
  }

  private handleBombPlayerOverlap(...values: unknown[]): void {
    const bomb = this.resolveCollisionTarget(BomberBomb, ...values);
    if (!(bomb?.active && this.canProcessPlayerCollision())) {
      return;
    }

    const impactX = bomb.x;
    const impactY = bomb.y;

    this.processAcceptedPlayerDamage({
      amount: 2,
      beforeDamage: () => bomb.kill(),
      afterDamage: () => this.effectsManager.createExplosion(impactX, impactY, 1.5),
    });
  }

  private handleEnemyPlayerCollision(
    obj1: unknown,
    obj2: unknown,
    playerCollisionBehavior: 'kamikaze' | 'impact'
  ): void {
    const enemy = this.resolveCollisionTarget(EnemyBase, obj1, obj2);
    if (!(enemy?.active && this.canProcessPlayerCollision())) {
      return;
    }

    this.processAcceptedPlayerDamage({
      amount: 1,
      afterDamage: () => this.applyEnemyContactOutcome(enemy, playerCollisionBehavior),
    });
  }

  private applyEnemyContactOutcome(
    enemy: EnemyBase,
    playerCollisionBehavior: 'kamikaze' | 'impact'
  ): void {
    if (playerCollisionBehavior === 'kamikaze') {
      enemy.die();
      return;
    }

    enemy.takeDamage(1);
  }

  private handleAsteroidPlayerOverlap(...values: unknown[]): void {
    const asteroid = this.resolveCollisionTarget(Asteroid, ...values);
    if (!(asteroid?.active && this.canProcessPlayerCollision())) {
      return;
    }

    this.processAcceptedPlayerDamage({
      amount: asteroid.getCollisionDamage(),
      afterDamage: () => asteroid.onPlayerCollision(),
    });
  }

  private onEnemyHit(enemy: EnemyBase): void {
    if (!enemy.active) {
      this.effectsManager.createExplosion(enemy.x, enemy.y, 1.0);
    } else {
      this.effectsManager.createSparkBurst(enemy.x, enemy.y);
      this.effectsManager.createHitSplash(enemy.x, enemy.y);
    }
  }

  private canProcessPlayerCollision(): boolean {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    return !this.terminalTransitionActive && !this.respawnInProgress && this.player.isAlive && !!body && body.enable;
  }

  private shouldEmitPlayerHit(damageOutcome: PlayerDamageOutcome): boolean {
    return damageOutcome === 'absorbed' || damageOutcome === 'damaged';
  }

  private processAcceptedPlayerDamage(options: {
    amount: number;
    beforeDamage?: () => void;
    afterDamage?: () => void;
  }): void {
    options.beforeDamage?.();

    const damageOutcome = this.player.takeDamage(options.amount);

    options.afterDamage?.();

    if (damageOutcome === 'fatal') {
      this.onPlayerFatalHit();
      return;
    }

    if (this.shouldEmitPlayerHit(damageOutcome)) {
      this.onPlayerHit();
    }
  }

  private onPlayerHit(): void {
    if (this.terminalTransitionActive || this.respawnInProgress) {
      return;
    }

    const now = this.scene.time.now;
    if (now - this.lastPlayerHitFeedbackTime < this.playerHitFeedbackCooldownMs) {
      return;
    }

    this.lastPlayerHitFeedbackTime = now;

    this.runBestEffort(() => this.effectsManager.createSparkBurst(this.player.x, this.player.y));
    this.runBestEffort(() => this.scene.cameras.main.shake(200, 0.01));
    this.runBestEffort(() => this.scene.events.emit(GAME_SCENE_EVENTS.playerHit));
  }

  private onPlayerFatalHit(): void {
    if (this.respawnInProgress) {
      return;
    }

    this.runBestEffort(() => this.scene.events.emit(GAME_SCENE_EVENTS.playerFatalHit));
  }

  private clearHazardGroup(group: Phaser.Physics.Arcade.Group): void {
    this.getHazardChildrenSafely(group).forEach(child => {
      if (!(child instanceof Phaser.GameObjects.GameObject)) {
        return;
      }

      if ('kill' in child && typeof child.kill === 'function') {
        const sprite = child as EnemyBullet | BomberBomb;
        if (sprite.active) {
          sprite.kill();
        }
        return;
      }

      if (child instanceof Asteroid && child.active) {
        child.clear();
      }
    });
  }

  private getHazardChildrenSafely(group: Phaser.Physics.Arcade.Group): Phaser.GameObjects.GameObject[] {
    try {
      return group.getChildren();
    } catch (_error) {
      // Hazard groups may already be invalidated during terminal scene cleanup.
      return [];
    }
  }

  private resolveCollisionTarget<T>(ctor: CollisionTargetCtor<T>, ...values: unknown[]): T | null {
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

  private runBestEffort(effect: () => void): void {
    try {
      effect();
    } catch {
      // Keep collision handling alive even if optional hit feedback fails.
    }
  }
}
