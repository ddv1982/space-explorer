import { describe, expect, test } from 'bun:test';
import { PLAYER_CONFIG } from '../src/config/playerConfig';
import {
  ASTEROID_HP,
  BOMBER_HP,
  DIVER_HP,
  DODGER_HP,
  FIGHTER_HP,
  GUNSHIP_HP,
  LANCER_HP,
  SCOUT_HP,
  SOWER_HP,
  SPLITTER_HP,
  SWARM_HP,
  SWARMLING_HP,
} from '../src/utils/constants';

describe('regular enemy durability', () => {
  test('keeps the intended base-shot hierarchy without changing one-hit enemies', () => {
    const shotsToKill = (hp: number) => Math.ceil(hp / PLAYER_CONFIG.baseDamage);

    expect(PLAYER_CONFIG.baseDamage).toBe(1);
    expect({
      scout: shotsToKill(SCOUT_HP),
      swarm: shotsToKill(SWARM_HP),
      swarmling: shotsToKill(SWARMLING_HP),
      diver: shotsToKill(DIVER_HP),
      asteroid: shotsToKill(ASTEROID_HP),
      fighter: shotsToKill(FIGHTER_HP),
      dodger: shotsToKill(DODGER_HP),
      splitter: shotsToKill(SPLITTER_HP),
      sower: shotsToKill(SOWER_HP),
      bomber: shotsToKill(BOMBER_HP),
      lancer: shotsToKill(LANCER_HP),
      gunship: shotsToKill(GUNSHIP_HP),
    }).toEqual({
      scout: 1,
      swarm: 1,
      swarmling: 1,
      diver: 1,
      asteroid: 2,
      fighter: 2,
      dodger: 2,
      splitter: 2,
      sower: 3,
      bomber: 4,
      lancer: 4,
      gunship: 5,
    });

    expect(FIGHTER_HP).toBeLessThan(BOMBER_HP);
    expect(BOMBER_HP).toBeLessThan(GUNSHIP_HP);
    expect(DIVER_HP).toBe(SWARM_HP);
    expect(SWARMLING_HP).toBe(SCOUT_HP);
    expect(DODGER_HP).toBe(FIGHTER_HP);
    expect(SPLITTER_HP).toBe(FIGHTER_HP);
    expect(SOWER_HP).toBeLessThan(LANCER_HP);
    expect(LANCER_HP).toBe(BOMBER_HP);
  });
});
