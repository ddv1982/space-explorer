import Phaser from 'phaser';
import { EnemyPool } from './EnemyPool';
import { Asteroid } from '../entities/Asteroid';
import { GAME_WIDTH } from '../utils/constants';
import { LevelConfig, getLevelConfig, EnemyType } from '../config/LevelsConfig';

interface SpawnEntry {
  type: EnemyType;
  cumulativeWeight: number;
}

export class WaveManager {
  private scene!: Phaser.Scene;
  private enemyPool!: EnemyPool;
  private asteroidGroup!: Phaser.Physics.Arcade.Group;
  private lastScoutSpawn: number = 0;
  private lastFighterSpawn: number = 0;
  private lastBomberSpawn: number = 0;
  private lastSwarmSpawn: number = 0;
  private lastGunshipSpawn: number = 0;
  private lastAsteroidSpawn: number = 0;
  private levelConfig!: LevelConfig;

  create(scene: Phaser.Scene, enemyPool: EnemyPool): Phaser.Physics.Arcade.Group {
    this.scene = scene;
    this.enemyPool = enemyPool;

    this.asteroidGroup = scene.physics.add.group({
      maxSize: 20,
      classType: Asteroid,
      runChildUpdate: true,
    });

    return this.asteroidGroup;
  }

  setLevelConfig(levelNumber: number): void {
    this.levelConfig = getLevelConfig(levelNumber);
  }

  update(time: number, delta: number, progress: number): void {
    if (!this.levelConfig) return;

    const rateMultiplier = this.levelConfig.spawnRateMultiplier;

    this.spawnEnemiesByConfig(time, rateMultiplier);
    this.spawnAsteroids(time);
  }

  private spawnEnemiesByConfig(time: number, rateMultiplier: number): void {
    const baseInterval = 2000 / rateMultiplier;

    for (const entry of this.levelConfig.enemies) {
      switch (entry.type) {
        case 'scout':
          if (time > this.lastScoutSpawn + baseInterval) {
            this.lastScoutSpawn = time;
            const count = Phaser.Math.Between(1, 2);
            for (let i = 0; i < count; i++) {
              this.enemyPool.spawnScout(
                Phaser.Math.Between(50, GAME_WIDTH - 50),
                Phaser.Math.Between(-100, -30)
              );
            }
          }
          break;

        case 'fighter':
          if (time > this.lastFighterSpawn + baseInterval * 1.5) {
            this.lastFighterSpawn = time;
            this.enemyPool.spawnFighter(
              Phaser.Math.Between(100, GAME_WIDTH - 100),
              Phaser.Math.Between(-80, -30)
            );
          }
          break;

        case 'bomber':
          if (time > this.lastBomberSpawn + baseInterval * 2.0) {
            this.lastBomberSpawn = time;
            this.enemyPool.spawnBomber(
              Phaser.Math.Between(80, GAME_WIDTH - 80),
              Phaser.Math.Between(-80, -30)
            );
          }
          break;

        case 'swarm':
          if (time > this.lastSwarmSpawn + baseInterval * 1.8) {
            this.lastSwarmSpawn = time;
            const count = Phaser.Math.Between(3, 5);
            const baseX = Phaser.Math.Between(100, GAME_WIDTH - 100);
            for (let i = 0; i < count; i++) {
              this.enemyPool.spawnSwarm(
                baseX + Phaser.Math.Between(-60, 60),
                Phaser.Math.Between(-120, -30)
              );
            }
          }
          break;

        case 'gunship':
          if (time > this.lastGunshipSpawn + baseInterval * 2.5) {
            this.lastGunshipSpawn = time;
            this.enemyPool.spawnGunship(
              Phaser.Math.Between(120, GAME_WIDTH - 120),
              Phaser.Math.Between(-80, -30)
            );
          }
          break;
      }
    }
  }

  private spawnAsteroids(time: number): void {
    const interval = this.levelConfig?.asteroidInterval ?? 5000;
    if (time > this.lastAsteroidSpawn + interval) {
      this.lastAsteroidSpawn = time;
      const asteroid = this.asteroidGroup.getFirstDead(false) as Asteroid | null;
      if (asteroid) {
        asteroid.spawn(
          Phaser.Math.Between(50, GAME_WIDTH - 50),
          -50,
          Phaser.Math.Between(60, 120)
        );
      }
    }
  }

  getAsteroidGroup(): Phaser.Physics.Arcade.Group {
    return this.asteroidGroup;
  }
}
