import { beforeEach, describe, expect, mock, test } from 'bun:test';

const startRegisteredScene = mock();
mock.module('../src/scenes/sceneRegistry', () => ({
  startRegisteredScene,
}));

const { createGameSceneFlowContext } = await import('../src/scenes/gameScene/flowContextBridge');

describe('gameScene flowContextBridge', () => {
  beforeEach(() => {
    startRegisteredScene.mockClear();
  });

  test('creates a flow context that preserves callback behavior', () => {
    const stopPlayerMotion = mock();
    const runBestEffort = mock((effect: () => void) => effect());
    const getPlayerRespawnPosition = mock(() => ({ x: 120, y: 240 }));
    const pause = mock();
    const resume = mock();
    const clockPause = mock();
    const clockResume = mock();
    const effect = mock();

    const scene = {
      time: {
        paused: false,
        pause: clockPause,
        resume: clockResume,
      },
      physics: {
        world: {
          pause,
          resume,
        },
      },
    };
    const registry = {};
    const player = {};
    const collisionManager = {};
    const levelManager = {};
    const scoreManager = {};
    const warpTransition = {};

    const flowContext = createGameSceneFlowContext({
      scene: scene as never,
      registry: registry as never,
      player: player as never,
      collisionManager: collisionManager as never,
      levelManager: levelManager as never,
      scoreManager: scoreManager as never,
      warpTransition: warpTransition as never,
      stopPlayerMotion,
      runBestEffort,
      getPlayerRespawnPosition,
    });

    flowContext.stopPlayerMotion();
    flowContext.runBestEffort(effect);
    flowContext.startScene('GameOver');
    flowContext.pauseScene();
    flowContext.resumeScene();

    expect(flowContext.scene).toBe(scene);
    expect(flowContext.registry).toBe(registry);
    expect(flowContext.player).toBe(player);
    expect(flowContext.collisionManager).toBe(collisionManager);
    expect(flowContext.levelManager).toBe(levelManager);
    expect(flowContext.scoreManager).toBe(scoreManager);
    expect(flowContext.warpTransition).toBe(warpTransition);

    expect(stopPlayerMotion).toHaveBeenCalledTimes(1);
    expect(runBestEffort).toHaveBeenCalledWith(effect);
    expect(effect).toHaveBeenCalledTimes(1);
    expect(startRegisteredScene).toHaveBeenCalledWith(scene, 'GameOver');
    expect(pause).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(clockPause).not.toHaveBeenCalled();
    expect(clockResume).not.toHaveBeenCalled();
    expect(scene.time.paused).toBe(false);
    expect(flowContext.getPlayerRespawnPosition()).toEqual({ x: 120, y: 240 });
    expect(getPlayerRespawnPosition).toHaveBeenCalledTimes(1);
  });
});
