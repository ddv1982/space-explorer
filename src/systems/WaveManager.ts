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
import { WaveAsteroidSpawner } from './wave/WaveAsteroidSpawner';
import { EnemySpawnTable } from './wave/EnemySpawnTable';
import { createEnemySpawnHandlers } from './wave/createEnemySpawnHandlers';
import { HazardCadenceController } from './wave/HazardCadenceController';
import { WormholePackController } from './wave/WormholePackController';
import { AuthoredSectionCoordinator } from './wave/AuthoredSectionCoordinator';
import {
  CHOREO_LANE_COUNT,
  getLaneCenterX,
  resolveFormationPositions,
  WaveChoreographer,
} from './wave/waveChoreography';
import {
  resolveEncounterCount,
  resolveEncounterInterval,
  resolveEncounterRateMultiplier,
} from './wave/encounterPolicy';
import { triggerWaveHazard } from './wave/triggerWaveHazard';
import {
  clampEncounterX as clampWaveEncounterX,
  getEncounterHorizontalRange,
  getLaneAnchorX as getWaveLaneAnchorX,
} from './wave/waveGeometry';

const BOSS_ADD_WAVE_INTERVAL_MS = 12000;
const DEATH_RELIEF_DURATION_MS = 8000;

type EncounterSectionState = {
  activeSection: LevelSectionConfig | null;
  sectionProgress: number;
  rateMultiplier: number;
};

export class WaveManager {
  private scene!: Phaser.Scene;
  private enemyPool!: EnemyPool;
  private asteroidGroup!: Phaser.Physics.Arcade.Group;
  private asteroidSpawner!: WaveAsteroidSpawner;
  private readonly spawnTable = new EnemySpawnTable();
  private lastEncounterSpawn = 0;
  private lastAsteroidSpawn = 0;
  private levelConfig!: LevelConfig;
  private activeSection: LevelSectionConfig | null = null;
  private readonly hazardCadence = new HazardCadenceController();
  private powerUpGroup: Phaser.Physics.Arcade.Group | null = null;
  private hazardBeamSystem: HazardBeamSystem | null = null;
  private choreographer: WaveChoreographer | null = null;
  private lastBossAddSpawn = 0;
  private gameplayTime: number | null = null;
  private deathReliefRemainingMs = 0;
  private readonly wormholePacks = new WormholePackController();
  private readonly authoredSections = new AuthoredSectionCoordinator();
  private readonly enemySpawnHandlers = createEnemySpawnHandlers({
    spawnRepeated: (type, count, getX, getY) => this.spawnRepeatedEnemies(type, count, getX, getY),
    getSpawnX: (anchorX, padding) => this.getEncounterSpawnX(anchorX, padding),
    clampX: (x, padding) => this.clampEncounterX(x, padding),
  });

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

  update(_time: number, delta: number, progress: number): void {
    if (!this.levelConfig) {
      return;
    }

    const gameplayDelta = Math.max(0, delta);
    this.gameplayTime = this.gameplayTime === null ? Math.max(0, _time) : this.gameplayTime + gameplayDelta;
    const time = this.gameplayTime;

    this.updateDeathRelief(gameplayDelta);
    const sectionState = this.resolveEncounterSectionState(progress, time);
    this.hazardCadence.decay(gameplayDelta);
    this.choreographer?.update(gameplayDelta);
    this.wormholePacks.update(gameplayDelta, (hazard, x, y) => this.materializeWormholePack(hazard, x, y));
    this.spawnAuthoredSectionContent(sectionState.activeSection, sectionState.sectionProgress);
    this.spawnSectionHazards(time, sectionState.activeSection);
    this.spawnEnemiesByConfig(time, sectionState.rateMultiplier, sectionState.activeSection);
    this.updateAsteroids(time, sectionState.activeSection);
  }

  updateBossAdds(delta: number): void {
    if (!this.levelConfig?.bossAddWaves) {
      return;
    }

    this.gameplayTime = (this.gameplayTime ?? 0) + Math.max(0, delta);
    const time = this.gameplayTime;

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
    this.gameplayTime = null;
    this.lastEncounterSpawn = 0;
    this.lastAsteroidSpawn = 0;
    this.lastBossAddSpawn = 0;
    this.deathReliefRemainingMs = 0;
    this.activeSection = null;
    this.authoredSections.reset();
    this.choreographer?.setSection(undefined);
  }

