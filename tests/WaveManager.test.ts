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

type WaveManagerMutable = {
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
    music: {} as LevelConfig['music'],
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
  const markedAces: Array<{ type: string; x: number; y: number }> = [];
  const asteroidGroup = { id: 'asteroid-group' };
  const powerUpGroup = {
    getFirstDead: () => ({
      spawn: (x: number, y: number, type: string) => {
        spawnedPowerUps.push({ x, y, type });
      },
    }),
    get: (): null => null,
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
      return {
        active: true,
        getDefeatCount: () => 0,
        markAsAce: () => {
          markedAces.push({ type, x, y });
        },
      };
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
    markedAces,
    spawnerCalls,
  };
}

describe('WaveManager', () => {
  test('update spawns configured encounter batches and asteroid updates once the interval gate opens', () => {
    const levelConfig = createLevelConfig();
    const harness = createWaveManagerHarness(levelConfig);

    harness.manager.update(2500, 16, 0.4);

    expect(harness.returnedAsteroidGroup as unknown).toBe(harness.asteroidGroup);
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

  test('update routes solar-flare and laser-lattice hazards to the hazard beam system', () => {
    const activeSection = createSection({
      id: 'beam-section',
      hazardEvents: [
        { type: 'solar-flare', intensity: 0.6, cadenceMs: 400 },
        { type: 'laser-lattice', intensity: 0.4, cadenceMs: 400 },
      ],
    });
    const levelConfig = createLevelConfig({ sections: [activeSection] });
    const harness = createWaveManagerHarness(levelConfig);

    const beamCalls: Array<{ kind: string; intensity: number }> = [];
    harness.manager.setHazardBeamSystem({
      spawnSolarFlare: (intensity: number) => beamCalls.push({ kind: 'solar-flare', intensity }),
      spawnLaserLattice: (intensity: number) => beamCalls.push({ kind: 'laser-lattice', intensity }),
    } as never);

    harness.manager.update(0, 16, 0.2);
    harness.manager.update(500, 16, 0.2);

    expect(beamCalls).toEqual([
      { kind: 'solar-flare', intensity: 0.6 },
      { kind: 'laser-lattice', intensity: 0.4 },
    ]);
  });

  test('update telegraphs wormhole-spawn portals and materializes the configured pack', () => {
    const activeSection = createSection({
      id: 'wormhole-section',
      hazardEvents: [
        { type: 'wormhole-spawn', intensity: 0.5, cadenceMs: 500, enemyTypes: ['dodger'] },
      ],
      enemyFocus: [
        { type: 'scout', weight: 1 },
        { type: 'dodger', weight: 1 },
      ],
    });
    const levelConfig = createLevelConfig({
      enemies: activeSection.enemyFocus ?? [],
      sections: [activeSection],
    });
    const harness = createWaveManagerHarness(levelConfig);

    harness.manager.update(0, 16, 0.2);
    harness.manager.update(600, 16, 0.2);

    expect(harness.emittedEvents).toEqual([
      `${GAME_SCENE_EVENTS.wormholeTelegraph}:160`,
      `${GAME_SCENE_EVENTS.wormholeTelegraph}:160`,
    ]);
    expect(harness.spawnedEnemies).toEqual([]);

    // Wall-clock jumps do not advance the portal: only active gameplay delta does.
    harness.manager.update(600, 599, 0.2);
    expect(harness.spawnedEnemies).toEqual([]);
    harness.manager.update(600, 1, 0.2);

    expect(harness.spawnedEnemies).toEqual([
      { type: 'dodger', x: 130, y: 150 },
      { type: 'dodger', x: 160, y: 150 },
      { type: 'dodger', x: 190, y: 150 },
      { type: 'dodger', x: 130, y: 150 },
      { type: 'dodger', x: 160, y: 150 },
      { type: 'dodger', x: 190, y: 150 },
    ]);
  });

  test('section changes cancel pending wormhole packs', () => {
    const wormholeSection = createSection({
      id: 'wormhole-section',
      startProgress: 0,
      endProgress: 0.5,
      hazardEvents: [{ type: 'wormhole-spawn', intensity: 0, cadenceMs: 500 }],
    });
    const nextSection = createSection({ id: 'next-section', startProgress: 0.5, endProgress: 1 });
    const harness = createWaveManagerHarness(createLevelConfig({
      sections: [wormholeSection, nextSection],
    }));

    harness.manager.update(0, 16, 0.2);
    harness.manager.update(600, 16, 0.2);
    harness.manager.update(1200, 600, 0.8);

    expect(harness.spawnedEnemies).toEqual([]);
  });

  test('death relief cancels pending wormhole packs', () => {
    const activeSection = createSection({
      hazardEvents: [{ type: 'wormhole-spawn', intensity: 0, cadenceMs: 500 }],
    });
    const harness = createWaveManagerHarness(createLevelConfig({ sections: [activeSection] }));

    harness.manager.update(0, 16, 0.2);
    harness.manager.update(600, 16, 0.2);
    harness.manager.applyDeathRelief();
    harness.manager.update(600, 600, 0.2);

    expect(harness.spawnedEnemies).toEqual([]);
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

  test('update gilds only the authored ace entries of a signature wave', () => {
    const activeSection = createSection({
      signatureWaves: [
        {
          id: 'ace-priority-check',
          triggerProgress: 0.5,
          enemies: [
            { type: 'splitter', lane: 'left', ace: true },
            { type: 'gunship', lane: 'right' },
          ],
        },
      ],
    });
    const harness = createWaveManagerHarness(createLevelConfig({ sections: [activeSection] }));

    harness.manager.update(100, 16, 0.4);
    harness.manager.update(200, 16, 0.6);

    expect(harness.spawnedEnemies).toEqual([
      { type: 'splitter', x: 80, y: -80 },
      { type: 'gunship', x: 720, y: -80 },
    ]);
    expect(harness.markedAces).toEqual([{ type: 'splitter', x: 80, y: -80 }]);
  });

  test('update gilds the lead members of a choreographed wave up to its aceCount', () => {
    const activeSection = createSection({
      waves: [
        {
          id: 'ace-vee',
          atMs: 300,
          formation: 'line',
          type: 'gunship',
          count: 3,
          lane: 3,
          aceCount: 1,
        },
      ],
    });
    const harness = createWaveManagerHarness(createLevelConfig({ sections: [activeSection], enemies: [] }));

    harness.manager.update(0, 300, 0.1);

    expect(harness.spawnedEnemies).toEqual([
      { type: 'gunship', x: 344, y: -60 },
      { type: 'gunship', x: 400, y: -60 },
      { type: 'gunship', x: 456, y: -60 },
    ]);
    expect(harness.markedAces).toEqual([{ type: 'gunship', x: 344, y: -60 }]);
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

  test('update fires choreographed section waves on accumulated gameplay delta, ignoring wall-clock jumps', () => {
    const activeSection = createSection({
      waves: [
        { id: 'opening-line', atMs: 300, formation: 'line', type: 'scout', count: 3, lane: 3 },
      ],
    });
    const harness = createWaveManagerHarness(createLevelConfig({ sections: [activeSection], enemies: [] }));

    harness.manager.update(0, 100, 0.1);
    // A wall-clock jump with an ordinary frame delta (e.g. resuming after a
    // pause) must not compress the wave schedule into a burst.
    harness.manager.update(50000, 100, 0.2);
    expect(harness.spawnedEnemies).toEqual([]);

    harness.manager.update(50100, 100, 0.3);
    expect(harness.spawnedEnemies).toEqual([
      { type: 'scout', x: 344, y: -60 },
      { type: 'scout', x: 400, y: -60 },
      { type: 'scout', x: 456, y: -60 },
    ]);
    expect(harness.emittedEvents).toEqual([
      `${GAME_SCENE_EVENTS.enemySpawnWarning}:344`,
      `${GAME_SCENE_EVENTS.enemySpawnWarning}:400`,
      `${GAME_SCENE_EVENTS.enemySpawnWarning}:456`,
    ]);
  });

  test('updateBossAdds trickles scout lines on the configured interval when the level enables them', () => {
    const harness = createWaveManagerHarness(createLevelConfig({ bossAddWaves: true }));

    harness.manager.updateBossAdds(13000);
    expect(harness.spawnedEnemies).toEqual([
      { type: 'scout', x: 60, y: -50 },
      { type: 'scout', x: 112, y: -50 },
      { type: 'scout', x: 164, y: -50 },
    ]);

    harness.manager.updateBossAdds(20000);
    expect(harness.spawnedEnemies).toHaveLength(3);

    harness.manager.updateBossAdds(26000);
    expect(harness.spawnedEnemies).toHaveLength(6);
  });

  test('updateBossAdds is a no-op when the level does not enable boss add-waves', () => {
    const harness = createWaveManagerHarness(createLevelConfig());

    harness.manager.updateBossAdds(13000);

    expect(harness.spawnedEnemies).toEqual([]);
  });

  test('applyDeathRelief stretches the encounter interval while relief is active', () => {
    const harness = createWaveManagerHarness(createLevelConfig());

    harness.manager.applyDeathRelief();
    harness.manager.update(100_000, 16, 0.4);
    expect(harness.spawnedEnemies).toHaveLength(1);

    // A large scene-clock advance with only one gameplay frame does not consume relief.
    harness.manager.update(102_100, 16, 0.4);
    expect(harness.spawnedEnemies).toHaveLength(1);

    harness.manager.update(102_100, 8000, 0.4);
    expect(harness.spawnedEnemies).toHaveLength(2);
  });
});
