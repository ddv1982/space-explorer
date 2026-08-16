import type { BossAttackStyle } from '@/config/LevelsConfig';

export interface BossPhaseTransitionInput {
  phase: number;
  hp: number;
  maxHp: number;
  time: number;
  phase2MoveSpeed: number;
  phaseTransitionPauseMs: number;
  attackStyle: BossAttackStyle;
  phase2AttackStyle: BossAttackStyle | null;
}

export interface BossPhaseTransition {
  phase: 2;
  moveSpeed: number;
  phaseStartedAt: number;
  nextFireTime: number;
  attackStyle: BossAttackStyle;
  textureChanges: boolean;
}

export function resolveBossPhaseTransition(input: BossPhaseTransitionInput): BossPhaseTransition | null {
  if (input.phase !== 1 || input.hp / input.maxHp > 0.5) return null;

  const attackStyle = input.phase2AttackStyle ?? input.attackStyle;
  return {
    phase: 2,
    moveSpeed: input.phase2MoveSpeed,
    phaseStartedAt: input.time,
    nextFireTime: input.time + input.phaseTransitionPauseMs,
    attackStyle,
    textureChanges: attackStyle !== input.attackStyle,
  };
}
