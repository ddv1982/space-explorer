import Phaser from 'phaser';
import type { BossShotPattern, EnemyType } from '@/config/LevelsConfig';
import { ENEMY_BULLET_SPEED } from '@/utils/constants';

export interface BossBeamShot {
  x: number;
  top: number;
  width: number;
  telegraphMs: number;
  activeMs: number;
}

/** What a volley needs from the boss and the scene. */
export interface BossVolleyContext {
  x: number;
  y: number;
  moveDir: number;
  /** Volleys fired before this one in the fight; patterns alternate on it. */
  volley: number;
  /** The boss's gameplay clock, which turns spirals. */
  time: number;
  /** How many times this pattern has fired before, to step through its authored gaps. */
  patternUses: number;
  viewport: { left: number; width: number };
  fireBullet: (x: number, y: number, velocityX: number, velocityY: number) => void;
  /** Heading from the boss to the player in degrees (90, straight down, without a player). */
  getPlayerAimAngle: () => number;
  summonEscorts: (types: readonly EnemyType[]) => void;
  launchBeam: (beam: BossBeamShot) => void;
  /** Fires one aimed shot from the boss after `delayMs` of gameplay time. */
  queueAimedShot: (delayMs: number, speed: number, originY: number) => void;
}

/** Fires one emitter of a volley. Every pattern is deterministic: no randomness, so runs replay. */
export function fireBossPattern(pattern: BossShotPattern, context: BossVolleyContext): void {
  switch (pattern.kind) {
    case 'arc': {
      const lean = pattern.lean && (!pattern.leanEveryOther || context.volley % 2 === 1) ? pattern.lean : 0;
      const heading = 90 + (pattern.angle ?? 0) + lean * context.moveDir;
      for (const originX of pattern.originsX ?? [0]) {
        fireFan(context, context.x + originX, context.y + pattern.originY, heading, pattern);
      }
      return;
    }
    case 'aimedArc':
      fireFan(context, context.x, context.y + pattern.originY, context.getPlayerAimAngle(), pattern);
      return;
    case 'spiral': {
      const step = 360 / pattern.shots;
      const turn = (context.time / 1000) * pattern.degreesPerSecond;
      const starts = pattern.mirrored ? [turn, -turn + step / 2] : [turn];
      for (const start of starts) {
        for (let i = 0; i < pattern.shots; i++) {
          fireAt(context.fireBullet, context.x, context.y + pattern.originY, start + i * step, pattern.speed);
        }
      }
      return;
    }
    case 'wall':
      fireWall(context, pattern);
      return;
    case 'aimedBurst':
      fireAt(context.fireBullet, context.x, context.y + pattern.originY, context.getPlayerAimAngle(), pattern.speed);
      for (let shot = 1; shot < pattern.shots; shot++) {
        context.queueAimedShot(shot * pattern.intervalMs, pattern.speed, pattern.originY);
      }
      return;
    case 'beam':
      context.launchBeam({
        x: context.x,
        top: context.y + pattern.originY,
        width: pattern.width,
        telegraphMs: pattern.telegraphMs,
        activeMs: pattern.activeMs,
      });
      return;
    case 'summon':
      if (!pattern.onVolleys || (context.volley % 2 === 0) === (pattern.onVolleys === 'even')) {
        context.summonEscorts(pattern.escorts);
      }
  }
}

function fireFan(
  context: BossVolleyContext,
  originX: number,
  originY: number,
  heading: number,
  fan: { shots: number; arcDegrees: number; speed: number }
): void {
  const halfArc = fan.arcDegrees / 2;
  for (let i = 0; i < fan.shots; i++) {
    const progress = fan.shots === 1 ? 0.5 : i / (fan.shots - 1);
    fireAt(context.fireBullet, originX, originY, Phaser.Math.Linear(-halfArc, halfArc, progress) + heading, fan.speed);
  }
}

/** Shots across the screen at even spacing, leaving the gap clear and always fully on screen. */
function fireWall(context: BossVolleyContext, wall: Extract<BossShotPattern, { kind: 'wall' }>): void {
  const { left, width } = context.viewport;
  const gapShare = wall.gaps[context.patternUses % wall.gaps.length] ?? 0.5;
  const halfGap = wall.gapWidth / 2;
  const gapX = Phaser.Math.Clamp(left + gapShare * width, left + halfGap, left + width - halfGap);
  for (let x = left + wall.spacing / 2; x < left + width; x += wall.spacing) {
    if (Math.abs(x - gapX) >= halfGap) fireAt(context.fireBullet, x, context.y + wall.originY, 90, wall.speed);
  }
}

/** One shot at `angleDeg`, with `speed` scaling `ENEMY_BULLET_SPEED`. */
export function fireAt(
  fireBullet: BossVolleyContext['fireBullet'],
  x: number,
  y: number,
  angleDeg: number,
  speed: number
): void {
  const rad = Phaser.Math.DegToRad(angleDeg);
  fireBullet(x, y, Math.cos(rad) * ENEMY_BULLET_SPEED * speed, Math.sin(rad) * ENEMY_BULLET_SPEED * speed);
}
