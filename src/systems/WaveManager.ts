import Phaser from 'phaser';

import {
  type AuthoredLaneAnchor,
  type EnemySpawnConfig,
  type EnemyType,
  type LevelConfig,
  type LevelSectionConfig,
  type RecoveryDropConfig,
  type ScriptedHazardConfig,
  type SignatureWaveConfig,
  getActiveSection,
  getLevelConfig,
  getSectionProgress,
} from '@/config/LevelsConfig';
import { Asteroid } from '@/entities/Asteroid';
import { getViewportBounds } from '@/utils/layout';

import type { EnemyPool } from './EnemyPool';
import type { HazardBeamSystem } from './HazardBeamSystem';
import { GAME_SCENE_EVENTS, spawnPowerUp } from './GameplayFlow';
import { resolveSectionSpawnRateScale } from './sectionIdentity';
import { WaveAsteroidSpawner } from './wave/WaveAsteroidSpawner';
import {
  CHOREO_LANE_COUNT,
  getLaneCenterX,
  resolveFormationPositions,
  WaveChoreographer,
} from './wave/waveChoreography';
import {
  canTriggerHazard,
  consumeHazardPressure,
  decayHazardPressure,
  getEncounterCountPressureScale,
  getEncounterIntervalPressureScale,
  isHazardWithinDuration,
} from './wave/hazardPressurePolicy';

const BOSS_ADD_WAVE_INTERVAL_MS = 12000;
const DEATH_RELIEF_DURATION_MS = 8000;
const DEATH_RELIEF_SPAWN_RATE_SCALE = 0.75;

interface SpawnEntry {
  type: EnemyType;
  cumulativeWeight: number;
}

type EncounterSectionState = {
  activeSection: LevelSectionConfig | null;
  sectionProgress: number;
  rateMultiplier: number;
};

interface PendingWormholePack {
  hazard: ScriptedHazardConfig;
  x: number;
  y: number;
  remainingMs: number;
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
  private powerUpGroup: Phaser.Physics.Arcade.Group | null = null;
  private hazardBeamSystem: HazardBeamSystem | null = null;
  private choreographer: WaveChoreographer | null = null;
  private lastBossAddSpawn = 0;
  private deathReliefRemainingMs = 0;
  private pendingWormholePacks: PendingWormholePack[] = [];
  private readonly hazardLastTriggered = new Map<string, number>();
  private readonly triggeredAuthoredEvents = new Set<string>();
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
    diver: (anchorX) => this.spawnRepeatedEnemies(
      'diver',
      Phaser.Math.Between(1, 2),
      () => this.getEncounterSpawnX(anchorX, 60),
      () => Phaser.Math.Between(-100, -40)
    ),
    dodger: (anchorX) => this.spawnRepeatedEnemies(
      'dodger',
      1,
      () => this.getEncounterSpawnX(anchorX, 90),
      () => Phaser.Math.Between(-80, -30)
    ),
    sower: (anchorX) => this.spawnRepeatedEnemies(
      'sower',
      1,
      () => this.getEncounterSpawnX(anchorX, 100),
      () => Phaser.Math.Between(-80, -30)
    ),
    lancer: (anchorX) => this.spawnRepeatedEnemies(
      'lancer',
      1,
      () => this.getEncounterSpawnX(anchorX, 80),
      () => Phaser.Math.Between(-80, -30)
    ),
    splitter: (anchorX) => this.spawnRepeatedEnemies(
      'splitter',
      Phaser.Math.Between(1, 2),
      () => this.getEncounterSpawnX(anchorX, 80),
      () => Phaser.Math.Between(-90, -30)
    ),
    swarmling: (anchorX) => {
      const baseX = this.getEncounterSpawnX(anchorX, 60);

      return this.spawnRepeatedEnemies(
        'swarmling',
        Phaser.Math.Between(2, 3),
        () => this.clampEncounterX(baseX + Phaser.Math.Between(-40, 40), 40),
        () => Phaser.Math.Between(-120, -30)
      );
    },
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

    this.choreographer = new WaveChoreographer({
      spawn: (type, x, y, options) => {
        const enemy = this.enemyPool.spawnEnemy(type, x, y);
        if (enemy && options?.ace) {
          enemy.markAsAce();
        }
        return enemy;
      },
      emitWarning: (x) => this.emitSpawnWarning(x),
      emitWormhole: (x, y) => this.scene.events.emit(GAME_SCENE_EVENTS.wormholeTelegraph, x, y),
      emitEliteWave: () => this.scene.events.emit(GAME_SCENE_EVENTS.eliteWave),
      getViewportWidth: () => getViewportBounds(this.scene).width,
    });

