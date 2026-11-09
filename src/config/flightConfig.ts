import type { FlightParams } from '../systems/flight/flightModel';

/**
 * Inertial flight feel, matched to the v1.19 handling the user preferred: 800 px/s² thrust and
 * 400 px/s² drag, so the ship takes about a second to reach full speed and slides after release.
 */
export const FLIGHT_CONFIG: FlightParams = {
  maxSpeed: 800,
  acceleration: 800,
  drag: 400,
  bankFullSpeed: 480,
  bankResponseMs: 120,
};
