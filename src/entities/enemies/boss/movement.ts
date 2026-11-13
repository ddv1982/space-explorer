import Phaser from 'phaser';
import type { BossMovementConfig } from '@/config/LevelsConfig';

interface BossMovementInput {
  movement: BossMovementConfig;
  x: number;
  /** The height the boss moves around: its arrival line, or the last anchor it flew to. */
  baseY: number;
  moveDir: number;
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
  const effectivePadding = Math.min(padding, Math.max(0, (maxX - minX) / 2));
  return { min: minX + effectivePadding, max: Math.max(minX + effectivePadding, maxX - effectivePadding) };
}

/** The height for this moment of the fight: the base line, plus a slow bob for heavier hulls. */
function resolveBossBob(movement: BossMovementConfig, baseY: number, time: number): number {
  const bob = movement.bob;
  return bob ? baseY + Math.sin((time / bob.periodMs) * Math.PI * 2) * bob.amplitude : baseY;
}

/** One frame of a boss's idle movement: a patrol between the screen edges, or a slide after the player. */
export function resolveBossMovement(input: BossMovementInput): BossMovementOutput {
  const { movement, delta } = input;
  const bounds = getHorizontalBounds(input.minX, input.maxX, movement.edgePadding);
  const y = resolveBossBob(movement, input.baseY, input.time);

  if (movement.kind === 'pursuit') {
    const targetX = Phaser.Math.Clamp(input.playerX ?? input.x + input.moveDir * 120, bounds.min, bounds.max);
    const maxStep = (movement.speed * delta) / 1000;
    const x = Phaser.Math.Clamp(
      input.x + Phaser.Math.Clamp(targetX - input.x, -maxStep, maxStep),
      bounds.min,
      bounds.max
    );
    return { x, y, moveDir: targetX >= x ? 1 : -1 };
  }

  const rawX = input.x + (movement.speed * input.moveDir * delta) / 1000;
  return {
    x: Phaser.Math.Clamp(rawX, bounds.min, bounds.max),
    y,
    moveDir: rawX >= bounds.max ? -1 : rawX <= bounds.min ? 1 : input.moveDir,
  };
}

/** One frame of flying straight to an anchor at `speed`; `arrived` once it is there. */
export function resolveBossTravel(
  from: { x: number; y: number },
  to: { x: number; y: number },
  speed: number,
  delta: number
): { x: number; y: number; arrived: boolean } {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const step = (speed * delta) / 1000;
  if (distance <= step) return { x: to.x, y: to.y, arrived: true };
  return {
    x: from.x + ((to.x - from.x) / distance) * step,
    y: from.y + ((to.y - from.y) / distance) * step,
    arrived: false,
  };
}
