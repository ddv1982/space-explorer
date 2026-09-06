import { describe, expect, test } from 'bun:test';
import { createCollisionHarness, createInstance } from './helpers/collisionHarness';
import type { DamageSource } from '../src/systems/PlayerDamage';
const { EnemyBullet } = await import('../src/entities/EnemyBullet');
const { BomberBomb } = await import('../src/entities/BomberBomb');
const { Mine } = await import('../src/entities/Mine');
const { HazardBeam } = await import('../src/entities/HazardBeam');
const { Asteroid } = await import('../src/entities/Asteroid');
const { EnemyBase } = await import('../src/entities/enemies/EnemyBase');

const cases = [
  { source: 'enemy-bullet', group: 'enemyBullet', ctor: EnemyBullet, amount: 1 },
  { source: 'bomb', group: 'bomb', ctor: BomberBomb, amount: 2 },
  { source: 'mine', group: 'mine', ctor: Mine, amount: 2 },
  { source: 'beam', group: 'beam', ctor: HazardBeam, amount: 3 },
  { source: 'asteroid', group: 'asteroid', ctor: Asteroid, amount: 3 },
  { source: 'enemy-contact', group: 'impact', ctor: EnemyBase, amount: 1 },
] as const satisfies ReadonlyArray<{ source: DamageSource; group: string; ctor: unknown; amount: number }>;

describe('collision attribution', () => {
  for (const scenario of cases) {
    test(`${scenario.source} is captured before damage and survives impact cleanup`, () => {
      const harness = createCollisionHarness(['damaged'], 0.75);
      const hazard = createInstance<object>(scenario.ctor, {
        active: true,
        x: 80,
        y: 100,
        kill() {
          Object.assign(this, { active: false });
        },
        takeDamage() {},
        onPlayerCollision() {},
        isDamageActive: () => true,
        getDamage: () => 3,
        getCollisionDamage: () => 3,
      });
      harness.getOverlap(harness.groups[scenario.group], harness.player)(hazard, harness.player);
      expect(harness.damageContexts).toEqual([{ source: scenario.source, amount: scenario.amount * 0.75 }]);
      expect(harness.eventPayloads).toEqual([
        { source: scenario.source, outcome: 'damaged', hullDamage: scenario.amount * 0.75 },
      ]);
    });
  }
  test('absorbed hit emits zero hull damage and shield FX; ignored hits emit neither', () => {
    const harness = createCollisionHarness(['absorbed', 'ignored']);
    const collide = harness.getOverlap(harness.groups.enemyBullet, harness.player);
    for (let i = 0; i < 2; i++) collide(createInstance(EnemyBullet, { active: true, kill() {} }), harness.player);
    expect(harness.eventPayloads).toEqual([{ source: 'enemy-bullet', outcome: 'absorbed', hullDamage: 0 }]);
    expect(harness.callLog.filter((call) => call === 'shield-impact')).toHaveLength(1);
    expect(harness.callLog.filter((call) => call.startsWith('spark:'))).toHaveLength(0);
  });
});
