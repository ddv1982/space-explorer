import Phaser from 'phaser';
import type { BossAttackStyle } from '../../../config/LevelsConfig';
import { GAME_WIDTH } from '../../../utils/constants';

export interface BossMovementInput {
  attackStyle: BossAttackStyle;
  x: number;
  targetY: number;
  moveDir: number;
  moveSpeed: number;
  time: number;
  delta: number;
  playerX?: number;
}

export interface BossMovementOutput {
  x: number;
  y: number;
  moveDir: number;
}

export function updateBossMovement(input: BossMovementInput): BossMovementOutput {
  const { attackStyle, targetY, time, delta } = input;

  switch (attackStyle) {
    case 'carrier': {
      const x = input.x + input.moveSpeed * 0.72 * input.moveDir * delta / 1000;
      return {
        x,
        y: targetY + Math.sin(time * 0.0026) * 10,
        moveDir: x > GAME_WIDTH - 90 ? -1 : x < 90 ? 1 : input.moveDir,
      };
    }
    case 'pursuit': {
      const targetX = Phaser.Math.Clamp(input.playerX ?? input.x + input.moveDir * 120, 70, GAME_WIDTH - 70);
      const maxStep = input.moveSpeed * 1.15 * delta / 1000;
      const x = input.x + Phaser.Math.Clamp(targetX - input.x, -maxStep, maxStep);
      return {
        x,
        y: targetY + Math.sin(time * 0.005) * 14,
        moveDir: targetX >= x ? 1 : -1,
      };
    }
    case 'bulwark': {
      const x = input.x + input.moveSpeed * 0.45 * input.moveDir * delta / 1000;
      return {
        x,
        y: targetY + Math.sin(time * 0.0018) * 6,
        moveDir: x > GAME_WIDTH - 100 ? -1 : x < 100 ? 1 : input.moveDir,
      };
    }
    default: {
      const x = input.x + input.moveSpeed * input.moveDir * delta / 1000;
      return {
        x,
        y: targetY,
        moveDir: x > GAME_WIDTH - 60 ? -1 : x < 60 ? 1 : input.moveDir,
      };
    }
  }
}

export function shouldEnterBossPhaseTwo(phase: number, hp: number, maxHp: number): boolean {
  return phase === 1 && hp / maxHp <= 0.5;
}

export function getBossShieldActive(
  attackStyle: BossAttackStyle,
  phase: number,
  phaseStartedAt: number,
  time: number
): boolean {
  if (attackStyle !== 'bulwark') {
    return false;
  }

  const cycleDuration = phase === 1 ? 2500 : 1900;
  const openWindow = phase === 1 ? 820 : 620;
  const cycleProgress = (time - phaseStartedAt) % cycleDuration;
  return cycleProgress > openWindow;
}
