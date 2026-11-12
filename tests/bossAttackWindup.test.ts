import { describe, expect, test } from 'bun:test';
import {
  BOSS_ATTACK_WINDUP_MS,
  bossAttackWindup,
  firstVolleyLastFireTime,
} from '../src/entities/enemies/boss/attackWindup';

describe('boss attack wind-up', () => {
  test('stays at rest until the last 400 ms before a volley, then charges to full as it fires', () => {
    const cooldown = 1800;
    expect(bossAttackWindup(0, 0, cooldown)).toBe(0);
    expect(bossAttackWindup(cooldown - BOSS_ATTACK_WINDUP_MS - 1, 0, cooldown)).toBe(0);
    expect(bossAttackWindup(cooldown - BOSS_ATTACK_WINDUP_MS / 2, 0, cooldown)).toBeCloseTo(0.5);
    expect(bossAttackWindup(cooldown, 0, cooldown)).toBe(1);
    expect(bossAttackWindup(cooldown + 50, 0, cooldown)).toBe(1);
  });

  test('restarts from rest after each volley', () => {
    expect(bossAttackWindup(2000, 2000, 1800)).toBe(0);
  });

  test('fast cycles charge for at most 60% of the cooldown', () => {
    // 500 ms cooldown: the wind-up is 300 ms, so the first 200 ms after a volley stay at rest.
    expect(bossAttackWindup(199, 0, 500)).toBe(0);
    expect(bossAttackWindup(350, 0, 500)).toBeCloseTo(0.5);
  });

  test('a boss that cannot fire shows no charge', () => {
    expect(bossAttackWindup(100, 0, 0)).toBe(0);
  });

  test('a boss that arrives after its cooldown still charges fully before the first volley', () => {
    const cooldown = 1800;
    const arrivedAt = 5000;
    const lastFireTime = firstVolleyLastFireTime(arrivedAt, 0, cooldown);
    // Next volley is one wind-up after arrival, and the charge starts from rest.
    expect(lastFireTime + cooldown).toBe(arrivedAt + BOSS_ATTACK_WINDUP_MS);
    expect(bossAttackWindup(arrivedAt, lastFireTime, cooldown)).toBe(0);
    expect(bossAttackWindup(arrivedAt + BOSS_ATTACK_WINDUP_MS, lastFireTime, cooldown)).toBe(1);
  });

  test('arrival never pulls a later volley earlier', () => {
    expect(firstVolleyLastFireTime(1000, 900, 1800)).toBe(900);
  });
});
