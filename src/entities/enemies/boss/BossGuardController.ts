export interface BossGuardState {
  capacity: number;
  value: number;
  lastHitAt: number;
  broken: boolean;
  brokenUntil: number;
}

export function applyBossGuardHit(
  state: BossGuardState,
  amount: number,
  time: number,
): BossGuardState & { shouldBreak: boolean } {
  if (state.capacity <= 0 || state.broken || amount <= 0) {
    return { ...state, shouldBreak: false };
  }
  const value = Math.min(state.capacity, state.value + amount);
  return {
    ...state,
    value,
    lastHitAt: time,
    shouldBreak: value >= state.capacity,
  };
}

export function advanceBossGuard(
  state: BossGuardState,
  options: { time: number; delta: number; decayDelayMs: number; decayPerSecond: number },
): BossGuardState & { frozen: boolean; recovered: boolean } {
  if (state.broken && options.time < state.brokenUntil) {
    return { ...state, frozen: true, recovered: false };
  }
  if (state.broken) {
    return {
      ...state,
      value: 0,
      lastHitAt: Number.NEGATIVE_INFINITY,
      broken: false,
      frozen: false,
      recovered: true,
    };
  }
  const shouldDecay = state.capacity > 0
    && state.value > 0
    && options.time > state.lastHitAt + options.decayDelayMs;
  return {
    ...state,
    value: shouldDecay
      ? Math.max(0, state.value - options.decayPerSecond * (Math.max(0, options.delta) / 1000))
      : state.value,
    frozen: false,
    recovered: false,
  };
}
