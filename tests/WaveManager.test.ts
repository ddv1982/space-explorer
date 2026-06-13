import { describe, expect, mock, test } from 'bun:test';

import type { EnemySpawnConfig, LevelConfig, LevelSectionConfig } from '@/config/LevelsConfig';

mock.module('phaser', () => ({
  default: {
    Math: {
      Between: (min: number, _max: number) => min,
      Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      Linear: (a: number, b: number, t: number) => a + (b - a) * t,
      Easing: {
        Cubic: {
          In: (value: number) => value,
        },
      },
    },
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
  },
}));

const { WaveManager } = await import('../src/systems/WaveManager');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');

type FakeSpawner = {
  resetCorridorGapCenter: () => void;
  spawnAsteroids: (
    time: number,
    activeSection: LevelSectionConfig | null,
    levelConfig: LevelConfig,
    lastAsteroidSpawn: number
  ) => number;
  spawnMirroredAsteroids: (leftSpeed: number, rightSpeed: number) => void;
  spawnAsteroidBurst: (count: number, minSpeed: number, maxSpeed: number, spacing?: number) => void;
  spawnEdgeAsteroids: (hazard: unknown) => void;
};

type WaveManagerMutable = InstanceType<typeof WaveManager> & {
  levelConfig: LevelConfig;
  asteroidSpawner: FakeSpawner;
  buildSpawnTable: (enemyEntries: EnemySpawnConfig[]) => void;
  resetLevelState: () => void;
  resetHazardState: () => void;
};

function createLevelConfig(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    name: 'Test Level',
    planetName: 'Test Planet',
    bgColor: '#000000',
    accentColor: 0xffffff,
    nebulaColor: 0x000000,
    nebulaAlpha: 0.4,
    colorGrade: null,
    planetPalette: [0xffffff, 0x111111],
    enemies: [{ type: 'scout', weight: 1 }],
    encounterSize: { min: 1, max: 1 },
    spawnRateMultiplier: 1,
    levelDistance: 1000,
    hasBoss: false,
    boss: null,
    lastLifeHelperWing: null,
    bossTriggerProgress: 1,
    asteroidInterval: 500,
    sections: [],
    music: {
      seed: 'test',
      tempo: 120,
      meter: { beatsPerBar: 4, beatUnit: 4 },
      key: 'C',
      mode: 'ionian',
      energyCurve: 'steady',
      layers: [],
      arrangement: { sections: [] },
    },
    destination: 'test',
    visualTheme: 'test',
    coreGameplayIdea: 'test',
    pacingSummary: 'test',
    enemyCompositionSummary: 'test',
    hazardSummary: 'test',
    bossConcept: 'test',
    difficultyRole: 'test',
    journeyNote: 'test',
    ...overrides,
  };
}

function createSection(overrides: Partial<LevelSectionConfig> = {}): LevelSectionConfig {
  return {
    id: 'section',
    label: 'Section',
    startProgress: 0,
    endProgress: 1,
    phase: 'hazard',
    summary: 'Section summary',
    tensionArc: 'constant',
    ...overrides,
  };
}

function createWaveManagerHarness(levelConfig: LevelConfig) {
  const spawnerCalls = {
    resetCorridorGapCenter: 0,
    spawnAsteroids: [] as Array<{ time: number; activeSection: LevelSectionConfig | null; levelConfig: LevelConfig; lastAsteroidSpawn: number }>,
    spawnMirroredAsteroids: [] as Array<{ leftSpeed: number; rightSpeed: number }>,
    spawnAsteroidBurst: [] as Array<{ count: number; minSpeed: number; maxSpeed: number; spacing?: number }>,
    spawnEdgeAsteroids: [] as unknown[],
  };
  const emittedEvents: string[] = [];
  const spawnedEnemies: Array<{ type: string; x: number; y: number }> = [];
  const spawnedPowerUps: Array<{ x: number; y: number; type: string }> = [];
  const asteroidGroup = { id: 'asteroid-group' };
  const powerUpGroup = {
    getFirstDead: () => ({
      spawn: (x: number, y: number, type: string) => {
        spawnedPowerUps.push({ x, y, type });
      },
    }),
    get: () => null,
  };

  const scene = {
    physics: {
      add: {
        group: () => asteroidGroup,
      },
    },
    scale: {
      getViewPort: () => ({ x: 0, y: 0, width: 800, height: 600 }),
    },
    events: {
      emit: (eventName: string, value: number) => {
        emittedEvents.push(`${eventName}:${value}`);
      },
    },
  };

  const enemyPool = {
    spawnEnemy: (type: string, x: number, y: number) => {
      spawnedEnemies.push({ type, x, y });
      return { active: true };
    },
  };

  const fakeSpawner: FakeSpawner = {
    resetCorridorGapCenter: () => {
      spawnerCalls.resetCorridorGapCenter += 1;
    },
    spawnAsteroids: (time, activeSection, currentLevelConfig, lastAsteroidSpawn) => {
      spawnerCalls.spawnAsteroids.push({
        time,
        activeSection,
        levelConfig: currentLevelConfig,
        lastAsteroidSpawn,
      });
      return time;
    },
    spawnMirroredAsteroids: (leftSpeed, rightSpeed) => {
      spawnerCalls.spawnMirroredAsteroids.push({ leftSpeed, rightSpeed });
    },
    spawnAsteroidBurst: (count, minSpeed, maxSpeed, spacing) => {
      spawnerCalls.spawnAsteroidBurst.push({ count, minSpeed, maxSpeed, spacing });
    },
    spawnEdgeAsteroids: (hazard) => {
      spawnerCalls.spawnEdgeAsteroids.push(hazard);
    },
  };

  const manager = new WaveManager();
  const returnedAsteroidGroup = manager.create(scene as never, enemyPool as never);
  manager.setPowerUpGroup(powerUpGroup as never);
  const mutableManager = manager as unknown as WaveManagerMutable;
  mutableManager.asteroidSpawner = fakeSpawner;
  mutableManager.levelConfig = levelConfig;
  mutableManager.resetLevelState();
  mutableManager.resetHazardState();
  mutableManager.buildSpawnTable(levelConfig.enemies);

  return {
    manager,
    returnedAsteroidGroup,
    asteroidGroup,
    emittedEvents,
    spawnedEnemies,
    spawnedPowerUps,
    spawnerCalls,
  };
}

