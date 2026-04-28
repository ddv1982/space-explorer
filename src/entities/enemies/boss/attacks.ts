import Phaser from 'phaser';
import type { BossAttackStyle, EnemyType } from '@/config/LevelsConfig';
import { ENEMY_BULLET_SPEED } from '@/utils/constants';

interface BossAttackContext {
  attackStyle: BossAttackStyle;
  phase: number;
  x: number;
  y: number;
  moveDir: number;
  attackCycle: number;
  shieldActive: boolean;
  phase1SpreadShotCount: number;
  phase1SpreadArcDegrees: number;
  phase1BulletSpeedScale: number;
  phase2SpiralShotCount: number;
  phase2SpiralTurnRate: number;
  phase2BulletSpeedScale: number;
  time: number;
  fireBullet: (x: number, y: number, velocityX: number, velocityY: number) => void;
  summonEscorts: (types: EnemyType[]) => void;
  getPlayerAimAngle: () => number;
}

export function fireBossPattern(context: BossAttackContext): void {
  switch (context.attackStyle) {
    case 'carrier':
      if (context.phase === 1) {
        fireCarrierPattern(context);
      } else {
        fireCarrierAssault(context);
      }
      return;
    case 'pursuit':
      if (context.phase === 1) {
        firePursuitVolley(context);
      } else {
        firePursuitBurst(context);
      }
      return;
    case 'bulwark':
      if (context.phase === 1) {
        fireBulwarkSpread(context);
      } else {
        fireBulwarkRotary(context);
      }
      return;
    default:
      if (context.phase === 1) {
        fireSpread(context);
      } else {
        fireSpiral(context);
      }
  }
}

function fireSpread(context: BossAttackContext): void {
  const shotCount = Math.max(1, context.phase1SpreadShotCount);
  const origins = context.attackStyle === 'barrage' ? [context.x - 18, context.x + 18] : [context.x];
  const arcScale = context.attackStyle === 'barrage' ? 1.15 : context.attackStyle === 'pressure' ? 0.55 : 1;
  const angleOffset = context.attackStyle === 'pressure' && context.attackCycle % 2 === 1 ? context.moveDir * 6 : 0;
  const halfArc = (context.phase1SpreadArcDegrees * arcScale) / 2;

  for (const originX of origins) {
    for (let i = 0; i < shotCount; i++) {
      const progress = shotCount === 1 ? 0.5 : i / (shotCount - 1);
      const angleDeg = Phaser.Math.Linear(-halfArc, halfArc, progress) + angleOffset;
      const rad = Phaser.Math.DegToRad(angleDeg + 90);
      context.fireBullet(
        originX,
        context.y + 30,
        Math.cos(rad) * ENEMY_BULLET_SPEED * context.phase1BulletSpeedScale,
        Math.sin(rad) * ENEMY_BULLET_SPEED * context.phase1BulletSpeedScale
      );
    }
  }
}

function fireSpiral(context: BossAttackContext): void {
  const shotCount = Math.max(1, context.phase2SpiralShotCount);
  const angleStep = 360 / shotCount;
  const timeDivisor = context.attackStyle === 'pressure' ? 420 : 500;
  const turnRate = context.phase2SpiralTurnRate * (context.attackStyle === 'pressure' ? 1.15 : 1);
  const baseAngle = (context.time / timeDivisor) * turnRate;
  const spiralAngles = context.attackStyle === 'maelstrom' ? [baseAngle, -baseAngle + angleStep / 2] : [baseAngle];

  for (const spiralAngle of spiralAngles) {
    fireRadialPattern(context, context.x, context.y + 30, shotCount, spiralAngle, angleStep, context.phase2BulletSpeedScale);
  }
}

function fireCarrierPattern(context: BossAttackContext): void {
  fireArc(context, context.x - 22, context.y + 24, 4, 54, context.phase1BulletSpeedScale * 0.95, -8);
  fireArc(context, context.x + 22, context.y + 24, 4, 54, context.phase1BulletSpeedScale * 0.95, 8);

  if (context.attackCycle % 2 === 0) {
    context.summonEscorts(['swarm', 'scout']);
  }
}

function fireCarrierAssault(context: BossAttackContext): void {
  fireSpiral(context);
  fireArc(context, context.x, context.y + 26, 5, 38, context.phase2BulletSpeedScale, context.moveDir * 4);

  if (context.attackCycle % 2 === 1) {
    context.summonEscorts(['fighter', 'swarm']);
  }
}

