import Phaser from 'phaser';
import { EnemyPool } from './EnemyPool';
import { Asteroid } from '../entities/Asteroid';
import {
  type EnemySpawnConfig,
  type EnemyType,
  type LevelConfig,
  type LevelSectionConfig,
  type ScriptedHazardConfig,
  getActiveSection,
  getSectionProgress,
  getLevelConfig,
} from '../config/LevelsConfig';
import { GAME_SCENE_EVENTS } from './GameplayFlow';
import { getActiveGameplayBounds } from '../utils/layout';
import { resolveSectionSpawnRateScale } from './sectionIdentity';
import { WaveAsteroidSpawner } from './wave/WaveAsteroidSpawner';
import {
  canTriggerHazard,
  consumeHazardPressure,
  decayHazardPressure,
  getEncounterCountPressureScale,
  getEncounterIntervalPressureScale,
  isHazardWithinDuration,
} from './wave/hazardPressurePolicy';

interface SpawnEntry {
  type: EnemyType;
  cumulativeWeight: number;
}

export class WaveManager {
  private scene!: Phaser.Scene;
  private enemyPool!: EnemyPool;
  private asteroidGroup!: Phaser.Physics.Arcade.Group;
  private asteroidSpawner!: WaveAsteroidSpawner;
  private spawnEntries: SpawnEntry[] = [];
  private totalEnemyWeight = 0;
  private lastEncounterSpawn = 0;
  private lastAsteroidSpawn = 0;
  private levelConfig!: LevelConfig;
  private activeSection: LevelSectionConfig | null = null;
  private activeSectionStartedAt = 0;
  private hazardPressure = 0;
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
        () => this.clampEncounterX(baseX + Phaser.Math.Between(-60, 60), 50),
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

    this.asteroidGroup = scene.physics.add.group({
      maxSize: 40,
      classType: Asteroid,
      runChildUpdate: true,
    });

    this.asteroidSpawner = new WaveAsteroidSpawner(scene, this.asteroidGroup);

