import Phaser from 'phaser';
import { getLevelConfig, getSectionProgress, type LevelSectionConfig } from './config/LevelsConfig';
import { ensureSceneRegistered } from './scenes/sceneRegistry';
import { audioManager, type AudioManager, type AudioPauseReason } from './systems/AudioManager';
import { GAME_SCENE_EVENTS } from './systems/GameplayFlow';
import type { ParallaxBackground } from './systems/ParallaxBackground';
import { getPlayerState, setPlayerState } from './systems/PlayerState';
import {
  runtimePerformanceBudget,
  type RuntimePerformanceSnapshot,
} from './systems/RuntimePerformanceBudget';

const HARNESS_GLOBAL = '__SPACE_EXPLORER_BROWSER_HARNESS__';
const ROUTABLE_SCENES = new Set(['PlanetIntermission', 'GameOver', 'Victory']);

export interface BrowserHarnessSnapshot {
  activeScenes: readonly string[];
  registeredScenes: readonly string[];
  gameSize: Readonly<{ width: number; height: number }>;
  canvas: Readonly<{
    backingWidth: number;
    backingHeight: number;
    cssWidth: number;
    cssHeight: number;
    devicePixelRatio: number;
    backingScale: number;
  }>;
  runtimePerformance: RuntimePerformanceSnapshot;
  physicsPaused: boolean | null;
  physicsBodyCount: number;
  cameraFilterCount: number;
  particleEmitterCount: number;
  tweenCount: number;
  audioPauseReasons: readonly AudioPauseReason[];
  audioContextState: AudioContextState | null;
  levelProgress: number | null;
  preload: Readonly<{ status: number; progress: number; texts: readonly string[] }> | null;
  texts: readonly Readonly<{ text: string; x: number; y: number }>[];
  objects: readonly Readonly<{
    textureKey: string;
    x: number;
    y: number;
    active: boolean;
    hasBody: boolean;
    rotation: number;
    tintMode: number | null;
    tintTopLeft: number | null;
  }>[];
  arcs: readonly Readonly<{ x: number; y: number; radius: number; visible: boolean }>[];
}

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
  workCost: Readonly<{
    update: BrowserHarnessRenderCost;
    renderSubmission: BrowserHarnessRenderCost;
  }>;
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

declare global {
  interface Window {
    __SPACE_EXPLORER_BROWSER_HARNESS__?: BrowserHarnessApi;
  }
}

