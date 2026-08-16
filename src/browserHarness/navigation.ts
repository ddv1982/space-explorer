import type Phaser from 'phaser';

import { getLevelConfig } from '@/config/LevelsConfig';
import { ensureSceneRegistered } from '@/scenes/sceneRegistry';
import { getPlayerState, setPlayerState } from '@/systems/PlayerState';

const ROUTABLE_SCENES = new Set(['PlanetIntermission', 'GameOver', 'Victory']);

function requireActiveScene(game: Phaser.Game): Phaser.Scene {
  const scene = game.scene.getScenes(true)[0];
  if (!scene) throw new Error('Browser harness cannot route without an active scene');
  return scene;
}

export function createBrowserHarnessNavigation(game: Phaser.Game) {
  return {
    showPlanetIntermission: async (level: number) => {
      const normalizedLevel = Math.floor(level);
      const levelConfig = getLevelConfig(normalizedLevel);
      const activeScene = requireActiveScene(game);
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
      if (!ROUTABLE_SCENES.has(key)) throw new Error(`Browser harness cannot route to scene: ${key}`);
      const activeScene = requireActiveScene(game);
      await ensureSceneRegistered(activeScene, key);
      activeScene.scene.start(key);
    },
  };
}
