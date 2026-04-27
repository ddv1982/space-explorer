import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';
import type { LastLifeHelperWing } from '../src/systems/LastLifeHelperWing';

const saveHelperWingState = mock();
mock.module('../src/systems/PlayerState', () => ({
  saveHelperWingState,
}));

const { persistHelperWingState, syncLastLifeHelperWingState } = await import(
  '../src/scenes/gameScene/helperWingStateBridge'
);

describe('gameScene helperWingStateBridge', () => {
  beforeEach(() => {
    saveHelperWingState.mockClear();
  });

  test('syncLastLifeHelperWingState forwards remaining lives when helper wing exists', () => {
    const updateLastLifeState = mock();

    syncLastLifeHelperWingState(
      { updateLastLifeState } as unknown as LastLifeHelperWing,
      1
    );

    expect(updateLastLifeState).toHaveBeenCalledWith(1);
  });

  test('persistHelperWingState stores empty helper-wing state when helper wing is absent', () => {
    const registry = {};

    persistHelperWingState(registry as unknown as Phaser.Data.DataManager, null);

    expect(saveHelperWingState).toHaveBeenCalledWith(registry, { slots: [], grantedSlots: 0 });
  });

  test('persistHelperWingState captures and stores helper-wing state when helper wing exists', () => {
    const registry = {};
    const persistedState = {
      grantedSlots: 1,
      slots: [{ remainingLives: 2, hp: 3 }],
    };
    const capturePersistentState = mock(() => persistedState);

    persistHelperWingState(
      registry as unknown as Phaser.Data.DataManager,
      { capturePersistentState } as unknown as LastLifeHelperWing
    );

    expect(capturePersistentState).toHaveBeenCalledTimes(1);
    expect(saveHelperWingState).toHaveBeenCalledWith(registry, persistedState);
  });
});
