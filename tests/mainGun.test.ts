import { describe, expect, mock, test } from 'bun:test';
import { getMainGunProfile, NO_SHIP_SYSTEMS, type ShipSystems } from '../src/config/shipSystems';
import { fireMainGunVolley, resolveMainGunCooldownMs } from '../src/systems/mainGun';

function volley(systems: Partial<ShipSystems>, volleyIndex = 1) {
  const fire = mock();
  fireMainGunVolley({
    systems: { ...NO_SHIP_SYSTEMS, ...systems },
    volleyIndex,
    origin: { x: 100, y: 500 },
    direction: { x: 0, y: -1 },
    speed: 600,
    findTarget: () => null,
    fire,
  });
  return fire.mock.calls as Array<
    [number, number, number, number, { pierce?: boolean; seekDegreesPerSecond?: number }?]
  >;
}

describe('main gun', () => {
  test('the standard gun fires one plain bolt straight ahead', () => {
    const shots = volley({});
    expect(shots).toHaveLength(1);
    expect(shots[0].slice(0, 4)).toEqual([100, 500, 0, -600]);
    expect(shots[0][4]).toBeUndefined();
  });

  test('Lance fires one piercing shot, Seekers one seeking shot', () => {
    expect(volley({ gun: 'lance' })[0][4]?.pierce).toBe(true);
    expect(volley({ gun: 'seekers' })[0][4]?.seekDegreesPerSecond).toBeGreaterThan(0);
  });

  test('Scatter fires three shots fanned evenly around straight ahead, all at full speed', () => {
    const shots = volley({ gun: 'scatter' });
    expect(shots).toHaveLength(3);
    const [left, centre, right] = shots;
    expect(centre[2]).toBeCloseTo(0);
    expect(left[2]).toBeCloseTo(-right[2]);
    expect(Math.abs(left[2])).toBeGreaterThan(50);
    for (const shot of shots) expect(Math.hypot(shot[2], shot[3])).toBeCloseTo(600);
  });

  test('Wingman adds a plain bolt from the drone on every other volley', () => {
    expect(volley({ support: 'wingman', gun: 'lance' }, 1)).toHaveLength(1);
    const shots = volley({ support: 'wingman', gun: 'lance' }, 2);
    expect(shots).toHaveLength(2);
    expect(shots[1][0]).toBeGreaterThan(100);
    expect(shots[1][4]).toBeUndefined();
  });

  test('each gun pays for its pattern with a slower cooldown', () => {
    expect(resolveMainGunCooldownMs(150, 1, NO_SHIP_SYSTEMS)).toBe(150);
    for (const gun of ['lance', 'scatter', 'seekers'] as const) {
      const cooldown = resolveMainGunCooldownMs(150, 1, { ...NO_SHIP_SYSTEMS, gun });
      expect(cooldown).toBeCloseTo(150 * getMainGunProfile(gun).cooldownScale);
      expect(cooldown).toBeGreaterThan(150);
    }
  });

  test('no gun is strictly better: each trades single-target damage for its strength', () => {
    // Shots that reach ships per second, relative to the standard gun.
    const rate = (gun: 'lance' | 'scatter' | 'seekers', shotsThatHit: number) =>
      shotsThatHit / getMainGunProfile(gun).cooldownScale;
    // Against one ship at range, every gun is weaker than the standard bolt...
    for (const gun of ['lance', 'scatter', 'seekers'] as const) {
      expect(rate(gun, 1)).toBeLessThan(1);
      expect(rate(gun, 1)).toBeGreaterThanOrEqual(0.5);
    }
    // ...and each beats it only in its own situation, within limits.
    expect(rate('lance', 2)).toBeGreaterThan(1); // two ships in a line
    expect(rate('lance', 2)).toBeLessThanOrEqual(1.6);
    expect(rate('scatter', 3)).toBeGreaterThan(1); // point blank
    expect(rate('scatter', 3)).toBeLessThanOrEqual(1.7);
  });

  test('Overdrive speeds the gun up with every chain step; without it only the max chain does', () => {
    const overdrive = { ...NO_SHIP_SYSTEMS, late: 'overdrive' as const };
    expect(resolveMainGunCooldownMs(150, 1, overdrive)).toBe(150);
    expect(resolveMainGunCooldownMs(150, 3, overdrive)).toBeCloseTo(150 * 0.88);
    expect(resolveMainGunCooldownMs(150, 5, overdrive)).toBeCloseTo(150 * 0.76);
    expect(resolveMainGunCooldownMs(150, 3, NO_SHIP_SYSTEMS)).toBe(150);
    expect(resolveMainGunCooldownMs(150, 5, NO_SHIP_SYSTEMS)).toBeCloseTo(150 * 0.85);
  });
});