    return this.asteroidGroup;
  }

  setLevelConfig(levelNumber: number): void {
    this.levelConfig = getLevelConfig(levelNumber);
    this.lastEncounterSpawn = 0;
    this.lastAsteroidSpawn = 0;
    this.activeSection = null;
    this.hazardPressure = 0;
    this.hazardLastTriggered.clear();
    this.asteroidSpawner.resetCorridorGapCenter();
    this.buildSpawnTable(this.levelConfig.enemies);
  }

  update(time: number, delta: number, progress: number): void {
    if (!this.levelConfig) return;

    const activeSection = getActiveSection(this.levelConfig, progress);
    const sectionProgress = activeSection ? getSectionProgress(activeSection, progress) : 0;
    this.setActiveSection(activeSection, time);
    this.decayHazardPressure(delta);

    const rateMultiplier = this.getEncounterRateMultiplier(progress, activeSection, sectionProgress);

    this.spawnSectionHazards(time, activeSection);
    this.spawnEnemiesByConfig(time, rateMultiplier, activeSection);
    this.lastAsteroidSpawn = this.asteroidSpawner.spawnAsteroids(
      time,
      activeSection,
      this.levelConfig,
      this.lastAsteroidSpawn
    );
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
    this.hazardPressure = 0;
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
    return this.clampEncounterX(anchorX + Phaser.Math.Between(-70, 70), padding);
  }

  private getEncounterRateMultiplier(
    progress: number,
    activeSection: LevelSectionConfig | null,
    sectionProgress: number
  ): number {
    const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);
    const rampProgress = Phaser.Math.Easing.Cubic.In(clampedProgress);
    const intensityMultiplier = Phaser.Math.Linear(1, 1.5, rampProgress);
    const sectionMultiplier = activeSection?.spawnRateMultiplier ?? this.levelConfig.spawnRateMultiplier;
    const sectionArcMultiplier = resolveSectionSpawnRateScale(activeSection, sectionProgress);

    return sectionMultiplier * intensityMultiplier * sectionArcMultiplier;
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
    const encounterInterval = (2000 / rateMultiplier) * getEncounterIntervalPressureScale(this.hazardPressure);
    if (time <= this.lastEncounterSpawn + encounterInterval) {
      return;
    }

    this.lastEncounterSpawn = time;

    const encounterSize = activeSection?.encounterSizeOverride ?? this.levelConfig.encounterSize;
    const anchorX = this.getEncounterRandomX(120);
    const pressureScale = getEncounterCountPressureScale(this.hazardPressure);
    const minCount = Math.max(1, Math.round(encounterSize.min * pressureScale));
    const maxCount = Math.max(minCount, Math.round(encounterSize.max * pressureScale));
    const encounterCount = Phaser.Math.Between(minCount, maxCount);

    this.spawnEncounterBatch(anchorX, encounterCount, () => this.pickEnemyType());
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
      const sectionElapsedMs = Math.max(0, time - this.activeSectionStartedAt);

      if (!isHazardWithinDuration(hazard, sectionElapsedMs)) {
        continue;
      }

      if (time <= lastTriggered + cadence) {
        continue;
      }

      if (!canTriggerHazard(this.hazardPressure, hazard)) {
        continue;
      }

      this.hazardLastTriggered.set(key, time);
      this.triggerHazardEvent(hazard);
      this.hazardPressure = consumeHazardPressure(this.hazardPressure, hazard);
    }
  }

  private decayHazardPressure(delta: number): void {
    this.hazardPressure = decayHazardPressure(this.hazardPressure, delta);
  }

  private triggerHazardEvent(hazard: ScriptedHazardConfig): void {
    switch (hazard.type) {
      case 'ambient-asteroids':
      case 'debris-surge':
        this.asteroidSpawner.spawnAsteroidBurst(2 + Math.round((hazard.intensity ?? 0.5) * 2), 65, 130);
        return;
      case 'minefield':
        this.asteroidSpawner.spawnAsteroidBurst(2, 40, 70, 80);
        return;
      case 'ring-crossfire':
        this.asteroidSpawner.spawnMirroredAsteroids(
          Phaser.Math.Between(90, 150),
          Phaser.Math.Between(90, 150)
        );
        return;
      case 'rock-corridor':
        this.asteroidSpawner.spawnEdgeAsteroids(hazard);
        return;
      case 'energy-storm':
        this.spawnHazardEncounter(['fighter', 'gunship', 'swarm'], hazard.intensity ?? 0.6);
        return;
      case 'nebula-ambush':
        this.spawnHazardEncounter(['fighter', 'bomber', 'swarm'], hazard.intensity ?? 0.6);
        return;
      case 'gravity-well':
        this.asteroidSpawner.spawnMirroredAsteroids(
          Phaser.Math.Between(110, 160),
          Phaser.Math.Between(110, 160)
        );
        this.spawnHazardEncounter(['fighter', 'gunship'], hazard.intensity ?? 0.75);
        return;
    }
  }

  private spawnHazardEncounter(preferredTypes: EnemyType[], intensity: number): void {
    const allowedTypes = preferredTypes.filter((type) => this.spawnEntries.some((entry) => entry.type === type));
    const anchorX = this.getEncounterRandomX(120);
    const spawnCount = Phaser.Math.Clamp(Math.round(1 + intensity * 2), 1, 3);

    this.spawnEncounterBatch(anchorX, spawnCount, () => {
      return allowedTypes[Phaser.Math.Between(0, Math.max(allowedTypes.length - 1, 0))] ?? this.pickEnemyType();
    });
  }

  private getEncounterRandomX(padding: number): number {
    const { min, max } = this.getEncounterHorizontalRange(padding);
    return Phaser.Math.Between(min, max);
  }

  private clampEncounterX(x: number, padding: number): number {
    const { min, max } = this.getEncounterHorizontalRange(padding);
    return Phaser.Math.Clamp(x, min, max);
  }

  private getEncounterHorizontalRange(padding: number): { min: number; max: number } {
    const viewportWidth = getActiveGameplayBounds(this.scene).width;
    const effectivePadding = Math.min(padding, viewportWidth / 2);

    return {
      min: effectivePadding,
      max: Math.max(effectivePadding, viewportWidth - effectivePadding),
    };
  }
}
