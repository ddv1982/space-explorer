import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { EnemyBullet } from '../entities/EnemyBullet';
import { EnemyBase } from '../entities/enemies/EnemyBase';
import { Boss } from '../entities/enemies/Boss';
import { Asteroid } from '../entities/Asteroid';
import { resolveCollisionTarget } from '../utils/resolveCollisionTarget';
import { routePlayerDamageOutcome } from './collision/playerDamagePolicy';
import { clearHazardGroup } from './collision/clearHazardGroup';
import { registerCollisionOverlaps } from './collision/registerCollisionOverlaps';
import { runBestEffort } from '../utils/runBestEffort';
import { BulletPool } from './BulletPool';
import { EnemyPool } from './EnemyPool';
import { EffectsManager } from './EffectsManager';
import { BomberBomb } from '../entities/BomberBomb';
import { Mine } from '../entities/Mine';
import { HazardBeam } from '../entities/HazardBeam';
import type { HazardBeamSystem } from './HazardBeamSystem';
import { GAME_SCENE_EVENTS } from './GameplayFlow';
import { getGameplayDifficultyProfile } from '../config/gameplayDifficulty';

export class CollisionManager {
  private scene!: Phaser.Scene;
  private player!: Player;
  private effectsManager!: EffectsManager;
  private enemyPool!: EnemyPool;
  private asteroidGroup!: Phaser.Physics.Arcade.Group;
  private bulletDamage: number = 1;
  private hazardBeamSystem: HazardBeamSystem | null = null;
  private terminalTransitionActive: boolean = false;
  private respawnInProgress: boolean = false;
  private lastPlayerHitFeedbackTime: number = Number.NEGATIVE_INFINITY;
  private readonly playerHitFeedbackCooldownMs: number = 75;
  private getHullDamageMultiplier: () => number = () => getGameplayDifficultyProfile().hullDamageMultiplier;

  setup(
    scene: Phaser.Scene,
    player: Player,
    bulletPool: BulletPool,
    enemyPool: EnemyPool,
    asteroidGroup: Phaser.Physics.Arcade.Group,
    hazardBeamSystem?: HazardBeamSystem,
    getHullDamageMultiplier: () => number = () => getGameplayDifficultyProfile().hullDamageMultiplier
  ): void {
    this.assignSetupContext(scene, player, enemyPool, asteroidGroup);
    this.hazardBeamSystem = hazardBeamSystem ?? null;
    this.getHullDamageMultiplier = getHullDamageMultiplier;

    registerCollisionOverlaps({
      scene,
      player,
      bulletPool,
      enemyPool,
      asteroidGroup,
      hazardBeamSystem: this.hazardBeamSystem,
      callbacks: {
        bulletEnemy: (...values) => this.bulletVsEnemy(...values),
        bulletAsteroid: (...values) => this.handleBulletAsteroidOverlap(...values),
        enemyBulletPlayer: (...values) => this.handleEnemyBulletPlayerOverlap(...values),
        bombPlayer: (...values) => this.handleBombPlayerOverlap(...values),
        minePlayer: (...values) => this.handleMinePlayerOverlap(...values),
        bulletMine: (...values) => this.handleBulletMineOverlap(...values),
        beamPlayer: (...values) => this.handleHazardBeamPlayerOverlap(...values),
        beamBullet: (...values) => this.handleHazardBeamBulletClear(...values),
        enemyBulletAsteroid: (...values) => this.handleEnemyBulletAsteroidOverlap(...values),
        bombAsteroid: (...values) => this.handleBombAsteroidOverlap(...values),
        mineAsteroid: (...values) => this.handleMineAsteroidOverlap(...values),
        enemyPlayer: (behavior, ...values) => this.handleEnemyPlayerCollision(values[0], values[1], behavior),
        asteroidPlayer: (...values) => this.handleAsteroidPlayerOverlap(...values),
      },
    });
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
    this.clearHazardGroup(this.enemyPool.getMineGroup());
    this.clearHazardGroup(this.asteroidGroup);

    if (this.hazardBeamSystem) {
      this.clearHazardGroup(this.hazardBeamSystem.getGroup());
    }
  }

