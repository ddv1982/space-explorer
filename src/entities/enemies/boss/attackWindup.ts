/** How long a boss visibly charges before each volley. */
export const BOSS_ATTACK_WINDUP_MS = 400;

/** The wind-up for one cooldown: 400 ms, or 60% of a faster cycle. */
function effectiveWindupMs(cooldownMs: number, windupMs = BOSS_ATTACK_WINDUP_MS): number {
  return Math.max(0, Math.min(windupMs, cooldownMs * 0.6));
}

/**
 * The fire schedule on arrival, so the first volley gets its full wind-up: a volley already due later
 * keeps its time, and one that would fire sooner is pushed back to one wind-up from now.
 */
export function firstVolleyLastFireTime(arrivedAt: number, lastFireTime: number, cooldownMs: number): number {
  return Math.max(lastFireTime, arrivedAt + effectiveWindupMs(cooldownMs) - cooldownMs);
}

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
  const windup = effectiveWindupMs(cooldownMs, windupMs);
  if (windup <= 0) return 0;
  const untilFire = lastFireTime + cooldownMs - time;
  return Math.min(1, Math.max(0, 1 - untilFire / windup));
}
