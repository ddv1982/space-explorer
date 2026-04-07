interface PerformancePolicy {
  qualityScale: number;
  lowPerformanceMode: boolean;
  burstScale: number;
  motionUpdateStride: number;
}

interface DeviceSnapshot {
  cpuCores: number;
  memoryGb: number;
  pixelBudget: number;
}

interface SustainedFpsFallbackConfig {
  graceMs: number;
  sampleWindowMs: number;
  lowFpsThreshold: number;
  recoverFpsThreshold: number;
  requiredLowSamples: number;
}

const DEFAULT_FPS_FALLBACK_CONFIG: SustainedFpsFallbackConfig = {
  graceMs: 5000,
  sampleWindowMs: 1800,
  lowFpsThreshold: 52,
  recoverFpsThreshold: 56,
  requiredLowSamples: 2,
};

export class SustainedFpsFallbackGate {
  private readonly config: SustainedFpsFallbackConfig;
  private graceElapsed = 0;
  private sampleElapsed = 0;
  private lowSampleStreak = 0;
  private triggered = false;

  constructor(config?: Partial<SustainedFpsFallbackConfig>) {
    this.config = {
      ...DEFAULT_FPS_FALLBACK_CONFIG,
      ...config,
    };
  }

  reset(): void {
    this.graceElapsed = 0;
    this.sampleElapsed = 0;
    this.lowSampleStreak = 0;
    this.triggered = false;
  }

  update(deltaMs: number, fps: number): boolean {
    if (this.triggered || !Number.isFinite(fps) || fps <= 0) {
      return false;
    }

    this.graceElapsed += deltaMs;
    if (this.graceElapsed < this.config.graceMs) {
      return false;
    }

    this.sampleElapsed += deltaMs;
    if (this.sampleElapsed < this.config.sampleWindowMs) {
      return false;
    }

    if (fps < this.config.lowFpsThreshold) {
      this.lowSampleStreak += 1;
    } else if (fps > this.config.recoverFpsThreshold) {
      this.lowSampleStreak = 0;
    }

    this.sampleElapsed = 0;

    if (this.lowSampleStreak < this.config.requiredLowSamples) {
      return false;
    }

    this.triggered = true;
    return true;
  }
}

export function resolvePerformancePolicy(width: number, height: number): PerformancePolicy {
  const snapshot = readDeviceSnapshot(width, height);

  if (snapshot.cpuCores <= 4 || snapshot.memoryGb <= 4 || snapshot.pixelBudget > 1920 * 1080) {
    return {
      qualityScale: 0.72,
      lowPerformanceMode: true,
      burstScale: 0.86,
      motionUpdateStride: 2,
    };
  }

  if (snapshot.cpuCores <= 6 || snapshot.memoryGb <= 6) {
    return {
      qualityScale: 0.85,
      lowPerformanceMode: false,
      burstScale: 0.94,
      motionUpdateStride: 1,
    };
  }

  return {
    qualityScale: 1,
    lowPerformanceMode: false,
    burstScale: 1,
    motionUpdateStride: 1,
  };
}

function readDeviceSnapshot(width: number, height: number): DeviceSnapshot {
  const pixelBudget = Math.max(1, Math.floor(width * height));

  if (typeof window === 'undefined') {
    return {
      cpuCores: 8,
      memoryGb: 8,
      pixelBudget,
    };
  }

  const nav = window.navigator as Navigator & { deviceMemory?: number };

  return {
    cpuCores: nav.hardwareConcurrency ?? 8,
    memoryGb: nav.deviceMemory ?? 8,
    pixelBudget,
  };
}
