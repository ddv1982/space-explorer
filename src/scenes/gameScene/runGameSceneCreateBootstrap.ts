import type Phaser from 'phaser';
import { type BossConfig, type getActiveSection } from '../../config/LevelsConfig';
import { type Player } from '../../entities/Player';
import { type PowerUpType } from '../../entities/PowerUp';
import { type BulletPool } from '../../systems/BulletPool';
import { type CollisionManager } from '../../systems/CollisionManager';
import { type EffectsManager } from '../../systems/EffectsManager';
import { type EnemyPool } from '../../systems/EnemyPool';
import { type HUD } from '../../systems/HUD';
import { type InputManager } from '../../systems/InputManager';
import { type LastLifeHelperWing } from '../../systems/LastLifeHelperWing';
import { type LevelManager } from '../../systems/LevelManager';
import { type MobileControls } from '../../systems/MobileControls';
import { type MobileViewportGuard } from '../../systems/MobileViewportGuard';
import { type ParallaxBackground } from '../../systems/ParallaxBackground';
import { type getPlayerState } from '../../systems/PlayerState';
import { type ScoreManager } from '../../systems/ScoreManager';
import { type WarpTransition } from '../../systems/WarpTransition';
import { type WaveManager } from '../../systems/WaveManager';
import { isTouchMobileDevice } from '../../utils/device';
import { createHudAndTransitions } from './createHudAndTransitions';
import { createInputAndPlayer } from './createInputAndPlayer';
import { createPoolsAndGameplaySystems } from './createPoolsAndGameplaySystems';
import { createWorldPresentation } from './createWorldPresentation';
import { initializeLevelRuntime } from './initializeLevelRuntime';
import type { PauseStateController } from './PauseStateController';
import { createPauseViewportWiring } from './pauseViewportWiring';
import { type createGameSceneRuntimeLifecycle } from './runtimeLifecycle';
import { showControlsHint } from './showControlsHint';

type LevelConfig = ReturnType<LevelManager['getLevelConfig']>;
type PlayerRunState = ReturnType<typeof getPlayerState>;
type InitialSection = ReturnType<typeof getActiveSection>;
type RuntimeLifecycle = Pick<
  ReturnType<typeof createGameSceneRuntimeLifecycle>,
  'registerLifecycleHandlers' | 'registerScaleHandlers' | 'registerRuntimeHandlers'
>;

type GameSceneCreateBootstrapBridge = Phaser.Scene & {
  resetRuntimeState: () => void;
  initializePlayerRunState: () => PlayerRunState;
  initializeAudioForLevel: (levelConfig: LevelConfig) => {
    initialSection: InitialSection;
    initialSectionProgress: number;
  };
  syncViewportBounds: () => void;
  getPlayerSpawnPoint: () => { x: number; y: number };
  stopPlayerMotion: () => void;
  applyPowerUp: (type: PowerUpType) => void;
  runtimeLifecycle: RuntimeLifecycle;
  flow: {
    isTerminalTransitionActive: () => boolean;
  };
  levelManager: LevelManager;
  scaledBossConfig: BossConfig | null;
  parallax: ParallaxBackground;
  effectsManager: EffectsManager;
  mobileControls: MobileControls | null;
  inputManager: InputManager;
  player: Player;
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  lastLifeHelperWing: LastLifeHelperWing | null;
  waveManager: WaveManager;
  collisionManager: CollisionManager;
  scoreManager: ScoreManager;
  powerUpGroup: Phaser.Physics.Arcade.Group;
  hud: HUD;
  warpTransition: WarpTransition;
  lastHudShieldCount: number | null;
  pauseStateController: PauseStateController | null;
  mobileViewportGuard: MobileViewportGuard | null;
};

export function runGameSceneCreateBootstrap(scene: unknown): void {
  const gameScene = scene as GameSceneCreateBootstrapBridge;

  gameScene.resetRuntimeState();
  gameScene.runtimeLifecycle.registerLifecycleHandlers();

  const state = gameScene.initializePlayerRunState();
  const { levelManager, levelConfig, scaledBossConfig } = initializeLevelRuntime(state);
  gameScene.levelManager = levelManager;
  gameScene.scaledBossConfig = scaledBossConfig;

  const { initialSection, initialSectionProgress } = gameScene.initializeAudioForLevel(levelConfig);
  const worldPresentation = createWorldPresentation({
    scene: gameScene,
    levelConfig,
    initialSection,
    initialSectionProgress,
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

  const inputAndPlayer = createInputAndPlayer({
    scene: gameScene,
    state,
    playerSpawnPoint: worldPresentation.playerSpawnPoint,
  });
  gameScene.mobileControls = inputAndPlayer.mobileControls;
  gameScene.inputManager = inputAndPlayer.inputManager;
  gameScene.player = inputAndPlayer.player;

  const gameplaySystems = createPoolsAndGameplaySystems({
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

  const hudAndTransitions = createHudAndTransitions({
    scene: gameScene,
    levelConfig,
    level: state.level,
    playerShields: gameScene.player.shields,
    lastHudShieldCount: gameScene.lastHudShieldCount,
  });
  gameScene.hud = hudAndTransitions.hud;
  gameScene.warpTransition = hudAndTransitions.warpTransition;
  gameScene.lastHudShieldCount = hudAndTransitions.lastHudShieldCount;

  const { pauseStateController, mobileViewportGuard } = createPauseViewportWiring({
    scene: gameScene,
    stopPlayerMotion: () => gameScene.stopPlayerMotion(),
    getMobileControls: () => gameScene.mobileControls,
  });
  gameScene.pauseStateController = pauseStateController;
  gameScene.mobileViewportGuard = mobileViewportGuard;

  showControlsHint(gameScene, { mobile: isTouchMobileDevice() });
  gameScene.runtimeLifecycle.registerRuntimeHandlers();
}
