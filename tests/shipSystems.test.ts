import { describe, expect, test } from 'bun:test';
import {
  describePickedShipSystems,
  getNextMainGun,
  getPendingShipSystemSlot,
  getShipSystemSlot,
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

  test('support is offered after sector 5 and doctrine after 8; the main gun is never a pick', () => {
    expect(getPendingShipSystemSlot(2, NO_SHIP_SYSTEMS)).toBeNull();
    expect(getPendingShipSystemSlot(4, NO_SHIP_SYSTEMS)).toBeNull();
    expect(getPendingShipSystemSlot(5, NO_SHIP_SYSTEMS)?.slot).toBe('support');
    const withSupport = { ...NO_SHIP_SYSTEMS, support: 'magnet' as const };
    expect(getPendingShipSystemSlot(8, withSupport)?.slot).toBe('late');
    expect(getPendingShipSystemSlot(9, { ...withSupport, late: 'bulwark' })).toBeNull();
  });

  test('a run that starts late (a loaded save, a level jump) is offered each missed pick in turn', () => {
    expect(getPendingShipSystemSlot(9, NO_SHIP_SYSTEMS)?.slot).toBe('support');
  });

  test("stored picks are clamped to their own slot, and an old save's main gun is ignored", () => {
    expect(normalizeShipSystems({ gun: 'scatter', support: 'lance', late: 42 })).toEqual({
      support: null,
      late: null,
    });
    expect(normalizeShipSystems({ gun: 'seekers', support: 'magnet', late: 'bulwark' })).toEqual({
      support: 'magnet',
      late: 'bulwark',
    });
    expect(normalizeShipSystems(undefined)).toEqual(NO_SHIP_SYSTEMS);
  });

  test('cycling a slot steps through its options and wraps around', () => {
    let systems: ShipSystems = { ...NO_SHIP_SYSTEMS, support: 'magnet', late: 'bulwark' };
    const supports: Array<string | null> = [];
    for (let step = 0; step < 3; step += 1) {
      systems = selectNextShipSystem(systems, 'support');
      supports.push(systems.support);
    }
    expect(supports).toEqual(['surgeCore', 'wingman', 'magnet']);
    expect(systems.late).toBe('bulwark');
  });

  test('the swap key steps the main gun Lance -> Scatter -> Seekers -> Lance', () => {
    expect([getNextMainGun('lance'), getNextMainGun('scatter'), getNextMainGun('seekers')]).toEqual([
      'scatter',
      'seekers',
      'lance',
    ]);
  });

  test('cycling an empty slot leaves it empty, so nothing can be picked early', () => {
    expect(selectNextShipSystem(NO_SHIP_SYSTEMS, 'support')).toEqual(NO_SHIP_SYSTEMS);
    expect(selectNextShipSystem({ ...NO_SHIP_SYSTEMS, support: 'magnet' }, 'late').late).toBeNull();
  });

  test("setting a slot only accepts that slot's own options", () => {
    expect(setShipSystem(NO_SHIP_SYSTEMS, 'support', 'wingman').support).toBe('wingman');
    expect(setShipSystem(NO_SHIP_SYSTEMS, 'support', 'bulwark').support).toBeNull();
  });

  test('a picked slot can be offered again at the refit bay with its own three options', () => {
    const support = getShipSystemSlot('support');
    expect(support.title).toBe('SUPPORT SYSTEM');
    expect(support.options.map((option) => option.id)).toEqual(['magnet', 'surgeCore', 'wingman']);
    expect(getShipSystemSlot('late').options.map((option) => option.id)).toEqual(['overdrive', 'bulwark', 'salvager']);
  });

  test('the pause panel lists only picked slots, in slot order', () => {
    expect(describePickedShipSystems({ support: null, late: 'bulwark' }).map((system) => system.title)).toEqual([
      'COMBAT DOCTRINE',
    ]);
    const picked = describePickedShipSystems({ support: 'wingman', late: 'bulwark' });
    expect(picked.map((system) => [system.title, system.option.name])).toEqual([
      ['SUPPORT SYSTEM', 'WINGMAN'],
      ['COMBAT DOCTRINE', 'BULWARK'],
    ]);
  });
});
