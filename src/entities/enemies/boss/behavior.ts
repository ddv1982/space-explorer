import Phaser from 'phaser';
import type { BossAttackStyle } from '../../../config/LevelsConfig';

interface BossMovementInput {
  attackStyle: BossAttackStyle;
  x: number;
  targetY: number;
  moveDir: number;
  moveSpeed: number;
  time: number;
  delta: number;
  playerX?: number;
  minX: number;
  maxX: number;
}

interface BossMovementOutput {
  x: number;
  y: number;
  moveDir: number;
}

function getHorizontalBounds(minX: number, maxX: number, padding: number): { min: number; max: number } {
  const halfWidth = Math.max(0, (maxX - minX) / 2);
  const effectivePadding = Math.min(padding, halfWidth);

  return {
    min: minX + effectivePadding,
    max: Math.max(minX + effectivePadding, maxX - effectivePadding),
  };
}

function resolvePatrolMovement(
  input: BossMovementInput,
  horizontalBounds: { min: number; max: number },
  speedScale: number
): { x: number; moveDir: number } {
  const rawX = input.x + input.moveSpeed * speedScale * input.moveDir * input.delta / 1000;
  const x = Phaser.Math.Clamp(rawX, horizontalBounds.min, horizontalBounds.max);

  return {
    x,
    moveDir: rawX >= horizontalBounds.max ? -1 : rawX <= horizontalBounds.min ? 1 : input.moveDir,
  };
}

export function updateBossMovement(input: BossMovementInput): BossMovementOutput {
  const { attackStyle, targetY, time, delta } = input;
  const minX = input.minX;
  const maxX = input.maxX;

  switch (attackStyle) {
    case 'carrier': {
      const horizontalBounds = getHorizontalBounds(minX, maxX, 90);
      const movement = resolvePatrolMovement(input, horizontalBounds, 0.72);
      return {
        x: movement.x,
        y: targetY + Math.sin(time * 0.0026) * 10,
        moveDir: movement.moveDir,
      };
    }
    case 'pursuit': {
      const horizontalBounds = getHorizontalBounds(minX, maxX, 70);
      const targetX = Phaser.Math.Clamp(input.playerX ?? input.x + input.moveDir * 120, horizontalBounds.min, horizontalBounds.max);
      const maxStep = input.moveSpeed * 1.15 * delta / 1000;
      const x = Phaser.Math.Clamp(
        input.x + Phaser.Math.Clamp(targetX - input.x, -maxStep, maxStep),
        horizontalBounds.min,
        horizontalBounds.max
      );
      return {
        x,
        y: targetY + Math.sin(time * 0.005) * 14,
        moveDir: targetX >= x ? 1 : -1,
      };
    }
    case 'bulwark': {
      const horizontalBounds = getHorizontalBounds(minX, maxX, 100);
      const movement = resolvePatrolMovement(input, horizontalBounds, 0.45);
      return {
        x: movement.x,
        y: targetY + Math.sin(time * 0.0018) * 6,
        moveDir: movement.moveDir,
      };
    }
    default: {
      const horizontalBounds = getHorizontalBounds(minX, maxX, 60);
      const movement = resolvePatrolMovement(input, horizontalBounds, 1);
      return {
        x: movement.x,
        y: targetY,
        moveDir: movement.moveDir,
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
