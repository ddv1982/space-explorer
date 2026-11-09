export interface FlightState {
  vx: number;
  vy: number;
  /** -1 is full left bank, 1 is full right bank. */
  bank: number;
}

export interface FlightParams {
  maxSpeed: number;
  /** px/s² the thrusters change velocity by while the pilot steers (including reversals). */
  acceleration: number;
  /** px/s² the ship sheds once the pilot lets go, so it coasts to rest. */
  drag: number;
  /** Lateral speed that shows the full bank frame. */
  bankFullSpeed: number;
  bankResponseMs: number;
}

function approach(current: number, target: number, dtMs: number, tauMs: number): number {
  return current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
}

/**
 * Advances inertial flight by one frame: velocity moves toward the desired velocity at a fixed
 * thrust (or drag, once released), like the Arcade acceleration/drag handling of v1.19.
 * Pure and frame-rate independent.
 */
export function stepFlight(
  state: FlightState,
  desiredVx: number,
  desiredVy: number,
  dtMs: number,
  params: FlightParams
): FlightState {
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return { ...state };
  }

  const steering = desiredVx !== 0 || desiredVy !== 0;
  const maxChange = ((steering ? params.acceleration : params.drag) * dtMs) / 1000;
  const errorX = desiredVx - state.vx;
  const errorY = desiredVy - state.vy;
  const error = Math.hypot(errorX, errorY);
  let vx = desiredVx;
  let vy = desiredVy;
  if (error > maxChange) {
    vx = state.vx + (errorX / error) * maxChange;
    vy = state.vy + (errorY / error) * maxChange;
  }
  const speed = Math.hypot(vx, vy);
  if (speed > params.maxSpeed) {
    const scale = params.maxSpeed / speed;
    vx *= scale;
    vy *= scale;
  }

  const targetBank = Math.max(-1, Math.min(1, vx / params.bankFullSpeed));
  const bank = Math.max(-1, Math.min(1, approach(state.bank, targetBank, dtMs, params.bankResponseMs)));
  return { vx, vy, bank };
}

export function keyboardDesiredVelocity(
  horizontal: -1 | 0 | 1,
  vertical: -1 | 0 | 1,
  maxSpeed: number
): { vx: number; vy: number } {
  if (horizontal === 0 && vertical === 0) {
    return { vx: 0, vy: 0 };
  }
  const scale = horizontal !== 0 && vertical !== 0 ? Math.SQRT1_2 : 1;
  return { vx: horizontal * maxSpeed * scale, vy: vertical * maxSpeed * scale };
}
