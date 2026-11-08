import type { HazardBeamLaunchConfig } from '../../src/entities/HazardBeam';
import { FLIGHT_CONFIG } from '../../src/config/flightConfig';
import { stepFlight, type FlightState } from '../../src/systems/flight/flightModel';
import { dragDesiredVelocity } from '../../src/systems/input/relativeDrag';

const REACTION_MS = 250;
const PLAYER_HALF_WIDTH = 12;
const PLAYER_HALF_HEIGHT = 16;
const CLEARANCE = 4;

export function proveLowerBeamRoute(input: {
  width: number;
  height: number;
  x: number;
  y: number;
  beams: HazardBeamLaunchConfig[];
}): { safe: boolean; escapedAtMs: number | null } {
  const flare = input.beams[0];
  if (!flare) throw new Error('Route proof requires a flare');
  let targetX = input.x;
  for (const beam of input.beams.slice(1)) {
    if (beam.height < input.height) continue;
    const left = beam.x - beam.width / 2 - PLAYER_HALF_WIDTH - CLEARANCE;
    const right = beam.x + beam.width / 2 + PLAYER_HALF_WIDTH + CLEARANCE;
    if (targetX > left && targetX < right) {
      targetX = targetX - left < right - targetX ? left : right;
    }
  }
  const escapeY = flare.y + flare.height / 2 + PLAYER_HALF_HEIGHT + CLEARANCE;
  const targetY = Math.max(input.y, escapeY + 2);
  const dx = targetX - input.x;
  const dy = targetY - input.y;
  const distance = Math.hypot(dx, dy);
  let travelled = 0;
  let flight: FlightState = { vx: 0, vy: 0, bank: 0 };
  let escapedAtMs: number | null = null;
  const stepMs = 1000 / 240;
  for (let time = 0; time < 12000; time += stepMs) {
    if (time >= REACTION_MS && travelled < distance) {
      // Steer toward the escape point the way a drag player does, through the real flight model.
      const desired = dragDesiredVelocity(travelled, 0, distance, 0, FLIGHT_CONFIG.maxSpeed);
      flight = stepFlight(flight, desired.vx, 0, stepMs, FLIGHT_CONFIG);
      travelled = Math.min(distance, Math.max(0, travelled + (flight.vx * stepMs) / 1000));
    }
    const fraction = distance === 0 ? 1 : travelled / distance;
    const x = input.x + dx * fraction;
    const y = input.y + dy * fraction;
    if (y >= escapeY && escapedAtMs === null) escapedAtMs = time;
    if (x < PLAYER_HALF_WIDTH || x > input.width - PLAYER_HALF_WIDTH || y > input.height - PLAYER_HALF_HEIGHT) {
      return { safe: false, escapedAtMs };
    }
    for (const beam of input.beams) {
      if (time < beam.telegraphMs || time >= beam.telegraphMs + beam.activeMs) continue;
      const beamX = beam.x + ((beam.velocityX ?? 0) * (time - beam.telegraphMs)) / 1000;
      if (
        Math.abs(x - beamX) < beam.width / 2 + PLAYER_HALF_WIDTH &&
        Math.abs(y - beam.y) < beam.height / 2 + PLAYER_HALF_HEIGHT
      ) {
        return { safe: false, escapedAtMs };
      }
    }
  }
  return { safe: true, escapedAtMs };
}
