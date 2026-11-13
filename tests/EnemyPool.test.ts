import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { EnemyPool } = await import('../src/systems/EnemyPool');
const { Scout } = await import('../src/entities/enemies/Scout');
const { Fighter } = await import('../src/entities/enemies/Fighter');
const { Bomber } = await import('../src/entities/enemies/Bomber');
const { Swarm } = await import('../src/entities/enemies/Swarm');
const { Gunship } = await import('../src/entities/enemies/Gunship');
const { Dodger } = await import('../src/entities/enemies/Dodger');
const { Sower } = await import('../src/entities/enemies/Sower');
const { Lancer } = await import('../src/entities/enemies/Lancer');
const { Splitter } = await import('../src/entities/enemies/Splitter');
const { Swarmling } = await import('../src/entities/enemies/Swarmling');
const { Boss } = await import('../src/entities/enemies/Boss');
const { getLevelConfig } = await import('../src/config/LevelsConfig');
const BOSS_CONFIG = getLevelConfig(3).boss!;
const { BomberBomb } = await import('../src/entities/BomberBomb');
const { EnemyBullet } = await import('../src/entities/EnemyBullet');
type EnemyPoolInstance = InstanceType<typeof EnemyPool>;

type GroupConfig = {
  maxSize: number;
  classType: unknown;
  runChildUpdate: boolean;
};

type FakeGroup = {
  config: GroupConfig;
  createdCount: number;
  getFirstDead: (_createIfNull: boolean) => unknown;
  get: (_x: number, _y: number) => unknown;
  getChildren: () => Array<{ active?: boolean }>;
};

type EnemyPoolHarness = {
  pool: EnemyPoolInstance;
  groupsByClassType: Map<unknown, FakeGroup>;
  groupCreateCalls: GroupConfig[];
  lastFighter: { setEnemyBulletGroupArgs: unknown[] } | null;
  lastGunship: { setEnemyBulletGroupArgs: unknown[] } | null;
  lastBomber: { setBombGroupArgs: unknown[] } | null;
  lastDodger: { setEnemyBulletGroupArgs: unknown[] } | null;
  lastLancer: { setEnemyBulletGroupArgs: unknown[]; targetProvider: unknown } | null;
  lastSower: { setMineGroupArgs: unknown[] } | null;
  lastSplitter: { splitHandler: ((x: number, y: number) => void) | null } | null;
  swarmlings: Array<{ spawnArgs: number[][] }>;
  lastBoss: {
    active: boolean;
    setEnemyBulletGroupArgs: unknown[];
    summonHandler: ((type: 'scout' | 'fighter' | 'bomber' | 'swarm' | 'gunship', x: number, y: number) => void) | null;
  } | null;
};