function firePursuitVolley(context: BossAttackContext): void {
  const shotCount = Phaser.Math.Clamp(context.phase1SpreadShotCount, 3, 9);
  const arcDegrees = Phaser.Math.Clamp(context.phase1SpreadArcDegrees * 0.55, 18, 48);
  fireAimedArc(context, context.getPlayerAimAngle(), shotCount, arcDegrees, context.phase1BulletSpeedScale);
}

function firePursuitBurst(context: BossAttackContext): void {
  const burstCount = Phaser.Math.Clamp(context.phase2SpiralShotCount + 1, 5, 9);
  const burstArc = Phaser.Math.Clamp(context.phase1SpreadArcDegrees * 0.42, 16, 34);
  const flankCount = Phaser.Math.Clamp(Math.floor(context.phase2SpiralShotCount / 2) + 2, 3, 5);
  fireAimedArc(context, context.getPlayerAimAngle(), burstCount, burstArc, context.phase2BulletSpeedScale * 1.02);
  fireArc(context, context.x, context.y + 28, flankCount, 18, context.phase2BulletSpeedScale, context.moveDir * 10);
}

function fireBulwarkSpread(context: BossAttackContext): void {
  const shotCount = Phaser.Math.Clamp(Math.round(context.phase1SpreadShotCount / 2), 3, 6);
  const arcDegrees = Phaser.Math.Clamp(context.phase1SpreadArcDegrees * 0.3, 14, 30);
  [-28, 0, 28].forEach((offset) => {
    fireArc(context, context.x + offset, context.y + 26, shotCount, arcDegrees, context.phase1BulletSpeedScale, offset * 0.08);
  });
}

function fireBulwarkRotary(context: BossAttackContext): void {
  const spokes = Math.max(4, context.phase2SpiralShotCount);
  const angleStep = 360 / spokes;
  const baseAngle = (context.time / 520) * context.phase2SpiralTurnRate;

  fireRadialPattern(context, context.x, context.y + 26, spokes, baseAngle, angleStep, context.phase2BulletSpeedScale);

  if (!context.shieldActive) {
    fireArc(context, context.x, context.y + 26, 5, 28, context.phase2BulletSpeedScale * 0.95, context.moveDir * 4);
  }
}

function fireAimedArc(
  context: BossAttackContext,
  baseAngle: number,
  shotCount: number,
  arcDegrees: number,
  speedScale: number
): void {
  fireArcPattern(context, context.x, context.y + 28, baseAngle, shotCount, arcDegrees, speedScale);
}

function fireArc(
  context: BossAttackContext,
  originX: number,
  originY: number,
  shotCount: number,
  arcDegrees: number,
  speedScale: number,
  angleOffset = 0
): void {
  fireArcPattern(context, originX, originY, 90 + angleOffset, shotCount, arcDegrees, speedScale);
}

function fireArcPattern(
  context: BossAttackContext,
  originX: number,
  originY: number,
  baseAngle: number,
  shotCount: number,
  arcDegrees: number,
  speedScale: number
): void {
  const halfArc = arcDegrees / 2;

  for (let i = 0; i < shotCount; i++) {
    const progress = shotCount === 1 ? 0.5 : i / (shotCount - 1);
    const angleDeg = Phaser.Math.Linear(-halfArc, halfArc, progress) + baseAngle;
    const rad = Phaser.Math.DegToRad(angleDeg);
    context.fireBullet(
      originX,
      originY,
      Math.cos(rad) * ENEMY_BULLET_SPEED * speedScale,
      Math.sin(rad) * ENEMY_BULLET_SPEED * speedScale
    );
  }
}

function fireRadialPattern(
  context: BossAttackContext,
  originX: number,
  originY: number,
  shotCount: number,
  baseAngle: number,
  angleStep: number,
  speedScale: number
): void {
  for (let i = 0; i < shotCount; i++) {
    const angleDeg = baseAngle + i * angleStep;
    const rad = Phaser.Math.DegToRad(angleDeg);
    context.fireBullet(
      originX,
      originY,
      Math.cos(rad) * ENEMY_BULLET_SPEED * speedScale,
      Math.sin(rad) * ENEMY_BULLET_SPEED * speedScale
    );
  }
}
