import type { PlayerDamageContext, PlayerDamageResult } from '../../src/systems/PlayerDamage';
import { mockPhaserModule } from './phaserMock';

mockPhaserModule();

const { CollisionManager } = await import('../../src/systems/CollisionManager');

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
    takeDamage: (context: PlayerDamageContext) => PlayerDamageResult;
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
    boss: object;
  };
  setTime: (now: number) => void;
  getOverlap: (a: unknown, b: unknown) => OverlapCallback;
  emittedEvents: string[];
  damageAmounts: number[];
  damageContexts: PlayerDamageContext[];
  eventPayloads: unknown[];
  callLog: string[];
};

export function createInstance<T>(Ctor: abstract new (...args: never[]) => T, properties: Record<string, unknown>): T {
  return Object.assign(Object.create(Ctor.prototype), properties) as T;
}

export function createCollisionHarness(outcomes: DamageOutcome[], hullDamageMultiplier = 1): CollisionHarness {
  const overlaps: OverlapRegistration[] = [];
  const emittedEvents: string[] = [];
  const damageAmounts: number[] = [];
  const damageContexts: PlayerDamageContext[] = [];
  const eventPayloads: unknown[] = [];
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
    boss: { id: 'boss-group' },
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
      emit: (eventName: string, payload: unknown) => {
        eventPayloads.push(payload);
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
    takeDamage: ({ amount, source }: PlayerDamageContext): PlayerDamageResult => {
      damageAmounts.push(amount);
      damageContexts.push({ amount, source });
      callLog.push(`takeDamage:${amount}`);
      const outcome = outcomes[Math.min(outcomeIndex, outcomes.length - 1)] ?? 'damaged';
      outcomeIndex += 1;
      if (outcome === 'absorbed' || outcome === 'ignored') return { outcome, source, hullDamage: 0 };
      return { outcome, source, hullDamage: amount };
    },
  };

  const effectsManager = {
    createSparkBurst: (x: number, y: number) => {
      callLog.push(`spark:${x},${y}`);
    },
    createShieldImpact: () => callLog.push('shield-impact'),
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
      { key: 'boss', group: groups.boss, playerCollisionBehavior: 'none' as const },
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
    hazardBeamSystem as never,
    () => hullDamageMultiplier
  );

  return {
    manager,
    player,
    groups,
    setTime: (value: number) => {
      now = value;
    },
    getOverlap: (a: unknown, b: unknown) => {
      const overlap = overlaps.find((entry) => entry.a === a && entry.b === b);
      if (!overlap) {
        throw new Error('Requested overlap callback was not registered');
      }

      return overlap.callback;
    },
    emittedEvents,
    damageAmounts,
    damageContexts,
    eventPayloads,
    callLog,
  };
}
