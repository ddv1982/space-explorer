import type { createGameFeelProbes } from './gameFeelProbes';
import type { createCombatPolishProbes } from './combatPolishProbes';

import type { BrowserHarnessSnapshot } from './snapshot';
import type { createShipyardProbes } from './shipyardProbes';
import type { createEffectsProbes } from './effectsProbes';
import type { createProceduralBackgroundProbes } from './proceduralBackgroundProbes';

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

export interface BrowserHarnessVisualPilotEntity {
  textureKey: string;
  active: boolean;
  x: number;
  y: number;
  displayScale: number;
  logicalWidth: number;
  logicalHeight: number;
  sourceCanvasWidth: number;
  sourceCanvasHeight: number;
  sourceIsCanvas: boolean;
}

export interface BrowserHarnessVisualPilotEvidence {
  filterCount: number;
  sectionId: string;
  motionPhase: number;
  qualityTier: string;
  entities: BrowserHarnessVisualPilotEntity[];
}

export interface BrowserHarnessFramePacingProbe {
  sampleCount: number;
  warmupFrames: number;
  syntheticUpdateWorkMs: number;
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

export interface BrowserHarnessApi
  extends
    ReturnType<typeof createShipyardProbes>,
    ReturnType<typeof createEffectsProbes>,
    ReturnType<typeof createProceduralBackgroundProbes> {
  combatPolish: ReturnType<typeof createCombatPolishProbes>;
  gameFeel: ReturnType<typeof createGameFeelProbes>;
  destroyGame: () => void;
  snapshot: () => BrowserHarnessSnapshot;
  waitForRender: () => Promise<void>;
  probeArcadeOverlap: () => Promise<boolean>;
  probeAcceptedPlayerDamage: (amount?: number) => { beforeHp: number; afterHp: number; damage: number };
  setAudioResumeRequestsEnabled: (enabled: boolean) => void;
  suspendAudioContextForPolicyTest: () => Promise<void>;
  probeFramePacing: (
    sampleCount?: number,
    options?: { warmupFrames?: number; syntheticUpdateWorkMs?: number }
  ) => Promise<BrowserHarnessFramePacingProbe>;
  showLaneReadingPilot: (
    glowEnabled?: boolean,
    hazardType?: 'ring-crossfire' | 'debris-surge'
  ) => BrowserHarnessVisualPilotEvidence;
  measureLaneReadingPilotRenderCost: () => Promise<BrowserHarnessVisualPilotMetrics>;
  finishLevelIntro: () => void;
  showPlanetIntermission: (level: number) => Promise<{ level: number; planetName: string }>;
  route: (key: string) => Promise<void>;
}