  private bulletVsEnemy(...values: unknown[]): void {
    const bullet = resolveCollisionTarget(Bullet, ...values);
    const enemy = resolveCollisionTarget(EnemyBase, ...values);

    if (bullet?.active && enemy?.active) {
      bullet.kill();
      if (enemy instanceof Boss) {
        enemy.takePlayerDamage(this.bulletDamage, this.scene.time.now);
      } else {
        enemy.takeDamage(this.bulletDamage);
      }
      this.onEnemyHit(enemy);
    }
  }

  private handleBulletAsteroidOverlap(...values: unknown[]): void {
    const bullet = resolveCollisionTarget(Bullet, ...values);
    const asteroid = resolveCollisionTarget(Asteroid, ...values);
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
    const enemyBullet = resolveCollisionTarget(EnemyBullet, ...values);
    if (!(enemyBullet?.active && this.canProcessPlayerCollision())) {
      return;
    }

    this.processAcceptedPlayerDamage({
      amount: 1,
      beforeDamage: () => enemyBullet.kill(),
    });
  }

  private handleBombPlayerOverlap(...values: unknown[]): void {
    const bomb = resolveCollisionTarget(BomberBomb, ...values);
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

  private handleBulletMineOverlap(...values: unknown[]): void {
    const bullet = resolveCollisionTarget(Bullet, ...values);
    const mine = resolveCollisionTarget(Mine, ...values);
    if (!(bullet?.active && mine?.active)) {
      return;
    }

    bullet.kill();
    mine.takeDamage(this.bulletDamage);
    if (!mine.active) {
      this.effectsManager.createExplosion(mine.x, mine.y, 0.9);
    }
  }

  private handleMinePlayerOverlap(...values: unknown[]): void {
    const mine = resolveCollisionTarget(Mine, ...values);
    if (!(mine?.active && this.canProcessPlayerCollision())) {
      return;
    }

    const impactX = mine.x;
    const impactY = mine.y;

    this.processAcceptedPlayerDamage({
      amount: 2,
      beforeDamage: () => mine.kill(),
      afterDamage: () => this.effectsManager.createExplosion(impactX, impactY, 1.5),
    });
  }

  private handleMineAsteroidOverlap(...values: unknown[]): void {
    const mine = resolveCollisionTarget(Mine, ...values);
    const asteroid = resolveCollisionTarget(Asteroid, ...values);
    if (!(mine?.active && asteroid?.active && asteroid.blocksEnemyProjectiles())) {
      return;
    }

    mine.kill();
    asteroid.takeDamage(1);
    this.effectsManager.createSparkBurst(asteroid.x, asteroid.y);
    if (!asteroid.active) {
      this.effectsManager.createAsteroidDebris(asteroid.x, asteroid.y);
    }
  }

  private handleHazardBeamPlayerOverlap(...values: unknown[]): void {
    const beam = resolveCollisionTarget(HazardBeam, ...values);
    if (!(beam?.active && beam.isDamageActive() && this.canProcessPlayerCollision())) {
      return;
    }

    this.processAcceptedPlayerDamage({
      amount: beam.getDamage(),
      afterDamage: () => this.effectsManager.createSparkBurst(this.player.x, this.player.y),
    });
  }

  private handleHazardBeamBulletClear(...values: unknown[]): void {
    const beam = resolveCollisionTarget(HazardBeam, ...values);
    const enemyBullet = resolveCollisionTarget(EnemyBullet, ...values);
    if (!(beam?.active && beam.isDamageActive() && beam.getClearsBullets() && enemyBullet?.active)) {
      return;
    }

    enemyBullet.kill();
    this.effectsManager.createSparkBurst(enemyBullet.x, enemyBullet.y);
  }

  private handleEnemyBulletAsteroidOverlap(...values: unknown[]): void {
    const enemyBullet = resolveCollisionTarget(EnemyBullet, ...values);
    const asteroid = resolveCollisionTarget(Asteroid, ...values);
    if (!(enemyBullet?.active && asteroid?.active && asteroid.blocksEnemyProjectiles())) {
      return;
    }

    enemyBullet.kill();
    asteroid.takeDamage(1);
    this.effectsManager.createSparkBurst(asteroid.x, asteroid.y);
    if (!asteroid.active) {
      this.effectsManager.createAsteroidDebris(asteroid.x, asteroid.y);
    }
  }

  private handleBombAsteroidOverlap(...values: unknown[]): void {
    const bomb = resolveCollisionTarget(BomberBomb, ...values);
    const asteroid = resolveCollisionTarget(Asteroid, ...values);
    if (!(bomb?.active && asteroid?.active && asteroid.blocksEnemyProjectiles())) {
      return;
    }

    const impactX = bomb.x;
    const impactY = bomb.y;

    bomb.kill();
    asteroid.takeDamage(2);
    this.effectsManager.createExplosion(impactX, impactY, 1.15);
    if (!asteroid.active) {
      this.effectsManager.createAsteroidDebris(asteroid.x, asteroid.y);
    }
  }

  private handleEnemyPlayerCollision(
    obj1: unknown,
    obj2: unknown,
    playerCollisionBehavior: 'kamikaze' | 'impact'
  ): void {
    const enemy = resolveCollisionTarget(EnemyBase, obj1, obj2);
    if (!(enemy?.active && this.canProcessPlayerCollision())) {
      return;
    }

    this.processAcceptedPlayerDamage({
      amount: 1,
      afterDamage: () => this.applyEnemyContactOutcome(enemy, playerCollisionBehavior),
    });
  }

  private applyEnemyContactOutcome(enemy: EnemyBase, playerCollisionBehavior: 'kamikaze' | 'impact'): void {
    if (playerCollisionBehavior === 'kamikaze') {
      enemy.die();
      return;
    }

    enemy.takeDamage(1);
  }

  private handleAsteroidPlayerOverlap(...values: unknown[]): void {
    const asteroid = resolveCollisionTarget(Asteroid, ...values);
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
      this.effectsManager.createEnemyExplosion(enemy.x, enemy.y, enemy.enemyType, 1.0);
    } else {
      this.effectsManager.createSparkBurst(enemy.x, enemy.y);
      this.effectsManager.createHitSplash(enemy.x, enemy.y);
    }
  }

  private canProcessPlayerCollision(): boolean {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    return !this.terminalTransitionActive && !this.respawnInProgress && this.player.isAlive && !!body && body.enable;
  }

  private processAcceptedPlayerDamage(options: {
    amount: number;
    beforeDamage?: () => void;
    afterDamage?: () => void;
  }): void {
    options.beforeDamage?.();

    const damageOutcome = this.player.takeDamage(options.amount * this.getHullDamageMultiplier());

    options.afterDamage?.();

    const route = routePlayerDamageOutcome(damageOutcome);
    if (route === 'fatal-transition') {
      this.onPlayerFatalHit();
      return;
    }

    if (route === 'hit-feedback') {
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

    runBestEffort(() => this.effectsManager.createSparkBurst(this.player.x, this.player.y));
    runBestEffort(() => this.scene.events.emit(GAME_SCENE_EVENTS.playerHit));
  }

  private onPlayerFatalHit(): void {
    if (this.respawnInProgress) {
      return;
    }

    runBestEffort(() => this.scene.events.emit(GAME_SCENE_EVENTS.playerFatalHit));
  }

  private clearHazardGroup(group: Phaser.Physics.Arcade.Group): void {
    clearHazardGroup(group);
  }
}