    return this.asteroidGroup;
  }

  setLevelConfig(levelNumber: number): void {
    this.levelConfig = getLevelConfig(levelNumber);
    this.resetLevelState();
    this.resetHazardState();
    this.asteroidSpawner.resetCorridorGapCenter();
    this.setEnemySpawnFocus(this.levelConfig.enemies);
  }

  update(time: number, delta: number, progress: number): void {
    if (!this.levelConfig) {
      return;
    }

    this.updateDeathRelief(delta);
    const sectionState = this.resolveEncounterSectionState(progress, time);
    this.decayHazardPressure(delta);
    this.choreographer?.update(delta);
    this.updatePendingWormholePacks(delta);
    this.spawnAuthoredSectionContent(sectionState.activeSection, sectionState.sectionProgress);
    this.spawnSectionHazards(time, sectionState.activeSection);
    this.spawnEnemiesByConfig(time, sectionState.rateMultiplier, sectionState.activeSection);
    this.updateAsteroids(time, sectionState.activeSection);
  }

  getAsteroidGroup(): Phaser.Physics.Arcade.Group {
    return this.asteroidGroup;
  }

  updateBossAdds(time: number): void {
    if (!this.levelConfig?.bossAddWaves) {
      return;
    }

    if (time <= this.lastBossAddSpawn + BOSS_ADD_WAVE_INTERVAL_MS) {
      return;
    }

    this.lastBossAddSpawn = time;

    const viewportWidth = getViewportBounds(this.scene).width;
    const anchorX = getLaneCenterX(Phaser.Math.Between(0, CHOREO_LANE_COUNT - 1), viewportWidth);
    const positions = resolveFormationPositions('line', 3, anchorX, viewportWidth, -50, 52);

    let spawnedAny = false;
    for (const position of positions) {
      if (this.enemyPool.spawnEnemy('scout', position.x, position.y)) {
        spawnedAny = true;
      }
    }

    if (spawnedAny) {
      this.emitSpawnWarning(anchorX);
    }
  }

  setPowerUpGroup(powerUpGroup: Phaser.Physics.Arcade.Group): void {
    this.powerUpGroup = powerUpGroup;
  }

  setHazardBeamSystem(hazardBeamSystem: HazardBeamSystem): void {
    this.hazardBeamSystem = hazardBeamSystem;
  }

  private resetLevelState(): void {
    this.lastEncounterSpawn = 0;
    this.lastAsteroidSpawn = 0;
    this.lastBossAddSpawn = 0;
    this.deathReliefRemainingMs = 0;
    this.activeSection = null;
    this.triggeredAuthoredEvents.clear();
    this.choreographer?.setSection(undefined);
  }

  private resetHazardState(): void {
    this.hazardPressure = 0;
    this.hazardLastTriggered.clear();
    this.pendingWormholePacks = [];
  }

  private setEnemySpawnFocus(enemyEntries: EnemySpawnConfig[]): void {
    this.buildSpawnTable(enemyEntries);
  }

  private resolveEncounterSectionState(progress: number, time: number): EncounterSectionState {
    const activeSection = getActiveSection(this.levelConfig, progress);
    const sectionProgress = activeSection ? getSectionProgress(activeSection, progress) : 0;

    this.setActiveSection(activeSection, time);

    return {
      activeSection,
      sectionProgress,
      rateMultiplier: this.getEncounterRateMultiplier(progress, activeSection, sectionProgress),
    };
  }

  private spawnAuthoredSectionContent(section: LevelSectionConfig | null, sectionProgress: number): void {
    if (!section) {
      return;
    }

    section.signatureWaves?.forEach((wave) => {
      if (this.shouldTriggerAuthoredEvent(section, 'wave', wave.id, wave.triggerProgress, sectionProgress)) {
        this.spawnSignatureWave(wave);
      }
    });

    section.recoveryDrops?.forEach((drop) => {
      if (this.shouldTriggerAuthoredEvent(section, 'drop', drop.id, drop.triggerProgress, sectionProgress)) {
        this.spawnRecoveryDrop(drop);
      }
    });
  }

  private shouldTriggerAuthoredEvent(
    section: LevelSectionConfig,
    type: 'wave' | 'drop',
    id: string,
    triggerProgress: number,
    sectionProgress: number
  ): boolean {
    const key = `${section.id}:${type}:${id}`;
    if (this.triggeredAuthoredEvents.has(key) || sectionProgress < triggerProgress) {
      return false;
    }

    this.triggeredAuthoredEvents.add(key);
    return true;
  }

  private spawnSignatureWave(wave: SignatureWaveConfig): void {
    const warningLanes = new Set<number>();

    wave.enemies.forEach((entry) => {
      const x = this.getLaneAnchorX(entry.lane, 80);
      const enemy = this.enemyPool.spawnEnemy(entry.type, x, entry.y ?? -80);
      if (enemy) {
        if (entry.ace) {
          enemy.markAsAce();
        }
        warningLanes.add(x);
      }
    });

    warningLanes.forEach((x) => this.emitSpawnWarning(x));
  }

  private spawnRecoveryDrop(drop: RecoveryDropConfig): void {
    if (!this.powerUpGroup) {
      return;
    }

    spawnPowerUp(this.powerUpGroup, this.getLaneAnchorX(drop.lane, 60), -40, drop.type);
  }

  private updateAsteroids(time: number, activeSection: LevelSectionConfig | null): void {
    this.lastAsteroidSpawn = this.asteroidSpawner.spawnAsteroids(
      time,
      activeSection,
      this.levelConfig,
      this.lastAsteroidSpawn
    );
  }

  private setActiveSection(section: LevelSectionConfig | null, time: number): void {
    if (this.activeSection?.id === section?.id) {
      return;
    }

    this.activeSection = section;
    this.activeSectionStartedAt = time;
    this.resetHazardState();
    this.choreographer?.setSection(section?.waves);
    this.setEnemySpawnFocus(section?.enemyFocus ?? this.levelConfig.enemies);
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
    const reliefScale = this.deathReliefRemainingMs > 0 ? DEATH_RELIEF_SPAWN_RATE_SCALE : 1;

    return sectionMultiplier * intensityMultiplier * sectionArcMultiplier * reliefScale;
  }

  applyDeathRelief(): void {
    this.resetHazardState();
    this.deathReliefRemainingMs = DEATH_RELIEF_DURATION_MS;
  }

  private updateDeathRelief(delta: number): void {
    this.deathReliefRemainingMs = Math.max(0, this.deathReliefRemainingMs - Math.max(0, delta));
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

  private shouldSpawnEncounter(time: number, rateMultiplier: number): boolean {
    const encounterInterval = (2000 / rateMultiplier) * getEncounterIntervalPressureScale(this.hazardPressure);
    if (time <= this.lastEncounterSpawn + encounterInterval) {
      return false;
    }

    this.lastEncounterSpawn = time;
    return true;
  }

  private getEncounterCount(activeSection: LevelSectionConfig | null): number {
    const encounterSize = activeSection?.encounterSizeOverride ?? this.levelConfig.encounterSize;
    const pressureScale = getEncounterCountPressureScale(this.hazardPressure);
    const minCount = Math.max(1, Math.round(encounterSize.min * pressureScale));
    const maxCount = Math.max(minCount, Math.round(encounterSize.max * pressureScale));

    return Phaser.Math.Between(minCount, maxCount);
  }

  private spawnEnemiesByConfig(
    time: number,
    rateMultiplier: number,
    activeSection: LevelSectionConfig | null
  ): void {
    if (!this.shouldSpawnEncounter(time, rateMultiplier)) {
      return;
    }

    const anchorX = this.getEncounterRandomX(120);
    const encounterCount = this.getEncounterCount(activeSection);
    this.spawnEncounterBatch(anchorX, encounterCount, () => this.pickEnemyType());
  }

  private spawnSectionHazards(time: number, activeSection: LevelSectionConfig | null): void {
    if (!activeSection?.hazardEvents?.length) {
      return;
    }

    for (let index = 0; index < activeSection.hazardEvents.length; index++) {
      const hazard = activeSection.hazardEvents[index];
      const key = `${activeSection.id}:${hazard.type}:${index}`;

      if (!this.shouldTriggerHazard(time, hazard, key)) {
        continue;
      }

      this.recordHazardTrigger(key, time);
      this.triggerHazardEvent(hazard);
      this.consumeHazardPressure(hazard);
    }
  }

  private shouldTriggerHazard(time: number, hazard: ScriptedHazardConfig, key: string): boolean {
    const cadence = hazard.cadenceMs ?? 2000;
    const lastTriggered = this.hazardLastTriggered.get(key) ?? this.activeSectionStartedAt;
    const sectionElapsedMs = Math.max(0, time - this.activeSectionStartedAt);

    if (!isHazardWithinDuration(hazard, sectionElapsedMs)) {
      return false;
    }

    if (time <= lastTriggered + cadence) {
      return false;
    }

    return canTriggerHazard(this.hazardPressure, hazard);
  }

  private recordHazardTrigger(key: string, time: number): void {
    this.hazardLastTriggered.set(key, time);
  }

  private consumeHazardPressure(hazard: ScriptedHazardConfig): void {
    this.hazardPressure = consumeHazardPressure(this.hazardPressure, hazard);
  }

  private decayHazardPressure(delta: number): void {
    this.hazardPressure = decayHazardPressure(this.hazardPressure, delta);
  }

  private spawnMirroredHazardAsteroids(minSpeed: number, maxSpeed: number): void {
    this.asteroidSpawner.spawnMirroredAsteroids(
      Phaser.Math.Between(minSpeed, maxSpeed),
      Phaser.Math.Between(minSpeed, maxSpeed)
    );
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
        this.spawnMirroredHazardAsteroids(90, 150);
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
        this.spawnMirroredHazardAsteroids(110, 160);
        this.spawnHazardEncounter(['fighter', 'gunship'], hazard.intensity ?? 0.75);
        return;
      case 'solar-flare':
        this.hazardBeamSystem?.spawnSolarFlare(hazard.intensity ?? 0.5);
        return;
      case 'laser-lattice':
        this.hazardBeamSystem?.spawnLaserLattice(hazard.intensity ?? 0.5);
        return;
      case 'wormhole-spawn':
        this.spawnWormholePack(hazard);
        return;
    }
  }

  private spawnWormholePack(hazard: ScriptedHazardConfig): void {
    const viewport = getViewportBounds(this.scene);
    const portalCount = 1 + Math.round(hazard.intensity ?? 0.5);

    for (let index = 0; index < portalCount; index++) {
      const x = Phaser.Math.Between(
        Math.round(viewport.left + viewport.width * 0.2),
        Math.round(viewport.right - viewport.width * 0.2)
      );
      const y = Phaser.Math.Between(150, 280);

      this.scene.events.emit(GAME_SCENE_EVENTS.wormholeTelegraph, x, y);
      this.pendingWormholePacks.push({ hazard, x, y, remainingMs: 600 });
    }
  }

  private updatePendingWormholePacks(delta: number): void {
    if (this.pendingWormholePacks.length === 0) {
      return;
    }

    const elapsed = Math.max(0, delta);
    const stillPending: PendingWormholePack[] = [];

    for (const pending of this.pendingWormholePacks) {
      pending.remainingMs -= elapsed;
      if (pending.remainingMs <= 0) {
        this.materializeWormholePack(pending.hazard, pending.x, pending.y);
      } else {
        stillPending.push(pending);
      }
    }

    this.pendingWormholePacks = stillPending;
  }

  private materializeWormholePack(hazard: ScriptedHazardConfig, x: number, y: number): void {
    const preferredTypes = hazard.enemyTypes ?? ['scout', 'fighter'];
    const allowedTypes = preferredTypes.filter((type) => this.spawnEntries.some((entry) => entry.type === type));
    const intensity = hazard.intensity ?? 0.5;
    const spawnCount = Phaser.Math.Clamp(2 + Math.round(intensity * 2), 2, 4);

    for (let index = 0; index < spawnCount; index++) {
      const type = allowedTypes[index % Math.max(allowedTypes.length, 1)] ?? this.pickEnemyType();
      if (!type) {
        continue;
      }

      const offset = (index - (spawnCount - 1) / 2) * 30;
      this.enemyPool.spawnEnemy(type, x + offset, y);
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

  private getLaneAnchorX(lane: AuthoredLaneAnchor, padding: number): number {
    const { min, max } = this.getEncounterHorizontalRange(padding);
    const center = (min + max) / 2;

    switch (lane) {
      case 'left':
        return min;
      case 'center':
        return center;
      case 'right':
        return max;
    }
  }

  private getEncounterHorizontalRange(padding: number): { min: number; max: number } {
    const viewportWidth = getViewportBounds(this.scene).width;
    const effectivePadding = Math.min(padding, viewportWidth / 2);

    return {
      min: effectivePadding,
      max: Math.max(effectivePadding, viewportWidth - effectivePadding),
    };
  }
}
