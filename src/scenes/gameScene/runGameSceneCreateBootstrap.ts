import type Phaser from 'phaser';

import { isTouchMobileDevice } from '@/utils/device';

import type {
  GameSceneCreateGameplayBridge,
  GameSceneCreateHudBridge,
  GameSceneCreateInputBridge,
  GameSceneCreatePauseBridge,
  GameSceneCreateRuntimeBridge,
  GameSceneCreateWorldBridge,
} from './bootstrapContracts';
import { createHudAndTransitions } from './createHudAndTransitions';
import { createInputAndPlayer } from './createInputAndPlayer';
import { createPoolsAndGameplaySystems } from './createPoolsAndGameplaySystems';
import { createWorldPresentation } from './createWorldPresentation';
import { initializeLevelRuntime } from './initializeLevelRuntime';
import { createPauseViewportWiring } from './pauseViewportWiring';
import { showControlsHint } from './showControlsHint';

/**
 * Create-time surface required by bootstrap orchestration.
 * GameScene satisfies this structurally after private members are cast at the call site.
 */
export type GameSceneCreateBootstrapBridge = Phaser.Scene
  & GameSceneCreateRuntimeBridge
  & GameSceneCreateWorldBridge
  & GameSceneCreateInputBridge
  & GameSceneCreateGameplayBridge
  & GameSceneCreateHudBridge
  & GameSceneCreatePauseBridge;

type RuntimeBootstrapScene = GameSceneCreateRuntimeBridge;
type WorldBootstrapScene = Phaser.Scene & GameSceneCreateRuntimeBridge & GameSceneCreateWorldBridge;
type InputBootstrapScene = Phaser.Scene & GameSceneCreateInputBridge;
type GameplayBootstrapScene = Phaser.Scene & GameSceneCreateGameplayBridge & Pick<GameSceneCreateWorldBridge, 'effectsManager'> & Pick<GameSceneCreateInputBridge, 'player'>;
type HudBootstrapScene = Phaser.Scene & GameSceneCreateHudBridge & Pick<GameSceneCreateInputBridge, 'player'>;
type PauseBootstrapScene = Phaser.Scene & GameSceneCreatePauseBridge & Pick<GameSceneCreateInputBridge, 'mobileControls'> & Pick<GameSceneCreateGameplayBridge, 'flow'>;

type BootstrapRuntimeState = ReturnType<RuntimeBootstrapScene['initializePlayerRunState']>;
type BootstrapLevelRuntime = ReturnType<typeof initializeLevelRuntime>;
type BootstrapAudioInitialization = ReturnType<RuntimeBootstrapScene['initializeAudioForLevel']>;
type BootstrapDependencies = {
  isTouchMobileDevice: typeof isTouchMobileDevice;
  initializeLevelRuntime: typeof initializeLevelRuntime;
  createWorldPresentation: typeof createWorldPresentation;
  createInputAndPlayer: typeof createInputAndPlayer;
  createPoolsAndGameplaySystems: typeof createPoolsAndGameplaySystems;
  createHudAndTransitions: typeof createHudAndTransitions;
  createPauseViewportWiring: typeof createPauseViewportWiring;
  showControlsHint: typeof showControlsHint;
};

const defaultBootstrapDependencies: BootstrapDependencies = {
  isTouchMobileDevice,
  initializeLevelRuntime,
  createWorldPresentation,
  createInputAndPlayer,
  createPoolsAndGameplaySystems,
  createHudAndTransitions,
  createPauseViewportWiring,
  showControlsHint,
};

function initializeRuntimeState(
  gameScene: RuntimeBootstrapScene,
  dependencies: Pick<BootstrapDependencies, 'initializeLevelRuntime'>
): {
  state: BootstrapRuntimeState;
  levelRuntime: BootstrapLevelRuntime;
  audioInitialization: BootstrapAudioInitialization;
} {
  gameScene.resetRuntimeState();
  gameScene.runtimeLifecycle.registerLifecycleHandlers();

  const state = gameScene.initializePlayerRunState();
  const levelRuntime = dependencies.initializeLevelRuntime(state);
  gameScene.levelManager = levelRuntime.levelManager;
  gameScene.scaledBossConfig = levelRuntime.scaledBossConfig;

  const audioInitialization = gameScene.initializeAudioForLevel(levelRuntime.levelConfig);

  return {
    state,
    levelRuntime,
    audioInitialization,
  };
}

function bootstrapWorldPresentation(
  gameScene: WorldBootstrapScene,
  levelConfig: BootstrapLevelRuntime['levelConfig'],
  levelNumber: number,
  audioInitialization: BootstrapAudioInitialization,
  dependencies: Pick<BootstrapDependencies, 'createWorldPresentation'>
): { playerSpawnPoint: { x: number; y: number } } {
  const worldPresentation = dependencies.createWorldPresentation({
    scene: gameScene,
    levelConfig,
    levelNumber,
    initialSection: audioInitialization.initialSection,
    initialSectionProgress: audioInitialization.initialSectionProgress,
    syncViewportBounds: () => {
      gameScene.syncViewportBounds();
    },
    getPlayerSpawnPoint: () => gameScene.getPlayerSpawnPoint(),
    registerScaleHandlers: () => {
      gameScene.runtimeLifecycle.registerScaleHandlers();
    },
  });

  gameScene.parallax = worldPresentation.parallax;
  gameScene.effectsManager = worldPresentation.effectsManager;

  return {
    playerSpawnPoint: worldPresentation.playerSpawnPoint,
  };
}

