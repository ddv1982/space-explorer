import { describe, expect, test } from 'bun:test';
import { FLIGHT_CONFIG } from '../src/config/flightConfig';
import { keyboardDesiredVelocity, stepFlight, type FlightState } from '../src/systems/flight/flightModel';

const REST: FlightState = { vx: 0, vy: 0, bank: 0 };

function run(
  state: FlightState,
  desiredVx: number,
  desiredVy: number,
  durationMs: number,
  dtMs: number
): { state: FlightState; distanceX: number } {
  let current = state;
  let distanceX = 0;
  const steps = Math.round(durationMs / dtMs);
  for (let i = 0; i < steps; i++) {
    current = stepFlight(current, desiredVx, desiredVy, dtMs, FLIGHT_CONFIG);
    distanceX += (current.vx * dtMs) / 1000;
  }
  return { state: current, distanceX };
}

describe('flightModel', () => {
  test('reaches 90% of max speed from rest within 200ms at 60fps', () => {
    expect(run(REST, 480, 0, 50, 1000 / 60).state.vx).toBeLessThan(432);
    expect(run(REST, 480, 0, 200, 1000 / 60).state.vx).toBeGreaterThanOrEqual(432);
  });

  test('glides to rest instead of stopping dead', () => {
    const cruising: FlightState = { vx: 480, vy: 0, bank: 1 };
    expect(run(cruising, 0, 0, 80, 1000 / 60).state.vx).toBeGreaterThan(120);
    expect(Math.abs(run(cruising, 0, 0, 350, 1000 / 60).state.vx)).toBeLessThan(24);
  });

  test('is frame-rate independent', () => {
    const results = [1000 / 120, 1000 / 60, 1000 / 30].map((dt) => {
      const accelerate = run(REST, 480, 0, 500, dt);
      const release = run(accelerate.state, 0, 0, 500, dt);
      return { vx: release.state.vx, distance: accelerate.distanceX + release.distanceX };
    });
    const reference = results[1]!;
    for (const result of results) {
      expect(Math.abs(result.distance - reference.distance) / reference.distance).toBeLessThan(0.02);
      expect(Math.abs(result.vx - reference.vx)).toBeLessThan(1);
    }
  });

  test('zero, negative, or NaN delta returns an equal state', () => {
    const state: FlightState = { vx: 120, vy: -40, bank: 0.3 };
    for (const dt of [0, -5, Number.NaN]) {
      expect(stepFlight(state, 480, 0, dt, FLIGHT_CONFIG)).toEqual(state);
    }
  });

  test('never exceeds maxSpeed in magnitude', () => {
    const { state } = run(REST, 10000, 10000, 2000, 1000 / 60);
    expect(Math.hypot(state.vx, state.vy)).toBeLessThanOrEqual(480 + 1e-6);
  });

  test('bank follows lateral velocity and settles after release', () => {
    const banked = run(REST, 480, 0, 1000, 1000 / 60).state;
    expect(banked.bank).toBeGreaterThan(0.95);
    expect(banked.bank).toBeLessThanOrEqual(1);
    const settled = run(banked, 0, 0, 600, 1000 / 60).state;
    expect(Math.abs(settled.bank)).toBeLessThan(0.05);
  });

  test('keyboardDesiredVelocity normalizes diagonals', () => {
    const diagonal = keyboardDesiredVelocity(1, -1, 480);
    expect(Math.hypot(diagonal.vx, diagonal.vy)).toBeCloseTo(480, 6);
    expect(keyboardDesiredVelocity(0, 0, 480)).toEqual({ vx: 0, vy: 0 });
    expect(keyboardDesiredVelocity(-1, 0, 480)).toEqual({ vx: -480, vy: 0 });
  });
});
