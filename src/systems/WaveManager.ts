import Phaser from 'phaser';
import { EnemyPool } from './EnemyPool';
import { Asteroid, type AsteroidSpawnConfig } from '../entities/Asteroid';
import {
  type EnemySpawnConfig,
  type EnemyType,
  type LevelConfig,
  type LevelSectionConfig,
  type ScriptedHazardConfig,
  getActiveSection,
  getLevelConfig,
} from '../config/LevelsConfig';
import { GAME_SCENE_EVENTS } from './GameplayFlow';
import { getViewportBounds } from '../utils/layout';

interface SpawnEntry {
  type: EnemyType;
  cumulativeWeight: number;
}

const ASTEROID_SPAWN_Y = -50;

export class WaveManager {
  private scene!: Phaser.Scene;
  private enemyPool!: EnemyPool;
  private asteroidGroup!: Phaser.Physics.Arcade.Group;
  private spawnEntries: SpawnEntry[] = [];
  private totalEnemyWeight = 0;
  private lastEncounterSpawn = 0;
  private lastAsteroidSpawn = 0;
  private levelConfig!: LevelConfig;
  private activeSection: LevelSectionConfig | null = null;
  private activeSectionStartedAt = 0;
  private corridorGapCenter = 0;
  private readonly hazardLastTriggered = new Map<string, number>();
  private readonly enemySpawnHandlers: Record<EnemyType, (anchorX: number) => boolean> = {
    scout: (anchorX) => this.spawnRepeatedEnemies(
      'scout',
      Phaser.Math.Between(1, 2),
      () => this.getEncounterSpawnX(anchorX, 50),
      () => Phaser.Math.Between(-100, -30)
    ),
    fighter: (anchorX) => this.spawnRepeatedEnemies(
      'fighter',
      1,
      () => this.getEncounterSpawnX(anchorX, 100),
      () => Phaser.Math.Between(-80, -30)
    ),
    bomber: (anchorX) => this.spawnRepeatedEnemies(
      'bomber',
      1,
      () => this.getEncounterSpawnX(anchorX, 80),
      () => Phaser.Math.Between(-80, -30)
    ),
    swarm: (anchorX) => {
      const baseX = this.getEncounterSpawnX(anchorX, 100);

      return this.spawnRepeatedEnemies(
        'swarm',
        Phaser.Math.Between(3, 5),
        () => this.clampX(baseX + Phaser.Math.Between(-60, 60), 50),
        () => Phaser.Math.Between(-120, -30)
      );
    },
    gunship: (anchorX) => this.spawnRepeatedEnemies(
      'gunship',
      1,
      () => this.getEncounterSpawnX(anchorX, 120),
      () => Phaser.Math.Between(-80, -30)
    ),
  };

  create(scene: Phaser.Scene, enemyPool: EnemyPool): Phaser.Physics.Arcade.Group {
    this.scene = scene;
    this.enemyPool = enemyPool;
    this.corridorGapCenter = this.getViewportCenterX();

    this.asteroidGroup = scene.physics.add.group({
      maxSize: 40,
      classType: Asteroid,
      runChildUpdate: true,
    });

    return this.asteroidGroup;
  }

  setLevelConfig(levelNumber: number): void {
    this.levelConfig = getLevelConfig(levelNumber);
    this.lastEncounterSpawn = 0;
    this.lastAsteroidSpawn = 0;
    this.activeSection = null;
    this.corridorGapCenter = this.getViewportCenterX();
    this.hazardLastTriggered.clear();
    this.buildSpawnTable(this.levelConfig.enemies);
  }

  update(time: number, _delta: number, progress: number): void {
    if (!this.levelConfig) return;

    const activeSection = getActiveSection(this.levelConfig, progress);
    this.setActiveSection(activeSection, time);

    const rateMultiplier = this.getEncounterRateMultiplier(progress, activeSection);

    this.spawnEnemiesByConfig(time, rateMultiplier, activeSection);
    this.spawnAsteroids(time, activeSection);
    this.spawnSectionHazards(time, activeSection);
  }

  getAsteroidGroup(): Phaser.Physics.Arcade.Group {
    return this.asteroidGroup;
  }

  private setActiveSection(section: LevelSectionConfig | null, time: number): void {
    if (this.activeSection?.id === section?.id) {
      return;
    }

    this.activeSection = section;
    this.activeSectionStartedAt = time;
    this.hazardLastTriggered.clear();
    this.buildSpawnTable(section?.enemyFocus ?? this.levelConfig.enemies);
  }

  private emitSpawnWarning(x: number): void {
    this.scene.events.emit(GAME_SCENE_EVENTS.enemySpawnWarning, x);
  }

  private buildSpawnTable(enemyEntries: EnemySpawnConfig[]): void {
    let cumulativeWeight = 0;

    this.spawnEntries = enemyEntries
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
    return this.clampX(anchorX + Phaser.Math.Between(-70, 70), padding);
  }

  private getEncounterRateMultiplier(progress: number, activeSection: LevelSectionConfig | null): number {
    const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);
    const rampProgress = Phaser.Math.Easing.Cubic.In(clampedProgress);
    const intensityMultiplier = Phaser.Math.Linear(1, 1.5, rampProgress);
    const sectionMultiplier = activeSection?.spawnRateMultiplier ?? this.levelConfig.spawnRateMultiplier;