  private resetHazardState(): void {
    this.hazardCadence.reset();
    this.wormholePacks.reset();
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
    this.authoredSections.update(section, sectionProgress, {
      spawnWave: (wave) => this.spawnSignatureWave(wave),
      spawnDrop: (drop) => this.spawnRecoveryDrop(drop),
    });
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
    this.resetHazardState();
    this.hazardCadence.reset(time);
    this.choreographer?.setSection(section?.waves);
    this.setEnemySpawnFocus(section?.enemyFocus ?? this.levelConfig.enemies);
  }

  private emitSpawnWarning(x: number): void {
    this.scene.events.emit(GAME_SCENE_EVENTS.enemySpawnWarning, x);
  }

  private buildSpawnTable(enemyEntries: EnemySpawnConfig[]): void {
    this.spawnTable.rebuild(enemyEntries);
  }

  private pickEnemyType(): EnemyType | null {
    return this.spawnTable.pick();
  }

  private getEncounterSpawnX(anchorX: number, padding: number): number {
    return this.clampEncounterX(anchorX + Phaser.Math.Between(-70, 70), padding);
  }

  private getEncounterRateMultiplier(
    progress: number,
    activeSection: LevelSectionConfig | null,
    sectionProgress: number
  ): number {
    return resolveEncounterRateMultiplier({
      progress,
      section: activeSection,
      sectionProgress,
      defaultMultiplier: this.levelConfig.spawnRateMultiplier,
      deathReliefActive: this.deathReliefRemainingMs > 0,
    });
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
    const encounterInterval = resolveEncounterInterval(rateMultiplier, this.hazardCadence.getPressure());
    if (time <= this.lastEncounterSpawn + encounterInterval) {
      return false;
    }

    this.lastEncounterSpawn = time;
    return true;
  }

  private getEncounterCount(activeSection: LevelSectionConfig | null): number {
    return resolveEncounterCount(activeSection, this.levelConfig.encounterSize, this.hazardCadence.getPressure());
  }

  private spawnEnemiesByConfig(time: number, rateMultiplier: number, activeSection: LevelSectionConfig | null): void {
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

      if (!this.hazardCadence.tryTrigger(time, hazard, key)) {
        continue;
      }
      this.triggerHazardEvent(hazard);
    }
  }

  private spawnMirroredHazardAsteroids(minSpeed: number, maxSpeed: number): void {
    this.asteroidSpawner.spawnMirroredAsteroids(
      Phaser.Math.Between(minSpeed, maxSpeed),
      Phaser.Math.Between(minSpeed, maxSpeed)
    );
  }

  private triggerHazardEvent(hazard: ScriptedHazardConfig): void {
    triggerWaveHazard(hazard, {
      spawnAsteroidBurst: (count, minSpeed, maxSpeed, padding) =>
        this.asteroidSpawner.spawnAsteroidBurst(count, minSpeed, maxSpeed, padding),
      spawnMirroredAsteroids: (minSpeed, maxSpeed) => this.spawnMirroredHazardAsteroids(minSpeed, maxSpeed),
      spawnEdgeAsteroids: (event) => this.asteroidSpawner.spawnEdgeAsteroids(event),
      spawnEncounter: (types, intensity) => this.spawnHazardEncounter(types, intensity),
      spawnSolarFlare: (intensity) => this.hazardBeamSystem?.spawnSolarFlare(intensity),
      spawnLaserLattice: (intensity) => this.hazardBeamSystem?.spawnLaserLattice(intensity),
      spawnWormholePack: (event) => this.spawnWormholePack(event),
    });
  }

  private spawnWormholePack(hazard: ScriptedHazardConfig): void {
    const viewport = getViewportBounds(this.scene);
    this.wormholePacks.schedule(hazard, viewport, (x, y) => {
      this.scene.events.emit(GAME_SCENE_EVENTS.wormholeTelegraph, x, y);
    });
  }

  private materializeWormholePack(hazard: ScriptedHazardConfig, x: number, y: number): void {
    const preferredTypes = hazard.enemyTypes ?? ['scout', 'fighter'];
    const allowedTypes = preferredTypes.filter((type) => this.spawnTable.includes(type));
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
    const allowedTypes = preferredTypes.filter((type) => this.spawnTable.includes(type));
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
    return clampWaveEncounterX(getViewportBounds(this.scene).width, x, padding);
  }

  private getLaneAnchorX(lane: AuthoredLaneAnchor, padding: number): number {
    return getWaveLaneAnchorX(getViewportBounds(this.scene).width, lane, padding);
  }

  private getEncounterHorizontalRange(padding: number): { min: number; max: number } {
    return getEncounterHorizontalRange(getViewportBounds(this.scene).width, padding);
  }
}
