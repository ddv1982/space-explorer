import { describe, expect, test } from 'bun:test';
import type { BossPhaseConfig } from '../src/config/LevelsConfig';
import { resolveBossPhaseIndex } from '../src/entities/enemies/boss/phaseTransition';

const phase = (startsAtHull: number): BossPhaseConfig => ({
  startsAtHull,
  style: 'bulwark',
  movement: { kind: 'patrol', speed: 36, edgePadding: 100 },
  attacks: [],
});
const THREE_PHASES = [phase(1), phase(0.66), phase(0.33)];

describe('boss phases by hull threshold', () => {
  test('stays in a phase until the hull reaches the next threshold', () => {
    expect(resolveBossPhaseIndex(THREE_PHASES, 0, 0.67)).toBeNull();
    expect(resolveBossPhaseIndex(THREE_PHASES, 0, 0.66)).toBe(1);
    expect(resolveBossPhaseIndex(THREE_PHASES, 1, 0.34)).toBeNull();
    expect(resolveBossPhaseIndex(THREE_PHASES, 1, 0.33)).toBe(2);
  });

  test('advances one phase at a time, so a burst past two thresholds still plays both changes', () => {
    expect(resolveBossPhaseIndex(THREE_PHASES, 0, 0.1)).toBe(1);
    expect(resolveBossPhaseIndex(THREE_PHASES, 1, 0.1)).toBe(2);
  });

  test('the last phase lasts until the kill', () => {
    expect(resolveBossPhaseIndex(THREE_PHASES, 2, 0)).toBeNull();
  });

  test('a two-phase boss switches at half hull, as before', () => {
    expect(resolveBossPhaseIndex([phase(1), phase(0.5)], 0, 0.51)).toBeNull();
    expect(resolveBossPhaseIndex([phase(1), phase(0.5)], 0, 0.5)).toBe(1);
  });
});
