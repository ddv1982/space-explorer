import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { EnemyBullet } from '../entities/EnemyBullet';
import { EnemyBase } from '../entities/enemies/EnemyBase';
import { Asteroid } from '../entities/Asteroid';
import { BulletPool } from './BulletPool';
import { EnemyPool } from './EnemyPool';
import { EffectsManager } from './EffectsManager';

export class CollisionManager {
  private scene!: Phaser.Scene;
  private player!: Player;
  private effectsManager!: EffectsManager;
  private enemyPool!: EnemyPool;
  private bulletDamage: number = 1;

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

    const bulletGroup = bulletPool.getGroup();

    // Bullets vs Scouts
    scene.physics.add.overlap(
      bulletGroup, enemyPool.getScoutGroup(),
      (_obj1, _obj2) => this.bulletVsEnemy(_obj1 as Bullet, _obj2 as EnemyBase)
    );

    // Bullets vs Fighters
    scene.physics.add.overlap(
      bulletGroup, enemyPool.getFighterGroup(),
      (_obj1, _obj2) => this.bulletVsEnemy(_obj1 as Bullet, _obj2 as EnemyBase)
    );

    // Bullets vs Bombers
    scene.physics.add.overlap(
      bulletGroup, enemyPool.getBomberGroup(),
      (_obj1, _obj2) => this.bulletVsEnemy(_obj1 as Bullet, _obj2 as EnemyBase)
    );

    // Bullets vs Swarm
    scene.physics.add.overlap(
      bulletGroup, enemyPool.getSwarmGroup(),
      (_obj1, _obj2) => this.bulletVsEnemy(_obj1 as Bullet, _obj2 as EnemyBase)
    );

    // Bullets vs Gunships
    scene.physics.add.overlap(
      bulletGroup, enemyPool.getGunshipGroup(),
      (_obj1, _obj2) => this.bulletVsEnemy(_obj1 as Bullet, _obj2 as EnemyBase)
    );

    // Bullets vs Boss
    scene.physics.add.overlap(
      bulletGroup, enemyPool.getBossGroup(),
      (_obj1, _obj2) => this.bulletVsEnemy(_obj1 as Bullet, _obj2 as EnemyBase)
    );

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
        if (eBullet.active && player.isAlive) {
          eBullet.kill();
          player.takeDamage(1);
          this.onPlayerHit();
        }
      }
    );

    // Bombs vs Player
    scene.physics.add.overlap(
      enemyPool.getBombGroup(), player,
      (_obj1, _obj2) => {
        const bomb = _obj1 as Phaser.Physics.Arcade.Sprite;
        if (bomb.active && player.isAlive) {
          bomb.setActive(false);
          bomb.setVisible(false);
          bomb.setVelocity(0, 0);
          (bomb.body as Phaser.Physics.Arcade.Body).reset(0, 0);
          player.takeDamage(2);
          this.effectsManager.createExplosion(bomb.x, bomb.y, 1.5);
          this.onPlayerHit();
        }
      }
    );

    // All enemy types vs Player (contact damage)
    this.setupEnemyPlayerCollision(enemyPool.getScoutGroup(), true);
    this.setupEnemyPlayerCollision(enemyPool.getFighterGroup(), false);
    this.setupEnemyPlayerCollision(enemyPool.getBomberGroup(), false);
    this.setupEnemyPlayerCollision(enemyPool.getSwarmGroup(), true);
    this.setupEnemyPlayerCollision(enemyPool.getGunshipGroup(), false);

    // Asteroids vs Player
    scene.physics.add.overlap(
      asteroidGroup, player,
      (_obj1, _obj2) => {
        const asteroid = _obj1 as Asteroid;
        if (asteroid.active && player.isAlive) {
          player.takeDamage(1);
          asteroid.die();
          this.onPlayerHit();
        }
      }
    );
  }

  private setupEnemyPlayerCollision(group: Phaser.Physics.Arcade.Group, kamikaze: boolean): void {
    this.scene.physics.add.overlap(
      group, this.player,
      (_obj1, _obj2) => {
        const enemy = _obj1 as EnemyBase;
        if (enemy.active && this.player.isAlive) {
          this.player.takeDamage(1);
          if (kamikaze) {
            enemy.die();
          } else {
            enemy.takeDamage(1);
          }
          this.onPlayerHit();
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

  private onPlayerHit(): void {
    this.effectsManager.createSparkBurst(this.player.x, this.player.y);
    this.scene.cameras.main.shake(200, 0.01);
    this.scene.events.emit('player-hit');
  }
}
