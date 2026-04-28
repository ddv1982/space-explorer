import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
  },
}));

const { runGameSceneCreateBootstrap } = await import('../src/scenes/gameScene/runGameSceneCreateBootstrap');

describe('runGameSceneCreateBootstrap', () => {
  test('orchestrates create-time phases in order and wires pause handling', () => {
    const callLog: string[] = [];
    let pauseHandler: (() => void) | null = null;
    let pauseToggleArg: boolean | null = null;
    let showControlsHintArgs: unknown[] = [];

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
    };
    const inputManager = { id: 'input-manager' };
    const player = { shields: 4 };
    const bulletPool = { id: 'bullet-pool' };
    const enemyPool = { id: 'enemy-pool' };
    const lastLifeHelperWing = { id: 'helper-wing' };
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
    const mobileViewportGuard = { id: 'mobile-viewport-guard' };
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
        initialSection: unknown;
        initialSectionProgress: number;
      }) => {
        callLog.push('createWorldPresentation');
        expect(params.levelConfig).toBe(levelConfig);
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
      createInputAndPlayer: (params: {
        state: unknown;
        playerSpawnPoint: { x: number; y: number };
      }) => {
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
          mobileViewportGuard,
        };
      },
      showControlsHint: (...args: unknown[]) => {
        callLog.push('showControlsHint');
        showControlsHintArgs = args;
      },
    };

    const scene = {
      runtimeLifecycle,
      flow: {
        isTerminalTransitionActive: () => false,
        isGameplayLocked: () => {
          callLog.push('flow.isGameplayLocked');
          return true;
        },
      },
      lastHudShieldCount: 7,
      resetRuntimeState: () => {
        callLog.push('resetRuntimeState');
      },
      initializePlayerRunState: () => {
        callLog.push('initializePlayerRunState');
        return state;
      },
      initializeAudioForLevel: (receivedLevelConfig: unknown) => {
        callLog.push('initializeAudioForLevel');
        expect(receivedLevelConfig).toBe(levelConfig);
        return {
          initialSection,
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
      captureCurrentRunStateForSave: () => {
        callLog.push('captureCurrentRunStateForSave');
        return savedState;
      },
      canSaveCurrentRun: () => {
        callLog.push('canSaveCurrentRun');
        return true;
      },
    };

    runGameSceneCreateBootstrap(scene, dependencies as never);

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
      'isTouchMobileDevice',
      'showControlsHint',
      'runtimeLifecycle.registerRuntimeHandlers',
    ]);

    expect(scene).toMatchObject({
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
      waveManager,
      collisionManager,
      scoreManager,
      powerUpGroup,
      hud,
      warpTransition,
      pauseStateController,
      mobileViewportGuard,
      lastHudShieldCount: 11,
    });

    expect(showControlsHintArgs).toEqual([scene, { mobile: false }]);
    expect(pauseHandler).not.toBeNull();

    pauseHandler?.();
    expect(callLog.slice(-2)).toEqual([
      'flow.isGameplayLocked',
      'pauseStateController.togglePauseRequest',
    ]);
    expect(pauseToggleArg).toBe(true);
  });
});
