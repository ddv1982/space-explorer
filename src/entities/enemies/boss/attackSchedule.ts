import type { BossAttackConfig } from '@/config/LevelsConfig';

/** How long a boss visibly charges before each volley. */
export const BOSS_ATTACK_WINDUP_MS = 400;
/** Past par, cooldowns shrink over this long... */
const ESCALATION_RAMP_MS = 30_000;
/** ...until volleys come this much faster, and no faster. */
const MAX_FIRE_RATE_SCALE = 1.25;
/** Score for every whole second a boss dies under par. */
export const FAST_KILL_BONUS_PER_SECOND = 200;

/** The wind-up before a volley: 400 ms, or 60% of a faster cooldown so the boss never looks charged all the time. */
function resolveWindupMs(cooldownMs: number): number {
  return Math.max(0, Math.min(BOSS_ATTACK_WINDUP_MS, cooldownMs * 0.6));
}

/**
 * How much faster volleys come at this point of the fight: 1 until par, then rising evenly to 1.25
 * over the next 30 s. A boss that does not escalate always fires at 1.
 */
export function resolveFireRateScale(fightMs: number, parMs: number, escalates: boolean): number {
  if (!escalates || fightMs <= parMs) return 1;
  return 1 + (MAX_FIRE_RATE_SCALE - 1) * Math.min(1, (fightMs - parMs) / ESCALATION_RAMP_MS);
}

/** The bonus for a kill at `fightMs`: a fixed amount per whole second left on the par clock. */
export function resolveFastKillBonus(fightMs: number, parMs: number): number {
  return Math.max(0, Math.floor((parMs - fightMs) / 1000)) * FAST_KILL_BONUS_PER_SECOND;
}

/**
 * When a boss fires and what: it steps through a phase's attacks in their authored order, each after
 * its own cooldown. Times are the boss's gameplay clock (milliseconds since it spawned), which stops
 * during pause and hit-stop, so the schedule, escalation and par never move while gameplay is frozen.
 */
export class BossAttackSchedule {
  private attacks: readonly BossAttackConfig[] = [];
  private index = 0;
  private nextFireAt = 0;
  private windupMs = 0;

  constructor(
    private readonly parMs: number,
    private readonly escalates: boolean
  ) {}

  /** Starts a rotation from its first attack, which fires its cooldown after a `pauseMs` pause. */
  start(attacks: readonly BossAttackConfig[], time: number, pauseMs = 0): void {
    this.attacks = attacks;
    this.index = 0;
    this.scheduleFrom(time + pauseMs);
  }

  /** The attack that fires next. */
  get upcoming(): BossAttackConfig | null {
    return this.attacks[this.index] ?? null;
  }

  /** Keeps the next volley at least a full wind-up away, while the boss is still getting into position. */
  hold(time: number): void {
    this.nextFireAt = Math.max(this.nextFireAt, time + this.windupMs);
  }

  /** The attack due at `time`, moving the rotation on to the next one; null while none is due. */
  takeDue(time: number): BossAttackConfig | null {
    const attack = this.upcoming;
    if (!attack || time < this.nextFireAt) return null;
    this.index = (this.index + 1) % this.attacks.length;
    this.scheduleFrom(time);
    return attack;
  }

  /** Charge shown before the next volley: 0 until its wind-up starts, rising to 1 as it fires. */
  windup(time: number): number {
    if (this.windupMs <= 0) return 0;
    return Math.min(1, Math.max(0, 1 - (this.nextFireAt - time) / this.windupMs));
  }

  /** Escalation shortens the cooldown but never the wind-up, which comes from the authored cooldown. */
  private scheduleFrom(time: number): void {
    const next = this.upcoming;
    if (!next) return;
    this.windupMs = resolveWindupMs(next.cooldownMs);
    const scale = resolveFireRateScale(time, this.parMs, this.escalates);
    this.nextFireAt = time + Math.max(this.windupMs, next.cooldownMs / scale);
  }
}
