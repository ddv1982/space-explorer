import Phaser from 'phaser';

import { audioManager, type AudioPauseReason } from '@/systems/AudioManager';
import { runtimePerformanceBudget, type RuntimePerformanceSnapshot } from '@/systems/RuntimePerformanceBudget';

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
  texts: readonly Readonly<{ text: string; x: number; y: number; width: number; height: number }>[];
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

type BrowserHarnessTextSnapshot = BrowserHarnessSnapshot['texts'][number];

function createTextSnapshot(text: Phaser.GameObjects.Text): BrowserHarnessTextSnapshot {
  const bounds = text.getBounds();
  return { text: text.text, x: bounds.centerX, y: bounds.centerY, width: bounds.width, height: bounds.height };
}

function freezeList<T extends object>(items: T[]): readonly Readonly<T>[] {
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

export function createBrowserHarnessSnapshot(game: Phaser.Game): BrowserHarnessSnapshot {
  const activeScenes = game.scene.getScenes(true);
  const primaryScene = activeScenes[0];
  const sceneManager = game.scene as Phaser.Scenes.SceneManager & { keys?: Record<string, unknown> };
  const texts: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
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
      (count, camera) => count + camera.filters.internal.list.length + camera.filters.external.list.length,
      0
    );
    tweenCount += scene.tweens.getTweens().length;

    for (const child of scene.children.list) {
      if (child instanceof Phaser.GameObjects.Particles.ParticleEmitter) particleEmitterCount += 1;
      if (child instanceof Phaser.GameObjects.Arc) {
        arcs.push({ x: child.x, y: child.y, radius: child.radius, visible: child.visible });
      }
      if (child instanceof Phaser.GameObjects.Text) {
        texts.push(createTextSnapshot(child));
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
  const gameScene = activeScenes.find((scene) => scene.scene.key === 'Game') as
    (Phaser.Scene & { levelManager?: { progress: number } }) | undefined;
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
