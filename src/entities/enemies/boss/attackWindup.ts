/** How long a boss visibly charges before each volley. */
export const BOSS_ATTACK_WINDUP_MS = 400;

/**
 * Charge shown before the next volley: 0 until the wind-up starts, rising to 1 as the boss fires.
 * Fast cycles charge for at most 60% of the cooldown, so the boss never looks charged all the time.
 */
export function bossAttackWindup(
  time: number,
  lastFireTime: number,
  cooldownMs: number,
  windupMs = BOSS_ATTACK_WINDUP_MS
): number {
  const windup = Math.min(windupMs, cooldownMs * 0.6);
  if (windup <= 0) return 0;
  const untilFire = lastFireTime + cooldownMs - time;
  return Math.min(1, Math.max(0, 1 - untilFire / windup));
}
