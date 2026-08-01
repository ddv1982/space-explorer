import { describe, expect, test } from 'bun:test';
import { resolveDevLevelJump } from '../src/scenes/menuScene/devLevelJump';
import { getTotalLevels } from '../src/config/LevelsConfig';

describe('resolveDevLevelJump', () => {
  test('returns null without a startLevel param', () => {
    expect(resolveDevLevelJump('')).toBeNull();
    expect(resolveDevLevelJump('?browserHarness=1')).toBeNull();
  });

  test('returns null for a non-numeric startLevel', () => {
    expect(resolveDevLevelJump('?startLevel=abc')).toBeNull();
  });

  test('clamps the target level into the campaign range', () => {
    expect(resolveDevLevelJump('?startLevel=0')?.level).toBe(1);
    expect(resolveDevLevelJump('?startLevel=-4')?.level).toBe(1);
    expect(resolveDevLevelJump('?startLevel=99')?.level).toBe(getTotalLevels());
    expect(resolveDevLevelJump('?startLevel=9')?.level).toBe(9);
  });

  test('defaults to the progression-legal max loadout for the target level', () => {
    expect(resolveDevLevelJump('?startLevel=9')?.upgrades).toEqual({
      hp: 5,
      damage: 4,
      fireRate: 4,
      shield: 3,
    });
    expect(resolveDevLevelJump('?startLevel=2')?.upgrades).toEqual({
      hp: 3,
      damage: 2,
      fireRate: 1,
      shield: 0,
    });
  });

  test('supports a fresh-ship loadout', () => {
    expect(resolveDevLevelJump('?startLevel=9&upgrades=0')?.upgrades).toEqual({
      hp: 0,
      damage: 0,
      fireRate: 0,
      shield: 0,
    });
    expect(resolveDevLevelJump('?startLevel=9&upgrades=fresh')?.upgrades.hp).toBe(0);
  });

  test('parses explicit loadouts and clamps them to upgrade max levels', () => {
    expect(resolveDevLevelJump('?startLevel=9&upgrades=2,9,1,1')?.upgrades).toEqual({
      hp: 2,
      damage: 4,
      fireRate: 1,
      shield: 1,
    });
  });

  test('falls back to the default loadout for malformed upgrade lists', () => {
    expect(resolveDevLevelJump('?startLevel=9&upgrades=1,2')?.upgrades).toEqual({
      hp: 5,
      damage: 4,
      fireRate: 4,
      shield: 3,
    });
  });
});
