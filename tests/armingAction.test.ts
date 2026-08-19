import { describe, expect, test } from 'bun:test';

import { createArmingAction } from '../src/systems/armingAction';

describe('createArmingAction', () => {
  test('confirms only on the second trigger', () => {
    let confirmed = 0;
    const action = createArmingAction(() => {
      confirmed += 1;
    });

    expect(action.trigger()).toBe(false);
    expect(action.isArmed()).toBe(true);
    expect(confirmed).toBe(0);

    expect(action.trigger()).toBe(true);
    expect(action.isArmed()).toBe(false);
    expect(confirmed).toBe(1);
  });

  test('cancel disarms without confirming', () => {
    let confirmed = 0;
    const action = createArmingAction(() => {
      confirmed += 1;
    });

    action.trigger();
    action.cancel();
    expect(action.isArmed()).toBe(false);
    expect(action.trigger()).toBe(false);
    expect(confirmed).toBe(0);
  });

  test('re-arms when the keyed target changes', () => {
    const confirmed: string[] = [];
    const action = createArmingAction<string>((slotId) => {
      confirmed.push(slotId);
    });

    expect(action.trigger('slot-1')).toBe(false);
    expect(action.trigger('slot-2')).toBe(false);
    expect(action.isArmed('slot-2')).toBe(true);
    expect(action.trigger('slot-2')).toBe(true);
    expect(confirmed).toEqual(['slot-2']);
  });
});
