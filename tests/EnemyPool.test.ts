import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
  },
}));

const { EnemyPool } = await import('../src/systems/EnemyPool');
const { Scout } = await import('../src/entities/enemies/Scout');
const { Fighter } = await import('../src/entities/enemies/Fighter');
const { Bomber } = await import('../src/entities/enemies/Bomber');
const { Swarm } = await import('../src/entities/enemies/Swarm');
const { Gunship } = await import('../src/entities/enemies/Gunship');
const { Boss } = await import('../src/entities/enemies/Boss');
const { BomberBomb } = await import('../src/entities/BomberBomb');
const { EnemyBullet } = await import('../src/entities/EnemyBullet');

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
  [Boss, { maxSize: 1, classType: Boss, runChildUpdate: true }],
  [BomberBomb, { maxSize: 30, classType: BomberBomb, runChildUpdate: true }],
  [EnemyBullet, { maxSize: 80, classType: EnemyBullet, runChildUpdate: true }],
]);

type EnemyPoolHarness = {
  pool: EnemyPool;
  groupsByClassType: Map<unknown, FakeGroup>;
  groupCreateCalls: GroupConfig[];
  lastFighter: { setEnemyBulletGroupArgs: unknown[] } | null;
  lastGunship: { setEnemyBulletGroupArgs: unknown[] } | null;
  lastBomber: { setBombGroupArgs: unknown[] } | null;
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

    expect(harness.pool.getScoutGroup()).toBe(harness.groupsByClassType.get(Scout));
    expect(harness.pool.getFighterGroup()).toBe(harness.groupsByClassType.get(Fighter));
    expect(harness.pool.getEnemyBulletGroup()).toBe(harness.groupsByClassType.get(EnemyBullet));
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
      'boss',
    ]);
    expect(registryB.map(entry => entry.key)).toEqual([
      'scout',
      'fighter',
      'bomber',
      'swarm',
      'gunship',
      'boss',
    ]);

    const classTypeCalls = harness.groupCreateCalls.map(call => call.classType);
    expect(classTypeCalls.filter(type => type === Bomber).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Swarm).length).toBe(1);
    expect(classTypeCalls.filter(type => type === Gunship).length).toBe(1);
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

    expect(bomber).toBe(harness.lastBomber);
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
    }) as EnemyPool['spawnEnemy'];

    harness.lastBoss?.summonHandler?.('scout', 42, 64);

    expect(delegated).toEqual([{ type: 'scout', x: 42, y: 64 }]);
  });
});
