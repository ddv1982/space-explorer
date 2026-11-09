import type { FlightParams } from '../systems/flight/flightModel';

/**
 * Inertial flight feel: 1600 px/s² thrust so the ship answers the controls within half a second,
 * and the v1.19 400 px/s² drag so it still slides about 800 px after release.
 */
export const FLIGHT_CONFIG: FlightParams = {
  maxSpeed: 800,
  acceleration: 1600,
  drag: 400,
  bankFullSpeed: 480,
  bankResponseMs: 120,
};