describe('WaveManager', () => {
  test('update spawns configured encounter batches and asteroid updates once the interval gate opens', () => {
    const levelConfig = createLevelConfig();
    const harness = createWaveManagerHarness(levelConfig);

    harness.manager.update(2500, 16, 0.4);

    expect(harness.returnedAsteroidGroup).toBe(harness.asteroidGroup);
    expect(harness.spawnerCalls.resetCorridorGapCenter).toBe(0);
    expect(harness.spawnerCalls.spawnAsteroids).toEqual([
      {
        time: 2500,
        activeSection: null,
        levelConfig,
        lastAsteroidSpawn: 0,
      },
    ]);
    expect(harness.spawnedEnemies).toEqual([
      {
        type: 'scout',
        x: 50,
        y: -100,
      },
    ]);
    expect(harness.emittedEvents).toEqual([`${GAME_SCENE_EVENTS.enemySpawnWarning}:120`]);
  });

  test('update triggers gravity-well hazards with mirrored asteroids and preferred hazard encounters', () => {
    const activeSection = createSection({
      id: 'gravity-well-section',
      hazardEvents: [
        {
          type: 'gravity-well',
          intensity: 0.75,
          cadenceMs: 500,
        },
      ],
      enemyFocus: [
        { type: 'fighter', weight: 1 },
        { type: 'gunship', weight: 1 },
      ],
    });
    const levelConfig = createLevelConfig({
      enemies: activeSection.enemyFocus ?? [],
      sections: [activeSection],
    });
    const harness = createWaveManagerHarness(levelConfig);

    harness.manager.update(0, 16, 0.2);
    harness.manager.update(600, 16, 0.2);

    expect(harness.spawnerCalls.spawnMirroredAsteroids).toEqual([
      {
        leftSpeed: 110,
        rightSpeed: 110,
      },
    ]);
    expect(harness.spawnedEnemies).toEqual([
      { type: 'fighter', x: 100, y: -80 },
      { type: 'fighter', x: 100, y: -80 },
      { type: 'fighter', x: 100, y: -80 },
    ]);
    expect(harness.emittedEvents).toEqual([`${GAME_SCENE_EVENTS.enemySpawnWarning}:120`]);
  });

  test('update triggers lane-based signature waves once when section progress crosses the threshold', () => {
    const activeSection = createSection({
      signatureWaves: [
        {
          id: 'lane-read-check',
          triggerProgress: 0.5,
          enemies: [
            { type: 'scout', lane: 'left', y: -70 },
            { type: 'fighter', lane: 'center' },
            { type: 'bomber', lane: 'right', y: -90 },
          ],
        },
      ],
    });
    const harness = createWaveManagerHarness(createLevelConfig({ sections: [activeSection] }));

    harness.manager.update(100, 16, 0.4);
    harness.manager.update(200, 16, 0.6);
    harness.manager.update(300, 16, 0.7);

    expect(harness.spawnedEnemies).toEqual([
      { type: 'scout', x: 80, y: -70 },
      { type: 'fighter', x: 400, y: -80 },
      { type: 'bomber', x: 720, y: -90 },
    ]);
    expect(harness.emittedEvents).toEqual([
      `${GAME_SCENE_EVENTS.enemySpawnWarning}:80`,
      `${GAME_SCENE_EVENTS.enemySpawnWarning}:400`,
      `${GAME_SCENE_EVENTS.enemySpawnWarning}:720`,
    ]);
  });

  test('update triggers authored recovery drops once through the configured power-up group', () => {
    const activeSection = createSection({
      recoveryDrops: [
        {
          id: 'recover-after-climax',
          triggerProgress: 0.45,
          type: 'shield',
          lane: 'center',
        },
      ],
    });
    const harness = createWaveManagerHarness(createLevelConfig({ sections: [activeSection] }));

    harness.manager.update(100, 16, 0.44);
    harness.manager.update(200, 16, 0.45);
    harness.manager.update(300, 16, 0.8);

    expect(harness.spawnedPowerUps).toEqual([
      { x: 400, y: -40, type: 'shield' },
    ]);
  });
});
