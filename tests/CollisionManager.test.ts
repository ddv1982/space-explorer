import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => {
  class GameObject {
    active = true;
  }

  class Sprite extends GameObject {}

  return {
    default: {
      GameObjects: {
        GameObject,
      },
      Physics: {
        Arcade: {
          Sprite,
        },
      },
      Math: {
        DegToRad: (degrees: number) => (degrees * Math.PI) / 180,
        Linear: (a: number, b: number, t: number) => a + (b - a) * t,
        Vector2: class {
          x = 0;
          y = 0;

          set(x: number, y: number) {
            this.x = x;
            this.y = y;
            return this;
          }

          rotate(_radians: number) {
            return this;
          }

          normalize() {
            return this;
          }

          scale(_value: number) {
            return this;
          }
        },
      },
      Utils: {
        Array: {
          GetRandom: <T>(values: T[]) => values[0],
        },
      },
    },
  };
});

const { CollisionManager } = await import('../src/systems/CollisionManager');
const { EnemyBullet } = await import('../src/entities/EnemyBullet');
const { BomberBomb } = await import('../src/entities/BomberBomb');
const { Asteroid } = await import('../src/entities/Asteroid');
const { EnemyBase } = await import('../src/entities/enemies/EnemyBase');
const { GAME_SCENE_EVENTS } = await import('../src/systems/GameplayFlow');

type DamageOutcome = 'ignored' | 'absorbed' | 'damaged' | 'fatal';
type OverlapCallback = (obj1: unknown, obj2: unknown) => void;

type OverlapRegistration = {
  a: unknown;
  b: unknown;
  callback: OverlapCallback;
};

type CollisionHarness = {
  manager: InstanceType<typeof CollisionManager>;
  player: {
    body: { enable: boolean };
    isAlive: boolean;
    x: number;
    y: number;
    takeDamage: (amount: number) => DamageOutcome;
  };
  groups: {
    bullet: object;
    asteroid: object;
    enemyBullet: object;
    bomb: object;
    kamikaze: object;
    impact: object;
    none: object;
  };
  setTime: (now: number) => void;
  getOverlap: (a: unknown, b: unknown) => OverlapCallback;
  emittedEvents: string[];
  damageAmounts: number[];
  callLog: string[];
};

function createInstance<T>(Ctor: abstract new (...args: never[]) => T, properties: Record<string, unknown>): T {
  return Object.assign(Object.create(Ctor.prototype), properties) as T;
}

function createCollisionHarness(outcomes: DamageOutcome[]): CollisionHarness {
  const overlaps: OverlapRegistration[] = [];
  const emittedEvents: string[] = [];
  const damageAmounts: number[] = [];
  const callLog: string[] = [];

  let outcomeIndex = 0;
  let now = 100;

  const groups = {
    bullet: { id: 'bullet-group' },
    asteroid: { id: 'asteroid-group' },
    enemyBullet: { id: 'enemy-bullet-group' },
    bomb: { id: 'bomb-group' },
    kamikaze: { id: 'kamikaze-group' },
    impact: { id: 'impact-group' },
    none: { id: 'none-group' },
  };

  const scene = {
    physics: {
      add: {
        overlap: (a: unknown, b: unknown, callback: OverlapCallback) => {
          overlaps.push({ a, b, callback });
        },
      },
    },
    time: {
      get now() {
        return now;
      },
    },
    cameras: {
      main: {
        shake: () => {
          callLog.push('camera.shake');
        },
      },
    },
    events: {
      emit: (eventName: string) => {
        emittedEvents.push(eventName);
        callLog.push(`emit:${eventName}`);
      },
    },
  };

  const player = {
    body: { enable: true },
    isAlive: true,
    x: 320,
    y: 240,
    takeDamage: (amount: number): DamageOutcome => {
      damageAmounts.push(amount);
      callLog.push(`takeDamage:${amount}`);
      const outcome = outcomes[Math.min(outcomeIndex, outcomes.length - 1)] ?? 'damaged';
      outcomeIndex += 1;
      return outcome;
    },
  };

  const effectsManager = {
    createSparkBurst: (x: number, y: number) => {
      callLog.push(`spark:${x},${y}`);
    },
    createExplosion: (x: number, y: number, scale: number) => {
      callLog.push(`explosion:${x},${y},${scale}`);
    },
    createHitSplash: () => {
      // not used in these tests
    },
    createAsteroidDebris: () => {
      // not used in these tests
    },
  };

  const bulletPool = {
    getGroup: () => groups.bullet,
  };

  const enemyPool = {
    getEnemyBulletGroup: () => groups.enemyBullet,
    getBombGroup: () => groups.bomb,
    getEnemyGroupRegistry: () => [
      { key: 'kamikaze', group: groups.kamikaze, playerCollisionBehavior: 'kamikaze' as const },
      { key: 'impact', group: groups.impact, playerCollisionBehavior: 'impact' as const },
      { key: 'none', group: groups.none, playerCollisionBehavior: 'none' as const },
    ],
  };

  const manager = new CollisionManager();
  manager.setEffectsManager(effectsManager as never);
  manager.setup(
    scene as never,
    player as never,
    bulletPool as never,
    enemyPool as never,
    groups.asteroid as never
  );

  return {
    manager,
    player,
    groups,
    setTime: (value: number) => {
      now = value;
    },
    getOverlap: (a: unknown, b: unknown) => {
      const overlap = overlaps.find(entry => entry.a === a && entry.b === b);
      if (!overlap) {
        throw new Error('Requested overlap callback was not registered');
      }

      return overlap.callback;
    },
    emittedEvents,
    damageAmounts,
    callLog,
  };
}

