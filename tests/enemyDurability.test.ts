import { describe, expect, test } from 'bun:test';
import { PLAYER_CONFIG } from '../src/config/playerConfig';
import {
  ASTEROID_HP,
  BOMBER_HP,
  FIGHTER_HP,
  GUNSHIP_HP,
  SCOUT_HP,
  SWARM_HP,
} from '../src/utils/constants';

describe('regular enemy durability', () => {
  test('keeps the intended base-shot hierarchy without changing one-hit enemies', () => {
    const shotsToKill = (hp: number) => Math.ceil(hp / PLAYER_CONFIG.baseDamage);

    expect(PLAYER_CONFIG.baseDamage).toBe(1);
    expect({
      scout: shotsToKill(SCOUT_HP),
      swarm: shotsToKill(SWARM_HP),
      asteroid: shotsToKill(ASTEROID_HP),
      fighter: shotsToKill(FIGHTER_HP),
      bomber: shotsToKill(BOMBER_HP),
      gunship: shotsToKill(GUNSHIP_HP),
    }).toEqual({
      scout: 1,
      swarm: 1,
      asteroid: 2,
      fighter: 2,
      bomber: 4,
      gunship: 5,
    });

    expect(FIGHTER_HP).toBeLessThan(BOMBER_HP);
    expect(BOMBER_HP).toBeLessThan(GUNSHIP_HP);
  });
});
