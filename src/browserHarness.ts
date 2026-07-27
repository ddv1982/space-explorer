import Phaser from 'phaser';
import { getLevelConfig, getSectionProgress, type LevelSectionConfig } from './config/LevelsConfig';
import { ensureSceneRegistered } from './scenes/sceneRegistry';
import { audioManager, type AudioPauseReason } from './systems/AudioManager';
import type { ParallaxBackground } from './systems/ParallaxBackground';

const HARNESS_GLOBAL = '__SPACE_EXPLORER_BROWSER_HARNESS__';
const ROUTABLE_SCENES = new Set(['PlanetIntermission', 'GameOver', 'Victory']);

export interface BrowserHarnessSnapshot {
  activeScenes: readonly string[];
  registeredScenes: readonly string[];
  gameSize: Readonly<{ width: number; height: number }>;
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
  }>[];
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

export interface BrowserHarnessApi {
  destroyGame: () => void;
  snapshot: () => BrowserHarnessSnapshot;
  probeArcadeOverlap: () => Promise<boolean>;
  probePlayerHitTint: () => Promise<{ duringMode: number; afterMode: number }>;
  getFrameMetrics: () => BrowserHarnessFrameMetrics;
  resetFrameMetrics: () => void;
  setFpsLimit: (limit: number) => void;
  showLaneReadingPilot: (glowEnabled?: boolean) => { filterCount: number; sectionId: string };
  measureLaneReadingPilotRenderCost: () => Promise<BrowserHarnessVisualPilotMetrics>;
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
  }> = [];
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

  return Object.freeze({
    activeScenes: Object.freeze(activeScenes.map((scene) => scene.scene.key)),
    registeredScenes: Object.freeze(Object.keys(sceneManager.keys ?? {}).sort()),
    gameSize: Object.freeze({ width: Number(game.scale.width), height: Number(game.scale.height) }),
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
  });
}

export function installBrowserHarness(game: Phaser.Game): void {
  if (window[HARNESS_GLOBAL]) {
    return;
  }

  let frameCount = 0;
  let totalDelta = 0;
  let maxDelta = 0;
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
