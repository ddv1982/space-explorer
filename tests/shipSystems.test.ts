import { describe, expect, test } from 'bun:test';
import {
  describePickedShipSystems,
  getPendingShipSystemSlot,
  NO_SHIP_SYSTEMS,
  normalizeShipSystems,
  selectNextShipSystem,
  setShipSystem,
  type ShipSystems,
} from '../src/config/shipSystems';

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

  test('cycling a slot steps through its options and wraps around', () => {
    let systems: ShipSystems = { ...NO_SHIP_SYSTEMS, gun: 'lance', support: 'magnet' };
    const guns: Array<string | null> = [];
    for (let step = 0; step < 3; step += 1) {
      systems = selectNextShipSystem(systems, 'gun');
      guns.push(systems.gun);
    }
    expect(guns).toEqual(['scatter', 'seekers', 'lance']);
    expect(systems.support).toBe('magnet');
    expect(selectNextShipSystem(systems, 'support').support).toBe('surgeCore');
  });

  test('cycling an empty slot leaves it empty, so nothing can be picked early', () => {
    expect(selectNextShipSystem(NO_SHIP_SYSTEMS, 'gun')).toEqual(NO_SHIP_SYSTEMS);
    expect(selectNextShipSystem({ ...NO_SHIP_SYSTEMS, gun: 'seekers' }, 'late').late).toBeNull();
  });

  test("setting a slot only accepts that slot's own options", () => {
    expect(setShipSystem(NO_SHIP_SYSTEMS, 'support', 'wingman').support).toBe('wingman');
    expect(setShipSystem(NO_SHIP_SYSTEMS, 'support', 'lance').support).toBeNull();
  });

  test('the pause panel lists only picked slots, in slot order', () => {
    const picked = describePickedShipSystems({ gun: 'scatter', support: null, late: 'bulwark' });
    expect(picked.map((system) => [system.title, system.option.name])).toEqual([
      ['MAIN GUN', 'SCATTER'],
      ['COMBAT DOCTRINE', 'BULWARK'],
    ]);
  });
});
