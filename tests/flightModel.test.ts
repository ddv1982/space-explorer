import { describe, expect, test } from 'bun:test';
import { FLIGHT_CONFIG } from '../src/config/flightConfig';
import { keyboardDesiredVelocity, stepFlight, type FlightState } from '../src/systems/flight/flightModel';
import { dragDesiredVelocity } from '../src/systems/input/relativeDrag';

const REST: FlightState = { vx: 0, vy: 0, bank: 0 };
const MAX = FLIGHT_CONFIG.maxSpeed;

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

describe('flightModel (v1.19 inertial handling)', () => {
  test('builds speed gradually: about a second from rest to full speed', () => {
    expect(run(REST, MAX, 0, 250, 1000 / 60).state.vx).toBeCloseTo(200, 0);
    expect(run(REST, MAX, 0, 500, 1000 / 60).state.vx).toBeCloseTo(400, 0);
    expect(run(REST, MAX, 0, 1000, 1000 / 60).state.vx).toBeCloseTo(MAX, 0);
  });

  test('slides after release: 400 px/s² drag, about 2 s and 800 px from full speed', () => {
    const cruising: FlightState = { vx: MAX, vy: 0, bank: 1 };
    const halfway = run(cruising, 0, 0, 1000, 1000 / 60);
    expect(halfway.state.vx).toBeCloseTo(400, 0);
    const stopped = run(cruising, 0, 0, 2100, 1000 / 60);
    expect(stopped.state.vx).toBe(0);
    expect(stopped.distanceX).toBeGreaterThan(780);
    expect(stopped.distanceX).toBeLessThan(820);
  });

  test('a reversal uses thrust, not drag', () => {
    const cruising: FlightState = { vx: 480, vy: 0, bank: 1 };
    expect(run(cruising, -MAX, 0, 600, 1000 / 60).state.vx).toBeCloseTo(0, 0);
  });

  test('is frame-rate independent', () => {
    const results = [1000 / 120, 1000 / 60, 1000 / 30].map((dt) => {
      const accelerate = run(REST, MAX, 0, 500, dt);
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

  test('never exceeds maxSpeed in magnitude, including diagonals', () => {
    const { state } = run(REST, 10000, 10000, 3000, 1000 / 60);
    expect(Math.hypot(state.vx, state.vy)).toBeLessThanOrEqual(MAX + 1e-6);
  });

  test('bank follows lateral velocity and settles after the ship stops', () => {
    const banked = run(REST, MAX, 0, 1000, 1000 / 60).state;
    expect(banked.bank).toBeGreaterThan(0.95);
    expect(banked.bank).toBeLessThanOrEqual(1);
    const settled = run(banked, 0, 0, 2800, 1000 / 60).state;
    expect(Math.abs(settled.bank)).toBeLessThan(0.05);
  });

  test('a drag pilot trails the finger and settles on it without a large overshoot', () => {
    let state = REST;
    let x = 0;
    let peak = 0;
    const dt = 1000 / 60;
    for (let i = 0; i < 240; i++) {
      const desired = dragDesiredVelocity(x, 0, 300, 0, MAX);
      state = stepFlight(state, desired.vx, 0, dt, FLIGHT_CONFIG);
      x += (state.vx * dt) / 1000;
      peak = Math.max(peak, x);
      if (i === 15) expect(x).toBeLessThan(120); // still trailing a quarter second in
    }
    expect(peak).toBeLessThan(306);
    expect(Math.abs(x - 300)).toBeLessThan(2);
  });

  test('keyboardDesiredVelocity normalizes diagonals', () => {
    const diagonal = keyboardDesiredVelocity(1, -1, 480);
    expect(Math.hypot(diagonal.vx, diagonal.vy)).toBeCloseTo(480, 6);
    expect(keyboardDesiredVelocity(0, 0, 480)).toEqual({ vx: 0, vy: 0 });
    expect(keyboardDesiredVelocity(-1, 0, 480)).toEqual({ vx: -480, vy: 0 });
  });
});