function createEnemyPoolHarness(): EnemyPoolHarness {
  const groupsByClassType = new Map<unknown, FakeGroup>();
  const groupCreateCalls: GroupConfig[] = [];

  let lastFighter: EnemyPoolHarness['lastFighter'] = null;
  let lastGunship: EnemyPoolHarness['lastGunship'] = null;
  let lastBomber: EnemyPoolHarness['lastBomber'] = null;
  let lastDodger: EnemyPoolHarness['lastDodger'] = null;
  let lastLancer: EnemyPoolHarness['lastLancer'] = null;
  let lastSower: EnemyPoolHarness['lastSower'] = null;
  let lastSplitter: EnemyPoolHarness['lastSplitter'] = null;
  const swarmlings: EnemyPoolHarness['swarmlings'] = [];
  let lastBoss: EnemyPoolHarness['lastBoss'] = null;

  const createEntityForClassType = (classType: unknown) => {
    if (classType === Fighter) {
      const fighter = {
        active: true,
        spawn: (_x: number, _y: number) => {},
        setEnemyBulletGroupArgs: [] as unknown[],
        setEnemyBulletGroup(group: unknown) {
          this.setEnemyBulletGroupArgs.push(group);
        },
      };

      lastFighter = fighter;
      return fighter;
    }

    if (classType === Gunship) {
      const gunship = {
        active: true,
        spawn: (_x: number, _y: number) => {},
        setEnemyBulletGroupArgs: [] as unknown[],
        setEnemyBulletGroup(group: unknown) {
          this.setEnemyBulletGroupArgs.push(group);
        },
      };

      lastGunship = gunship;
      return gunship;
    }

    if (classType === Bomber) {
      const bomber = {
        active: true,
        spawn: (_x: number, _y: number) => {},
        setBombGroupArgs: [] as unknown[],
        setBombGroup(group: unknown) {
          this.setBombGroupArgs.push(group);
        },
      };

      lastBomber = bomber;
      return bomber;
    }

    if (classType === Dodger) {
      const dodger = {
        active: true,
        spawn: (_x: number, _y: number) => {},
        setEnemyBulletGroupArgs: [] as unknown[],
        setEnemyBulletGroup(group: unknown) {
          this.setEnemyBulletGroupArgs.push(group);
        },
      };

      lastDodger = dodger;
      return dodger;
    }

    if (classType === Lancer) {
      const lancer = {
        active: true,
        spawn: (_x: number, _y: number) => {},
        setEnemyBulletGroupArgs: [] as unknown[],
        setEnemyBulletGroup(group: unknown) {
          this.setEnemyBulletGroupArgs.push(group);
        },
        targetProvider: null as unknown,
        setTargetProvider(provider: unknown) {
          this.targetProvider = provider;
        },
      };

      lastLancer = lancer;
      return lancer;
    }

    if (classType === Sower) {
      const sower = {
        active: true,
        spawn: (_x: number, _y: number) => {},
        setMineGroupArgs: [] as unknown[],
        setMineGroup(group: unknown) {
          this.setMineGroupArgs.push(group);
        },
      };

      lastSower = sower;
      return sower;
    }

    if (classType === Splitter) {
      const splitter = {
        active: true,
        spawn: (_x: number, _y: number) => {},
        splitHandler: null as ((x: number, y: number) => void) | null,
        setSplitHandler(handler: (x: number, y: number) => void) {
          this.splitHandler = handler;
        },
      };

      lastSplitter = splitter;
      return splitter;
    }

    if (classType === Swarmling) {
      const swarmling = {
        active: true,
        spawnArgs: [] as number[][],
        spawn(x: number, y: number) {
          this.spawnArgs.push([x, y]);
        },
      };

      swarmlings.push(swarmling);
      return swarmling;
    }

    if (classType === Boss) {
      const boss = {
        active: true,
        spawn: (_x: number, _y: number, _config?: unknown) => {},
        setEnemyBulletGroupArgs: [] as unknown[],
        summonHandler: null as NonNullable<EnemyPoolHarness['lastBoss']>['summonHandler'],
        setEnemyBulletGroup(group: unknown) {
          this.setEnemyBulletGroupArgs.push(group);
        },
        setSummonHandler(handler: NonNullable<EnemyPoolHarness['lastBoss']>['summonHandler']) {
          this.summonHandler = handler;
        },
      };

      lastBoss = boss;
      return boss;
    }

    if (classType === Scout || classType === Swarm || classType === EnemyBullet || classType === BomberBomb) {
      return {
        active: true,
        spawn: (_x: number, _y: number) => {},
        fire: (_x: number, _y: number) => {},
      };
    }

    return {
      active: true,
      spawn: (_x: number, _y: number) => {},
    };
  };

  const scene = {
    physics: {
      add: {
        group: (config: GroupConfig): FakeGroup => {
          groupCreateCalls.push(config);

          const children: Array<{ active?: boolean }> = [];
          const group: FakeGroup = {
            config,
            createdCount: 0,
            getFirstDead: () => null,
            get: (_x: number, _y: number) => {
              group.createdCount += 1;
              const entity = createEntityForClassType(config.classType) as { active?: boolean };
              children.push(entity);
              return entity;
            },
            getChildren: () => children,
          };

          groupsByClassType.set(config.classType, group);
          return group;
        },
      },
    },
  };

  const pool = new EnemyPool();
  pool.create(scene as never);

  return {
    pool,
    groupsByClassType,
    groupCreateCalls,
    get lastFighter() {
      return lastFighter;
    },
    get lastGunship() {
      return lastGunship;
    },
    get lastBomber() {
      return lastBomber;
    },
    get lastDodger() {
      return lastDodger;
    },
    get lastLancer() {
      return lastLancer;
    },
    get lastSower() {
      return lastSower;
    },
    get lastSplitter() {
      return lastSplitter;
    },
    get swarmlings() {
      return swarmlings;
    },
    get lastBoss() {
      return lastBoss;
    },
  };
}

