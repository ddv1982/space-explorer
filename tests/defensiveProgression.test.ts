import { describe, expect, mock, test } from 'bun:test';
import { evaluateUpgrades, type PlayerUpgradeLevels } from '../src/config/UpgradesConfig';

mock.module('phaser', () => ({ default: {} }));
const { advanceToNextLevel, getPlayerState, setPlayerState } = await import('../src/systems/PlayerState');

const stock: PlayerUpgradeLevels = { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 };

/** Buy every affordable tier, including prerequisites, as a high-scoring player can. */
function buyAvailable(clearedSector: number): PlayerUpgradeLevels {
  const upgrades = { ...stock };
  for (;;) {
    const next = evaluateUpgrades(clearedSector, Number.MAX_SAFE_INTEGER, upgrades).find((entry) => entry.canPurchase);
    if (!next) return upgrades;
    upgrades[next.upgrade.key] += 1;
  }
}

describe('defensive campaign pacing', () => {
  test('large scores cannot bypass defensive tier gates or inflate sector recovery', () => {
    for (const [clearedSector, hp, shields] of [
      [1, 6, 0],
      [3, 7, 1],
      [5, 8, 1],
      [7, 9, 2],
      [9, 10, 3],
    ]) {
      const values = new Map<string, unknown>();
      const registry = {
        get: (key: string) => values.get(key),
        set: (key: string, value: unknown) => values.set(key, value),
      };
      setPlayerState(registry, {
        ...getPlayerState(registry),
        level: clearedSector,
        score: 1_000_000,
        currentHp: 1,
        currentShields: 0,
        upgrades: buyAvailable(clearedSector),
      });
      advanceToNextLevel(registry);
      expect(getPlayerState(registry)).toMatchObject({
        level: clearedSector + 1,
        currentHp: hp,
        currentShields: shields,
      });
    }
  });

  test('the first hull upgrade remains affordable after the opening sector', () => {
    const hull = evaluateUpgrades(1, 500, stock).find((entry) => entry.upgrade.key === 'hp');
    expect(hull?.canPurchase).toBe(true);
    expect(hull?.cost).toBe(500);
  });
});