function freezeList<T extends object>(items: T[]): readonly Readonly<T>[] {
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

function createSnapshot(game: Phaser.Game): BrowserHarnessSnapshot {
  const activeScenes = game.scene.getScenes(true);
  const primaryScene = activeScenes[0];
  const sceneManager = game.scene as Phaser.Scenes.SceneManager & { keys?: Record<string, unknown> };
  const texts: Array<{ text: string; x: number; y: number }> = [];
  const objects: Array<{
    textureKey: string;
    x: number;
    y: number;
    active: boolean;
    hasBody: boolean;
    rotation: number;
    tintMode: number | null;
    tintTopLeft: number | null;
  }> = [];
  const arcs: Array<{ x: number; y: number; radius: number; visible: boolean }> = [];
  let cameraFilterCount = 0;
  let particleEmitterCount = 0;
  let tweenCount = 0;

  for (const scene of activeScenes) {
    cameraFilterCount += scene.cameras.cameras.reduce(
      (count, camera) =>
        count + camera.filters.internal.list.length + camera.filters.external.list.length,
      0,
    );
    tweenCount += scene.tweens.getTweens().length;

    for (const child of scene.children.list) {
      if (child instanceof Phaser.GameObjects.Particles.ParticleEmitter) {
        particleEmitterCount += 1;
      }

      if (child instanceof Phaser.GameObjects.Arc) {
        arcs.push({ x: child.x, y: child.y, radius: child.radius, visible: child.visible });
      }

      if (child instanceof Phaser.GameObjects.Text) {
        const bounds = child.getBounds();
        texts.push({ text: child.text, x: bounds.centerX, y: bounds.centerY });
      }

      const texturedChild = child as Phaser.GameObjects.GameObject & {
        texture?: Phaser.Textures.Texture;
        x?: number;
        y?: number;
        active?: boolean;
        body?: unknown;
        rotation?: number;
        tintMode?: number;
        tintTopLeft?: number;
      };
      const textureKey = texturedChild.texture?.key;
      if (textureKey) {
        objects.push({
          textureKey,
          x: texturedChild.x ?? 0,
          y: texturedChild.y ?? 0,
          active: texturedChild.active ?? true,
          hasBody: Boolean(texturedChild.body),
          rotation: texturedChild.rotation ?? 0,
          tintMode: texturedChild.tintMode ?? null,
          tintTopLeft: texturedChild.tintTopLeft ?? null,
        });
      }
    }
  }

  const physicsWorld = primaryScene?.physics?.world;
  const gameScene = activeScenes.find((scene) => scene.scene.key === 'Game') as (
    Phaser.Scene & { levelManager?: { progress: number } }
  ) | undefined;
  const preloadScene = game.scene.getScene('Preload');
  const preloadTexts = preloadScene.children.list
    .filter((child): child is Phaser.GameObjects.Text => child instanceof Phaser.GameObjects.Text)
    .map((text) => text.text);
  const canvasBounds = game.canvas.getBoundingClientRect();

  return Object.freeze({
    activeScenes: Object.freeze(activeScenes.map((scene) => scene.scene.key)),
    registeredScenes: Object.freeze(Object.keys(sceneManager.keys ?? {}).sort()),
    gameSize: Object.freeze({ width: Number(game.scale.width), height: Number(game.scale.height) }),
    canvas: Object.freeze({
      backingWidth: game.canvas.width,
      backingHeight: game.canvas.height,
      cssWidth: canvasBounds.width,
      cssHeight: canvasBounds.height,
      devicePixelRatio: window.devicePixelRatio,
      backingScale: canvasBounds.width > 0 ? game.canvas.width / canvasBounds.width : 1,
    }),
    runtimePerformance: runtimePerformanceBudget.getSnapshot(),
    physicsPaused: physicsWorld ? physicsWorld.isPaused : null,
    physicsBodyCount: physicsWorld?.bodies.size ?? 0,
    cameraFilterCount,
    particleEmitterCount,
    tweenCount,
    audioPauseReasons: Object.freeze([...audioManager.getPauseReasons()]),
    audioContextState: audioManager.getContextState(),
    levelProgress: gameScene?.levelManager?.progress ?? null,
    preload: Object.freeze({
      status: preloadScene.sys.settings.status,
      progress: preloadScene.load.progress,
      texts: Object.freeze(preloadTexts),
    }),
    texts: freezeList(texts),
    objects: freezeList(objects),
    arcs: freezeList(arcs),
  });
}

export function installBrowserHarness(game: Phaser.Game): void {
  if (window[HARNESS_GLOBAL]) {
    return;
  }

  let frameCount = 0;
  let totalDelta = 0;
  let maxDelta = 0;
  let playerTrailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  let originalPlayerTrailExplode: Phaser.GameObjects.Particles.ParticleEmitter['explode'] | null = null;
  let originalLaserSfx: AudioManager['playLaser'] | null = null;
  type HarnessAudioContextManager = { resume(): void };
  const harnessAudioContextManager = (
    audioManager as unknown as { contextManager: HarnessAudioContextManager }
  ).contextManager;
  let originalAudioResume: HarnessAudioContextManager['resume'] | null = null;
  let framePacingProbeActive = false;
  const recordFrame = (_time: number, delta: number): void => {
    frameCount += 1;
    totalDelta += delta;
    maxDelta = Math.max(maxDelta, delta);
  };
  game.events.on(Phaser.Core.Events.STEP, recordFrame);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    game.events.off(Phaser.Core.Events.STEP, recordFrame);
  });

  const getLaneReadingPilotOverlay = (): Phaser.GameObjects.Graphics => {
    const gameScene = game.scene.getScene('Game');
    const overlay = gameScene?.children.list.find((child) =>
      child instanceof Phaser.GameObjects.Graphics && child.depth === -5
    );
    if (!(overlay instanceof Phaser.GameObjects.Graphics)) {
      throw new Error('Browser harness cannot find the lane-reading visual pilot overlay');
    }
    return overlay;
  };

  const setLaneReadingPilotGlow = (enabled: boolean): number => {
    const filters = getLaneReadingPilotOverlay().filters?.internal.list ?? [];
    for (const filter of filters) {
      filter.setActive(enabled);
    }
    return filters.length;
  };

  const collectRenderCost = async (
    enabled: boolean,
    sampleCount: number
  ): Promise<number[]> => {
    setLaneReadingPilotGlow(enabled);
    const renderer = game.renderer;
    if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
      throw new Error('Browser harness render-cost measurement requires WebGL');
    }

    const gl = renderer.gl;
    const samples: number[] = [];
    let renderStartedAt = 0;
    let warmupFrames = 15;

    return new Promise<number[]>((resolve) => {
      const onPreRender = (): void => {
        gl.finish();
        renderStartedAt = performance.now();
      };
      const onPostRender = (): void => {
        gl.finish();
        if (warmupFrames > 0) {
          warmupFrames -= 1;
          return;
        }

        samples.push(performance.now() - renderStartedAt);
        if (samples.length === sampleCount) {
          game.events.off(Phaser.Core.Events.PRE_RENDER, onPreRender);
          game.events.off(Phaser.Core.Events.POST_RENDER, onPostRender);
          resolve(samples);
        }
      };

      game.events.on(Phaser.Core.Events.PRE_RENDER, onPreRender);
      game.events.on(Phaser.Core.Events.POST_RENDER, onPostRender);
    });
  };

  const summarizeRenderCost = (samples: number[]): BrowserHarnessRenderCost => {
    const sorted = [...samples].sort((a, b) => a - b);
    return Object.freeze({
      averageMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
      p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0,
      sampleCount: samples.length,
    });
  };

  const summarizeFrameDelivery = (samples: number[]): BrowserHarnessFrameDeliveryProbe => {
    const sorted = [...samples].sort((a, b) => a - b);
    const percentile = (value: number): number =>
      sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)] ?? 0;
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
        Math.max(15_000, sampleCount * 250),
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
      const countPlayerExhaust = (): void => { effectEventCount.playerExhaust += 1; };
      const countPlayerBulletTrail = (): void => { effectEventCount.playerBulletTrail += 1; };
      const countEnemyBulletTrail = (): void => { effectEventCount.enemyBulletTrail += 1; };
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
        const percentile = (value: number): number =>
          sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)] ?? 0;
        const summarizeWorkCost = (workSamples: number[]): BrowserHarnessRenderCost => {
          const sortedWorkSamples = [...workSamples].sort((a, b) => a - b);
          return Object.freeze({
            averageMs: workSamples.length > 0
              ? workSamples.reduce((total, sample) => total + sample, 0) / workSamples.length
              : 0,
            p95Ms: sortedWorkSamples[Math.max(0, Math.ceil(sortedWorkSamples.length * 0.95) - 1)] ?? 0,
            sampleCount: workSamples.length,
          });
        };
        const currentSnapshot = createSnapshot(game);
        const activePhysicsBodyCount = currentSnapshot.objects.filter(
          (object) => object.active && object.hasBody,
        ).length;
        const activeParticleCount = game.scene.getScenes(true).reduce(
          (count, scene) => count + scene.children.list.reduce(
            (sceneCount, child) => sceneCount + (
              child instanceof Phaser.GameObjects.Particles.ParticleEmitter
                ? child.getAliveParticleCount()
                : 0
            ),
            0,
          ),
          0,
        );
        resolve(Object.freeze({
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
              (object) => object.active && object.textureKey === 'player-bullet',
            ).length,
            activeEnemyBulletCount: currentSnapshot.objects.filter(
              (object) => object.active && object.textureKey === 'enemy-bullet',
            ).length,
            particleEmitterCount: currentSnapshot.particleEmitterCount,
            tweenCount: currentSnapshot.tweenCount,
            effectEventCount: Object.freeze({ ...effectEventCount }),
            musicIntensityRequestCount,
            audioResumeRequestCount,
            laserRequestCount,
          }),
        }));
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
        Math.max(15_000, sampleCount * 750),
      );
    });
  };

  window[HARNESS_GLOBAL] = Object.freeze({
    destroyGame: () => game.destroy(true),
    snapshot: () => createSnapshot(game),
    getFrameMetrics: () => Object.freeze({
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
    setPlayerBulletTrailEmissionEnabled: (enabled: boolean) => {
      const gameScene = game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game');
      if (!gameScene) {
        throw new Error('Browser harness cannot configure player bullet trails without active gameplay');
      }
      const emitters = gameScene.children.list.filter((child): child is Phaser.GameObjects.Particles.ParticleEmitter =>
        child instanceof Phaser.GameObjects.Particles.ParticleEmitter
        && child.texture.key === 'particle-trail'
      );
      const emitter = emitters[0];
      if (!emitter) return 0;

      if (!enabled && !originalPlayerTrailExplode) {
        playerTrailEmitter = emitter;
        originalPlayerTrailExplode = emitter.explode;
        emitter.explode = function (): Phaser.GameObjects.Particles.Particle | undefined {
          return undefined;
        };
      } else if (enabled && originalPlayerTrailExplode && playerTrailEmitter) {
        playerTrailEmitter.explode = originalPlayerTrailExplode;
        playerTrailEmitter = null;
        originalPlayerTrailExplode = null;
      }
      return 1;
    },
    setProjectileTrailIntervals: (playerMs: number, enemyMs: number) => {
      const gameScene = game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game') as (
        Phaser.Scene & {
          bulletPool?: { getGroup(): Phaser.Physics.Arcade.Group };
          enemyPool?: { getEnemyBulletGroup(): Phaser.Physics.Arcade.Group };
        }
      ) | undefined;
      if (!gameScene?.bulletPool || !gameScene.enemyPool) {
        throw new Error('Browser harness cannot configure projectile trails without active gameplay');
      }
      const setIntervalForGroup = (group: Phaser.Physics.Arcade.Group, intervalMs: number): void => {
        const projectile = group.getChildren()[0];
        const projectileClass = (projectile?.constructor ?? (
          group as unknown as { classType?: unknown }
        ).classType) as {
          setTrailIntervalMs?: (nextIntervalMs: number) => void;
        } | undefined;
        if (!projectileClass?.setTrailIntervalMs) {
          throw new Error('Browser harness cannot find a configurable projectile type');
        }
        projectileClass.setTrailIntervalMs(intervalMs);
      };
      setIntervalForGroup(gameScene.bulletPool.getGroup(), playerMs);
      setIntervalForGroup(gameScene.enemyPool.getEnemyBulletGroup(), enemyMs);
    },
    stageProjectileTrailEvidence: () => {
      const gameScene = game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game') as (
        Phaser.Scene & {
          bulletPool?: { getGroup(): Phaser.Physics.Arcade.Group };
          enemyPool?: { getEnemyBulletGroup(): Phaser.Physics.Arcade.Group };
        }
      ) | undefined;
      if (!gameScene?.bulletPool || !gameScene.enemyPool) {
        throw new Error('Browser harness cannot stage projectile trails without active gameplay');
      }

      const { width, height } = gameScene.cameras.main;
      const stageGroup = (
        group: Phaser.Physics.Arcade.Group,
        positions: ReadonlyArray<readonly [number, number]>,
        fire: (projectile: Phaser.Physics.Arcade.Sprite, x: number, y: number) => void,
      ): number => {
        const existing = group.getChildren() as Phaser.Physics.Arcade.Sprite[];
        let count = 0;
        for (const [index, [x, y]] of positions.entries()) {
          const projectile = existing[index] ?? group.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
          if (!projectile) break;
          fire(projectile, x, y);
          count += 1;
        }
        return count;
      };
      const playerCount = stageGroup(
        gameScene.bulletPool.getGroup(),
        [0.82, 0.68, 0.54, 0.4].map((y) => [width * 0.38, height * y] as const),
        (projectile, x, y) => {
          (projectile as Phaser.Physics.Arcade.Sprite & {
            fire(x: number, y: number, velocityX?: number, velocityY?: number): void;
          }).fire(x, y, 0, -180);
        },
      );
      const enemyCount = stageGroup(
        gameScene.enemyPool.getEnemyBulletGroup(),
        [0.18, 0.32, 0.46, 0.6].map((y) => [width * 0.62, height * y] as const),
        (projectile, x, y) => {
          (projectile as Phaser.Physics.Arcade.Sprite & { fire(x: number, y: number): void }).fire(x, y);
        },
      );
      return { playerCount, enemyCount };
    },
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
    probeArcadeOverlap: async () => {
      const activeScene = game.scene.getScenes(true)[0];
      if (!activeScene) {
        throw new Error('Browser harness cannot probe collisions without an active scene');
      }

      return new Promise<boolean>((resolve) => {
        const first = activeScene.add.zone(-20, -20, 4, 4);
        const second = activeScene.add.zone(-20, -20, 4, 4);
        activeScene.physics.add.existing(first);
        activeScene.physics.add.existing(second);

        let settled = false;
        let collider: Phaser.Physics.Arcade.Collider | null = null;
        let timeout: Phaser.Time.TimerEvent | null = null;
        const finish = (overlapped: boolean): void => {
          if (settled) return;
          settled = true;
          timeout?.remove(false);
          collider?.destroy();
          first.destroy();
          second.destroy();
          resolve(overlapped);
        };

        collider = activeScene.physics.add.overlap(first, second, () => finish(true));
        timeout = activeScene.time.delayedCall(250, () => finish(false));
      });
    },
    probePlayerHitTint: async () => {
      const activeScene = game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game');
      const player = activeScene?.children.list.find((child) => {
        const candidate = child as Phaser.GameObjects.GameObject & { texture?: Phaser.Textures.Texture };
        return candidate.texture?.key === 'player-ship';
      }) as (Phaser.GameObjects.GameObject & {
        takeDamage: (amount: number) => unknown;
        tintMode: number;
        invulnerable: boolean;
        deathStarted: boolean;
        shields: number;
        hp: number;
      }) | undefined;
      if (!activeScene || !player || typeof player.takeDamage !== 'function') {
        throw new Error('Browser harness cannot probe player hit tint without active gameplay');
      }

      player.invulnerable = false;
      player.deathStarted = false;
      player.shields = 0;
      player.hp = Math.max(player.hp, 2);
      player.takeDamage(1);
      const duringMode = player.tintMode;
      await new Promise<void>((resolve) => activeScene.time.delayedCall(200, resolve));
      return { duringMode, afterMode: player.tintMode };
    },
    probeAcceptedPlayerDamage: (amount = 1) => {
      const activeScene = game.scene.getScenes(true).find((scene) => scene.scene.key === 'Game') as (
        Phaser.Scene & {
          collisionManager?: {
            processAcceptedPlayerDamage: (options: { amount: number }) => void;
          };
        }
      ) | undefined;
      const player = activeScene?.children.list.find((child) => {
        const candidate = child as Phaser.GameObjects.GameObject & { texture?: Phaser.Textures.Texture };
        return candidate.texture?.key === 'player-ship';
      }) as (Phaser.GameObjects.GameObject & {
        hp: number;
        maxHp: number;
        shields: number;
        invulnerable: boolean;
        deathStarted: boolean;
      }) | undefined;
      const collisionManager = activeScene?.collisionManager;
      if (!player || !collisionManager) {
        throw new Error('Browser harness cannot probe accepted player damage without active gameplay');
      }

      player.hp = player.maxHp;
      player.shields = 0;
      player.invulnerable = false;
      player.deathStarted = false;
      const beforeHp = player.hp;
      collisionManager.processAcceptedPlayerDamage({ amount });
      const afterHp = player.hp;
      return { beforeHp, afterHp, damage: beforeHp - afterHp };
    },
    showLaneReadingPilot: (glowEnabled = true) => {
      const gameScene = game.scene.getScene('Game') as (
        Phaser.Scene & { parallax?: Pick<ParallaxBackground, 'setSectionAtmosphere' | 'update'> }
      );
      const levelConfig = getLevelConfig(1);
      const section = levelConfig.sections.find((candidate: LevelSectionConfig) =>
        candidate.hazardEvents?.some((hazard) => hazard.type === 'ring-crossfire')
      );
      if (!gameScene?.parallax || !section) {
        throw new Error('Browser harness cannot show the lane-reading visual pilot');
      }

      gameScene.scene.pause();
      for (const child of gameScene.children.list) {
        if (child instanceof Phaser.GameObjects.Graphics && child.depth === 200) {
          child.setVisible(false);
        }
        if (
          child instanceof Phaser.GameObjects.Text
          && (child.text === 'SECTOR 1' || child.text.includes('Move') || child.text.includes('move')
            || child.text.includes('Fire') || child.text.includes('fire') || child.text.includes('shoot'))
        ) {
          child.setVisible(false);
        }
      }
      gameScene.parallax.setSectionAtmosphere(section, getSectionProgress(section, 0.54));
      for (let frame = 0; frame < 60; frame += 1) {
        gameScene.parallax.update(1000 / 60);
      }

      return {
        filterCount: setLaneReadingPilotGlow(glowEnabled),
        sectionId: section.id,
      };
    },
    measureLaneReadingPilotRenderCost: async () => {
      const baselineSamples = await collectRenderCost(false, 45);
      const glowSamples = await collectRenderCost(true, 45);
      glowSamples.push(...await collectRenderCost(true, 45));
      baselineSamples.push(...await collectRenderCost(false, 45));
      setLaneReadingPilotGlow(true);

      const baseline = summarizeRenderCost(baselineSamples);
      const glow = summarizeRenderCost(glowSamples);
      return Object.freeze({
        baseline,
        glow,
        averageRegressionMs: glow.averageMs - baseline.averageMs,
        p95RegressionMs: glow.p95Ms - baseline.p95Ms,
      });
    },
    showPlanetIntermission: async (level: number) => {
      const normalizedLevel = Math.floor(level);
      const levelConfig = getLevelConfig(normalizedLevel);
      const activeScene = game.scene.getScenes(true)[0];
      if (!activeScene) {
        throw new Error('Browser harness cannot stage a planet intermission without an active scene');
      }

      const state = getPlayerState(activeScene.registry);
      setPlayerState(activeScene.registry, {
        ...state,
        level: normalizedLevel,
        score: Math.max(state.score, 8_000),
        currentHp: Math.max(state.currentHp, 5),
      });
      await ensureSceneRegistered(activeScene, 'PlanetIntermission');
      activeScene.scene.start('PlanetIntermission');

      return { level: normalizedLevel, planetName: levelConfig.planetName };
    },
    route: async (key: string) => {
      if (!ROUTABLE_SCENES.has(key)) {
        throw new Error(`Browser harness cannot route to scene: ${key}`);
      }

      const activeScene = game.scene.getScenes(true)[0];
      if (!activeScene) {
        throw new Error('Browser harness cannot route without an active scene');
      }

      await ensureSceneRegistered(activeScene, key);
      activeScene.scene.start(key);
    },
  });
}
