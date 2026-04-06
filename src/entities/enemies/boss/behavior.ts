import Phaser from 'phaser';
import type { BossAttackStyle } from '../../../config/LevelsConfig';

export interface BossMovementInput {
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

export interface BossMovementOutput {
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

export function updateBossMovement(input: BossMovementInput): BossMovementOutput {
  const { attackStyle, targetY, time, delta } = input;
  const minX = input.minX;
  const maxX = input.maxX;

  switch (attackStyle) {
    case 'carrier': {
      const horizontalBounds = getHorizontalBounds(minX, maxX, 90);
      const rawX = input.x + input.moveSpeed * 0.72 * input.moveDir * delta / 1000;
      const x = Phaser.Math.Clamp(
        rawX,
        horizontalBounds.min,
        horizontalBounds.max
      );
      return {
        x,
        y: targetY + Math.sin(time * 0.0026) * 10,
        moveDir: rawX >= horizontalBounds.max ? -1 : rawX <= horizontalBounds.min ? 1 : input.moveDir,
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
      const rawX = input.x + input.moveSpeed * 0.45 * input.moveDir * delta / 1000;
      const x = Phaser.Math.Clamp(
        rawX,
        horizontalBounds.min,
        horizontalBounds.max
      );
      return {
        x,
        y: targetY + Math.sin(time * 0.0018) * 6,
        moveDir: rawX >= horizontalBounds.max ? -1 : rawX <= horizontalBounds.min ? 1 : input.moveDir,
      };
    }
    default: {
      const horizontalBounds = getHorizontalBounds(minX, maxX, 60);
      const rawX = input.x + input.moveSpeed * input.moveDir * delta / 1000;
      const x = Phaser.Math.Clamp(
        rawX,
        horizontalBounds.min,
        horizontalBounds.max
      );
      return {
        x,
        y: targetY,
        moveDir: rawX >= horizontalBounds.max ? -1 : rawX <= horizontalBounds.min ? 1 : input.moveDir,
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
