/** Gameplay runs at this fraction of real time during a hit-stop. */
export const HIT_STOP_TIME_SCALE = 0.15;

/** How long each big moment holds, in real milliseconds. */
export const HIT_STOP_MS = {
  aceKill: 50,
  playerHullHit: 60,
  bossGuardBreak: 70,
  bossPhaseChange: 80,
  bossDefeat: 110,
} as const;

/**
 * A brief slow-down on big impacts. It scales gameplay time only (the gameplay clock and the Arcade
 * world), so music, input, the HUD and presentation tweens keep real time. Overlapping stops extend to
 * the longest one instead of adding up.
 */
export class HitStop {
  private remainingMs = 0;

  constructor(
    /** Arcade's world time scale: 1 is normal, higher is slower. */
    private readonly setPhysicsTimeScale: (scale: number) => void,
    private readonly timeScale = HIT_STOP_TIME_SCALE
  ) {}

  trigger(durationMs: number): void {
    if (!(durationMs > 0)) return;
    if (this.remainingMs <= 0) this.setPhysicsTimeScale(1 / this.timeScale);
    this.remainingMs = Math.max(this.remainingMs, durationMs);
  }

  /** Turns this frame's real delta into gameplay delta, and ends the stop once its time has passed. */
  scaleDelta(realDeltaMs: number): number {
    if (this.remainingMs <= 0) return realDeltaMs;
    const slowedMs = Math.min(this.remainingMs, realDeltaMs);
    this.remainingMs -= realDeltaMs;
    if (this.remainingMs <= 0) this.reset();
    return realDeltaMs - slowedMs + slowedMs * this.timeScale;
  }

  isActive(): boolean {
    return this.remainingMs > 0;
  }

  reset(): void {
    this.remainingMs = 0;
    this.setPhysicsTimeScale(1);
  }
}
