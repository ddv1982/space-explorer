import Phaser from 'phaser';

import type { getActiveSection } from '@/config/LevelsConfig';
import type { PowerUpType } from '@/entities/PowerUp';
import { isTouchMobileDevice } from '@/utils/device';
import { onHardwareKeyboardDetected } from '@/systems/hardwareKeyboardDetection';
import type { LevelManager } from '@/systems/LevelManager';
import type { getPlayerState, PlayerStateData } from '@/systems/PlayerState';

import { createHudAndTransitions } from './createHudAndTransitions';
import { createInputAndPlayer } from './createInputAndPlayer';
import { createPoolsAndGameplaySystems } from './createPoolsAndGameplaySystems';
import { createWorldPresentation } from './createWorldPresentation';
import { initializeLevelRuntime } from './initializeLevelRuntime';
import { createPauseViewportWiring } from './pauseViewportWiring';
import type { createGameSceneRuntimeLifecycle } from './runtimeLifecycle';
import { showControlsHint } from './showControlsHint';

type PlayerRunState = ReturnType<typeof getPlayerState>;
type LevelConfig = ReturnType<LevelManager['getLevelConfig']>;
type InitialSection = ReturnType<typeof getActiveSection>;
type RuntimeLifecycle = Pick<
  ReturnType<typeof createGameSceneRuntimeLifecycle>,
  'registerLifecycleHandlers' | 'registerScaleHandlers'
>;

export type GameSceneBootstrapHost = {
  scene: Phaser.Scene;
  runtimeLifecycle: RuntimeLifecycle;
  previousHudShieldCount: number | null;
  resetRuntimeState: () => void;
  initializePlayerRunState: () => PlayerRunState;
  initializeAudioForLevel: (levelConfig: LevelConfig) => {
    initialSection: InitialSection;
    initialSectionProgress: number;
  };
  syncViewportBounds: () => void;
  getPlayerSpawnPoint: () => { x: number; y: number };
  applyPowerUp: (type: PowerUpType) => void;
  isTerminalTransitionActive: () => boolean;
  isGameplayLocked: () => boolean;
  stopPlayerMotion: () => void;
  captureCurrentRunStateForSave: () => PlayerStateData;
  canSaveCurrentRun: () => boolean;
};

export type GameSceneBootstrapRuntime = {
  levelManager: ReturnType<typeof initializeLevelRuntime>['levelManager'];
  parallax: ReturnType<typeof createWorldPresentation>['parallax'];
  effectsManager: ReturnType<typeof createWorldPresentation>['effectsManager'];
  mobileControls: ReturnType<typeof createInputAndPlayer>['mobileControls'];
  inputManager: ReturnType<typeof createInputAndPlayer>['inputManager'];
  player: ReturnType<typeof createInputAndPlayer>['player'];
  bulletPool: ReturnType<typeof createPoolsAndGameplaySystems>['bulletPool'];
  enemyPool: ReturnType<typeof createPoolsAndGameplaySystems>['enemyPool'];
  lastLifeHelperWing: ReturnType<typeof createPoolsAndGameplaySystems>['lastLifeHelperWing'];
  picketTurrets: ReturnType<typeof createPoolsAndGameplaySystems>['picketTurrets'];
  waveManager: ReturnType<typeof createPoolsAndGameplaySystems>['waveManager'];
  collisionManager: ReturnType<typeof createPoolsAndGameplaySystems>['collisionManager'];
  scoreManager: ReturnType<typeof createPoolsAndGameplaySystems>['scoreManager'];
  grazeSurge: ReturnType<typeof createPoolsAndGameplaySystems>['grazeSurge'];
  powerUpGroup: ReturnType<typeof createPoolsAndGameplaySystems>['powerUpGroup'];
  shipSystems: ReturnType<typeof createPoolsAndGameplaySystems>['shipSystems'];
  hud: ReturnType<typeof createHudAndTransitions>['hud'];
  warpTransition: ReturnType<typeof createHudAndTransitions>['warpTransition'];
  lastHudShieldCount: ReturnType<typeof createHudAndTransitions>['lastHudShieldCount'];
  pauseStateController: ReturnType<typeof createPauseViewportWiring>['pauseStateController'];
};