function bootstrapInputAndPlayer(
  gameScene: InputBootstrapScene,
  state: BootstrapRuntimeState,
  playerSpawnPoint: { x: number; y: number },
  dependencies: Pick<BootstrapDependencies, 'createInputAndPlayer'>
): void {
  const inputAndPlayer = dependencies.createInputAndPlayer({
    scene: gameScene,
    state,
    playerSpawnPoint,
  });

  gameScene.mobileControls = inputAndPlayer.mobileControls;
  gameScene.inputManager = inputAndPlayer.inputManager;
  gameScene.player = inputAndPlayer.player;
}

function bootstrapGameplaySystems(
  gameScene: GameplayBootstrapScene,
  levelConfig: BootstrapLevelRuntime['levelConfig'],
  state: BootstrapRuntimeState,
  dependencies: Pick<BootstrapDependencies, 'createPoolsAndGameplaySystems'>
): void {
  const gameplaySystems = dependencies.createPoolsAndGameplaySystems({
    scene: gameScene,
    player: gameScene.player,
    effectsManager: gameScene.effectsManager,
    levelConfig,
    state,
    isTerminalTransitionActive: () => gameScene.flow.isTerminalTransitionActive(),
    applyPowerUp: (type) => gameScene.applyPowerUp(type),
  });

  gameScene.bulletPool = gameplaySystems.bulletPool;
  gameScene.enemyPool = gameplaySystems.enemyPool;
  gameScene.lastLifeHelperWing = gameplaySystems.lastLifeHelperWing;
  gameScene.waveManager = gameplaySystems.waveManager;
  gameScene.collisionManager = gameplaySystems.collisionManager;
  gameScene.scoreManager = gameplaySystems.scoreManager;
  gameScene.powerUpGroup = gameplaySystems.powerUpGroup;
}

function bootstrapHudAndTransitions(
  gameScene: HudBootstrapScene,
  levelConfig: BootstrapLevelRuntime['levelConfig'],
  level: BootstrapRuntimeState['level'],
  dependencies: Pick<BootstrapDependencies, 'createHudAndTransitions'>
): void {
  const hudAndTransitions = dependencies.createHudAndTransitions({
    scene: gameScene,
    levelConfig,
    level,
    playerShields: gameScene.player.shields,
    lastHudShieldCount: gameScene.lastHudShieldCount,
  });

  gameScene.hud = hudAndTransitions.hud;
  gameScene.warpTransition = hudAndTransitions.warpTransition;
  gameScene.lastHudShieldCount = hudAndTransitions.lastHudShieldCount;
}

function bootstrapPauseAndViewportWiring(
  gameScene: PauseBootstrapScene,
  dependencies: Pick<BootstrapDependencies, 'createPauseViewportWiring'>
): void {
  const { pauseStateController, mobileViewportGuard } = dependencies.createPauseViewportWiring({
    scene: gameScene,
    stopPlayerMotion: () => gameScene.stopPlayerMotion(),
    getMobileControls: () => gameScene.mobileControls,
    captureCurrentRunStateForSave: () => gameScene.captureCurrentRunStateForSave(),
    canSaveCurrentRun: () => gameScene.canSaveCurrentRun(),
  });

  gameScene.pauseStateController = pauseStateController;
  gameScene.mobileViewportGuard = mobileViewportGuard;
  gameScene.mobileControls?.setPauseButtonHandler(() => {
    pauseStateController.togglePauseRequest(gameScene.flow.isGameplayLocked());
  });
}

export function runGameSceneCreateBootstrap(
  scene: GameSceneCreateBootstrapBridge,
  dependencies: BootstrapDependencies = defaultBootstrapDependencies
): void {
  const { state, levelRuntime, audioInitialization } = initializeRuntimeState(scene, dependencies);
  const { playerSpawnPoint } = bootstrapWorldPresentation(
    scene,
    levelRuntime.levelConfig,
    state.level,
    audioInitialization,
    dependencies
  );

  bootstrapInputAndPlayer(scene, state, playerSpawnPoint, dependencies);
  bootstrapGameplaySystems(scene, levelRuntime.levelConfig, state, dependencies);
  bootstrapHudAndTransitions(scene, levelRuntime.levelConfig, state.level, dependencies);
  bootstrapPauseAndViewportWiring(scene, dependencies);

  dependencies.showControlsHint(scene, { mobile: dependencies.isTouchMobileDevice() });
  scene.runtimeLifecycle.registerRuntimeHandlers();
}
