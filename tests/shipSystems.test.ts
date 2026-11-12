import { describe, expect, test } from 'bun:test';
import { getPendingShipSystemSlot, NO_SHIP_SYSTEMS, normalizeShipSystems } from '../src/config/shipSystems';

describe('ship systems', () => {
  test('nothing is offered during the two gentle opening sectors', () => {
    expect(getPendingShipSystemSlot(1, NO_SHIP_SYSTEMS)).toBeNull();
  });

  test('the main gun is offered after sector 2, support after 5, doctrine after 8', () => {
    expect(getPendingShipSystemSlot(2, NO_SHIP_SYSTEMS)?.slot).toBe('gun');
    const withGun = { ...NO_SHIP_SYSTEMS, gun: 'lance' as const };
    expect(getPendingShipSystemSlot(4, withGun)).toBeNull();
    expect(getPendingShipSystemSlot(5, withGun)?.slot).toBe('support');
    const withSupport = { ...withGun, support: 'magnet' as const };
    expect(getPendingShipSystemSlot(8, withSupport)?.slot).toBe('late');
    expect(getPendingShipSystemSlot(9, { ...withSupport, late: 'bulwark' })).toBeNull();
  });

  test('a run that starts late (a loaded save, a level jump) is offered each missed pick in turn', () => {
    expect(getPendingShipSystemSlot(9, NO_SHIP_SYSTEMS)?.slot).toBe('gun');
  });

  test('stored picks are clamped to their own slot', () => {
    expect(normalizeShipSystems({ gun: 'scatter', support: 'lance', late: 42 })).toEqual({
      gun: 'scatter',
      support: null,
      late: null,
    });
    expect(normalizeShipSystems(undefined)).toEqual(NO_SHIP_SYSTEMS);
  });
});
