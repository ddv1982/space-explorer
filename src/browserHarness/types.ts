import type { RuntimePerformanceSnapshot } from '@/systems/RuntimePerformanceBudget';

import type { BrowserHarnessSnapshot } from './snapshot';

export interface BrowserHarnessFrameMetrics {
  frameCount: number;
  averageDelta: number;
  maxDelta: number;
}

export interface BrowserHarnessRenderCost {
  averageMs: number;
  p95Ms: number;
  sampleCount: number;
}

export interface BrowserHarnessVisualPilotMetrics {
  baseline: BrowserHarnessRenderCost;
  glow: BrowserHarnessRenderCost;
  averageRegressionMs: number;
  p95RegressionMs: number;
}

export interface BrowserHarnessFramePacingProbe {
  sampleCount: number;
  averageMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  over16_67MsCount: number;
  over33_33MsCount: number;
  workCost: Readonly<{ update: BrowserHarnessRenderCost; renderSubmission: BrowserHarnessRenderCost }>;
  runtimeLoad: Readonly<{
    activeTexturedObjectCount: number;
    activePhysicsBodyCount: number;
    activeParticleCount: number;
    activePlayerBulletCount: number;
    activeEnemyBulletCount: number;
    particleEmitterCount: number;
    tweenCount: number;
    effectEventCount: Readonly<{
      playerExhaust: number;
      playerBulletTrail: number;
      enemyBulletTrail: number;
    }>;
    musicIntensityRequestCount: number;
    audioResumeRequestCount: number;
    laserRequestCount: number;
  }>;
}

export interface BrowserHarnessFrameDeliveryProbe {
  sampleCount: number;
  averageMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  cadenceDropThresholdMs: number;
  cadenceDropCount: number;
  cadenceDropRatio: number;
  over33_33MsCount: number;
}

export interface BrowserHarnessApi {
  destroyGame: () => void;
  snapshot: () => BrowserHarnessSnapshot;
  probeArcadeOverlap: () => Promise<boolean>;
  probePlayerHitTint: () => Promise<{ duringMode: number; afterMode: number }>;
  probeAcceptedPlayerDamage: (amount?: number) => { beforeHp: number; afterHp: number; damage: number };
  getFrameMetrics: () => BrowserHarnessFrameMetrics;
  resetFrameMetrics: () => void;
  setFpsLimit: (limit: number) => void;
  setPlayerBulletTrailEmissionEnabled: (enabled: boolean) => number;
  setProjectileTrailIntervals: (playerMs: number, enemyMs: number) => void;
  stageProjectileTrailEvidence: () => { playerCount: number; enemyCount: number };
  setAudioResumeRequestsEnabled: (enabled: boolean) => void;
  setLaserSfxEnabled: (enabled: boolean) => void;
  probeFramePacing: (sampleCount?: number) => Promise<BrowserHarnessFramePacingProbe>;
  probeFrameDelivery: (sampleCount?: number) => Promise<BrowserHarnessFrameDeliveryProbe>;
  getRuntimePerformanceSnapshot: () => RuntimePerformanceSnapshot;
  showLaneReadingPilot: (glowEnabled?: boolean) => { filterCount: number; sectionId: string };
  measureLaneReadingPilotRenderCost: () => Promise<BrowserHarnessVisualPilotMetrics>;
  showPlanetIntermission: (level: number) => Promise<{ level: number; planetName: string }>;
  route: (key: string) => Promise<void>;
}
