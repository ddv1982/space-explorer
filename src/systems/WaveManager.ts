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
  private spawnEntries: SpawnEntry[] = [];
  private totalEnemyWeight: number = 0;
  private lastEncounterSpawn: number = 0;
  private lastAsteroidSpawn: number = 0;
  private levelConfig!: LevelConfig;

  private acquireAsteroid(x: number, y: number): Asteroid | null {
    const existing = this.asteroidGroup.getFirstDead(false) as Asteroid | null;
    if (existing) {
      return existing;
    }

    return this.asteroidGroup.get(x, y) as Asteroid | null;
  }

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
    this.lastEncounterSpawn = 0;
    this.lastAsteroidSpawn = 0;
    this.buildSpawnTable();
  }

  update(time: number, delta: number, progress: number): void {
    if (!this.levelConfig) return;

    const rateMultiplier = this.getEncounterRateMultiplier(progress);

    this.spawnEnemiesByConfig(time, rateMultiplier);
    this.spawnAsteroids(time);
  }

  private emitSpawnWarning(x: number): void {
    this.scene.events.emit('enemy-spawn-warning', x);
  }

  private buildSpawnTable(): void {
    let cumulativeWeight = 0;

    this.spawnEntries = this.levelConfig.enemies
      .filter((entry) => entry.weight > 0)
      .map((entry) => {
        cumulativeWeight += entry.weight;
        return {
          type: entry.type,
          cumulativeWeight,
        };
      });

    this.totalEnemyWeight = cumulativeWeight;
  }

  private pickEnemyType(): EnemyType | null {
    if (this.totalEnemyWeight <= 0) {
      return null;
    }

    const roll = Phaser.Math.Between(1, this.totalEnemyWeight);
    const match = this.spawnEntries.find((entry) => roll <= entry.cumulativeWeight);
    return match?.type ?? this.spawnEntries[this.spawnEntries.length - 1]?.type ?? null;
  }

  private getEncounterSpawnX(anchorX: number, padding: number): number {
    return Phaser.Math.Clamp(
      anchorX + Phaser.Math.Between(-70, 70),
      padding,
      GAME_WIDTH - padding
    );
  }

  private getEncounterRateMultiplier(progress: number): number {
    const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);
    const rampProgress = Phaser.Math.Easing.Cubic.In(clampedProgress);
    const intensityMultiplier = Phaser.Math.Linear(1, 1.5, rampProgress);

    return this.levelConfig.spawnRateMultiplier * intensityMultiplier;
  }

  private spawnEnemyByType(type: EnemyType, anchorX: number): boolean {
    switch (type) {
      case 'scout': {
        const count = Phaser.Math.Between(1, 2);
        let spawnedAny = false;

        for (let i = 0; i < count; i++) {
          const spawnX = this.getEncounterSpawnX(anchorX, 50);
          const scout = this.enemyPool.spawnScout(
            spawnX,
            Phaser.Math.Between(-100, -30)
          );
          spawnedAny = spawnedAny || Boolean(scout);
        }

        return spawnedAny;
      }

      case 'fighter': {
        const spawnX = this.getEncounterSpawnX(anchorX, 100);
        return Boolean(this.enemyPool.spawnFighter(
          spawnX,
          Phaser.Math.Between(-80, -30)
        ));
      }

      case 'bomber': {
        const spawnX = this.getEncounterSpawnX(anchorX, 80);
        return Boolean(this.enemyPool.spawnBomber(
          spawnX,
          Phaser.Math.Between(-80, -30)
        ));
      }

      case 'swarm': {
        const baseX = this.getEncounterSpawnX(anchorX, 100);
        const count = Phaser.Math.Between(3, 5);
        let spawnedAny = false;

        for (let i = 0; i < count; i++) {
          const spawnX = Phaser.Math.Clamp(
            baseX + Phaser.Math.Between(-60, 60),
            50,
            GAME_WIDTH - 50
          );
          const swarm = this.enemyPool.spawnSwarm(
            spawnX,
            Phaser.Math.Between(-120, -30)
          );
          spawnedAny = spawnedAny || Boolean(swarm);
        }

        return spawnedAny;
      }

      case 'gunship': {
        const spawnX = this.getEncounterSpawnX(anchorX, 120);
        return Boolean(this.enemyPool.spawnGunship(
          spawnX,
          Phaser.Math.Between(-80, -30)
        ));
      }
    }
  }

  private spawnEnemiesByConfig(time: number, rateMultiplier: number): void {
    const encounterInterval = 2000 / rateMultiplier;
    if (time <= this.lastEncounterSpawn + encounterInterval) {
      return;
    }

    this.lastEncounterSpawn = time;

    const anchorX = Phaser.Math.Between(120, GAME_WIDTH - 120);
    const encounterCount = Phaser.Math.Between(
      this.levelConfig.encounterSize.min,
      this.levelConfig.encounterSize.max
    );
    let spawnedAny = false;

    for (let i = 0; i < encounterCount; i++) {
      const enemyType = this.pickEnemyType();
      if (!enemyType) {
        continue;
      }

      spawnedAny = this.spawnEnemyByType(enemyType, anchorX) || spawnedAny;
    }

    if (spawnedAny) {
      this.emitSpawnWarning(anchorX);
    }
  }

  private spawnAsteroids(time: number): void {
    const interval = this.levelConfig?.asteroidInterval ?? 5000;
    if (time > this.lastAsteroidSpawn + interval) {
      this.lastAsteroidSpawn = time;
      const spawnX = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const asteroid = this.acquireAsteroid(spawnX, -50);
      if (asteroid) {
        asteroid.spawn(
          spawnX,
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
