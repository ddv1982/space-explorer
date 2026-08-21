import Phaser from 'phaser';

import { createBrowserHarnessGameplayProbes } from './browserHarness/gameplayProbes';
import { createBrowserHarnessNavigation } from './browserHarness/navigation';
import {
  BrowserHarnessPerformanceProbes,
  type BrowserHarnessAudioContextManager,
} from './browserHarness/performanceProbes';
import { BrowserHarnessRuntimeControls } from './browserHarness/runtimeControls';
import { createBrowserHarnessSnapshot } from './browserHarness/snapshot';
import type { BrowserHarnessApi } from './browserHarness/types';
import { BrowserHarnessVisualPilot } from './browserHarness/visualPilot';
import { audioManager, type AudioManager } from './systems/AudioManager';
import { runtimePerformanceBudget } from './systems/RuntimePerformanceBudget';

export type { BrowserHarnessSnapshot } from './browserHarness/snapshot';
export type * from './browserHarness/types';

const HARNESS_GLOBAL = '__SPACE_EXPLORER_BROWSER_HARNESS__';

declare global {
  interface Window {
    __SPACE_EXPLORER_BROWSER_HARNESS__?: BrowserHarnessApi;
  }
}

function createBrowserHarnessApi(game: Phaser.Game): BrowserHarnessApi {
  let frameCount = 0;
  let totalDelta = 0;
  let maxDelta = 0;
  let originalLaserSfx: AudioManager['playLaser'] | null = null;
  const harnessAudioContextManager = (audioManager as unknown as { contextManager: BrowserHarnessAudioContextManager })
    .contextManager;
  let originalAudioResume: BrowserHarnessAudioContextManager['resume'] | null = null;
  const visualPilot = new BrowserHarnessVisualPilot(game);
  const navigation = createBrowserHarnessNavigation(game);
  const gameplayProbes = createBrowserHarnessGameplayProbes(game);
  const performanceProbes = new BrowserHarnessPerformanceProbes(game, audioManager, harnessAudioContextManager);
  const runtimeControls = new BrowserHarnessRuntimeControls(game);
  const recordFrame = (_time: number, delta: number): void => {
    frameCount += 1;
    totalDelta += delta;
    maxDelta = Math.max(maxDelta, delta);
  };
  game.events.on(Phaser.Core.Events.STEP, recordFrame);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    game.events.off(Phaser.Core.Events.STEP, recordFrame);
  });

  const api: BrowserHarnessApi = {
    destroyGame: () => game.destroy(true),
    snapshot: () => createBrowserHarnessSnapshot(game),
    getFrameMetrics: () =>
      Object.freeze({
        frameCount,
        averageDelta: frameCount > 0 ? totalDelta / frameCount : 0,
        maxDelta,
      }),
    resetFrameMetrics: () => {
      frameCount = 0;
      totalDelta = 0;
      maxDelta = 0;
    },
    setFpsLimit: (limit: number) => {
      game.loop.setFPSLimit(limit);
    },
    setPlayerBulletTrailEmissionEnabled: (enabled: boolean) =>
      runtimeControls.setPlayerBulletTrailEmissionEnabled(enabled),
    setProjectileTrailIntervals: (playerMs: number, enemyMs: number) =>
      runtimeControls.setProjectileTrailIntervals(playerMs, enemyMs),
    stageProjectileTrailEvidence: () => runtimeControls.stageProjectileTrailEvidence(),
    setAudioResumeRequestsEnabled: (enabled: boolean) => {
      if (!enabled && !originalAudioResume) {
        originalAudioResume = harnessAudioContextManager.resume;
        harnessAudioContextManager.resume = (): void => undefined;
      } else if (enabled && originalAudioResume) {
        harnessAudioContextManager.resume = originalAudioResume;
        originalAudioResume = null;
      }
    },
    suspendAudioContextForPolicyTest: async () => {
      const context = harnessAudioContextManager.getCtx();
      if (!context || context.state === 'closed') throw new Error('Browser harness audio context is unavailable');
      if (audioManager.getPauseReasons().length > 0) {
        throw new Error('Browser harness cannot stage policy suspension while an application pause is active');
      }
      if (context.state === 'running') await context.suspend();
    },
    setLaserSfxEnabled: (enabled: boolean) => {
      if (!enabled && !originalLaserSfx) {
        originalLaserSfx = audioManager.playLaser;
        audioManager.playLaser = (): void => undefined;
      } else if (enabled && originalLaserSfx) {
        audioManager.playLaser = originalLaserSfx;
        originalLaserSfx = null;
      }
    },
    probeFramePacing: (sampleCount, options) => performanceProbes.probeFramePacing(sampleCount, options),
    probeFrameDelivery: (sampleCount) => performanceProbes.probeFrameDelivery(sampleCount),
    getRuntimePerformanceSnapshot: () => runtimePerformanceBudget.getSnapshot(),
    ...gameplayProbes,
    showLaneReadingPilot: (glowEnabled = true) => visualPilot.show(glowEnabled),
    measureLaneReadingPilotRenderCost: () => visualPilot.measureRenderCost(),
    ...navigation,
  };
  return Object.freeze(api);
}

export function installBrowserHarness(game: Phaser.Game): void {
  if (!window[HARNESS_GLOBAL]) window[HARNESS_GLOBAL] = createBrowserHarnessApi(game);
}
