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

const hasScene = (scene: Phaser.Scene, key: string): boolean => {
  const sceneKeys = (scene.scene.manager as Phaser.Scenes.SceneManager & { keys?: Record<string, unknown> }).keys;
  return Boolean(sceneKeys?.[key]);
};

export const ensureSceneRegistered = async (
  scene: Phaser.Scene,
  key: string,
  sceneLoaders: SceneLoaderMap = lazySceneLoaders,
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

  const loadingTask = loadScene()
    .then((sceneClass) => {
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
  sceneLoaders: SceneLoaderMap = lazySceneLoaders,
): void => {
  void ensureSceneRegistered(scene, key, sceneLoaders)
    .then(() => {
      if (!hasScene(scene, key)) {
        console.warn(`[sceneRegistry] Scene "${key}" is not registered and cannot be started`);
        return;
      }

      scene.scene.start(key);
    })
    .catch((error) => {
      console.error(`[sceneRegistry] Failed to register scene "${key}"`, error);
    });
};
