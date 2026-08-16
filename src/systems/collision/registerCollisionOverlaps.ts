import type Phaser from 'phaser';
import type { Player } from '@/entities/Player';
import type { BulletPool } from '@/systems/BulletPool';
import type { EnemyPool } from '@/systems/EnemyPool';
import type { HazardBeamSystem } from '@/systems/HazardBeamSystem';

type CollisionCallback = (...values: unknown[]) => void;

interface CollisionCallbacks {
  bulletEnemy: CollisionCallback;
  bulletAsteroid: CollisionCallback;
  enemyBulletPlayer: CollisionCallback;
  bombPlayer: CollisionCallback;
  minePlayer: CollisionCallback;
  bulletMine: CollisionCallback;
  beamPlayer: CollisionCallback;
  beamBullet: CollisionCallback;
  enemyBulletAsteroid: CollisionCallback;
  bombAsteroid: CollisionCallback;
  mineAsteroid: CollisionCallback;
  enemyPlayer: (behavior: 'kamikaze' | 'impact', ...values: unknown[]) => void;
  asteroidPlayer: CollisionCallback;
}

export interface CollisionOverlapContext {
  scene: Phaser.Scene;
  player: Player;
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  asteroidGroup: Phaser.Physics.Arcade.Group;
  hazardBeamSystem: HazardBeamSystem | null;
  callbacks: CollisionCallbacks;
}

export function registerCollisionOverlaps(context: CollisionOverlapContext): void {
  const { scene, player, bulletPool, enemyPool, asteroidGroup, hazardBeamSystem, callbacks } = context;
  const overlap = (
    first: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    second: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    callback: CollisionCallback
  ): void => {
    scene.physics.add.overlap(first, second, (left, right) => callback(left, right));
  };
  const bullets = bulletPool.getGroup();
  const enemyBullets = enemyPool.getEnemyBulletGroup();
  const bombs = enemyPool.getBombGroup();
  const mines = enemyPool.getMineGroup();

  for (const { group, playerCollisionBehavior } of enemyPool.getEnemyGroupRegistry()) {
    overlap(bullets, group, callbacks.bulletEnemy);
    if (playerCollisionBehavior !== 'none') {
      overlap(group, player, (...values) => callbacks.enemyPlayer(playerCollisionBehavior, ...values));
    }
  }

  overlap(bullets, asteroidGroup, callbacks.bulletAsteroid);
  overlap(enemyBullets, player, callbacks.enemyBulletPlayer);
  overlap(bombs, player, callbacks.bombPlayer);
  overlap(mines, player, callbacks.minePlayer);
  overlap(bullets, mines, callbacks.bulletMine);
  overlap(enemyBullets, asteroidGroup, callbacks.enemyBulletAsteroid);
  overlap(bombs, asteroidGroup, callbacks.bombAsteroid);
  overlap(mines, asteroidGroup, callbacks.mineAsteroid);
  overlap(asteroidGroup, player, callbacks.asteroidPlayer);

  if (hazardBeamSystem) {
    const beams = hazardBeamSystem.getGroup();
    overlap(beams, player, callbacks.beamPlayer);
    overlap(beams, enemyBullets, callbacks.beamBullet);
  }
}
