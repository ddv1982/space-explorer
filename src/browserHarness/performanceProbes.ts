import Phaser from 'phaser';

import type { AudioManager } from '../systems/AudioManager';
import { GAME_SCENE_EVENTS } from '../systems/GameplayFlow';
import { createBrowserHarnessSnapshot } from './snapshot';
import type {
  BrowserHarnessFrameDeliveryProbe,
  BrowserHarnessFramePacingProbe,
  BrowserHarnessRenderCost,
} from './types';

export interface BrowserHarnessAudioContextManager {
  getCtx(): AudioContext | null;
  resume(): void;
}

export class BrowserHarnessPerformanceProbes {
  private frameDeliveryProbeActive = false;
  private framePacingProbeActive = false;

  constructor(
    private readonly game: Phaser.Game,
    private readonly audioManager: AudioManager,
    private readonly audioContextManager: BrowserHarnessAudioContextManager
  ) {}

  private summarizeFrameDelivery(samples: number[]): BrowserHarnessFrameDeliveryProbe {
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
  }

  probeFrameDelivery(sampleCount = 240): Promise<BrowserHarnessFrameDeliveryProbe> {
    if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 1200) {
      throw new Error('Browser harness frame-delivery sample count must be between 1 and 1200');
    }

    const gameScene = this.game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game');
    if (!gameScene || !gameScene.sys.isActive()) {
      throw new Error('Browser harness cannot probe frame delivery without active gameplay');
    }
    if (this.frameDeliveryProbeActive) {
      throw new Error('Browser harness frame-delivery probe is already active');
    }

    this.frameDeliveryProbeActive = true;
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

