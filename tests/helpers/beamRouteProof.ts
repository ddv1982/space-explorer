import type { HazardBeamLaunchConfig } from '../../src/entities/HazardBeam';
import { BEAM_HIT_FRACTION } from '../../src/entities/hazardBeamGeometry';
import { FLIGHT_CONFIG } from '../../src/config/flightConfig';
import { stepFlight, type FlightState } from '../../src/systems/flight/flightModel';
import { dragDesiredVelocity } from '../../src/systems/input/relativeDrag';

const REACTION_MS = 250;
const PLAYER_HALF_WIDTH = 12;
const PLAYER_HALF_HEIGHT = 16;
const CLEARANCE = 4;

/** The vertical opening between a sweeping flare's two segments. */
export function flareGap(beams: HazardBeamLaunchConfig[]): { top: number; bottom: number } {
  const segments = beams.filter((beam) => (beam.velocityX ?? 0) !== 0).sort((a, b) => a.y - b.y);
  const [upper, lower] = segments;
  if (!upper || !lower) throw new Error('Route proof requires a two-segment flare');
  return { top: upper.y + upper.height / 2, bottom: lower.y - lower.height / 2 };
}

/** Hurting half-width: vertical beams hurt across their core only, crossbeams across their length. */
function hitHalfWidth(beam: HazardBeamLaunchConfig): number {
  return (beam.height >= beam.width ? beam.width * BEAM_HIT_FRACTION : beam.width) / 2;
}

/** The widest opening between a lattice curtain's static full-height beams (null without a lattice). */
export function latticeGap(beams: HazardBeamLaunchConfig[], height: number): { left: number; right: number } | null {
  const walls = beams.filter((beam) => (beam.velocityX ?? 0) === 0 && beam.height >= height).sort((a, b) => a.x - b.x);
  let best: { left: number; right: number } | null = null;
  for (let index = 1; index < walls.length; index++) {
    const left = walls[index - 1]!.x + hitHalfWidth(walls[index - 1]!);
    const right = walls[index]!.x - hitHalfWidth(walls[index]!);
    if (!best || right - left > best.right - best.left) best = { left, right };
  }
  return best;
}

/**
 * Steers a drag pilot (250 ms reaction, real flight model) in a straight line into the flare's gap
 * (when there is a flare) and the lattice curtain's gap (when there is a lattice), and reports whether the ship touched a live beam.
 */
export function proveBeamRoute(input: {
  width: number;
  height: number;
  x: number;
  y: number;
  beams: HazardBeamLaunchConfig[];
}): { safe: boolean; inGapAtMs: number | null } {
  const hasFlare = input.beams.some((beam) => (beam.velocityX ?? 0) !== 0);
  const gap = hasFlare ? flareGap(input.beams) : { top: -Infinity, bottom: Infinity };
  const lattice = latticeGap(input.beams, input.height);
  const targetX = lattice
    ? Math.min(
        lattice.right - PLAYER_HALF_WIDTH - CLEARANCE,
        Math.max(lattice.left + PLAYER_HALF_WIDTH + CLEARANCE, input.x)
      )
    : input.x;
  const safeTop = gap.top + PLAYER_HALF_HEIGHT + CLEARANCE;
  const safeBottom = gap.bottom - PLAYER_HALF_HEIGHT - CLEARANCE;
  const targetY = Math.min(safeBottom - 2, Math.max(safeTop + 2, input.y));
  const dx = targetX - input.x;
  const dy = targetY - input.y;
  const distance = Math.hypot(dx, dy);
  let travelled = 0;
  let flight: FlightState = { vx: 0, vy: 0, bank: 0 };
  let inGapAtMs: number | null = null;
  const stepMs = 1000 / 240;
  for (let time = 0; time < 12000; time += stepMs) {
    if (time >= REACTION_MS) {
      // Steer toward the gap the way a drag player does, through the real flight model.
      const desired = dragDesiredVelocity(travelled, 0, distance, 0, FLIGHT_CONFIG.maxSpeed);
      flight = stepFlight(flight, desired.vx, 0, stepMs, FLIGHT_CONFIG);
      travelled += (flight.vx * stepMs) / 1000;
    }
    const fraction = distance === 0 ? 1 : travelled / distance;
    const x = input.x + dx * fraction;
    const y = input.y + dy * fraction;
    if (inGapAtMs === null && y >= safeTop - CLEARANCE && y <= safeBottom + CLEARANCE) inGapAtMs = time;
    if (x < PLAYER_HALF_WIDTH || x > input.width - PLAYER_HALF_WIDTH || y > input.height - PLAYER_HALF_HEIGHT) {
      return { safe: false, inGapAtMs };
    }
    for (const beam of input.beams) {
      if (time < beam.telegraphMs || time >= beam.telegraphMs + beam.activeMs) continue;
      const beamX = beam.x + ((beam.velocityX ?? 0) * (time - beam.telegraphMs)) / 1000;
      if (
        Math.abs(x - beamX) < hitHalfWidth(beam) + PLAYER_HALF_WIDTH &&
        Math.abs(y - beam.y) < beam.height / 2 + PLAYER_HALF_HEIGHT
      ) {
        return { safe: false, inGapAtMs };
      }
    }
  }
  return { safe: true, inGapAtMs };
}
