import { getVisualQualityTier } from '@/config/visualQuality';

export interface RuntimePerformanceSnapshot {
  enabled: boolean;
  pressureLevel: number;
  particleScale: number;
  trailIntervalScale: number;
  backgroundLayerLimit: number;
  glowEnabled: boolean;
  sampleCount: number;
  droppedFrameRatio: number;
}

const LEVELS = [
  { particleScale: 1, trailIntervalScale: 1, backgroundLayerLimit: 3, glowEnabled: true },
  { particleScale: 0.78, trailIntervalScale: 1.35, backgroundLayerLimit: 3, glowEnabled: false },
  { particleScale: 0.58, trailIntervalScale: 1.75, backgroundLayerLimit: 2, glowEnabled: false },
  { particleScale: 0.42, trailIntervalScale: 2.25, backgroundLayerLimit: 2, glowEnabled: false },
] as const;

const SAMPLE_WINDOW = 120;
const DEGRADE_RATIO = 0.12;
const RECOVER_RATIO = 0.025;
const RECOVERY_WINDOWS = 4;

export class RuntimePerformanceBudget {
  private pressureLevel = 0;
  private samples: boolean[] = [];
  private recoveryWindows = 0;
  private droppedFrameRatio = 0;
  private cachedSnapshot: RuntimePerformanceSnapshot;
  private listeners = new Set<(snapshot: RuntimePerformanceSnapshot) => void>();

  constructor(private readonly enabledResolver: () => boolean = () => getVisualQualityTier() === 'auto') {
    this.cachedSnapshot = this.buildSnapshot();
  }

  isEnabled(): boolean {
    return this.enabledResolver();
  }

  sampleFrame(deltaMs: number): void {
    if (!this.isEnabled() || !Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 250) return;
    this.samples.push(deltaMs > 22);
    if (this.samples.length < SAMPLE_WINDOW) {
      this.cachedSnapshot = this.buildSnapshot();
      return;
    }

    const dropped = this.samples.filter(Boolean).length;
    this.droppedFrameRatio = dropped / this.samples.length;
    this.samples = [];

    if (this.droppedFrameRatio >= DEGRADE_RATIO && this.pressureLevel < LEVELS.length - 1) {
      this.pressureLevel += 1;
      this.recoveryWindows = 0;
      this.emit();
      return;
    }

    if (this.droppedFrameRatio <= RECOVER_RATIO && this.pressureLevel > 0) {
      this.recoveryWindows += 1;
      if (this.recoveryWindows >= RECOVERY_WINDOWS) {
        this.pressureLevel -= 1;
        this.recoveryWindows = 0;
        this.emit();
      }
    } else {
      this.recoveryWindows = 0;
    }

    this.cachedSnapshot = this.buildSnapshot();
  }

  reset(): void {
    const changed = this.pressureLevel !== 0;
    this.pressureLevel = 0;
    this.samples = [];
    this.recoveryWindows = 0;
    this.droppedFrameRatio = 0;
    if (changed) this.emit();
    else this.cachedSnapshot = this.buildSnapshot();
  }

  getSnapshot(): RuntimePerformanceSnapshot {
    if (this.cachedSnapshot.enabled !== this.isEnabled()) {
      this.cachedSnapshot = this.buildSnapshot();
    }
    return this.cachedSnapshot;
  }

  private buildSnapshot(): RuntimePerformanceSnapshot {
    const enabled = this.isEnabled();
    const level = enabled ? LEVELS[this.pressureLevel] : LEVELS[0];
    return Object.freeze({
      enabled,
      pressureLevel: enabled ? this.pressureLevel : 0,
      ...level,
      sampleCount: this.samples.length,
      droppedFrameRatio: this.droppedFrameRatio,
    });
  }

  subscribe(listener: (snapshot: RuntimePerformanceSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  primeForEnvironment(options: { backingPixelCount: number; reducedMotion: boolean }): void {
    if (!this.isEnabled() || this.pressureLevel !== 0 || this.samples.length > 0) return;
    if (options.reducedMotion || options.backingPixelCount > 2_000_000) {
      this.pressureLevel = 1;
      this.emit();
    }
  }

  private emit(): void {
    this.cachedSnapshot = this.buildSnapshot();
    const snapshot = this.cachedSnapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const runtimePerformanceBudget = new RuntimePerformanceBudget();

export function scaleRuntimeParticleQuantity(quantity: number): number {
  return Math.max(1, Math.round(quantity * runtimePerformanceBudget.getSnapshot().particleScale));
}

export function getRuntimeTrailInterval(baseIntervalMs: number): number {
  return baseIntervalMs * runtimePerformanceBudget.getSnapshot().trailIntervalScale;
}

export function shouldRenderRuntimeSecondaryEffects(): boolean {
  return runtimePerformanceBudget.getSnapshot().pressureLevel < 2;
}
