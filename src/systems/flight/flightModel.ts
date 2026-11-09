export interface FlightState {
  vx: number;
  vy: number;
  /** -1 is full left bank, 1 is full right bank. */
  bank: number;
}

export interface FlightParams {
  maxSpeed: number;
  responseMs: number;
  glideMs: number;
  bankResponseMs: number;
}

function approach(current: number, target: number, dtMs: number, tauMs: number): number {
  return current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
}

function axisTimeConstant(current: number, desired: number, params: FlightParams): number {
  const speedingUp = Math.abs(desired) >= Math.abs(current) && Math.sign(desired) * Math.sign(current) >= 0;
  return speedingUp ? params.responseMs : params.glideMs;
}

/** Advances momentum flight by one frame. Pure and frame-rate independent. */
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

  let vx = approach(state.vx, desiredVx, dtMs, axisTimeConstant(state.vx, desiredVx, params));
  let vy = approach(state.vy, desiredVy, dtMs, axisTimeConstant(state.vy, desiredVy, params));
  const speed = Math.hypot(vx, vy);
  if (speed > params.maxSpeed) {
    const scale = params.maxSpeed / speed;
    vx *= scale;
    vy *= scale;
  }

  const targetBank = Math.max(-1, Math.min(1, vx / params.maxSpeed));
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
