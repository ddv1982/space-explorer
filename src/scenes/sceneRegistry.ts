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

const pendingLoads = new Map<string, Promise<void>>();

const hasScene = (scene: Phaser.Scene, key: string): boolean => {
  const sceneKeys = (scene.scene.manager as Phaser.Scenes.SceneManager & { keys?: Record<string, unknown> }).keys;
  return Boolean(sceneKeys?.[key]);
};

export const ensureSceneRegistered = async (
  scene: Phaser.Scene,
  key: string,
  sceneLoaders: SceneLoaderMap = lazySceneLoaders,
): Promise<void> => {
  if (hasScene(scene, key)) {
    return;
  }

  const loadScene = sceneLoaders[key];
  if (!loadScene) {
    return;
  }

  const pending = pendingLoads.get(key);
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
      pendingLoads.delete(key);
    });

  pendingLoads.set(key, loadingTask);
  return loadingTask;
};

export const startRegisteredScene = (
  scene: Phaser.Scene,
  key: string,
  sceneLoaders: SceneLoaderMap = lazySceneLoaders,
): void => {
  void ensureSceneRegistered(scene, key, sceneLoaders)
    .then(() => {
      scene.scene.start(key);
    })
    .catch((error) => {
      console.error(`[sceneRegistry] Failed to register scene "${key}"`, error);
    });
};