      const cleanup = (): void => {
        window.clearTimeout(timeout);
        window.cancelAnimationFrame(animationFrame);
        this.game.events.off(Phaser.Core.Events.DESTROY, onDestroy);
        this.frameDeliveryProbeActive = false;
      };
      const finish = (error?: Error): void => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) {
          reject(error);
        } else {
          resolve(this.summarizeFrameDelivery(samples));
        }
      };
      const onAnimationFrame = (frameAt: number): void => {
        if (!activeGameScene.sys.isActive() || !this.game.scene.getScenes(true).includes(activeGameScene)) {
          finish(new Error('Browser harness frame-delivery probe was interrupted by a gameplay transition'));
          return;
        }
        if (lastFrameAt !== null) samples.push(frameAt - lastFrameAt);
        lastFrameAt = frameAt;

        if (samples.length >= sampleCount) {
          finish();
          return;
        }
        animationFrame = window.requestAnimationFrame(onAnimationFrame);
      };
      const onDestroy = (): void => {
        finish(new Error('Browser harness frame-delivery probe was interrupted by game destruction'));
      };

      this.game.events.once(Phaser.Core.Events.DESTROY, onDestroy);
      animationFrame = window.requestAnimationFrame(onAnimationFrame);
    });
  }

  probeFramePacing(
    sampleCount = 120,
    options: { warmupFrames?: number; syntheticUpdateWorkMs?: number } = {}
  ): Promise<BrowserHarnessFramePacingProbe> {
    if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 240) {
      throw new Error('Browser harness frame-pacing sample count must be between 1 and 240');
    }
    const warmupFrames = options.warmupFrames ?? 0;
    const syntheticUpdateWorkMs = options.syntheticUpdateWorkMs ?? 0;
    if (!Number.isInteger(warmupFrames) || warmupFrames < 0 || warmupFrames > 600) {
      throw new Error('Browser harness frame-pacing warm-up must be between 0 and 600 frames');
    }
    if (!Number.isFinite(syntheticUpdateWorkMs) || syntheticUpdateWorkMs < 0 || syntheticUpdateWorkMs > 20) {
      throw new Error('Browser harness synthetic update work must be between 0 and 20ms');
    }

    const gameScene = this.game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game');
    if (!gameScene || !gameScene.sys.isActive()) {
      throw new Error('Browser harness cannot probe frame pacing without active gameplay');
    }
    if (this.framePacingProbeActive) {
      throw new Error('Browser harness frame-pacing probe is already active');
    }
    const activeGameScene = gameScene;
    const originalSetMusicIntensity = this.audioManager.setMusicIntensity;
    const originalResume = this.audioContextManager.resume;
    const originalPlayLaser = this.audioManager.playLaser;
    let musicIntensityRequestCount = 0;
    let audioResumeRequestCount = 0;
    let laserRequestCount = 0;
    this.framePacingProbeActive = true;
    this.audioManager.setMusicIntensity = function (intensity: number): void {
      musicIntensityRequestCount += 1;
      originalSetMusicIntensity.call(this, intensity);
    };
    this.audioContextManager.resume = function (): void {
      audioResumeRequestCount += 1;
      originalResume.call(this);
    };
    this.audioManager.playLaser = function (): void {
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
      let remainingWarmupFrames = warmupFrames;
      let updateStartedAt = 0;
      let renderStartedAt = 0;
      let collectWorkCostThisFrame = false;
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
      const cleanup = (): void => {
        if (timeout !== null) window.clearTimeout(timeout);
        this.game.events.off(Phaser.Core.Events.STEP, onStep);
        this.game.events.off(Phaser.Core.Events.PRE_STEP, onPreStep);
        this.game.events.off(Phaser.Core.Events.POST_STEP, onPostStep);
        this.game.events.off(Phaser.Core.Events.PRE_RENDER, onPreRender);
        this.game.events.off(Phaser.Core.Events.POST_RENDER, onPostRender);
        this.game.events.off(Phaser.Core.Events.DESTROY, onDestroy);
        activeGameScene.events.off(GAME_SCENE_EVENTS.playerExhaust, countPlayerExhaust);
        activeGameScene.events.off(GAME_SCENE_EVENTS.playerBulletTrail, countPlayerBulletTrail);
        activeGameScene.events.off(GAME_SCENE_EVENTS.enemyBulletTrail, countEnemyBulletTrail);
        this.audioManager.setMusicIntensity = originalSetMusicIntensity;
        this.audioContextManager.resume = originalResume;
        this.audioManager.playLaser = originalPlayLaser;
        this.framePacingProbeActive = false;
      };
      const finish = (error?: Error): void => {
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
        const currentSnapshot = createBrowserHarnessSnapshot(this.game);
        const activePhysicsBodyCount = currentSnapshot.objects.filter(
          (object) => object.active && object.hasBody
        ).length;
        const activeParticleCount = this.game.scene
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
            warmupFrames,
            syntheticUpdateWorkMs,
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
      };
      const onStep = (): void => {
        if (!activeGameScene.sys.isActive() || !this.game.scene.getScenes(true).includes(activeGameScene)) {
          finish(new Error('Browser harness frame-pacing probe was interrupted by a gameplay transition'));
          return;
        }

        if (remainingWarmupFrames > 0) {
          remainingWarmupFrames -= 1;
          lastFrameAt = null;
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
      };
      const onPreStep = (): void => {
        const startedAt = performance.now();
        collectWorkCostThisFrame = remainingWarmupFrames === 0 && lastFrameAt !== null;
        updateStartedAt = collectWorkCostThisFrame ? startedAt : 0;
        if (syntheticUpdateWorkMs > 0) {
          while (performance.now() - startedAt < syntheticUpdateWorkMs) {
            // Deterministic harness-only work used to prove gate sensitivity.
          }
        }
      };
      const onPostStep = (): void => {
        if (collectWorkCostThisFrame) updateSamples.push(performance.now() - updateStartedAt);
      };
      const onPreRender = (): void => {
        renderStartedAt = collectWorkCostThisFrame ? performance.now() : 0;
      };
      const onPostRender = (): void => {
        if (collectWorkCostThisFrame) renderSamples.push(performance.now() - renderStartedAt);
        if (readyToFinish) finish();
      };
      const onDestroy = (): void => {
        finish(new Error('Browser harness frame-pacing probe was interrupted by game destruction'));
      };

      this.game.events.on(Phaser.Core.Events.STEP, onStep);
      this.game.events.on(Phaser.Core.Events.PRE_STEP, onPreStep);
      this.game.events.on(Phaser.Core.Events.POST_STEP, onPostStep);
      this.game.events.on(Phaser.Core.Events.PRE_RENDER, onPreRender);
      this.game.events.on(Phaser.Core.Events.POST_RENDER, onPostRender);
      this.game.events.once(Phaser.Core.Events.DESTROY, onDestroy);
      activeGameScene.events.on(GAME_SCENE_EVENTS.playerExhaust, countPlayerExhaust);
      activeGameScene.events.on(GAME_SCENE_EVENTS.playerBulletTrail, countPlayerBulletTrail);
      activeGameScene.events.on(GAME_SCENE_EVENTS.enemyBulletTrail, countEnemyBulletTrail);
      timeout = window.setTimeout(
        () => finish(new Error('Browser harness frame-pacing probe timed out')),
        Math.max(15_000, (sampleCount + warmupFrames) * 750)
      );
    });
  }
}
