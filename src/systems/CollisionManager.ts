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

export class CollisionManager {
  private scene!: Phaser.Scene;
  private player!: Player;
  private effectsManager!: EffectsManager;
  private enemyPool!: EnemyPool;
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
    this.scene = scene;
    this.player = player;
    this.enemyPool = enemyPool;
    this.terminalTransitionActive = false;
    this.respawnInProgress = false;
    this.lastPlayerHitFeedbackTime = Number.NEGATIVE_INFINITY;

    const bulletGroup = bulletPool.getGroup();
    const enemyGroups = enemyPool.getEnemyGroupRegistry();

    enemyGroups.forEach(({ group }) => {
      scene.physics.add.overlap(
        bulletGroup, group,
        (_obj1, _obj2) => this.bulletVsEnemy(_obj1 as Bullet, _obj2 as EnemyBase)
      );
    });

    // Bullets vs Asteroids
    scene.physics.add.overlap(
      bulletGroup, asteroidGroup,
      (_obj1, _obj2) => {
        const bullet = _obj1 as Bullet;
        const asteroid = _obj2 as Asteroid;
        if (bullet.active && asteroid.active) {
          bullet.kill();
          asteroid.takeDamage(this.bulletDamage);
        }
      }
    );

    // Enemy bullets vs Player
    scene.physics.add.overlap(
      enemyPool.getEnemyBulletGroup(), player,
      (_obj1, _obj2) => {
        const eBullet = _obj1 as EnemyBullet;
        if (eBullet.active && this.canProcessPlayerCollision()) {
          eBullet.kill();
          const damageOutcome = player.takeDamage(1);
          if (damageOutcome === 'fatal') {
            this.onPlayerFatalHit();
          } else if (this.shouldEmitPlayerHit(damageOutcome)) {
            this.onPlayerHit();
          }
        }
      }
    );

    // Bombs vs Player
    scene.physics.add.overlap(
      enemyPool.getBombGroup(), player,
      (_obj1, _obj2) => {
        const bomb = _obj1 as BomberBomb;
        if (bomb.active && this.canProcessPlayerCollision()) {
          const impactX = bomb.x;
          const impactY = bomb.y;
          bomb.kill();
          const damageOutcome = player.takeDamage(2);
          this.effectsManager.createExplosion(impactX, impactY, 1.5);
          if (damageOutcome === 'fatal') {
            this.onPlayerFatalHit();
          } else if (this.shouldEmitPlayerHit(damageOutcome)) {
            this.onPlayerHit();
          }
        }
      }
    );

    // All enemy types vs Player (contact damage)
    enemyGroups.forEach(({ group, playerCollisionBehavior }) => {
      if (playerCollisionBehavior === 'none') {
        return;
      }

      this.setupEnemyPlayerCollision(group, playerCollisionBehavior);
    });

    // Asteroids vs Player
    scene.physics.add.overlap(
      asteroidGroup, player,
      (_obj1, _obj2) => {
        const asteroid = _obj1 as Asteroid;
        if (asteroid.active && this.canProcessPlayerCollision()) {
          const damageOutcome = player.takeDamage(1);
          asteroid.die();
          if (damageOutcome === 'fatal') {
            this.onPlayerFatalHit();
          } else if (this.shouldEmitPlayerHit(damageOutcome)) {
            this.onPlayerHit();
          }
        }
      }
    );
  }

  private setupEnemyPlayerCollision(
    group: Phaser.Physics.Arcade.Group,
    playerCollisionBehavior: 'kamikaze' | 'impact'
  ): void {
    this.scene.physics.add.overlap(
      group, this.player,
      (_obj1, _obj2) => {
        const enemy = _obj1 as EnemyBase;
        if (enemy.active && this.canProcessPlayerCollision()) {
          const damageOutcome = this.player.takeDamage(1);
          if (playerCollisionBehavior === 'kamikaze') {
            enemy.die();
          } else {
            enemy.takeDamage(1);
          }
          if (damageOutcome === 'fatal') {
            this.onPlayerFatalHit();
          } else if (this.shouldEmitPlayerHit(damageOutcome)) {
            this.onPlayerHit();
          }
        }
      }
    );
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
  }

  private bulletVsEnemy(bullet: Bullet, enemy: EnemyBase): void {
    if (bullet.active && enemy.active) {
      bullet.kill();
      enemy.takeDamage(this.bulletDamage);
      this.onEnemyHit(enemy);
    }
  }

  private onEnemyHit(enemy: EnemyBase): void {
    if (!enemy.active) {
      this.effectsManager.createExplosion(enemy.x, enemy.y, 1.0);
    } else {
      this.effectsManager.createSparkBurst(enemy.x, enemy.y);
    }
  }

  private canProcessPlayerCollision(): boolean {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    return !this.terminalTransitionActive && !this.respawnInProgress && this.player.isAlive && !!body && body.enable;
  }

  private shouldEmitPlayerHit(damageOutcome: PlayerDamageOutcome): boolean {
    return damageOutcome === 'absorbed' || damageOutcome === 'damaged';
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
    group.getChildren().forEach(child => {
      const sprite = child as EnemyBullet | BomberBomb;
      if (sprite.active) {
        sprite.kill();
      }
    });
  }

  private runBestEffort(effect: () => void): void {
    try {
      effect();
    } catch {
      // Keep collision handling alive even if optional hit feedback fails.
    }
  }
}
