import { describe, expect, test } from 'bun:test';
import { resolveBossPhaseTransition } from '../src/entities/enemies/boss/phaseTransition';

describe('resolveBossPhaseTransition', () => {
  test('describes every phase-two state change without Phaser', () => {
    expect(
      resolveBossPhaseTransition({
        phase: 1,
        hp: 50,
        maxHp: 100,
        time: 1000,
        phase2MoveSpeed: 180,
        phaseTransitionPauseMs: 320,
        attackStyle: 'pressure',
        phase2AttackStyle: 'maelstrom',
      })
    ).toEqual({
      phase: 2,
      moveSpeed: 180,
      phaseStartedAt: 1000,
      nextFireTime: 1320,
      attackStyle: 'maelstrom',
      textureChanges: true,
    });
  });

  test('returns no transition above the threshold or after phase one', () => {
    const base = {
      maxHp: 100,
      time: 1000,
      phase2MoveSpeed: 180,
      phaseTransitionPauseMs: 320,
      attackStyle: 'pressure' as const,
      phase2AttackStyle: null,
    };
    expect(resolveBossPhaseTransition({ ...base, phase: 1, hp: 51 })).toBeNull();
    expect(resolveBossPhaseTransition({ ...base, phase: 2, hp: 10 })).toBeNull();
  });
});
