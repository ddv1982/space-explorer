import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const startRegisteredScene = mock();
let currentLevel = 4;

mock.module('@/systems/PlayerState', () => ({
  advanceToNextLevel: () => {
    currentLevel += 1;
  },
  getPlayerState: () => ({ level: currentLevel }),
  getRunSummary: mock(),
  setPlayerState: mock(),
  setRunSummary: mock(),
}));

mock.module('../src/scenes/sceneRegistry', () => ({
  startRegisteredScene,
}));

const { PlanetIntermissionScene } = await import('../src/scenes/PlanetIntermissionScene');
type PlanetIntermissionSceneInstance = InstanceType<typeof PlanetIntermissionScene>;

describe('PlanetIntermissionScene transitions', () => {
  test('advances state before starting Game', () => {
    currentLevel = 4;
    startRegisteredScene.mockClear();

    const scene = Object.create(PlanetIntermissionScene.prototype) as PlanetIntermissionSceneInstance;
    (scene as unknown as Record<string, unknown>).registry = {};
    (scene as unknown as Record<string, unknown>).warpTransition = {
      play: (callback: () => void) => callback(),
    };

    (scene as unknown as { transitionToNextGameLevel: () => void }).transitionToNextGameLevel();

    expect(currentLevel).toBe(5);
    expect(startRegisteredScene).toHaveBeenCalledWith(scene, 'Game');
  });
});
