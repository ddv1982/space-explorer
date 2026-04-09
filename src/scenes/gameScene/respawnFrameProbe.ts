const RESPAWN_FRAME_PROBE_QUERY_PARAM = 'debugRespawnFrameProbe';
const RESPAWN_FRAME_PROBE_GLOBAL_FLAG = '__SPACE_EXPLORER_RESPAWN_FRAME_PROBE__';

type RespawnProbeOutcome = 'respawned' | 'cancelled';

export function resolveRespawnFrameProbeEnabled(): boolean {
  const globalFlag = (globalThis as Record<string, unknown>)[RESPAWN_FRAME_PROBE_GLOBAL_FLAG];
  if (typeof globalFlag === 'boolean') {
    return globalFlag;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const queryValue = new URLSearchParams(window.location.search).get(RESPAWN_FRAME_PROBE_QUERY_PARAM);
  return queryValue === '1' || queryValue === 'true';
}

export class RespawnFrameProbe {
  private enabled = false;
  private active = false;
  private startTimeMs = 0;
  private sampleCount = 0;
  private totalDeltaMs = 0;
  private minDeltaMs = Number.POSITIVE_INFINITY;
  private maxDeltaMs = 0;
  private overBudget16Count = 0;
  private overBudget33Count = 0;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.active = false;
    }
  }

  abort(): void {
    this.active = false;
  }

  begin(startTimeMs: number): void {
    if (!this.enabled) {
      return;
    }

    this.active = true;
    this.startTimeMs = startTimeMs;
    this.sampleCount = 0;
    this.totalDeltaMs = 0;
    this.minDeltaMs = Number.POSITIVE_INFINITY;
    this.maxDeltaMs = 0;
    this.overBudget16Count = 0;
    this.overBudget33Count = 0;
  }

  sampleFrame(deltaMs: number): void {
    if (!this.active) {
      return;
    }

    const clampedDelta = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    this.sampleCount += 1;
    this.totalDeltaMs += clampedDelta;
    this.minDeltaMs = Math.min(this.minDeltaMs, clampedDelta);
    this.maxDeltaMs = Math.max(this.maxDeltaMs, clampedDelta);

    if (clampedDelta > 16.67) {
      this.overBudget16Count += 1;
    }

    if (clampedDelta > 33.33) {
      this.overBudget33Count += 1;
    }
  }

  finish(outcome: RespawnProbeOutcome, endTimeMs: number): void {
    if (!this.active) {
      return;
    }

    this.active = false;

    const transitionDurationMs = Math.max(0, endTimeMs - this.startTimeMs);
    const averageDeltaMs = this.sampleCount > 0 ? this.totalDeltaMs / this.sampleCount : 0;
    const minimumDeltaMs = this.sampleCount > 0 ? this.minDeltaMs : 0;

    console.debug(
      `[respawn-probe] outcome=${outcome} transitionMs=${transitionDurationMs.toFixed(1)} frames=${this.sampleCount} avgMs=${averageDeltaMs.toFixed(2)} minMs=${minimumDeltaMs.toFixed(2)} maxMs=${this.maxDeltaMs.toFixed(2)} over16=${this.overBudget16Count} over33=${this.overBudget33Count}`
    );
  }
}