type BootstrapDependencies = {
  isTouchMobileDevice: typeof isTouchMobileDevice;
  onHardwareKeyboardDetected: typeof onHardwareKeyboardDetected;
  initializeLevelRuntime: typeof initializeLevelRuntime;
  createWorldPresentation: typeof createWorldPresentation;
  createInputAndPlayer: typeof createInputAndPlayer;
  createPoolsAndGameplaySystems: typeof createPoolsAndGameplaySystems;
  createHudAndTransitions: typeof createHudAndTransitions;
  createPauseViewportWiring: typeof createPauseViewportWiring;
  showControlsHint: typeof showControlsHint;
};

const defaultDependencies: BootstrapDependencies = {
  isTouchMobileDevice,
  onHardwareKeyboardDetected,
  initializeLevelRuntime,
  createWorldPresentation,
  createInputAndPlayer,
  createPoolsAndGameplaySystems,
  createHudAndTransitions,
  createPauseViewportWiring,
  showControlsHint,
};

export function runGameSceneCreateBootstrap(
  host: GameSceneBootstrapHost,
  dependencies: BootstrapDependencies = defaultDependencies
): GameSceneBootstrapRuntime {
  host.resetRuntimeState();
  host.runtimeLifecycle.registerLifecycleHandlers();

  const state = host.initializePlayerRunState();
  const levelRuntime = dependencies.initializeLevelRuntime(state);
  const audio = host.initializeAudioForLevel(levelRuntime.levelConfig);
  const world = dependencies.createWorldPresentation({
    scene: host.scene,
    levelConfig: levelRuntime.levelConfig,
    initialSection: audio.initialSection,
    initialSectionProgress: audio.initialSectionProgress,
    syncViewportBounds: host.syncViewportBounds,
    getPlayerSpawnPoint: host.getPlayerSpawnPoint,
    registerScaleHandlers: host.runtimeLifecycle.registerScaleHandlers,
  });
  const input = dependencies.createInputAndPlayer({
    scene: host.scene,
    state,
    playerSpawnPoint: world.playerSpawnPoint,
  });
  const gameplay = dependencies.createPoolsAndGameplaySystems({
    scene: host.scene,
    player: input.player,
    effectsManager: world.effectsManager,
    levelConfig: levelRuntime.levelConfig,
    state,
    isTerminalTransitionActive: host.isTerminalTransitionActive,
    applyPowerUp: host.applyPowerUp,
  });
  const presentation = dependencies.createHudAndTransitions({
    scene: host.scene,
    levelConfig: levelRuntime.levelConfig,
    level: state.level,
    playerShields: input.player.shields,
    lastHudShieldCount: host.previousHudShieldCount,
  });
  const { pauseStateController } = dependencies.createPauseViewportWiring({
    scene: host.scene,
    stopPlayerMotion: host.stopPlayerMotion,
    getMobileControls: () => input.mobileControls,
    captureCurrentRunStateForSave: host.captureCurrentRunStateForSave,
    canSaveCurrentRun: host.canSaveCurrentRun,
    shipSystems: {
      getSystems: () => gameplay.shipSystems.getSystems(),
      cycleSystem: (slot) => gameplay.shipSystems.cycleSystem(slot),
      hasSpecialGuns: () => gameplay.shipSystems.getGun() !== null,
    },
  });

  input.mobileControls.setPauseButtonHandler(() => {
    pauseStateController.togglePauseRequest(host.isGameplayLocked());
  });
  // Every keypress hands steering to the keyboard (stopping touch autofire); only a real touch hands it
  // back, so trackpad or mouse clicks on hybrid devices never re-enable autofire.
  const suppressTouchSteering = (): void => {
    input.mobileControls.setTouchSteeringSuppressed(true);
  };
  const unsubscribeKeyboard = dependencies.onHardwareKeyboardDetected(suppressTouchSteering);
  const restoreTouchSteering = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.wasTouch) input.mobileControls.setTouchSteeringSuppressed(false);
  };
  host.scene.input.on('pointerdown', restoreTouchSteering);
  host.scene.input.keyboard?.on('keydown', suppressTouchSteering);
  const unsubscribeInput = (): void => {
    unsubscribeKeyboard();
    host.scene.input.off('pointerdown', restoreTouchSteering);
    host.scene.input.keyboard?.off('keydown', suppressTouchSteering);
  };
  host.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribeInput);
  dependencies.showControlsHint(host.scene, {
    mobile: dependencies.isTouchMobileDevice(),
    gunSwap: gameplay.shipSystems.getGun() !== null,
  });

  return {
    levelManager: levelRuntime.levelManager,
    ...world,
    ...input,
    ...gameplay,
    ...presentation,
    pauseStateController,
  };
}
