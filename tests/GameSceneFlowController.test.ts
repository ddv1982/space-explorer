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

type FakeTimer = {
  delay: number;
  callback: () => void;
  removed: boolean;
  remove: (dispatch?: boolean) => void;
};

const LEVEL_COMPLETE_DELAY_MS = 0;
const PLAYER_RESPAWN_FREEZE_DELAY_MS = 240;
const PLAYER_RESPAWN_DELAY_MS = 1000;

function createRegistry(initial: Record<string, unknown> = {}): RegistryLike {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => {
      store.set(key, value);
    },
  };
}

function createTimerHarness() {
  const timers: FakeTimer[] = [];
  const time = {
    now: 0,
    delayedCall: mock((delay: number, callback: () => void): FakeTimer => {
      let timer: FakeTimer;
      timer = {
        delay,
        callback,
        removed: false,
        remove: () => {
          timer.removed = true;
        },
      };
      timers.push(timer);
      return timer;
    }),
  };

  const pendingTimer = (delay: number): FakeTimer | null =>
    timers.find((timer) => timer.delay === delay && !timer.removed) ?? null;

  const fireTimer = (timer: FakeTimer | null): boolean => {
    if (!timer || timer.removed) {
      return false;
    }

    timer.removed = true;
    time.now += timer.delay;
    timer.callback();
    return true;
  };

  return {
    time,
    timers,
    pendingTimer,
    fireTimer,
    fireNext: (delay: number): boolean => fireTimer(pendingTimer(delay)),
  };
}

function createFlowHarness(options: { playerAlive?: boolean; autoCompleteWarp?: boolean } = {}) {
  const clock = createTimerHarness();
  const registry = createRegistry();
  const stopPlayerMotion = mock(() => undefined);
  const startScene = mock(() => undefined);
  const pauseScene = mock(() => undefined);
  const resumeScene = mock(() => undefined);
  const setRespawnInProgress = mock(() => undefined);
  const setTerminalTransitionActive = mock(() => undefined);
  const clearPlayerHazards = mock(() => undefined);
  const getScore = mock(() => 987);

  const player = {
    x: 20,
    y: 30,
    isAlive: options.playerAlive ?? true,
    hp: 3,
    maxHp: 5,
    prepareForRespawn: mock(() => undefined),
    spawn: mock((x: number, y: number, config: { hp: number }) => {
      player.x = x;
      player.y = y;
      player.hp = config.hp;
      player.isAlive = true;
    }),
  };

  const play = mock((callback: () => void) => {
    if (options.autoCompleteWarp ?? true) {
      callback();
    }
  });
  const cancel = mock(() => undefined);

  const collisionManager = {
    setRespawnInProgress,
    setTerminalTransitionActive,
    clearPlayerHazards,
  };

  const context = {
    scene: {
      time: clock.time,
    },
    registry,
    player,
    collisionManager,
    levelManager: {
      currentLevel: 6,
    },
    scoreManager: {
      getScore,
    },
    warpTransition: {
      play,
      cancel,
    },
    stopPlayerMotion,
    runBestEffort: (effect: () => void) => effect(),
    startScene,
    pauseScene,
    resumeScene,
    getPlayerRespawnPosition: () => ({ x: 111, y: 222 }),
  };

  return {
    clock,
    registry,
    player,
    collisionManager,
    stopPlayerMotion,
    startScene,
    pauseScene,
    resumeScene,
    setRespawnInProgress,
    setTerminalTransitionActive,
    clearPlayerHazards,
    play,
    cancel,
    getScore,
    context: context as never,
  };
}

