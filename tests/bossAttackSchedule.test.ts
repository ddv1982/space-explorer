import { describe, expect, test } from 'bun:test';
import type { BossAttackConfig } from '../src/config/LevelsConfig';
import {
  BOSS_ATTACK_WINDUP_MS,
  BossAttackSchedule,
  FAST_KILL_BONUS_PER_SECOND,
  resolveFastKillBonus,
  resolveFireRateScale,
} from '../src/entities/enemies/boss/attackSchedule';

const attack = (cooldownMs: number, id: string): BossAttackConfig => ({
  cooldownMs,
  volley: [{ kind: 'summon', escorts: [id as never] }],
});
const FIRST = attack(1000, 'first');
const SECOND = attack(1500, 'second');
const THIRD = attack(800, 'third');

/** Steps the schedule frame by frame and returns the times and attacks it fired. */
function run(schedule: BossAttackSchedule, untilMs: number, stepMs = 10): Array<[number, BossAttackConfig]> {
  const fired: Array<[number, BossAttackConfig]> = [];
  for (let time = 0; time <= untilMs; time += stepMs) {
    const due = schedule.takeDue(time);
    if (due) fired.push([time, due]);
  }
  return fired;
}

describe('boss attack rotation', () => {
  test('fires the authored attacks in order, each after its own cooldown, then starts over', () => {
    const schedule = new BossAttackSchedule(60_000, true);
    schedule.start([FIRST, SECOND, THIRD], 0);

    expect(run(schedule, 6000)).toEqual([
      [1000, FIRST],
      [2500, SECOND],
      [3300, THIRD],
      [4300, FIRST],
      [5800, SECOND],
    ]);
  });

  test('a new phase starts its own rotation from the top after the firing pause', () => {
    const schedule = new BossAttackSchedule(60_000, true);
    schedule.start([FIRST, SECOND], 0);
    expect(schedule.takeDue(1000)).toBe(FIRST);

    schedule.start([THIRD], 1200, 300);
    expect(schedule.upcoming).toBe(THIRD);
    expect(schedule.takeDue(1200 + 300 + 799)).toBeNull();
    expect(schedule.takeDue(1200 + 300 + 800)).toBe(THIRD);
  });

  test('charges for the last 400 ms before each volley, from rest after the last one', () => {
    const schedule = new BossAttackSchedule(60_000, true);
    schedule.start([attack(1800, 'slow')], 0);

    expect(schedule.windup(1800 - BOSS_ATTACK_WINDUP_MS - 1)).toBe(0);
    expect(schedule.windup(1800 - BOSS_ATTACK_WINDUP_MS / 2)).toBeCloseTo(0.5);
    schedule.takeDue(1800);
    expect(schedule.windup(1800)).toBe(0);
  });

  test('fast cooldowns charge for 60% of the cycle so the boss never looks charged all the time', () => {
    const schedule = new BossAttackSchedule(60_000, true);
    schedule.start([attack(500, 'fast')], 0);
    expect(schedule.windup(199)).toBe(0);
    expect(schedule.windup(350)).toBeCloseTo(0.5);
  });

  test('holding (arriving or flying to an anchor) keeps the next volley a full wind-up away', () => {
    const schedule = new BossAttackSchedule(60_000, true);
    schedule.start([FIRST], 0);
    schedule.hold(5000);
    expect(schedule.windup(5000)).toBe(0);
    expect(schedule.takeDue(5000 + BOSS_ATTACK_WINDUP_MS - 1)).toBeNull();
    expect(schedule.takeDue(5000 + BOSS_ATTACK_WINDUP_MS)).toBe(FIRST);
  });

  test('holding never pulls a later volley earlier', () => {
    const schedule = new BossAttackSchedule(60_000, true);
    schedule.start([attack(3000, 'late')], 0);
    schedule.hold(100);
    expect(schedule.takeDue(2999)).toBeNull();
    expect(schedule.takeDue(3000)).not.toBeNull();
  });
});

describe('escalation past par', () => {
  test('keeps the authored pace until par', () => {
    expect(resolveFireRateScale(0, 45_000, true)).toBe(1);
    expect(resolveFireRateScale(45_000, 45_000, true)).toBe(1);
  });

  test('speeds volleys up gradually after par and caps them at 25% faster', () => {
    expect(resolveFireRateScale(45_000 + 15_000, 45_000, true)).toBeCloseTo(1.125);
    expect(resolveFireRateScale(45_000 + 30_000, 45_000, true)).toBeCloseTo(1.25);
    expect(resolveFireRateScale(45_000 + 300_000, 45_000, true)).toBeCloseTo(1.25);
  });

  test('a boss that does not escalate keeps its pace forever', () => {
    expect(resolveFireRateScale(500_000, 45_000, false)).toBe(1);
  });

  test('a long fight fires sooner, but the wind-up keeps its full length', () => {
    const schedule = new BossAttackSchedule(10_000, true);
    schedule.start([attack(1000, 'late')], 40_000);
    // 30 s past par: 1000 ms / 1.25 = 800 ms, with the 400 ms wind-up intact.
    expect(schedule.takeDue(40_799)).toBeNull();
    expect(schedule.windup(40_800 - BOSS_ATTACK_WINDUP_MS)).toBe(0);
    expect(schedule.windup(40_800 - BOSS_ATTACK_WINDUP_MS / 2)).toBeCloseTo(0.5);
    expect(schedule.takeDue(40_800)).not.toBeNull();
  });

  test('escalation never squeezes a fast cooldown below its wind-up', () => {
    const schedule = new BossAttackSchedule(0, true);
    schedule.start([attack(460, 'fastest')], 60_000);
    // 460 / 1.25 = 368 ms, still longer than the 276 ms wind-up (60% of 460).
    expect(schedule.takeDue(60_367)).toBeNull();
    expect(schedule.takeDue(60_368)).not.toBeNull();
    expect(schedule.windup(60_368 + 368 - 276)).toBe(0);
  });
});

describe('fast-kill bonus', () => {
  test('pays for every whole second left on the par clock', () => {
    expect(resolveFastKillBonus(30_000, 45_000)).toBe(15 * FAST_KILL_BONUS_PER_SECOND);
    expect(resolveFastKillBonus(44_400, 45_000)).toBe(0);
    expect(resolveFastKillBonus(43_999, 45_000)).toBe(FAST_KILL_BONUS_PER_SECOND);
  });

  test('pays nothing at or past par', () => {
    expect(resolveFastKillBonus(45_000, 45_000)).toBe(0);
    expect(resolveFastKillBonus(90_000, 45_000)).toBe(0);
  });
});
