import type { FlightParams } from '../systems/flight/flightModel';

/**
 * Momentum flight feel. `responseMs` and `glideMs` are exponential time constants:
 * the ship reaches ~90% of a new speed after ~2.3× `responseMs` and coasts to ~5%
 * after ~3× `glideMs` once input is released. Tuned with the user during the v2 playtest.
 */
export const FLIGHT_CONFIG: FlightParams = {
  maxSpeed: 480,
  responseMs: 70,
  glideMs: 110,
  bankResponseMs: 90,
};