describe('GameSceneFlowController', () => {
  const originalStopMusic = audioManager.stopMusic;

  afterEach(() => {
    audioManager.stopMusic = originalStopMusic;
  });

  test('handlePlayerDeath consumes a remaining life, reports respawn, and begins respawn when lives remain', () => {
    const controller = new GameSceneFlowController();
    controller.reset(2);
    const harness = createFlowHarness({ playerAlive: false });

    const outcome = controller.handlePlayerDeath(harness.context);

    expect(outcome).toEqual({
      status: 'respawn-started',
      levelCompleteQueued: false,
      remainingLives: 1,
    });
    expect(controller.getRemainingLives()).toBe(1);
    expect(getPlayerState(harness.registry as never).remainingLives).toBe(1);
    expect(harness.setRespawnInProgress).toHaveBeenCalledWith(true);
    expect(harness.clearPlayerHazards).toHaveBeenCalledTimes(1);
    expect(harness.clock.pendingTimer(PLAYER_RESPAWN_DELAY_MS)).not.toBeNull();
  });

  test('queueLevelComplete persists run state and starts PlanetIntermission when flushed', () => {
    const controller = new GameSceneFlowController();
    controller.reset(1);

    audioManager.stopMusic = () => undefined;
    const harness = createFlowHarness({ playerAlive: true });

    controller.queueLevelComplete(harness.context);
    expect(harness.clock.pendingTimer(LEVEL_COMPLETE_DELAY_MS)).not.toBeNull();

    harness.clock.fireNext(LEVEL_COMPLETE_DELAY_MS);

    expect(harness.stopPlayerMotion).toHaveBeenCalledTimes(1);
    expect(harness.setTerminalTransitionActive).toHaveBeenCalledWith(true);
    expect(harness.play).toHaveBeenCalledTimes(1);
    expect(harness.startScene).toHaveBeenCalledWith('PlanetIntermission');
    expect(getPlayerState(harness.registry as never).score).toBe(987);
    expect(getPlayerState(harness.registry as never).currentHp).toBe(3);
    expect(getPlayerState(harness.registry as never).remainingLives).toBe(1);
    expect(getRunSummary(harness.registry as never).finalScore).toBe(987);
  });

  test('durable level-complete intent survives queued boss defeat followed by non-final player death', () => {
    const controller = new GameSceneFlowController();
    controller.reset(2);
    const harness = createFlowHarness({ playerAlive: true });

    controller.queueLevelComplete(harness.context);
    expect(harness.clock.pendingTimer(LEVEL_COMPLETE_DELAY_MS)).not.toBeNull();

    harness.player.isAlive = false;
    const outcome = controller.handlePlayerDeath(harness.context);

    expect(outcome).toEqual({
      status: 'respawn-started',
      levelCompleteQueued: true,
      remainingLives: 1,
    });
    expect(harness.clock.pendingTimer(LEVEL_COMPLETE_DELAY_MS)).toBeNull();
    expect(harness.play).not.toHaveBeenCalled();

    harness.clock.fireNext(PLAYER_RESPAWN_FREEZE_DELAY_MS);
    harness.clock.fireNext(PLAYER_RESPAWN_DELAY_MS);

    expect(harness.resumeScene).toHaveBeenCalledTimes(1);
    expect(harness.player.spawn).toHaveBeenCalledWith(111, 222, {
      hp: 5,
      invulnerabilityDuration: 2000,
    });
    expect(harness.clock.pendingTimer(LEVEL_COMPLETE_DELAY_MS)).not.toBeNull();

    harness.clock.fireNext(LEVEL_COMPLETE_DELAY_MS);

    expect(harness.play).toHaveBeenCalledTimes(1);
    expect(harness.startScene).toHaveBeenCalledWith('PlanetIntermission');
    expect(getPlayerState(harness.registry as never).remainingLives).toBe(1);
  });

  test('level-complete intent queued during respawn survives a blocked zero-delay flush', () => {
    const controller = new GameSceneFlowController();
    controller.reset(2);
    const harness = createFlowHarness({ playerAlive: false });

    const deathOutcome = controller.handlePlayerDeath(harness.context);
    expect(deathOutcome.status).toBe('respawn-started');

    controller.queueLevelComplete(harness.context);
    expect(harness.clock.pendingTimer(LEVEL_COMPLETE_DELAY_MS)).not.toBeNull();

    harness.clock.fireNext(LEVEL_COMPLETE_DELAY_MS);
    expect(harness.play).not.toHaveBeenCalled();

    harness.clock.fireNext(PLAYER_RESPAWN_FREEZE_DELAY_MS);
    harness.clock.fireNext(PLAYER_RESPAWN_DELAY_MS);
    harness.clock.fireNext(LEVEL_COMPLETE_DELAY_MS);

    expect(harness.play).toHaveBeenCalledTimes(1);
    expect(harness.startScene).toHaveBeenCalledWith('PlanetIntermission');
    expect(getPlayerState(harness.registry as never).remainingLives).toBe(1);
  });

  test('accepted level-complete terminal ignores later player death without cancelling warp', () => {
    const controller = new GameSceneFlowController();
    controller.reset(1);
    const harness = createFlowHarness({ playerAlive: true, autoCompleteWarp: false });

    controller.queueLevelComplete(harness.context);
    harness.clock.fireNext(LEVEL_COMPLETE_DELAY_MS);

    harness.player.isAlive = false;
    const outcome = controller.handlePlayerDeath(harness.context);

    expect(outcome).toEqual({
      status: 'ignored-terminal-active',
      levelCompleteQueued: false,
      remainingLives: 1,
    });
    expect(harness.cancel).not.toHaveBeenCalled();
    expect(harness.play).toHaveBeenCalledTimes(1);
    expect(harness.clock.pendingTimer(PLAYER_RESPAWN_DELAY_MS)).toBeNull();
    expect(harness.clock.pendingTimer(1500)).toBeNull();
    expect(controller.getRemainingLives()).toBe(1);
  });

  test('final death beats queued-but-unaccepted level completion', () => {
    const controller = new GameSceneFlowController();
    controller.reset(1);
    const harness = createFlowHarness({ playerAlive: true });

    controller.queueLevelComplete(harness.context);
    const levelCompleteTimer = harness.clock.pendingTimer(LEVEL_COMPLETE_DELAY_MS);
    expect(levelCompleteTimer).not.toBeNull();

    harness.player.isAlive = false;
    const outcome = controller.handlePlayerDeath(harness.context);

    expect(outcome).toEqual({
      status: 'game-over-started',
      levelCompleteQueued: false,
      remainingLives: 0,
    });
    expect(controller.getRemainingLives()).toBe(0);
    expect(harness.clock.fireTimer(levelCompleteTimer)).toBe(false);
    expect(harness.play).not.toHaveBeenCalled();
    expect(harness.setTerminalTransitionActive).toHaveBeenCalledWith(true);
    expect(getPlayerState(harness.registry as never).remainingLives).toBe(0);
    expect(getRunSummary(harness.registry as never).levelReached).toBe(6);

    harness.clock.fireNext(1500);
    expect(harness.startScene).toHaveBeenCalledWith('GameOver');

    controller.shutdown(harness.collisionManager as never);
  });

  test('physics pause callback can coexist with timer-driven respawn completion', () => {
    const controller = new GameSceneFlowController();
    controller.reset(2);
    const harness = createFlowHarness({ playerAlive: false });

    const outcome = controller.handlePlayerDeath(harness.context);
    expect(outcome.status).toBe('respawn-started');

    harness.clock.fireNext(PLAYER_RESPAWN_FREEZE_DELAY_MS);

    expect(harness.pauseScene).toHaveBeenCalledTimes(1);
    expect(harness.player.prepareForRespawn).toHaveBeenCalledTimes(1);

    harness.clock.fireNext(PLAYER_RESPAWN_DELAY_MS);

    expect(harness.resumeScene).toHaveBeenCalledTimes(1);
    expect(harness.player.spawn).toHaveBeenCalledWith(111, 222, {
      hp: 5,
      invulnerabilityDuration: 2000,
    });
    expect(harness.setRespawnInProgress).toHaveBeenLastCalledWith(false);
    expect(harness.play).not.toHaveBeenCalled();
  });
});
