import Phaser from 'phaser';

type SceneConstructor = new () => Phaser.Scene;
type SceneLoader = () => Promise<SceneConstructor>;
type SceneLoaderMap = Readonly<Record<string, SceneLoader>>;

const lazySceneLoaders: SceneLoaderMap = {
  Game: async () => (await import('./GameScene')).GameScene,
  PlanetIntermission: async () => (await import('./PlanetIntermissionScene')).PlanetIntermissionScene,
  GameOver: async () => (await import('./GameOverScene')).GameOverScene,
  Victory: async () => (await import('./VictoryScene')).VictoryScene,
};

const pendingLoads = new WeakMap<Phaser.Scenes.SceneManager, Map<string, Promise<void>>>();
const loadGenerations = new WeakMap<Phaser.Scenes.SceneManager, Map<string, number>>();

const getPendingLoadsForManager = (scene: Phaser.Scene): Map<string, Promise<void>> => {
  const manager = scene.scene.manager;
  const managerPendingLoads = pendingLoads.get(manager);

  if (managerPendingLoads) {
    return managerPendingLoads;
  }

  const nextPendingLoads = new Map<string, Promise<void>>();
  pendingLoads.set(manager, nextPendingLoads);
  return nextPendingLoads;
};

const getGenerationsForManager = (scene: Phaser.Scene): Map<string, number> => {
  const manager = scene.scene.manager;
  const generations = loadGenerations.get(manager);
  if (generations) {
    return generations;
  }

  const nextGenerations = new Map<string, number>();
  loadGenerations.set(manager, nextGenerations);
  return nextGenerations;
};

const bumpGeneration = (scene: Phaser.Scene, key: string): number => {
  const generations = getGenerationsForManager(scene);
  const next = (generations.get(key) ?? 0) + 1;
  generations.set(key, next);
  return next;
};

const currentGeneration = (scene: Phaser.Scene, key: string): number => {
  return getGenerationsForManager(scene).get(key) ?? 0;
};

const hasScene = (scene: Phaser.Scene, key: string): boolean => {
  const sceneKeys = (scene.scene.manager as Phaser.Scenes.SceneManager & { keys?: Record<string, unknown> }).keys;
  return Boolean(sceneKeys?.[key]);
};

const invalidatePendingLoads = (scene: Phaser.Scene): void => {
  const managerPendingLoads = pendingLoads.get(scene.scene.manager);
  if (!managerPendingLoads) {
    return;
  }

  for (const key of managerPendingLoads.keys()) {
    bumpGeneration(scene, key);
  }
};

export const ensureSceneRegistered = async (
  scene: Phaser.Scene,
  key: string,
  sceneLoaders: SceneLoaderMap = lazySceneLoaders
): Promise<void> => {
  const managerPendingLoads = getPendingLoadsForManager(scene);

  if (hasScene(scene, key)) {
    return;
  }

  const loadScene = sceneLoaders[key];
  if (!loadScene) {
    return;
  }

  const pending = managerPendingLoads.get(key);
  if (pending) {
    return pending;
  }

  const generation = bumpGeneration(scene, key);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => invalidatePendingLoads(scene));
  scene.events.once(Phaser.Scenes.Events.DESTROY, () => invalidatePendingLoads(scene));

  const loadingTask = loadScene()
    .then((sceneClass) => {
      if (currentGeneration(scene, key) !== generation) {
        return;
      }
      if (!hasScene(scene, key)) {
        scene.scene.add(key, sceneClass, false);
      }
    })
    .finally(() => {
      managerPendingLoads.delete(key);
    });

  managerPendingLoads.set(key, loadingTask);
  return loadingTask;
};

export const startRegisteredScene = (
  scene: Phaser.Scene,
  key: string,
  sceneLoaders: SceneLoaderMap = lazySceneLoaders
): void => {
  const generation = currentGeneration(scene, key);
  void ensureSceneRegistered(scene, key, sceneLoaders)
    .then(() => {
      if (currentGeneration(scene, key) !== generation && !hasScene(scene, key)) {
        return;
      }

      if (!hasScene(scene, key)) {
        announceSceneLoadFailure(key);
        return;
      }

      scene.scene.start(key);
    })
    .catch((error) => {
      announceSceneLoadFailure(key, error);
    });
};

export function announceSceneLoadFailure(key: string, error?: unknown): void {
  const documentRef = globalThis.document;
  const root = documentRef?.getElementById('game-root');
  if (root) {
    let banner = documentRef.getElementById('scene-load-failure');
    if (!banner) {
      banner = documentRef.createElement('p');
      banner.id = 'scene-load-failure';
      banner.setAttribute('role', 'alert');
      root.appendChild(banner);
    }
    banner.textContent = `Unable to open ${key}. Reload and try again.`;
  }

  if (error !== undefined) {
    console.error(`[sceneRegistry] Failed to register scene "${key}"`, error);
    return;
  }

  console.warn(`[sceneRegistry] Scene "${key}" is not registered and cannot be started`);
}
