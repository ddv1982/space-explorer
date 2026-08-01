import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { EnemyPool } = await import('../src/systems/EnemyPool');
const { Scout } = await import('../src/entities/enemies/Scout');
const { Fighter } = await import('../src/entities/enemies/Fighter');
const { Bomber } = await import('../src/entities/enemies/Bomber');
const { Swarm } = await import('../src/entities/enemies/Swarm');
const { Gunship } = await import('../src/entities/enemies/Gunship');
const { Diver } = await import('../src/entities/enemies/Diver');
const { Dodger } = await import('../src/entities/enemies/Dodger');
const { Sower } = await import('../src/entities/enemies/Sower');
const { Lancer } = await import('../src/entities/enemies/Lancer');
const { Splitter } = await import('../src/entities/enemies/Splitter');
const { Swarmling } = await import('../src/entities/enemies/Swarmling');
const { Boss } = await import('../src/entities/enemies/Boss');
const { BomberBomb } = await import('../src/entities/BomberBomb');
const { Mine } = await import('../src/entities/Mine');
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

const EXPECTED_GROUP_CONFIGS = new Map<unknown, GroupConfig>([
  [Scout, { maxSize: 50, classType: Scout, runChildUpdate: true }],
  [Fighter, { maxSize: 30, classType: Fighter, runChildUpdate: true }],
  [Bomber, { maxSize: 20, classType: Bomber, runChildUpdate: true }],
  [Swarm, { maxSize: 40, classType: Swarm, runChildUpdate: true }],
  [Gunship, { maxSize: 15, classType: Gunship, runChildUpdate: true }],
  [Diver, { maxSize: 24, classType: Diver, runChildUpdate: true }],
  [Dodger, { maxSize: 16, classType: Dodger, runChildUpdate: true }],
  [Sower, { maxSize: 10, classType: Sower, runChildUpdate: true }],
  [Lancer, { maxSize: 8, classType: Lancer, runChildUpdate: true }],
  [Splitter, { maxSize: 16, classType: Splitter, runChildUpdate: true }],
  [Swarmling, { maxSize: 32, classType: Swarmling, runChildUpdate: true }],
  [Boss, { maxSize: 1, classType: Boss, runChildUpdate: true }],
  [BomberBomb, { maxSize: 30, classType: BomberBomb, runChildUpdate: true }],
  [Mine, { maxSize: 24, classType: Mine, runChildUpdate: true }],
  [EnemyBullet, { maxSize: 80, classType: EnemyBullet, runChildUpdate: true }],
]);

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
        spawn: (_x: number, _y: number) => {
          // noop
        },
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
        spawn: (_x: number, _y: number) => {
          // noop
        },
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
        spawn: (_x: number, _y: number) => {
          // noop
        },
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
        spawn: (_x: number, _y: number) => {
          // noop
        },
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
        spawn: (_x: number, _y: number) => {
          // noop
        },
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
        spawn: (_x: number, _y: number) => {
          // noop
        },
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
        spawn: (_x: number, _y: number) => {
          // noop
        },
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
        spawn: (_x: number, _y: number, _config?: unknown) => {
          // noop
        },
        setEnemyBulletGroupArgs: [] as unknown[],
        summonHandler: null as EnemyPoolHarness['lastBoss']['summonHandler'],
        setEnemyBulletGroup(group: unknown) {
          this.setEnemyBulletGroupArgs.push(group);
        },
        setSummonHandler(handler: EnemyPoolHarness['lastBoss']['summonHandler']) {
          this.summonHandler = handler;
        },
      };

      lastBoss = boss;
      return boss;
    }

    if (classType === Scout || classType === Swarm || classType === EnemyBullet || classType === BomberBomb) {
      return {
        active: true,
        spawn: (_x: number, _y: number) => {
          // noop
        },
        fire: (_x: number, _y: number) => {
          // noop
        },
      };
    }

    return {
      active: true,
      spawn: (_x: number, _y: number) => {
        // noop
      },
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
  test('create eagerly initializes scout/fighter/enemy-bullet groups with expected descriptors', () => {
    const harness = createEnemyPoolHarness();

    expect(harness.groupCreateCalls.map(call => call.classType)).toEqual([
      Scout,
      Fighter,
      EnemyBullet,
    ]);

    expect(harness.groupCreateCalls).toEqual([
      EXPECTED_GROUP_CONFIGS.get(Scout),
      EXPECTED_GROUP_CONFIGS.get(Fighter),
      EXPECTED_GROUP_CONFIGS.get(EnemyBullet),
    ]);

    expect(harness.pool.getScoutGroup() as unknown).toBe(harness.groupsByClassType.get(Scout));
    expect(harness.pool.getFighterGroup() as unknown).toBe(harness.groupsByClassType.get(Fighter));
    expect(harness.pool.getEnemyBulletGroup() as unknown).toBe(
      harness.groupsByClassType.get(EnemyBullet),
    );
  });

  test('enemy registry order is stable and repeated accessor calls do not duplicate groups', () => {
    const harness = createEnemyPoolHarness();

    const registryA = harness.pool.getEnemyGroupRegistry();
    const registryB = harness.pool.getEnemyGroupRegistry();

    harness.pool.getBomberGroup();
    harness.pool.getBombGroup();
    harness.pool.getBossGroup();

    expect(registryA.map(entry => entry.key)).toEqual([
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
      'boss',
    ]);
    expect(registryB.map(entry => entry.key)).toEqual([
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
      'boss',
    ]);

    const classTypeCalls = harness.groupCreateCalls.map(call => call.classType);
    expect(classTypeCalls.filter(type => type === Bomber).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Swarm).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Gunship).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Diver).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Dodger).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Sower).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Lancer).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Splitter).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Swarmling).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Boss).length).toBe(1);
    expect(classTypeCalls.filter(type => type === BomberBomb).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Scout).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Fighter).length).toBe(1);
    expect(classTypeCalls.filter(type => type === EnemyBullet).length).toBe(1);

    for (const call of harness.groupCreateCalls) {
      expect(call).toEqual(EXPECTED_GROUP_CONFIGS.get(call.classType));
    }
  });

  test('spawnBomber wires the shared bomb group and keeps bomber-before-bomb creation order', () => {
    const harness = createEnemyPoolHarness();

    const bomber = harness.pool.spawnBomber(10, 20);

    expect(bomber as unknown).toBe(harness.lastBomber);
    expect(harness.lastBomber?.setBombGroupArgs).toEqual([harness.pool.getBombGroup()]);

    const bomberCreateIndex = harness.groupCreateCalls.findIndex(call => call.classType === Bomber);
    const bombCreateIndex = harness.groupCreateCalls.findIndex(call => call.classType === BomberBomb);

    expect(bomberCreateIndex).toBeGreaterThanOrEqual(0);
    expect(bombCreateIndex).toBeGreaterThanOrEqual(0);
    expect(bomberCreateIndex).toBeLessThan(bombCreateIndex);
  });

  test('spawnFighter/spawnGunship/spawnBoss wire shared enemy bullet group', () => {
    const harness = createEnemyPoolHarness();

    harness.pool.spawnFighter(1, 2);
    harness.pool.spawnGunship(3, 4);
    harness.pool.spawnBoss(5, 6);

    const enemyBulletGroup = harness.pool.getEnemyBulletGroup();
    expect(harness.lastFighter?.setEnemyBulletGroupArgs).toEqual([enemyBulletGroup]);
    expect(harness.lastGunship?.setEnemyBulletGroupArgs).toEqual([enemyBulletGroup]);
    expect(harness.lastBoss?.setEnemyBulletGroupArgs).toEqual([enemyBulletGroup]);
  });

  test('spawnDodger/spawnLancer wire shared enemy bullet group', () => {
    const harness = createEnemyPoolHarness();

    harness.pool.spawnDodger(1, 2);
    harness.pool.spawnLancer(3, 4);

    const enemyBulletGroup = harness.pool.getEnemyBulletGroup();
    expect(harness.lastDodger?.setEnemyBulletGroupArgs).toEqual([enemyBulletGroup]);
    expect(harness.lastLancer?.setEnemyBulletGroupArgs).toEqual([enemyBulletGroup]);
  });

  test('spawnLancer forwards the configured target provider', () => {
    const harness = createEnemyPoolHarness();

    harness.pool.spawnLancer(1, 2);
    expect(harness.lastLancer?.targetProvider).toBeNull();

    const provider = () => ({ x: 11, y: 22 });
    harness.pool.setTargetProvider(provider);
    harness.pool.spawnLancer(3, 4);

    expect(harness.lastLancer?.targetProvider).toBe(provider);
  });

  test('spawnSower wires the shared mine group and keeps sower-before-mine creation order', () => {
    const harness = createEnemyPoolHarness();

    const sower = harness.pool.spawnSower(10, 20);

    expect(sower as unknown).toBe(harness.lastSower);
    expect(harness.lastSower?.setMineGroupArgs).toEqual([harness.pool.getMineGroup()]);

    const sowerCreateIndex = harness.groupCreateCalls.findIndex(call => call.classType === Sower);
    const mineCreateIndex = harness.groupCreateCalls.findIndex(call => call.classType === Mine);

    expect(sowerCreateIndex).toBeGreaterThanOrEqual(0);
    expect(mineCreateIndex).toBeGreaterThanOrEqual(0);
    expect(sowerCreateIndex).toBeLessThan(mineCreateIndex);
  });

  test('spawnSplitter split handler spawns two flanking swarmlings', () => {
    const harness = createEnemyPoolHarness();

    const splitter = harness.pool.spawnSplitter(10, 20);

    expect(splitter as unknown).toBe(harness.lastSplitter);

    harness.lastSplitter?.splitHandler?.(100, 100);

    expect(harness.swarmlings.map(swarmling => swarmling.spawnArgs)).toEqual([
      [[86, 100]],
      [[114, 100]],
    ]);
  });

  test('spawnBoss enforces singleton active boss', () => {
    const harness = createEnemyPoolHarness();

    const firstBoss = harness.pool.spawnBoss(100, 100);
    const secondBoss = harness.pool.spawnBoss(120, 120);

    expect(firstBoss).toBeTruthy();
    expect(secondBoss).toBeNull();
  });

  test('boss summon handler delegates to spawnEnemy(type, x, y)', () => {
    const harness = createEnemyPoolHarness();

    harness.pool.spawnBoss(9, 9);

    const delegated: Array<{ type: string; x: number; y: number }> = [];
    harness.pool.spawnEnemy = ((type: string, x: number, y: number) => {
      delegated.push({ type, x, y });
      return null;
    }) as EnemyPoolInstance['spawnEnemy'];

    harness.lastBoss?.summonHandler?.('scout', 42, 64);

    expect(delegated).toEqual([{ type: 'scout', x: 42, y: 64 }]);
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
    expect(harness.pool.getAllEnemies()).toEqual([scout, fighter]);
  });
});
