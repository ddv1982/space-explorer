import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { CollisionManager } = await import('../src/systems/CollisionManager');
const { EnemyBullet } = await import('../src/entities/EnemyBullet');
const { BomberBomb } = await import('../src/entities/BomberBomb');
const { Mine } = await import('../src/entities/Mine');
const { HazardBeam } = await import('../src/entities/HazardBeam');
const { Bullet } = await import('../src/entities/Bullet');
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
    mine: object;
    beam: object;
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
    mine: { id: 'mine-group' },
    beam: { id: 'beam-group' },
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
    getMineGroup: () => groups.mine,
    getEnemyGroupRegistry: () => [
      { key: 'kamikaze', group: groups.kamikaze, playerCollisionBehavior: 'kamikaze' as const },
      { key: 'impact', group: groups.impact, playerCollisionBehavior: 'impact' as const },
      { key: 'none', group: groups.none, playerCollisionBehavior: 'none' as const },
    ],
  };

  const hazardBeamSystem = {
    getGroup: () => groups.beam,
  };

  const manager = new CollisionManager();
  manager.setEffectsManager(effectsManager as never);
  manager.setup(
    scene as never,
    player as never,
    bulletPool as never,
    enemyPool as never,
    groups.asteroid as never,
    hazardBeamSystem as never
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

  test('mine collision keeps kill->damage->explosion order and routes player hit events', () => {
    const harness = createCollisionHarness(['damaged']);
    const mineVsPlayer = harness.getOverlap(harness.groups.mine, harness.player);

    const mine = createInstance(Mine, {
      active: true,
      x: 50,
      y: 70,
      kill: () => harness.callLog.push('mine.kill'),
    });

    harness.setTime(100);
    mineVsPlayer(mine, harness.player);

    const killIndex = harness.callLog.indexOf('mine.kill');
    const damageIndex = harness.callLog.indexOf('takeDamage:2');
    const explosionIndex = harness.callLog.indexOf('explosion:50,70,1.5');

    expect(killIndex).toBeGreaterThanOrEqual(0);
    expect(damageIndex).toBeGreaterThan(killIndex);
    expect(explosionIndex).toBeGreaterThan(damageIndex);
    expect(harness.emittedEvents).toEqual([GAME_SCENE_EVENTS.playerHit]);
  });

  test('player bullets destroy mines and trigger a small explosion', () => {
    const harness = createCollisionHarness(['damaged']);
    const bulletVsMine = harness.getOverlap(harness.groups.bullet, harness.groups.mine);

    const bullet = createInstance(Bullet, {
      active: true,
      kill: () => harness.callLog.push('bullet.kill'),
    });
    const mine = createInstance(Mine, {
      active: true,
      x: 30,
      y: 50,
      hp: 1,
      takeDamage(amount: number) {
        harness.callLog.push(`mine.takeDamage:${amount}`);
        this.hp -= amount;
        if (this.hp <= 0) {
          this.active = false;
        }
      },
    });

    bulletVsMine(bullet, mine);

    expect(harness.callLog).toContain('bullet.kill');
    expect(harness.callLog).toContain('mine.takeDamage:1');
    expect(harness.callLog).toContain('explosion:30,50,0.9');
    expect(harness.damageAmounts).toEqual([]);
  });

  test('mines are blocked by projectile-blocking cover asteroids', () => {
    const harness = createCollisionHarness(['damaged']);
    const mineVsAsteroid = harness.getOverlap(harness.groups.mine, harness.groups.asteroid);

    const mine = createInstance(Mine, {
      active: true,
      kill: () => harness.callLog.push('mine.kill'),
    });
    const asteroid = createInstance(Asteroid, {
      active: true,
      x: 120,
      y: 140,
      blocksEnemyProjectiles: () => true,
      takeDamage: (amount: number) => harness.callLog.push(`asteroid.takeDamage:${amount}`),
    });

    mineVsAsteroid(mine, asteroid);

    expect(harness.callLog).toContain('mine.kill');
    expect(harness.callLog).toContain('asteroid.takeDamage:1');
    expect(harness.callLog).toContain('spark:120,140');
    expect(harness.damageAmounts).toEqual([]);
  });

  test('active hazard beams damage the player and emit player hit events', () => {
    const harness = createCollisionHarness(['damaged']);
    const beamVsPlayer = harness.getOverlap(harness.groups.beam, harness.player);

    const beam = createInstance(HazardBeam, {
      active: true,
      isDamageActive: () => true,
      getDamage: () => 1,
    });

    harness.setTime(100);
    beamVsPlayer(beam, harness.player);

    expect(harness.damageAmounts).toEqual([1]);
    expect(harness.emittedEvents).toEqual([GAME_SCENE_EVENTS.playerHit]);
  });

  test('telegraphing hazard beams do not damage the player', () => {
    const harness = createCollisionHarness(['damaged']);
    const beamVsPlayer = harness.getOverlap(harness.groups.beam, harness.player);

    const beam = createInstance(HazardBeam, {
      active: true,
      isDamageActive: () => false,
      getDamage: () => 1,
    });

    beamVsPlayer(beam, harness.player);

    expect(harness.damageAmounts).toEqual([]);
    expect(harness.emittedEvents).toEqual([]);
  });

  test('bullet-clearing hazard beams destroy crossed enemy bullets', () => {
    const harness = createCollisionHarness(['damaged']);
    const beamVsBullet = harness.getOverlap(harness.groups.beam, harness.groups.enemyBullet);

    const beam = createInstance(HazardBeam, {
      active: true,
      isDamageActive: () => true,
      getClearsBullets: () => true,
    });
    const bullet = createInstance(EnemyBullet, {
      active: true,
      x: 90,
      y: 110,
      kill: () => harness.callLog.push('enemyBullet.kill'),
    });

    beamVsBullet(beam, bullet);

    expect(harness.callLog).toContain('enemyBullet.kill');
    expect(harness.callLog).toContain('spark:90,110');
    expect(harness.damageAmounts).toEqual([]);
  });

  test('non-clearing hazard beams leave enemy bullets intact', () => {
    const harness = createCollisionHarness(['damaged']);
    const beamVsBullet = harness.getOverlap(harness.groups.beam, harness.groups.enemyBullet);

    const beam = createInstance(HazardBeam, {
      active: true,
      isDamageActive: () => true,
      getClearsBullets: () => false,
    });
    const bullet = createInstance(EnemyBullet, {
      active: true,
      kill: () => harness.callLog.push('enemyBullet.kill'),
    });

    beamVsBullet(beam, bullet);

    expect(harness.callLog).not.toContain('enemyBullet.kill');
  });

  test('enemy bullets are blocked by projectile-blocking cover asteroids', () => {
    const harness = createCollisionHarness(['damaged']);
    const enemyBulletVsAsteroid = harness.getOverlap(harness.groups.enemyBullet, harness.groups.asteroid);

    const bullet = createInstance(EnemyBullet, {
      active: true,
      kill: () => harness.callLog.push('enemyBullet.kill'),
    });
    const asteroid = createInstance(Asteroid, {
      active: true,
      x: 120,
      y: 140,
      blocksEnemyProjectiles: () => true,
      takeDamage: (amount: number) => harness.callLog.push(`asteroid.takeDamage:${amount}`),
    });

    enemyBulletVsAsteroid(bullet, asteroid);

    expect(harness.callLog).toContain('enemyBullet.kill');
    expect(harness.callLog).toContain('asteroid.takeDamage:1');
    expect(harness.callLog).toContain('spark:120,140');
    expect(harness.damageAmounts).toEqual([]);
  });

  test('collision target resolution accepts reversed Arcade callback order', () => {
    const harness = createCollisionHarness(['damaged']);
    const enemyBulletVsAsteroid = harness.getOverlap(harness.groups.enemyBullet, harness.groups.asteroid);

    const bullet = createInstance(EnemyBullet, {
      active: true,
      kill: () => harness.callLog.push('enemyBullet.kill'),
    });
    const asteroid = createInstance(Asteroid, {
      active: true,
      x: 125,
      y: 145,
      blocksEnemyProjectiles: () => true,
      takeDamage: (amount: number) => harness.callLog.push(`asteroid.takeDamage:${amount}`),
    });

    enemyBulletVsAsteroid(asteroid, bullet);

    expect(harness.callLog).toContain('enemyBullet.kill');
    expect(harness.callLog).toContain('asteroid.takeDamage:1');
    expect(harness.callLog).toContain('spark:125,145');
  });

  test('enemy bullets pass through non-cover asteroids', () => {
    const harness = createCollisionHarness(['damaged']);
    const enemyBulletVsAsteroid = harness.getOverlap(harness.groups.enemyBullet, harness.groups.asteroid);

    const bullet = createInstance(EnemyBullet, {
      active: true,
      kill: () => harness.callLog.push('enemyBullet.kill'),
    });
    const asteroid = createInstance(Asteroid, {
      active: true,
      blocksEnemyProjectiles: () => false,
      takeDamage: (amount: number) => harness.callLog.push(`asteroid.takeDamage:${amount}`),
    });

    enemyBulletVsAsteroid(bullet, asteroid);

    expect(harness.callLog).not.toContain('enemyBullet.kill');
    expect(harness.callLog).not.toContain('asteroid.takeDamage:1');
    expect(harness.damageAmounts).toEqual([]);
  });

  test('bomber bombs are blocked by projectile-blocking cover asteroids', () => {
    const harness = createCollisionHarness(['damaged']);
    const bombVsAsteroid = harness.getOverlap(harness.groups.bomb, harness.groups.asteroid);

    const bomb = createInstance(BomberBomb, {
      active: true,
      x: 180,
      y: 220,
      kill: () => harness.callLog.push('bomb.kill'),
    });
    const asteroid = createInstance(Asteroid, {
      active: true,
      x: 160,
      y: 210,
      blocksEnemyProjectiles: () => true,
      takeDamage: (amount: number) => harness.callLog.push(`asteroid.takeDamage:${amount}`),
    });

    bombVsAsteroid(bomb, asteroid);

    expect(harness.callLog).toContain('bomb.kill');
    expect(harness.callLog).toContain('asteroid.takeDamage:2');
    expect(harness.callLog).toContain('explosion:180,220,1.15');
    expect(harness.damageAmounts).toEqual([]);
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
