import { afterEach, describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const playPicketShot = mock();
mock.module('../src/systems/AudioManager', () => ({
  audioManager: {
    playPicketShot,
  },
}));

const { PicketTurretSystem } = await import('../src/systems/PicketTurretSystem');
const { PicketBolt } = await import('../src/entities/PicketBolt');
const { EnemyBase } = await import('../src/entities/enemies/EnemyBase');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');
const { PICKET_BOLT_DAMAGE, PICKET_BOLT_SPEED, PICKET_ONLINE_ANNOUNCE_DELAY_MS, PICKET_TARGET_RETRY_MS } =
  await import('../src/systems/picketTurretConfig');

type PicketTurretSystemInstance = InstanceType<typeof PicketTurretSystem>;

type MockBolt = {
  active: boolean;
  x: number;
  y: number;
  fire: ReturnType<typeof mock>;
  kill: ReturnType<typeof mock>;
  destroy: ReturnType<typeof mock>;
};

type MockEnemy = {
  active: boolean;
  x: number;
  y: number;
  enemyType: string;
  takeDamage: ReturnType<typeof mock>;
};

function createEnemy(x: number, y: number, enemyType = 'scout'): MockEnemy {
  return {
    active: true,
    x,
    y,
    enemyType,
    takeDamage: mock(),
  };
}

function createHarness(options: { viewportWidth?: number; viewportHeight?: number } = {}) {
  const viewportWidth = options.viewportWidth ?? 800;
  const viewportHeight = options.viewportHeight ?? 600;

  const bolts: MockBolt[] = [];
  const boltGroup = {
    config: null as unknown,
    getFirstDead: mock((_createIfNull: boolean) => bolts.find((bolt) => !bolt.active) ?? null),
    get: mock((x: number, y: number) => {
      const bolt: MockBolt = {
        active: false,
        x,
        y,
        fire: mock((fireX: number, fireY: number) => {
          bolt.active = true;
          bolt.x = fireX;
          bolt.y = fireY;
        }),
        kill: mock(() => {
          bolt.active = false;
        }),
        destroy: mock(),
      };
      bolts.push(bolt);
      return bolt;
    }),
    getChildren: mock(() => [...bolts]),
    clear: mock(),
  };

  const overlapRegistrations: Array<{ group: unknown; callback: (a: unknown, b: unknown) => void }> = [];
  const colliders: Array<{ destroy: ReturnType<typeof mock> }> = [];

  const sprites: Array<{
    x: number;
    y: number;
    setDepth: ReturnType<typeof mock>;
    setAlpha: ReturnType<typeof mock>;
    setScale: ReturnType<typeof mock>;
    setPosition: ReturnType<typeof mock>;
    destroy: ReturnType<typeof mock>;
  }> = [];

  const tweenConfigs: unknown[] = [];
  const emit = mock();

  const scene = {
    textures: { exists: () => true },
    add: {
      sprite: (x: number, y: number) => {
        const sprite = {
          x,
          y,
          setDepth: mock(),
          setAlpha: mock(),
          setScale: mock(),
          setPosition: mock((nextX: number, nextY: number) => {
            sprite.x = nextX;
            sprite.y = nextY;
          }),
          destroy: mock(),
        };
        sprites.push(sprite);
        return sprite;
      },
    },
    physics: {
      add: {
        group: (config: unknown) => {
          boltGroup.config = config;
          return boltGroup;
        },
        overlap: (_a: unknown, group: unknown, callback: (a: unknown, b: unknown) => void) => {
          overlapRegistrations.push({ group, callback });
          const collider = { destroy: mock() };
          colliders.push(collider);
          return collider;
        },
      },
      world: { isPaused: false },
    },
    cameras: { main: { width: viewportWidth, height: viewportHeight } },
    scale: {
      getViewPort: () => ({ x: 0, y: 0, width: viewportWidth, height: viewportHeight }),
    },
    time: {
      now: 0,
    },
    tweens: {
      add: (config: unknown) => {
        tweenConfigs.push(config);
        return { stop: () => {} };
      },
    },
    events: { emit },
  };

  const scoutGroup = { key: 'scout', children: [] as MockEnemy[] };
  const gunnerGroup = { key: 'gunner', children: [] as MockEnemy[] };
  const bossGroup = { key: 'boss', children: [] as MockEnemy[] };
  const groupsByKey = new Map([
    ['scout', scoutGroup],
    ['gunner', gunnerGroup],
    ['boss', bossGroup],
  ]);

  const enemyPool = {
    getEnemyGroupRegistry: () =>
      ['scout', 'gunner', 'boss'].map((key) => {
        const entry = groupsByKey.get(key)!;
        return {
          key,
          group: {
            getChildren: () => entry.children.filter((child) => child.active),
          },
        };
      }),
  };

  const effectsManager = {
    createMuzzleFlash: mock(),
    createExplosion: mock(),
    createSparkBurst: mock(),
  };

  return {
    scene,
    enemyPool,
    effectsManager,
    boltGroup,
    bolts,
    overlapRegistrations,
    colliders,
    sprites,
    tweenConfigs,
    emit,
    scoutGroup,
    gunnerGroup,
    bossGroup,
  };
}

type Harness = ReturnType<typeof createHarness>;

function createSystem(harness: Harness, tier: number): PicketTurretSystemInstance {
  const system = new PicketTurretSystem();
  system.create({
    scene: harness.scene as never,
    enemyPool: harness.enemyPool as never,
    effectsManager: harness.effectsManager as never,
    tier,
  });
  return system;
}

describe('PicketTurretSystem', () => {
  afterEach(() => {
    playPicketShot.mockClear();
    const globalScope = globalThis as unknown as { window?: unknown };
    delete globalScope.window;
  });

  test('create is a no-op without an owned tier', () => {
    const harness = createHarness();
    const system = createSystem(harness, 0);

    system.update(10_000);
    system.relayout();
    system.suspendForTransition();
    system.destroy();

    expect(harness.sprites).toHaveLength(0);
    expect(harness.overlapRegistrations).toHaveLength(0);
    expect(harness.boltGroup.get).not.toHaveBeenCalled();
  });

  test('create anchors two edge mounts, bounds the bolt pool, and arms the online announcement', () => {
    const harness = createHarness();
    const system = createSystem(harness, 1);

    expect(harness.sprites).toHaveLength(2);
    expect(harness.sprites[0].x).toBe(26);
    expect(harness.sprites[1].x).toBe(774);
    expect(harness.sprites[0].y).toBe(300);
    expect(harness.sprites[1].y).toBe(300);

    expect((harness.boltGroup.config as { maxSize: number }).maxSize).toBe(12);

    // Every enemy group (boss included) gets a bolt overlap for incidental hits.
    expect(harness.overlapRegistrations).toHaveLength(3);

    // The banner is HUD chrome on scene.time.now. A large gameplay timestamp
    // must not pull it early, and pause-frozen combat time must not hold it.
    system.update(10_000);
    expect(harness.emit).not.toHaveBeenCalled();
    harness.scene.time.now = PICKET_ONLINE_ANNOUNCE_DELAY_MS - 1;
    system.update(10_000);
    expect(harness.emit).not.toHaveBeenCalled();
    harness.scene.time.now = PICKET_ONLINE_ANNOUNCE_DELAY_MS;
    system.update(0);
    expect(harness.emit).toHaveBeenCalledTimes(1);
    expect(harness.emit).toHaveBeenCalledWith(GAME_SCENE_EVENTS.picketOnline);

    // One-time: later frames never re-emit.
    harness.scene.time.now = PICKET_ONLINE_ANNOUNCE_DELAY_MS + 5000;
    system.update(10_000);
    expect(harness.emit).toHaveBeenCalledTimes(1);

    // Deployment tween runs when reduced motion is not requested.
    expect(harness.tweenConfigs).toHaveLength(2);
  });

  test('create skips the deployment tween when reduced motion is preferred', () => {
    const globalScope = globalThis as unknown as { window?: unknown };
    globalScope.window = { matchMedia: () => ({ matches: true }) };

    const harness = createHarness();
    createSystem(harness, 1);

    expect(harness.tweenConfigs).toHaveLength(0);
    expect(harness.sprites[0].setAlpha).not.toHaveBeenCalled();
  });

  test('update holds fire without eligible targets and retries on a bounded cadence', () => {
    const harness = createHarness();
    const system = createSystem(harness, 1);

    // First mount staggers in at 350ms with an empty field.
    system.update(349);
    expect(harness.boltGroup.get).not.toHaveBeenCalled();

    system.update(350);
    system.update(350 + PICKET_TARGET_RETRY_MS);
    system.update(350 + PICKET_TARGET_RETRY_MS * 2);

    expect(harness.bolts).toHaveLength(0);
    expect(harness.boltGroup.get).not.toHaveBeenCalled();
    expect(playPicketShot).not.toHaveBeenCalled();
  });

  test('update staggers both mounts and refires on the tier-one cadence', () => {
    const harness = createHarness();
    harness.scoutGroup.children.push(createEnemy(200, 300));

    const system = createSystem(harness, 1);

    system.update(349);
    expect(harness.bolts).toHaveLength(0);

    // Mount one opens fire at floor(700 * 0.5) = 350ms.
    system.update(350);
    expect(harness.bolts).toHaveLength(1);
    expect(harness.bolts[0].active).toBe(true);

    const [, , velocityX, velocityY] = harness.bolts[0].fire.mock.calls[0];
    expect(Math.hypot(velocityX, velocityY)).toBeCloseTo(PICKET_BOLT_SPEED, 5);
    expect(playPicketShot).toHaveBeenCalledTimes(1);
    expect(harness.effectsManager.createMuzzleFlash).toHaveBeenCalledTimes(1);

    // Cadence gate: both mounts are inside their intervals.
    system.update(400);
    expect(harness.bolts).toHaveLength(1);

    // Second mount staggers in at 700ms.
    system.update(700);
    expect(harness.bolts).toHaveLength(2);

    // First mount refires at 350 + 700 = 1050ms, not a frame earlier.
    system.update(1049);
    expect(harness.bolts).toHaveLength(2);
    system.update(1050);
    expect(harness.bolts).toHaveLength(3);
  });

  test('overclock tier fires on the faster cadence', () => {
    const harness = createHarness();
    harness.scoutGroup.children.push(createEnemy(200, 300));

    const system = createSystem(harness, 2);

    // Tier-2 stagger: first mount at floor(480 * 0.5) = 240ms.
    system.update(239);
    expect(harness.bolts).toHaveLength(0);
    system.update(240);
    expect(harness.bolts).toHaveLength(1);

    // Second mount at 480ms; first mount refires at 720ms.
    system.update(479);
    expect(harness.bolts).toHaveLength(1);
    system.update(480);
    expect(harness.bolts).toHaveLength(2);
    system.update(719);
    expect(harness.bolts).toHaveLength(2);
    system.update(720);
    expect(harness.bolts).toHaveLength(3);
  });

  test('target scan prefers the mount half, then preferred light types, then nearest', () => {
    const harness = createHarness();

    // Right-half preferred scout must lose to a left-half non-preferred gunner
    // for the left mount.
    const rightScout = createEnemy(700, 300, 'scout');
    const leftGunner = createEnemy(200, 300, 'gunner');
    harness.scoutGroup.children.push(rightScout);
    harness.gunnerGroup.children.push(leftGunner);

    const system = createSystem(harness, 1);
    system.update(350);

    expect(harness.bolts).toHaveLength(1);
    const [, , velocityX] = harness.bolts[0].fire.mock.calls[0];
    expect(velocityX).toBeGreaterThan(0); // fired rightward toward the left-half gunner

    // A preferred scout in the same half beats the closer gunner on the next volley.
    const leftScout = createEnemy(380, 300, 'scout');
    harness.scoutGroup.children.push(leftScout);
    system.update(1050);

    // Left mount refires at 1050; right mount takes its staggered first shot too.
    expect(harness.bolts).toHaveLength(3);

    const [fireX, fireY, vx2, vy2] = harness.bolts[1].fire.mock.calls[0];
    const angleToScout = Math.atan2(leftScout.y - 300, leftScout.x - 26);
    expect(vx2).toBeCloseTo(Math.cos(angleToScout) * PICKET_BOLT_SPEED, 3);
    expect(vy2).toBeCloseTo(Math.sin(angleToScout) * PICKET_BOLT_SPEED, 3);
    expect(Math.hypot(fireX - 26, fireY - 300)).toBeCloseTo(10, 3);

    // Right mount prefers its own half: it engages the right-half scout.
    const [, , vx3] = harness.bolts[2].fire.mock.calls[0];
    expect(vx3).toBeLessThan(0);
  });

  test('bosses are never picked as targets but remain registered for incidental hits', () => {
    const harness = createHarness();
    harness.bossGroup.children.push(createEnemy(100, 300, 'boss'));

    const system = createSystem(harness, 1);
    system.update(350);
    system.update(350 + PICKET_TARGET_RETRY_MS);
    system.update(700);

    expect(harness.bolts).toHaveLength(0);
    expect(playPicketShot).not.toHaveBeenCalled();

    const bossRegistration = harness.overlapRegistrations[2];
    expect(bossRegistration).toBeDefined();
  });

  test('bolt overlap applies flat damage and reports kill vs hit feedback', () => {
    const harness = createHarness();
    createSystem(harness, 1);

    const overlap = harness.overlapRegistrations[0].callback;

    const bolt = Object.create(PicketBolt.prototype) as InstanceType<typeof PicketBolt>;
    bolt.active = true;
    const boltKill = mock();
    bolt.kill = boltKill as never;

    const killTarget = Object.create(EnemyBase.prototype) as InstanceType<typeof EnemyBase>;
    killTarget.active = true;
    killTarget.x = 120;
    killTarget.y = 220;
    const killTakeDamage = mock((_damage: number) => {
      killTarget.active = false;
    });
    killTarget.takeDamage = killTakeDamage as never;

    overlap(bolt, killTarget);

    expect(boltKill).toHaveBeenCalledTimes(1);
    expect(killTakeDamage).toHaveBeenCalledWith(PICKET_BOLT_DAMAGE);
    expect(harness.effectsManager.createExplosion).toHaveBeenCalledWith(120, 220, 0.9);
    expect(harness.effectsManager.createSparkBurst).not.toHaveBeenCalled();

    const secondBolt = Object.create(PicketBolt.prototype) as InstanceType<typeof PicketBolt>;
    secondBolt.active = true;
    secondBolt.kill = mock() as never;

    const survivor = Object.create(EnemyBase.prototype) as InstanceType<typeof EnemyBase>;
    survivor.active = true;
    survivor.x = 64;
    survivor.y = 64;
    survivor.takeDamage = mock() as never;

    overlap(survivor, secondBolt);

    expect(survivor.takeDamage).toHaveBeenCalledWith(PICKET_BOLT_DAMAGE);
    expect(harness.effectsManager.createSparkBurst).toHaveBeenCalledWith(64, 64);
  });

  test('suspendForTransition kills in-flight bolts and later volleys rescan fresh targets', () => {
    const harness = createHarness();
    harness.scoutGroup.children.push(createEnemy(200, 300));

    const system = createSystem(harness, 1);
    system.update(350);
    expect(harness.bolts).toHaveLength(1);
    expect(harness.bolts[0].active).toBe(true);

    system.suspendForTransition();
    expect(harness.bolts[0].kill).toHaveBeenCalledTimes(1);

    harness.scoutGroup.children[0].active = false;
    harness.gunnerGroup.children.push(createEnemy(150, 320, 'gunner'));
    system.update(1050);

    // Both mounts engage the fresh gunner target after the transition; the
    // suspended bolt is reused from the pool for the first volley.
    expect(harness.bolts).toHaveLength(2);
    expect(harness.bolts[0].active).toBe(true);
    expect(harness.bolts[1].active).toBe(true);
  });

  test('relayout re-anchors mounts to the resized viewport edges', () => {
    const harness = createHarness({ viewportWidth: 800, viewportHeight: 600 });
    const system = createSystem(harness, 1);

    harness.scene.cameras.main.width = 400;
    harness.scene.cameras.main.height = 700;
    harness.scene.scale.getViewPort = () => ({ x: 0, y: 0, width: 400, height: 700 });

    system.relayout();

    expect(harness.sprites[0].setPosition).toHaveBeenLastCalledWith(26, 350);
    expect(harness.sprites[1].setPosition).toHaveBeenLastCalledWith(374, 350);
  });

  test('destroy is idempotent when Phaser teardown already invalidated internals', () => {
    const harness = createHarness();
    const system = createSystem(harness, 1);

    harness.colliders[0].destroy = mock(() => {
      throw new TypeError('already destroyed');
    });
    harness.sprites[0].destroy = mock(() => {
      throw new TypeError('already destroyed');
    });
    harness.boltGroup.getChildren = mock(() => {
      throw new TypeError("undefined is not an object (evaluating 'n.forEach')");
    });
    harness.boltGroup.clear = mock(() => {
      throw new TypeError('already destroyed');
    });

    expect(() => system.destroy()).not.toThrow();
    expect(() => system.destroy()).not.toThrow();

    expect(harness.colliders[1].destroy).toHaveBeenCalledTimes(1);
    expect(harness.sprites[1].destroy).toHaveBeenCalledTimes(1);

    // After destroy the system is inert.
    system.update(100_000);
    expect(harness.bolts).toHaveLength(0);
  });
});