describe('EnemyPool regression coverage', () => {
  test('spawnLancer forwards the configured target provider', () => {
    const harness = createEnemyPoolHarness();

    harness.pool.spawnLancer(1, 2);
    expect(harness.lastLancer?.targetProvider).toBeNull();

    const provider = () => ({ x: 11, y: 22 });
    harness.pool.setTargetProvider(provider);
    harness.pool.spawnLancer(3, 4);

    expect(harness.lastLancer?.targetProvider).toBe(provider);
  });

  test('spawnSplitter split handler spawns two flanking swarmlings', () => {
    const harness = createEnemyPoolHarness();

    const splitter = harness.pool.spawnSplitter(10, 20);

    expect(splitter as unknown).toBe(harness.lastSplitter);

    harness.lastSplitter?.splitHandler?.(100, 100);

    expect(harness.swarmlings.map((swarmling) => swarmling.spawnArgs)).toEqual([[[86, 100]], [[114, 100]]]);
  });

  test('spawnBoss enforces singleton active boss', () => {
    const harness = createEnemyPoolHarness();

    const firstBoss = harness.pool.spawnBoss(100, 100, BOSS_CONFIG);
    const secondBoss = harness.pool.spawnBoss(120, 120, BOSS_CONFIG);

    expect(firstBoss).toBeTruthy();
    expect(secondBoss).toBeNull();
  });

  test('ordinary enumeration is ordered without initializing unused groups or including boss and projectiles', () => {
    const harness = createEnemyPoolHarness();
    expect(harness.pool.getAllEnemies()).toEqual([]);
    expect(harness.groupCreateCalls).toHaveLength(3);

    const types = [
      'scout',
      'fighter',
      'bomber',
      'swarm',
      'gunship',
      'diver',
      'dodger',
      'sower',
      'lancer',
      'splitter',
      'swarmling',
    ] as const;
    const enemies = types.map((type) => {
      const enemy = harness.pool.spawnEnemy(type, 10, 20);
      if (!enemy) throw new Error(`Failed to spawn ${type}`);
      return enemy;
    });
    harness.pool.spawnBoss(30, 40, BOSS_CONFIG);
    for (const group of [
      harness.pool.getBombGroup(),
      harness.pool.getMineGroup(),
      harness.pool.getEnemyBulletGroup(),
    ]) {
      group.get(50, 60);
    }

    expect(harness.pool.getAllEnemies()).toEqual(enemies);
    const bulletGroup = harness.pool.getEnemyBulletGroup();
    expect(harness.lastFighter?.setEnemyBulletGroupArgs).toEqual([bulletGroup]);
    expect(harness.lastGunship?.setEnemyBulletGroupArgs).toEqual([bulletGroup]);
    expect(harness.lastDodger?.setEnemyBulletGroupArgs).toEqual([bulletGroup]);
    expect(harness.lastLancer?.setEnemyBulletGroupArgs).toEqual([bulletGroup]);
    expect(harness.lastBomber?.setBombGroupArgs).toEqual([harness.pool.getBombGroup()]);
    expect(harness.lastSower?.setMineGroupArgs).toEqual([harness.pool.getMineGroup()]);
  });

  test('spawning reuses an inactive entity before creating another', () => {
    const harness = createEnemyPoolHarness();
    const calls: number[][] = [];
    const reused = { spawn: (x: number, y: number) => calls.push([x, y]) };
    const group = harness.groupsByClassType.get(Scout)!;
    group.getFirstDead = () => reused;

    expect(harness.pool.spawnEnemy('scout', 42, 64) as unknown).toBe(reused);
    expect(calls).toEqual([[42, 64]]);
    expect(group.createdCount).toBe(0);
  });

  test('getAllEnemies skips groups whose children were invalidated during teardown', () => {
    const harness = createEnemyPoolHarness();
    const scout = harness.pool.spawnScout(10, 20);
    const fighter = harness.pool.spawnFighter(30, 40);
    const bomberGroup = harness.pool.getBomberGroup();

    bomberGroup.getChildren = () => {
      throw new TypeError("undefined is not an object (evaluating 'n.forEach')");
    };

    expect(() => harness.pool.getAllEnemies()).not.toThrow();
    expect(harness.pool.getAllEnemies()).toEqual([scout!, fighter!]);
  });
});
