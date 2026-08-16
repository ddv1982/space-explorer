import Phaser from 'phaser';
import { audioManager, type AudioManager } from './systems/AudioManager';
import { GAME_SCENE_EVENTS } from './systems/GameplayFlow';
import { runtimePerformanceBudget } from './systems/RuntimePerformanceBudget';
import { createBrowserHarnessSnapshot } from './browserHarness/snapshot';
import { createBrowserHarnessNavigation } from './browserHarness/navigation';
import { BrowserHarnessVisualPilot } from './browserHarness/visualPilot';
import { createBrowserHarnessGameplayProbes } from './browserHarness/gameplayProbes';
import { BrowserHarnessRuntimeControls } from './browserHarness/runtimeControls';
import type {
  BrowserHarnessApi,
  BrowserHarnessFrameDeliveryProbe,
  BrowserHarnessFramePacingProbe,
  BrowserHarnessRenderCost,
} from './browserHarness/types';

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
  type HarnessAudioContextManager = { resume(): void };
  const harnessAudioContextManager = (audioManager as unknown as { contextManager: HarnessAudioContextManager })
    .contextManager;
  let originalAudioResume: HarnessAudioContextManager['resume'] | null = null;
  let framePacingProbeActive = false;
  const visualPilot = new BrowserHarnessVisualPilot(game);
  const navigation = createBrowserHarnessNavigation(game);
  const gameplayProbes = createBrowserHarnessGameplayProbes(game);
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

  const summarizeFrameDelivery = (samples: number[]): BrowserHarnessFrameDeliveryProbe => {
    const sorted = [...samples].sort((a, b) => a - b);
    const percentile = (value: number): number => sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)] ?? 0;
    const p50Ms = percentile(0.5);
    // A delivered frame is considered dropped when it is much closer to two
    // refresh intervals than one. This adapts to 60/90/100/120 Hz displays.
    const cadenceDropThresholdMs = Math.max(p50Ms * 1.65, p50Ms + 4);
    const cadenceDropCount = samples.filter((sample) => sample > cadenceDropThresholdMs).length;

    return Object.freeze({
      sampleCount: samples.length,
      averageMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
      p50Ms,
      p95Ms: percentile(0.95),
      p99Ms: percentile(0.99),
      maxMs: sorted[sorted.length - 1] ?? 0,
      cadenceDropThresholdMs,
      cadenceDropCount,
      cadenceDropRatio: cadenceDropCount / samples.length,
      over33_33MsCount: samples.filter((sample) => sample > 33.33).length,
    });
  };

  let frameDeliveryProbeActive = false;
  const probeFrameDelivery = (sampleCount = 240): Promise<BrowserHarnessFrameDeliveryProbe> => {
    if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 1200) {
      throw new Error('Browser harness frame-delivery sample count must be between 1 and 1200');
    }

    const gameScene = game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game');
    if (!gameScene || !gameScene.sys.isActive()) {
      throw new Error('Browser harness cannot probe frame delivery without active gameplay');
    }
    if (frameDeliveryProbeActive) {
      throw new Error('Browser harness frame-delivery probe is already active');
    }

    frameDeliveryProbeActive = true;
    const activeGameScene = gameScene;
    return new Promise<BrowserHarnessFrameDeliveryProbe>((resolve, reject) => {
      const samples: number[] = [];
      let lastFrameAt: number | null = null;
      let animationFrame = 0;
      let settled = false;
      const timeout = window.setTimeout(
        () => finish(new Error('Browser harness frame-delivery probe timed out')),
        Math.max(15_000, sampleCount * 250)
      );

      function cleanup(): void {
        window.clearTimeout(timeout);
        window.cancelAnimationFrame(animationFrame);
        game.events.off(Phaser.Core.Events.DESTROY, onDestroy);
        frameDeliveryProbeActive = false;
      }
      function finish(error?: Error): void {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) {
          reject(error);
        } else {
          resolve(summarizeFrameDelivery(samples));
        }
      }
      function onAnimationFrame(frameAt: number): void {
        if (!activeGameScene.sys.isActive() || !game.scene.getScenes(true).includes(activeGameScene)) {
          finish(new Error('Browser harness frame-delivery probe was interrupted by a gameplay transition'));
          return;
        }
        if (lastFrameAt !== null) {
          samples.push(frameAt - lastFrameAt);
        }
        lastFrameAt = frameAt;

        if (samples.length >= sampleCount) {
          finish();
          return;
        }
        animationFrame = window.requestAnimationFrame(onAnimationFrame);
      }
      function onDestroy(): void {
        finish(new Error('Browser harness frame-delivery probe was interrupted by game destruction'));
      }

      game.events.once(Phaser.Core.Events.DESTROY, onDestroy);
      animationFrame = window.requestAnimationFrame(onAnimationFrame);
    });
  };

  const probeFramePacing = (sampleCount = 120): Promise<BrowserHarnessFramePacingProbe> => {
    if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 240) {
      throw new Error('Browser harness frame-pacing sample count must be between 1 and 240');
    }

    const gameScene = game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game');
    if (!gameScene || !gameScene.sys.isActive()) {
      throw new Error('Browser harness cannot probe frame pacing without active gameplay');
    }
    if (framePacingProbeActive) {
      throw new Error('Browser harness frame-pacing probe is already active');
    }
    const activeGameScene = gameScene;
    const originalSetMusicIntensity = audioManager.setMusicIntensity;
    const originalResume = harnessAudioContextManager.resume;
    const originalPlayLaser = audioManager.playLaser;
    let musicIntensityRequestCount = 0;
    let audioResumeRequestCount = 0;
    let laserRequestCount = 0;
    framePacingProbeActive = true;
    audioManager.setMusicIntensity = function (intensity: number): void {
      musicIntensityRequestCount += 1;
      originalSetMusicIntensity.call(this, intensity);
    };
    harnessAudioContextManager.resume = function (): void {
      audioResumeRequestCount += 1;
      originalResume.call(this);
    };
    audioManager.playLaser = function (): void {
      laserRequestCount += 1;
      originalPlayLaser.call(this);
    };

    return new Promise<BrowserHarnessFramePacingProbe>((resolve, reject) => {
      const samples: number[] = [];
      const updateSamples: number[] = [];
      const renderSamples: number[] = [];
      const effectEventCount = {
        playerExhaust: 0,
        playerBulletTrail: 0,
        enemyBulletTrail: 0,
      };
      let lastFrameAt: number | null = null;
      let updateStartedAt = 0;
      let renderStartedAt = 0;
      let readyToFinish = false;
      const countPlayerExhaust = (): void => {
        effectEventCount.playerExhaust += 1;
      };
      const countPlayerBulletTrail = (): void => {
        effectEventCount.playerBulletTrail += 1;
      };
      const countEnemyBulletTrail = (): void => {
        effectEventCount.enemyBulletTrail += 1;
      };
      let settled = false;
      let timeout: number | null = null;
      function cleanup(): void {
        if (timeout !== null) window.clearTimeout(timeout);
        game.events.off(Phaser.Core.Events.STEP, onStep);
        game.events.off(Phaser.Core.Events.PRE_STEP, onPreStep);
        game.events.off(Phaser.Core.Events.POST_STEP, onPostStep);
        game.events.off(Phaser.Core.Events.PRE_RENDER, onPreRender);
        game.events.off(Phaser.Core.Events.POST_RENDER, onPostRender);
        game.events.off(Phaser.Core.Events.DESTROY, onDestroy);
        activeGameScene.events.off(GAME_SCENE_EVENTS.playerExhaust, countPlayerExhaust);
        activeGameScene.events.off(GAME_SCENE_EVENTS.playerBulletTrail, countPlayerBulletTrail);
        activeGameScene.events.off(GAME_SCENE_EVENTS.enemyBulletTrail, countEnemyBulletTrail);
        audioManager.setMusicIntensity = originalSetMusicIntensity;
        harnessAudioContextManager.resume = originalResume;
        audioManager.playLaser = originalPlayLaser;
        framePacingProbeActive = false;
      }
      function finish(error?: Error): void {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) {
          reject(error);
          return;
        }

        const sorted = [...samples].sort((a, b) => a - b);
        const percentile = (value: number): number => sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)] ?? 0;
        const summarizeWorkCost = (workSamples: number[]): BrowserHarnessRenderCost => {
          const sortedWorkSamples = [...workSamples].sort((a, b) => a - b);
          return Object.freeze({
            averageMs:
              workSamples.length > 0
                ? workSamples.reduce((total, sample) => total + sample, 0) / workSamples.length
                : 0,
            p95Ms: sortedWorkSamples[Math.max(0, Math.ceil(sortedWorkSamples.length * 0.95) - 1)] ?? 0,
            sampleCount: workSamples.length,
          });
        };
        const currentSnapshot = createBrowserHarnessSnapshot(game);
        const activePhysicsBodyCount = currentSnapshot.objects.filter(
          (object) => object.active && object.hasBody
        ).length;
        const activeParticleCount = game.scene
          .getScenes(true)
          .reduce(
            (count, scene) =>
              count +
              scene.children.list.reduce(
                (sceneCount, child) =>
                  sceneCount +
                  (child instanceof Phaser.GameObjects.Particles.ParticleEmitter ? child.getAliveParticleCount() : 0),
                0
              ),
            0
          );
        resolve(
          Object.freeze({
            sampleCount: samples.length,
            averageMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
            p50Ms: percentile(0.5),
            p95Ms: percentile(0.95),
            p99Ms: percentile(0.99),
            maxMs: sorted[sorted.length - 1] ?? 0,
            over16_67MsCount: samples.filter((sample) => sample > 16.67).length,
            over33_33MsCount: samples.filter((sample) => sample > 33.33).length,
            workCost: Object.freeze({
              update: summarizeWorkCost(updateSamples),
              renderSubmission: summarizeWorkCost(renderSamples),
            }),
            runtimeLoad: Object.freeze({
              activeTexturedObjectCount: currentSnapshot.objects.filter((object) => object.active).length,
              activePhysicsBodyCount,
              activeParticleCount,
              activePlayerBulletCount: currentSnapshot.objects.filter(
                (object) => object.active && object.textureKey === 'player-bullet'
              ).length,
              activeEnemyBulletCount: currentSnapshot.objects.filter(
                (object) => object.active && object.textureKey === 'enemy-bullet'
              ).length,
              particleEmitterCount: currentSnapshot.particleEmitterCount,
              tweenCount: currentSnapshot.tweenCount,
              effectEventCount: Object.freeze({ ...effectEventCount }),
              musicIntensityRequestCount,
              audioResumeRequestCount,
              laserRequestCount,
            }),
          })
        );
      }
      function onStep(): void {
        if (!activeGameScene.sys.isActive() || !game.scene.getScenes(true).includes(activeGameScene)) {
          finish(new Error('Browser harness frame-pacing probe was interrupted by a gameplay transition'));
          return;
        }

        const frameAt = performance.now();
        if (lastFrameAt === null) {
          lastFrameAt = frameAt;
          return;
        }
        samples.push(frameAt - lastFrameAt);
        lastFrameAt = frameAt;
        if (samples.length >= sampleCount) readyToFinish = true;
      }
      function onPreStep(): void {
        updateStartedAt = performance.now();
      }
      function onPostStep(): void {
        if (updateStartedAt > 0) updateSamples.push(performance.now() - updateStartedAt);
      }
      function onPreRender(): void {
        renderStartedAt = performance.now();
      }
      function onPostRender(): void {
        if (renderStartedAt > 0) renderSamples.push(performance.now() - renderStartedAt);
        if (readyToFinish) finish();
      }
      function onDestroy(): void {
        finish(new Error('Browser harness frame-pacing probe was interrupted by game destruction'));
      }

      game.events.on(Phaser.Core.Events.STEP, onStep);
      game.events.on(Phaser.Core.Events.PRE_STEP, onPreStep);
      game.events.on(Phaser.Core.Events.POST_STEP, onPostStep);
      game.events.on(Phaser.Core.Events.PRE_RENDER, onPreRender);
      game.events.on(Phaser.Core.Events.POST_RENDER, onPostRender);
      game.events.once(Phaser.Core.Events.DESTROY, onDestroy);
      activeGameScene.events.on(GAME_SCENE_EVENTS.playerExhaust, countPlayerExhaust);
      activeGameScene.events.on(GAME_SCENE_EVENTS.playerBulletTrail, countPlayerBulletTrail);
      activeGameScene.events.on(GAME_SCENE_EVENTS.enemyBulletTrail, countEnemyBulletTrail);
      timeout = window.setTimeout(
        () => finish(new Error('Browser harness frame-pacing probe timed out')),
        Math.max(15_000, sampleCount * 750)
      );
    });
  };

  return Object.freeze({
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
    setLaserSfxEnabled: (enabled: boolean) => {
      if (!enabled && !originalLaserSfx) {
        originalLaserSfx = audioManager.playLaser;
        audioManager.playLaser = (): void => undefined;
      } else if (enabled && originalLaserSfx) {
        audioManager.playLaser = originalLaserSfx;
        originalLaserSfx = null;
      }
    },
    probeFramePacing,
    probeFrameDelivery,
    getRuntimePerformanceSnapshot: () => runtimePerformanceBudget.getSnapshot(),
    ...gameplayProbes,
    showLaneReadingPilot: (glowEnabled = true) => visualPilot.show(glowEnabled),
    measureLaneReadingPilotRenderCost: () => visualPilot.measureRenderCost(),
    ...navigation,
  });
}

export function installBrowserHarness(game: Phaser.Game): void {
  if (!window[HARNESS_GLOBAL]) window[HARNESS_GLOBAL] = createBrowserHarnessApi(game);
}