describe('CollisionManager player damage dedupe regression coverage', () => {
  test('enemy bullet collision is gated by canProcessPlayerCollision checks', () => {
    const harness = createCollisionHarness(['damaged']);
    const enemyBulletVsPlayer = harness.getOverlap(harness.groups.enemyBullet, harness.player);

    let killCalls = 0;
    const bullet = createInstance(EnemyBullet, {
      active: true,
      kill: () => {
        killCalls += 1;
      },
    });

    harness.manager.setTerminalTransitionActive(true);
    enemyBulletVsPlayer(bullet, harness.player);

    expect(killCalls).toBe(0);
    expect(harness.damageAmounts).toEqual([]);
    expect(harness.emittedEvents).toEqual([]);
  });

  test('enemy bullet routes damaged/fatal outcomes and keeps hit cooldown behavior', () => {
    const harness = createCollisionHarness(['damaged', 'damaged', 'fatal']);
    const enemyBulletVsPlayer = harness.getOverlap(harness.groups.enemyBullet, harness.player);

    const bulletA = createInstance(EnemyBullet, { active: true, kill: () => harness.callLog.push('bulletA.kill') });
    const bulletB = createInstance(EnemyBullet, { active: true, kill: () => harness.callLog.push('bulletB.kill') });
    const bulletC = createInstance(EnemyBullet, { active: true, kill: () => harness.callLog.push('bulletC.kill') });

    harness.setTime(100);
    enemyBulletVsPlayer(bulletA, harness.player);

    harness.setTime(150);
    enemyBulletVsPlayer(bulletB, harness.player);

    harness.setTime(220);
    enemyBulletVsPlayer(bulletC, harness.player);

    expect(harness.damageAmounts).toEqual([1, 1, 1]);
    expect(harness.callLog).toContain('bulletA.kill');
    expect(harness.callLog).toContain('bulletB.kill');
    expect(harness.callLog).toContain('bulletC.kill');
    expect(harness.emittedEvents).toEqual([
      GAME_SCENE_EVENTS.playerHit,
      GAME_SCENE_EVENTS.playerFatalHit,
    ]);
  });

  test('bomb collision keeps kill->damage->explosion order and routes nonfatal/fatal events', () => {
    const harness = createCollisionHarness(['absorbed', 'fatal']);
    const bombVsPlayer = harness.getOverlap(harness.groups.bomb, harness.player);

    const firstBomb = createInstance(BomberBomb, {
      active: true,
      x: 40,
      y: 60,
      kill: () => harness.callLog.push('bomb1.kill'),
    });

    const secondBomb = createInstance(BomberBomb, {
      active: true,
      x: 70,
      y: 90,
      kill: () => harness.callLog.push('bomb2.kill'),
    });

    harness.setTime(100);
    bombVsPlayer(firstBomb, harness.player);

    harness.setTime(300);
    bombVsPlayer(secondBomb, harness.player);

    const firstKillIndex = harness.callLog.indexOf('bomb1.kill');
    const firstDamageIndex = harness.callLog.indexOf('takeDamage:2');
    const firstExplosionIndex = harness.callLog.indexOf('explosion:40,60,1.5');

    expect(firstKillIndex).toBeGreaterThanOrEqual(0);
    expect(firstDamageIndex).toBeGreaterThan(firstKillIndex);
    expect(firstExplosionIndex).toBeGreaterThan(firstDamageIndex);
    expect(harness.emittedEvents).toEqual([
      GAME_SCENE_EVENTS.playerHit,
      GAME_SCENE_EVENTS.playerFatalHit,
    ]);
  });

  test('asteroid collision runs onPlayerCollision after damage and before hit routing', () => {
    const harness = createCollisionHarness(['damaged']);
    const asteroidVsPlayer = harness.getOverlap(harness.groups.asteroid, harness.player);

    const asteroid = createInstance(Asteroid, {
      active: true,
      getCollisionDamage: () => 3,
      onPlayerCollision: () => {
        harness.callLog.push('asteroid.onPlayerCollision');
      },
    });

    harness.setTime(100);
    asteroidVsPlayer(asteroid, harness.player);

    const damageIndex = harness.callLog.indexOf('takeDamage:3');
    const onCollisionIndex = harness.callLog.indexOf('asteroid.onPlayerCollision');
    const hitEmitIndex = harness.callLog.indexOf(`emit:${GAME_SCENE_EVENTS.playerHit}`);

    expect(damageIndex).toBeGreaterThanOrEqual(0);
    expect(onCollisionIndex).toBeGreaterThan(damageIndex);
    expect(hitEmitIndex).toBeGreaterThan(onCollisionIndex);
  });

  test('asteroid ignored outcome still calls asteroid collision side effect without hit events', () => {
    const harness = createCollisionHarness(['ignored']);
    const asteroidVsPlayer = harness.getOverlap(harness.groups.asteroid, harness.player);

    const asteroid = createInstance(Asteroid, {
      active: true,
      getCollisionDamage: () => 4,
      onPlayerCollision: () => {
        harness.callLog.push('asteroid.onPlayerCollision');
      },
    });

    asteroidVsPlayer(asteroid, harness.player);

    expect(harness.callLog).toContain('takeDamage:4');
    expect(harness.callLog).toContain('asteroid.onPlayerCollision');
    expect(harness.emittedEvents).toEqual([]);
  });

  test('enemy contact preserves kamikaze/impact side effects and damage routing', () => {
    const harness = createCollisionHarness(['damaged', 'fatal']);

    const kamikazeContact = harness.getOverlap(harness.groups.kamikaze, harness.player);
    const impactContact = harness.getOverlap(harness.groups.impact, harness.player);

    const kamikazeEnemy = createInstance(EnemyBase, {
      active: true,
      die: () => {
        harness.callLog.push('enemy.kamikaze.die');
      },
      takeDamage: (_amount: number) => {
        harness.callLog.push('enemy.kamikaze.takeDamage');
      },
    });

    const impactEnemy = createInstance(EnemyBase, {
      active: true,
      die: () => {
        harness.callLog.push('enemy.impact.die');
      },
      takeDamage: (amount: number) => {
        harness.callLog.push(`enemy.impact.takeDamage:${amount}`);
      },
    });

    harness.setTime(100);
    kamikazeContact(kamikazeEnemy, harness.player);

    harness.setTime(220);
    impactContact(impactEnemy, harness.player);

    expect(harness.callLog).toContain('enemy.kamikaze.die');
    expect(harness.callLog).not.toContain('enemy.kamikaze.takeDamage');
    expect(harness.callLog).toContain('enemy.impact.takeDamage:1');
    expect(harness.callLog).not.toContain('enemy.impact.die');
    expect(harness.emittedEvents).toEqual([
      GAME_SCENE_EVENTS.playerHit,
      GAME_SCENE_EVENTS.playerFatalHit,
    ]);
  });

  test('clearPlayerHazards tolerates hazard groups invalidated during teardown', () => {
    const harness = createCollisionHarness(['damaged']);
    const throwInvalidatedGroup = () => {
      throw new TypeError("undefined is not an object (evaluating 'n.forEach')");
    };

    Object.assign(harness.groups.enemyBullet, { getChildren: throwInvalidatedGroup });
    Object.assign(harness.groups.bomb, { getChildren: throwInvalidatedGroup });
    Object.assign(harness.groups.asteroid, { getChildren: throwInvalidatedGroup });

    expect(() => harness.manager.clearPlayerHazards()).not.toThrow();
  });
});
