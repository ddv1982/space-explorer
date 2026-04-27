import Phaser from 'phaser';
import type { Asteroid, AsteroidSpawnConfig } from '../../entities/Asteroid';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../../config/LevelsConfig';
import { getActiveGameplayBounds } from '../../utils/layout';

const ASTEROID_SPAWN_Y = -50;

export class WaveAsteroidSpawner {
  private corridorGapCenter = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly asteroidGroup: Phaser.Physics.Arcade.Group
  ) {
    this.resetCorridorGapCenter();
  }

  resetCorridorGapCenter(): void {
    this.corridorGapCenter = this.getViewportCenterX();
  }

  spawnAsteroids(
    time: number,
    activeSection: LevelSectionConfig | null,
    levelConfig: LevelConfig,
    lastAsteroidSpawn: number
  ): number {
    const interval = activeSection?.asteroidInterval ?? levelConfig.asteroidInterval;
    if (time <= lastAsteroidSpawn + interval) {
      return lastAsteroidSpawn;
    }

    this.spawnSingleAsteroid(this.getRandomX(50), Phaser.Math.Between(60, 120));
    return time;
  }

  spawnAsteroidBurst(count: number, minSpeed: number, maxSpeed: number, edgePadding: number = 50): void {
    for (let i = 0; i < count; i++) {
      this.spawnSingleAsteroid(this.getRandomX(edgePadding), Phaser.Math.Between(minSpeed, maxSpeed));
    }
  }

  spawnMirroredAsteroids(leftSpeed: number, rightSpeed: number): void {
    const { min, max } = this.getHorizontalRange(70);
    const leftX = Phaser.Math.Between(min, Math.min(max, min + 80));
    const rightX = this.clampX(this.getViewportWidth() - leftX, 70);

    this.spawnSingleAsteroid(leftX, leftSpeed);
    this.spawnSingleAsteroid(rightX, rightSpeed);
  }

  spawnEdgeAsteroids(hazard: ScriptedHazardConfig): void {
    const corridorWidth = Phaser.Math.Clamp(hazard.corridorWidth ?? 190, 150, 240);
    const laneCount = Phaser.Math.Clamp(hazard.laneCount ?? 2, 1, 3);
    const viewportWidth = this.getViewportWidth();
    const viewportCenterX = this.getViewportCenterX();
    const sidePadding = Math.min(170, viewportWidth / 2);

    this.corridorGapCenter = Phaser.Math.Clamp(
      this.corridorGapCenter + Phaser.Math.Between(-28, 28),
      sidePadding,
      Math.max(sidePadding, viewportWidth - sidePadding)
    );

    const gapCenter = this.corridorGapCenter;
    const leftEdge = Phaser.Math.Clamp(gapCenter - corridorWidth / 2, 70, viewportCenterX - 40);
    const rightEdge = Phaser.Math.Clamp(gapCenter + corridorWidth / 2, viewportCenterX + 40, viewportWidth - 70);
    const collisionDamage = hazard.damage ?? 1;
    const baseConfig: AsteroidSpawnConfig = {
      collisionDamage,
      destroyOnPlayerImpact: false,
      indestructible: true,
      scoreValue: 0,
      tint: 0x7a4a2e,
      depth: 3,
      scaleRange: { min: 1.7, max: 2.3 },
      angularVelocityRange: { min: -0.9, max: 0.9 },
    };

    for (let lane = 0; lane < laneCount; lane++) {
      const laneOffset = lane * 34;

      this.spawnSingleAsteroid(
        leftEdge - Phaser.Math.Between(18, 42) - laneOffset,
        Phaser.Math.Between(110, 155),
        {
          ...baseConfig,
          velocityX: Phaser.Math.Between(-12, 6),
        }
      );

      this.spawnSingleAsteroid(
        rightEdge + Phaser.Math.Between(18, 42) + laneOffset,
        Phaser.Math.Between(115, 160),
        {
          ...baseConfig,
          velocityX: Phaser.Math.Between(-6, 12),
        }
      );
    }
  }

  private spawnSingleAsteroid(spawnX: number, speed: number, config: AsteroidSpawnConfig = {}): void {
    const asteroid = this.acquireAsteroid(spawnX, ASTEROID_SPAWN_Y);
    asteroid?.spawn(spawnX, ASTEROID_SPAWN_Y, speed, config);
  }

  private acquireAsteroid(x: number, y: number): Asteroid | null {
    const existing = this.asteroidGroup.getFirstDead(false) as Asteroid | null;
    if (existing) {
      return existing;
    }

    return this.asteroidGroup.get(x, y) as Asteroid | null;
  }

  private getViewportWidth(): number {
    return getActiveGameplayBounds(this.scene).width;
  }

  private getViewportCenterX(): number {
    return getActiveGameplayBounds(this.scene).centerX;
  }

  private getRandomX(padding: number): number {
    const { min, max } = this.getHorizontalRange(padding);
    return Phaser.Math.Between(min, max);
  }

  private clampX(x: number, padding: number): number {
    const { min, max } = this.getHorizontalRange(padding);
    return Phaser.Math.Clamp(x, min, max);
  }

  private getHorizontalRange(padding: number): { min: number; max: number } {
    const viewportWidth = this.getViewportWidth();
    const effectivePadding = Math.min(padding, viewportWidth / 2);

    return {
      min: effectivePadding,
      max: Math.max(effectivePadding, viewportWidth - effectivePadding),
    };
  }
}
