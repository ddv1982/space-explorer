import { waveRandom } from '../gameplayRandom';
import Phaser from 'phaser';
import type { Asteroid, AsteroidSpawnConfig } from '../../entities/Asteroid';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../../config/LevelsConfig';
import { getViewportBounds } from '../../utils/layout';

const ASTEROID_SPAWN_Y = -50;
/** Ambient rocks reach right up to the screen edges, so hugging a wall is not a safe spot. */
const EDGE_PADDING = 20;
/** Corridor rocks are 75–101 px wide; 64 px spacing leaves no ship-sized hole in a wall. */
const CORRIDOR_ROCK_SPACING = 64;
/** Height fraction at which a ring-crossfire pair crosses: the ship's flying row. */
const CROSSFIRE_MEET_HEIGHT = 0.75;

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

    this.spawnSingleAsteroid(this.getRandomX(EDGE_PADDING), waveRandom.between(60, 120));
    return time;
  }

  spawnAsteroidBurst(count: number, minSpeed: number, maxSpeed: number, edgePadding: number = EDGE_PADDING): void {
    for (let i = 0; i < count; i++) {
      this.spawnSingleAsteroid(this.getRandomX(edgePadding), waveRandom.between(minSpeed, maxSpeed));
    }
  }

  /** A mirrored pair that angles inward and crosses in the ship's flying row. */
  spawnMirroredAsteroids(leftSpeed: number, rightSpeed: number): void {
    const { min, max } = this.getHorizontalRange(70);
    const leftX = waveRandom.between(min, Math.min(max, min + 80));
    const rightX = this.clampX(this.getViewportWidth() - leftX, 70);
    const centerX = this.getViewportCenterX();
    const fallDistance = getViewportBounds(this.scene).height * CROSSFIRE_MEET_HEIGHT - ASTEROID_SPAWN_Y;

    this.spawnSingleAsteroid(leftX, leftSpeed, { velocityX: ((centerX - leftX) * leftSpeed) / fallDistance });
    this.spawnSingleAsteroid(rightX, rightSpeed, { velocityX: ((centerX - rightX) * rightSpeed) / fallDistance });
  }

  spawnEdgeAsteroids(hazard: ScriptedHazardConfig): void {
    const corridorWidth = Phaser.Math.Clamp(hazard.corridorWidth ?? 190, 150, 240);
    const laneCount = Phaser.Math.Clamp(hazard.laneCount ?? 2, 1, 3);
    const viewportWidth = this.getViewportWidth();
    const viewportCenterX = this.getViewportCenterX();
    const sidePadding = Math.min(170, viewportWidth / 2);

    this.corridorGapCenter = Phaser.Math.Clamp(
      this.corridorGapCenter + waveRandom.between(-28, 28),
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
      indestructible: hazard.coverIndestructible ?? hazard.coverHp === undefined,
      blocksEnemyProjectiles: hazard.blocksEnemyProjectiles ?? false,
      hp: hazard.coverHp,
      scoreValue: 0,
      tint: 0x7a4a2e,
      depth: 3,
      scaleRange: { min: 1.7, max: 2.3 },
      angularVelocityRange: { min: -0.9, max: 0.9 },
    };

    // Each wall runs from the corridor edge all the way to the screen edge.
    const viewportLeft = getViewportBounds(this.scene).left;
    const viewportRight = viewportLeft + viewportWidth;
    const leftCount = Math.max(laneCount, Math.ceil((leftEdge - viewportLeft) / CORRIDOR_ROCK_SPACING));
    const rightCount = Math.max(laneCount, Math.ceil((viewportRight - rightEdge) / CORRIDOR_ROCK_SPACING));

    for (let lane = 0; lane < leftCount; lane++) {
      const laneOffset = 30 + lane * CORRIDOR_ROCK_SPACING;
      this.spawnSingleAsteroid(leftEdge - laneOffset - waveRandom.between(0, 8), waveRandom.between(110, 155), {
        ...baseConfig,
        velocityX: waveRandom.between(-12, 6),
      });
    }
    for (let lane = 0; lane < rightCount; lane++) {
      const laneOffset = 30 + lane * CORRIDOR_ROCK_SPACING;
      this.spawnSingleAsteroid(rightEdge + laneOffset + waveRandom.between(0, 8), waveRandom.between(115, 160), {
        ...baseConfig,
        velocityX: waveRandom.between(-6, 12),
      });
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
    return getViewportBounds(this.scene).width;
  }

  private getViewportCenterX(): number {
    return getViewportBounds(this.scene).centerX;
  }

  private getRandomX(padding: number): number {
    const { min, max } = this.getHorizontalRange(padding);
    return waveRandom.between(min, max);
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