    return sectionMultiplier * intensityMultiplier;
  }

  private spawnRepeatedEnemies(
    type: EnemyType,
    count: number,
    getSpawnX: () => number,
    getSpawnY: () => number
  ): boolean {
    let spawnedAny = false;

    for (let i = 0; i < count; i++) {
      const enemy = this.enemyPool.spawnEnemy(type, getSpawnX(), getSpawnY());
      if (enemy) {
        spawnedAny = true;
      }
    }

    return spawnedAny;
  }

  private spawnEncounterBatch(anchorX: number, count: number, resolveEnemyType: () => EnemyType | null): void {
    let spawnedAny = false;

    for (let i = 0; i < count; i++) {
      const enemyType = resolveEnemyType();
      if (!enemyType) {
        continue;
      }

      if (this.spawnEnemyByType(enemyType, anchorX)) {
        spawnedAny = true;
      }
    }

    if (spawnedAny) {
      this.emitSpawnWarning(anchorX);
    }
  }

  private spawnEnemyByType(type: EnemyType, anchorX: number): boolean {
    return this.enemySpawnHandlers[type](anchorX);
  }

  private spawnEnemiesByConfig(
    time: number,
    rateMultiplier: number,
    activeSection: LevelSectionConfig | null
  ): void {
    const encounterInterval = 2000 / rateMultiplier;
    if (time <= this.lastEncounterSpawn + encounterInterval) {
      return;
    }

    this.lastEncounterSpawn = time;

    const encounterSize = activeSection?.encounterSizeOverride ?? this.levelConfig.encounterSize;
    const anchorX = this.getRandomX(120);
    const encounterCount = Phaser.Math.Between(encounterSize.min, encounterSize.max);

    this.spawnEncounterBatch(anchorX, encounterCount, () => this.pickEnemyType());
  }

  private spawnAsteroids(time: number, activeSection: LevelSectionConfig | null): void {
    const interval = activeSection?.asteroidInterval ?? this.levelConfig.asteroidInterval;
    if (time <= this.lastAsteroidSpawn + interval) {
      return;
    }

    this.lastAsteroidSpawn = time;
    this.spawnSingleAsteroid(this.getRandomX(50), Phaser.Math.Between(60, 120));
  }

  private spawnSectionHazards(time: number, activeSection: LevelSectionConfig | null): void {
    if (!activeSection?.hazardEvents?.length) {
      return;
    }

    for (let index = 0; index < activeSection.hazardEvents.length; index++) {
      const hazard = activeSection.hazardEvents[index];
      const key = `${activeSection.id}:${hazard.type}:${index}`;
      const cadence = hazard.cadenceMs ?? 2000;
      const lastTriggered = this.hazardLastTriggered.get(key) ?? this.activeSectionStartedAt;

      if (time <= lastTriggered + cadence) {
        continue;
      }

      this.hazardLastTriggered.set(key, time);
      this.triggerHazardEvent(hazard);
    }
  }

  private triggerHazardEvent(hazard: ScriptedHazardConfig): void {
    switch (hazard.type) {
      case 'ambient-asteroids':
      case 'debris-surge':
        this.spawnAsteroidBurst(2 + Math.round((hazard.intensity ?? 0.5) * 2), 65, 130);
        return;
      case 'minefield':
        this.spawnAsteroidBurst(2, 40, 70, 80);
        return;
      case 'ring-crossfire':
        this.spawnMirroredAsteroids(Phaser.Math.Between(90, 150), Phaser.Math.Between(90, 150));
        return;
      case 'rock-corridor':
        this.spawnEdgeAsteroids(hazard);
        return;
      case 'energy-storm':
        this.spawnHazardEncounter(['fighter', 'gunship', 'swarm'], hazard.intensity ?? 0.6);
        return;
      case 'nebula-ambush':
        this.spawnHazardEncounter(['fighter', 'bomber', 'swarm'], hazard.intensity ?? 0.6);
        return;
      case 'gravity-well':
        this.spawnMirroredAsteroids(Phaser.Math.Between(110, 160), Phaser.Math.Between(110, 160));
        this.spawnHazardEncounter(['fighter', 'gunship'], hazard.intensity ?? 0.75);
        return;
    }
  }

  private spawnHazardEncounter(preferredTypes: EnemyType[], intensity: number): void {
    const allowedTypes = preferredTypes.filter((type) => this.spawnEntries.some((entry) => entry.type === type));
    const anchorX = this.getRandomX(120);
    const spawnCount = Phaser.Math.Clamp(Math.round(1 + intensity * 2), 1, 3);

    this.spawnEncounterBatch(anchorX, spawnCount, () => {
      return allowedTypes[Phaser.Math.Between(0, Math.max(allowedTypes.length - 1, 0))] ?? this.pickEnemyType();
    });
  }

  private spawnAsteroidBurst(count: number, minSpeed: number, maxSpeed: number, edgePadding: number = 50): void {
    for (let i = 0; i < count; i++) {
      this.spawnSingleAsteroid(
        this.getRandomX(edgePadding),
        Phaser.Math.Between(minSpeed, maxSpeed)
      );
    }
  }

  private spawnMirroredAsteroids(leftSpeed: number, rightSpeed: number): void {
    const { min, max } = this.getHorizontalRange(70);
    const leftX = Phaser.Math.Between(min, Math.min(max, min + 80));
    const rightX = this.clampX(this.getViewportWidth() - leftX, 70);
    this.spawnSingleAsteroid(leftX, leftSpeed);
    this.spawnSingleAsteroid(rightX, rightSpeed);
  }

  private spawnEdgeAsteroids(hazard: ScriptedHazardConfig): void {
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
    return getViewportBounds(this.scene).width;
  }

  private getViewportCenterX(): number {
    return getViewportBounds(this.scene).centerX;
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
