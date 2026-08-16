import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
    Scenes: {
      Events: {
        SHUTDOWN: 'shutdown',
      },
    },
  },
}));

const { runGameSceneCreateBootstrap } = await import('../src/scenes/gameScene/runGameSceneCreateBootstrap');
type GameSceneBootstrapHost = import('../src/scenes/gameScene/runGameSceneCreateBootstrap').GameSceneBootstrapHost;

describe('runGameSceneCreateBootstrap', () => {
  test('orchestrates create-time phases in order and wires pause handling', () => {
    const callLog: string[] = [];
    let pauseHandler: (() => void) | null = null;
    let pauseToggleArg: boolean | null = null;
    let showControlsHintArgs: unknown[] = [];
    let keyboardDetectedHandler: (() => void) | null = null;
    let shutdownEventName: string | null = null;
    let shutdownUnsubscribe: (() => void) | null = null;
    const suppressedValues: boolean[] = [];

    const levelConfig = { id: 'level-config' };
    const scaledBossConfig = { id: 'scaled-boss-config' };
    const initialSection = { id: 'section-opening' };
    const playerSpawnPoint = { x: 128, y: 256 };
    const state = { level: 3, score: 9000 };
    const savedState = { id: 'saved-state' };

    const parallax = { id: 'parallax' };
    const effectsManager = { id: 'effects-manager' };
    const mobileControls = {
      setPauseButtonHandler(handler: () => void) {
        callLog.push('mobileControls.setPauseButtonHandler');
        pauseHandler = handler;
      },
      setJoystickSuppressed(value: boolean) {
        callLog.push('mobileControls.setJoystickSuppressed');
        suppressedValues.push(value);
      },
    };
    const inputManager = { id: 'input-manager' };
    const player = { shields: 4 };
    const bulletPool = { id: 'bullet-pool' };
    const enemyPool = { id: 'enemy-pool' };
    const lastLifeHelperWing = { id: 'helper-wing' };
    const picketTurrets = { id: 'picket-turrets' };
    const waveManager = { id: 'wave-manager' };
    const collisionManager = { id: 'collision-manager' };
    const scoreManager = { id: 'score-manager' };
    const powerUpGroup = { id: 'power-up-group' };
    const hud = { id: 'hud' };
    const warpTransition = { id: 'warp-transition' };
    const pauseStateController = {
      togglePauseRequest(value: boolean) {
        callLog.push('pauseStateController.togglePauseRequest');
        pauseToggleArg = value;
      },
    };
    const runtimeLifecycle = {
      registerLifecycleHandlers() {
        callLog.push('runtimeLifecycle.registerLifecycleHandlers');
      },
      registerScaleHandlers() {
        callLog.push('runtimeLifecycle.registerScaleHandlers');
      },
      registerRuntimeHandlers() {
        callLog.push('runtimeLifecycle.registerRuntimeHandlers');
      },
    };

    const dependencies = {
      isTouchMobileDevice: () => {
        callLog.push('isTouchMobileDevice');
        return false;
      },
      initializeLevelRuntime: (receivedState: unknown) => {
        callLog.push('initializeLevelRuntime');
        expect(receivedState).toBe(state);
        return {
          levelManager: { id: 'level-manager' },
          levelConfig,
          scaledBossConfig,
        };
      },
      createWorldPresentation: (params: {
        syncViewportBounds: () => void;
        getPlayerSpawnPoint: () => { x: number; y: number };
        registerScaleHandlers: () => void;
        levelConfig: unknown;
        levelNumber: number;
        initialSection: unknown;
        initialSectionProgress: number;
      }) => {
        callLog.push('createWorldPresentation');
        expect(params.levelConfig).toBe(levelConfig);
        expect(params.levelNumber).toBe(state.level);
        expect(params.initialSection).toBe(initialSection);
        expect(params.initialSectionProgress).toBe(0.25);
        params.syncViewportBounds();
        const spawn = params.getPlayerSpawnPoint();
        params.registerScaleHandlers();
        return {
          parallax,
          effectsManager,
          playerSpawnPoint: spawn,
        };
      },
      createInputAndPlayer: (params: { state: unknown; playerSpawnPoint: { x: number; y: number } }) => {
        callLog.push('createInputAndPlayer');
        expect(params.state).toBe(state);
        expect(params.playerSpawnPoint).toEqual(playerSpawnPoint);
        return {
          mobileControls,
          inputManager,
          player,
        };
      },
      createPoolsAndGameplaySystems: (params: {
        player: unknown;
        effectsManager: unknown;
        levelConfig: unknown;
        state: unknown;
        isTerminalTransitionActive: () => boolean;
        applyPowerUp: (type: string) => void;
      }) => {
        callLog.push('createPoolsAndGameplaySystems');
        expect(params.player).toBe(player);
        expect(params.effectsManager).toBe(effectsManager);
        expect(params.levelConfig).toBe(levelConfig);
        expect(params.state).toBe(state);
        expect(params.isTerminalTransitionActive()).toBe(false);
        params.applyPowerUp('shield');
        return {
          bulletPool,
          enemyPool,
          lastLifeHelperWing,
          picketTurrets,
          waveManager,
          collisionManager,
          scoreManager,
          powerUpGroup,
        };
      },
      createHudAndTransitions: (params: {
        levelConfig: unknown;
        level: number;
        playerShields: number;
        lastHudShieldCount: number | null;
      }) => {
        callLog.push('createHudAndTransitions');
        expect(params.levelConfig).toBe(levelConfig);
        expect(params.level).toBe(3);
        expect(params.playerShields).toBe(4);
        expect(params.lastHudShieldCount).toBe(7);
        return {
          hud,
          warpTransition,
          lastHudShieldCount: 11,
        };
      },
      createPauseViewportWiring: (params: {
        stopPlayerMotion: () => void;
        getMobileControls: () => unknown;
        captureCurrentRunStateForSave: () => unknown;
        canSaveCurrentRun: () => boolean;
      }) => {
        callLog.push('createPauseViewportWiring');
        params.stopPlayerMotion();
        expect(params.getMobileControls()).toBe(mobileControls);
        expect(params.captureCurrentRunStateForSave()).toBe(savedState);
        expect(params.canSaveCurrentRun()).toBe(true);
        return {
          pauseStateController,
        };
      },
      showControlsHint: (...args: unknown[]) => {
        callLog.push('showControlsHint');
        showControlsHintArgs = args;
      },
      onHardwareKeyboardDetected: (handler: () => void) => {
        callLog.push('onHardwareKeyboardDetected');
        keyboardDetectedHandler = handler;
        return () => {
          callLog.push('unsubscribeHardwareKeyboardDetected');
        };
      },
    };

    const phaserScene = {
      events: {
        once: (event: string, callback: () => void) => {
          shutdownEventName = event;
          shutdownUnsubscribe = callback;
        },
      },
    } as never;
    const host: GameSceneBootstrapHost = {
      scene: phaserScene,
      runtimeLifecycle: runtimeLifecycle as never,
      previousHudShieldCount: 7,
      resetRuntimeState: () => {
        callLog.push('resetRuntimeState');
      },
      initializePlayerRunState: () => {
        callLog.push('initializePlayerRunState');
        return state as never;
      },
      initializeAudioForLevel: (receivedLevelConfig: unknown) => {
        callLog.push('initializeAudioForLevel');
        expect(receivedLevelConfig).toBe(levelConfig);
        return {
          initialSection: initialSection as never,
          initialSectionProgress: 0.25,
        };
      },
      syncViewportBounds: () => {
        callLog.push('syncViewportBounds');
      },
      getPlayerSpawnPoint: () => {
        callLog.push('getPlayerSpawnPoint');
        return playerSpawnPoint;
      },
      stopPlayerMotion: () => {
        callLog.push('stopPlayerMotion');
      },
      applyPowerUp: (type: string) => {
        callLog.push(`applyPowerUp:${type}`);
      },
      isTerminalTransitionActive: () => false,
      isGameplayLocked: () => {
        callLog.push('flow.isGameplayLocked');
        return true;
      },
      captureCurrentRunStateForSave: () => {
        callLog.push('captureCurrentRunStateForSave');
        return savedState as never;
      },
      canSaveCurrentRun: () => {
        callLog.push('canSaveCurrentRun');
        return true;
      },
    };

    const runtime = runGameSceneCreateBootstrap(host, dependencies as never);

    expect(callLog).toEqual([
      'resetRuntimeState',
      'runtimeLifecycle.registerLifecycleHandlers',
      'initializePlayerRunState',
      'initializeLevelRuntime',
      'initializeAudioForLevel',
      'createWorldPresentation',
      'syncViewportBounds',
      'getPlayerSpawnPoint',
      'runtimeLifecycle.registerScaleHandlers',
      'createInputAndPlayer',
      'createPoolsAndGameplaySystems',
      'applyPowerUp:shield',
      'createHudAndTransitions',
      'createPauseViewportWiring',
      'stopPlayerMotion',
      'captureCurrentRunStateForSave',
      'canSaveCurrentRun',
      'mobileControls.setPauseButtonHandler',
      'onHardwareKeyboardDetected',
      'isTouchMobileDevice',
      'showControlsHint',
      'runtimeLifecycle.registerRuntimeHandlers',
    ]);

    expect(runtime).toMatchObject({
      levelManager: { id: 'level-manager' },
      scaledBossConfig,
      parallax,
      effectsManager,
      mobileControls,
      inputManager,
      player,
      bulletPool,
      enemyPool,
      lastLifeHelperWing,
      picketTurrets,
      waveManager,
      collisionManager,
      scoreManager,
      powerUpGroup,
      hud,
      warpTransition,
      pauseStateController,
      lastHudShieldCount: 11,
    });

    expect(showControlsHintArgs).toEqual([phaserScene, { mobile: false }]);
    expect(pauseHandler).not.toBeNull();

    expect(shutdownEventName as string | null).toBe('shutdown');
    expect(keyboardDetectedHandler).not.toBeNull();
    (keyboardDetectedHandler as (() => void) | null)?.();
    expect(suppressedValues).toEqual([true]);
    (shutdownUnsubscribe as (() => void) | null)?.();
    expect(callLog.slice(-1)).toEqual(['unsubscribeHardwareKeyboardDetected']);

    (pauseHandler as (() => void) | null)?.();
    expect(callLog.slice(-2)).toEqual(['flow.isGameplayLocked', 'pauseStateController.togglePauseRequest']);
    expect(pauseToggleArg as boolean | null).toBe(true);
  });
});
