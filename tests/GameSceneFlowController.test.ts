import { afterEach, describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Scene: class {},
  },
}));

const { GameSceneFlowController } = await import('../src/scenes/gameScene/GameSceneFlowController');
const { getPlayerState, getRunSummary } = await import('../src/systems/PlayerState');
const { audioManager } = await import('../src/systems/AudioManager');

type RegistryLike = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

function createRegistry(initial: Record<string, unknown> = {}): RegistryLike {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => {
      store.set(key, value);
    },
  };
}

describe('GameSceneFlowController', () => {
  const originalStopMusic = audioManager.stopMusic;

  afterEach(() => {
    audioManager.stopMusic = originalStopMusic;
  });

  test('handlePlayerDeath consumes a remaining life and begins respawn when lives remain', () => {
    const controller = new GameSceneFlowController();
    controller.reset(2);

    const beginRespawnTransition = mock(() => undefined);
    (controller as unknown as Record<string, unknown>).beginRespawnTransition = beginRespawnTransition;

    const registry = createRegistry();
    const context = {
      registry,
      player: { isAlive: true } as never,
      collisionManager: {} as never,
      levelManager: {} as never,
      scoreManager: {} as never,
      warpTransition: {} as never,
      stopPlayerMotion: () => undefined,
      runBestEffort: () => undefined,
      startScene: () => undefined,
      pauseScene: () => undefined,
      resumeScene: () => undefined,
      getPlayerRespawnPosition: () => ({ x: 0, y: 0 }),
    } as never;

    controller.handlePlayerDeath(context);

    expect(controller.getRemainingLives()).toBe(1);
    expect(getPlayerState(registry as never).remainingLives).toBe(1);
    expect(beginRespawnTransition).toHaveBeenCalledWith(context);
  });

  test('queueLevelComplete persists run state and starts PlanetIntermission when flushed', () => {
    const controller = new GameSceneFlowController();
    controller.reset(1);

    audioManager.stopMusic = () => undefined;

    let delayedCallback: (() => void) | null = null;
    const stopPlayerMotion = mock(() => undefined);
    const setTerminalTransitionActive = mock(() => undefined);
    const play = mock((callback: () => void) => callback());
    const startScene = mock(() => undefined);

    const registry = createRegistry();
    const context = {
      scene: {
        time: {
          delayedCall: (_ms: number, callback: () => void) => {
            delayedCallback = callback;
            return { remove: () => undefined };
          },
        },
      },
      registry,
      player: {
        isAlive: true,
        hp: 3,
      },
      collisionManager: {
        setTerminalTransitionActive,
      },
      levelManager: {
        currentLevel: 5,
      },
      scoreManager: {
        getScore: () => 987,
      },
      warpTransition: {
        play,
      },
      stopPlayerMotion,
      runBestEffort: (effect: () => void) => effect(),
      startScene,
      pauseScene: () => undefined,
      resumeScene: () => undefined,
      getPlayerRespawnPosition: () => ({ x: 0, y: 0 }),
    } as never;

    controller.queueLevelComplete(context);
    expect(delayedCallback).not.toBeNull();

    delayedCallback?.();

    expect(stopPlayerMotion).toHaveBeenCalledTimes(1);
    expect(setTerminalTransitionActive).toHaveBeenCalledWith(true);
    expect(play).toHaveBeenCalledTimes(1);
    expect(startScene).toHaveBeenCalledWith('PlanetIntermission');
    expect(getPlayerState(registry as never).score).toBe(987);
    expect(getPlayerState(registry as never).currentHp).toBe(3);
    expect(getPlayerState(registry as never).remainingLives).toBe(1);
    expect(getRunSummary(registry as never).finalScore).toBe(987);
  });
});
