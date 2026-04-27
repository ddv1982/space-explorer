import { describe, expect, test } from 'bun:test';

import { normalizePersistedState, resolveRuntimeConfig } from '../src/systems/lastLifeHelperWingState';

describe('lastLifeHelperWingState helpers', () => {
  test('resolveRuntimeConfig applies defaults and bounds', () => {
    expect(
      resolveRuntimeConfig({
        shipCount: 0,
        helperLives: -3,
        hpScaleFromPlayer: 2.5,
        fireRateMs: 10,
        respawnDelayMs: 10,
        spacing: 5,
        followOffsetY: 13.8,
      })
    ).toEqual({
      shipCount: 1,
      helperLives: 1,
      hpScaleFromPlayer: 1,
      fireRateMs: 80,
      respawnDelayMs: 120,
      spacing: 18,
      followOffsetY: 14,
    });
  });

  test('normalizePersistedState preserves slot floor/rounding and hard-caps granted slots', () => {
    expect(
      normalizePersistedState({
        grantedSlots: 9,
        slots: [
          { remainingLives: 2.9, hp: 5.6 },
          { remainingLives: -2, hp: -4 },
        ],
      })
    ).toEqual({
      grantedSlots: 4,
      slots: [
        { remainingLives: 2, hp: 6 },
        { remainingLives: 0, hp: 0 },
        { remainingLives: 0, hp: 0 },
        { remainingLives: 0, hp: 0 },
      ],
    });
  });
});
