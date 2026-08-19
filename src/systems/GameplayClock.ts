export class GameplayClock {
  private elapsedMs = 0;
  private lastDeltaMs = 0;

  reset(): void {
    this.elapsedMs = 0;
    this.lastDeltaMs = 0;
  }

  advance(deltaMs: number): void {
    const nextDelta = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    this.lastDeltaMs = nextDelta;
    this.elapsedMs += nextDelta;
  }

  get now(): number {
    return this.elapsedMs;
  }

  get delta(): number {
    return this.lastDeltaMs;
  }
}
