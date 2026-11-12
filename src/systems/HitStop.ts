/** How long each big moment freezes gameplay, in real milliseconds. */
export const HIT_STOP_MS = {
  aceKill: 40,
  playerHullHit: 50,
  bossGuardBreak: 60,
  bossPhaseChange: 70,
  bossDefeat: 100,
} as const;

/** The Arcade world controls a hit-stop needs. */
export interface HitStopPhysics {
  isPaused(): boolean;
  pause(): void;
  resume(): void;
  /** True while another owner (the pause menu, the respawn pause) holds physics and will resume it. */
  isHeldElsewhere(): boolean;
}

/**
 * A brief freeze on big impacts. It uses the same machinery as the pause menu: the Arcade world is
 * paused (so it builds no time backlog to catch up on, and entities skip their behaviour) and the
 * scene skips gameplay frames, so the gameplay clock, player, enemies and their attack timers all stop
 * together. Music, input, the HUD and presentation tweens keep running.
 *
 * It never takes physics from another owner: a stop is ignored while the world is already paused, and
 * when it ends while the pause menu or the respawn pause holds physics it leaves resuming to that
 * owner. Locks that keep physics running (level complete, warp) do not delay the resume.
 */
export class HitStop {
  private remainingMs = 0;
  private holding = false;

  constructor(private readonly physics: HitStopPhysics) {}

  trigger(durationMs: number): void {
    if (!(durationMs > 0)) return;
    if (!this.holding) {
      if (this.physics.isPaused()) return;
      this.physics.pause();
      this.holding = true;
    }
    this.remainingMs = Math.max(this.remainingMs, durationMs);
  }

  /**
   * Spends this frame's real time and reports whether gameplay stays frozen. Once the stop has run
   * out it resumes physics, unless another owner holds physics by then; it then lets go on the first
   * frame after that owner is done, resuming only if the world is still paused.
   */
  advance(realDeltaMs: number): boolean {
    if (!this.holding) return false;
    this.remainingMs = Math.max(0, this.remainingMs - (Number.isFinite(realDeltaMs) ? realDeltaMs : 0));
    if (this.remainingMs > 0) return true;
    if (this.physics.isHeldElsewhere()) return false;
    if (this.physics.isPaused()) this.physics.resume();
    this.holding = false;
    return false;
  }

  isActive(): boolean {
    return this.holding;
  }

  /** Forgets any stop without touching physics, for a fresh scene whose world starts running. */
  reset(): void {
    this.remainingMs = 0;
    this.holding = false;
  }
}
