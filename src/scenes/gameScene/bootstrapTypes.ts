// Private structural contract for GameScene create-time orchestration only.
import type Phaser from 'phaser';

import type { BossConfig, getActiveSection } from '@/config/LevelsConfig';
import type { Player } from '@/entities/Player';
import type { PowerUpType } from '@/entities/PowerUp';
import type { BulletPool } from '@/systems/BulletPool';
import type { CollisionManager } from '@/systems/CollisionManager';
import type { EffectsManager } from '@/systems/EffectsManager';
import type { EnemyPool } from '@/systems/EnemyPool';
import type { HUD } from '@/systems/HUD';
import type { InputManager } from '@/systems/InputManager';
import type { LastLifeHelperWing } from '@/systems/LastLifeHelperWing';
import type { LevelManager } from '@/systems/LevelManager';
import type { MobileControls } from '@/systems/MobileControls';
import type { MobileViewportGuard } from '@/systems/MobileViewportGuard';
import type { ParallaxBackground } from '@/systems/ParallaxBackground';
import type { getPlayerState, PlayerStateData } from '@/systems/PlayerState';
import type { ScoreManager } from '@/systems/ScoreManager';
import type { WarpTransition } from '@/systems/WarpTransition';
import type { WaveManager } from '@/systems/WaveManager';

import type { PauseStateController } from './PauseStateController';
import type { createGameSceneRuntimeLifecycle } from './runtimeLifecycle';

type LevelConfig = ReturnType<LevelManager['getLevelConfig']>;
type PlayerRunState = ReturnType<typeof getPlayerState>;
type InitialSection = ReturnType<typeof getActiveSection>;
type RuntimeLifecycle = Pick<
  ReturnType<typeof createGameSceneRuntimeLifecycle>,
  'registerLifecycleHandlers' | 'registerScaleHandlers' | 'registerRuntimeHandlers'
>;

export type GameSceneCreateRuntimeBridge = {
  resetRuntimeState: () => void;
  initializePlayerRunState: () => PlayerRunState;
  initializeAudioForLevel: (levelConfig: LevelConfig) => {
    initialSection: InitialSection;
    initialSectionProgress: number;
  };
  runtimeLifecycle: RuntimeLifecycle;
  levelManager: LevelManager;
  scaledBossConfig: BossConfig | null;
};

export type GameSceneCreateWorldBridge = {
  syncViewportBounds: () => void;
  getPlayerSpawnPoint: () => { x: number; y: number };
  parallax: ParallaxBackground;
  effectsManager: EffectsManager;
};

export type GameSceneCreateInputBridge = {
  mobileControls: MobileControls | null;
  inputManager: InputManager;
  player: Player;
};

export type GameSceneCreateGameplayBridge = {
  applyPowerUp: (type: PowerUpType) => void;
  flow: {
    isTerminalTransitionActive: () => boolean;
    isGameplayLocked: () => boolean;
  };
  bulletPool: BulletPool;
  enemyPool: EnemyPool;
  lastLifeHelperWing: LastLifeHelperWing | null;
  waveManager: WaveManager;
  collisionManager: CollisionManager;
  scoreManager: ScoreManager;
  powerUpGroup: Phaser.Physics.Arcade.Group;
};

export type GameSceneCreateHudBridge = {
  hud: HUD;
  warpTransition: WarpTransition;
  lastHudShieldCount: number | null;
};

export type GameSceneCreatePauseBridge = {
  stopPlayerMotion: () => void;
  captureCurrentRunStateForSave: () => PlayerStateData;
  canSaveCurrentRun: () => boolean;
  pauseStateController: PauseStateController | null;
  mobileViewportGuard: MobileViewportGuard | null;
};

export type GameSceneCreateBootstrapBridge = Phaser.Scene
  & GameSceneCreateRuntimeBridge
  & GameSceneCreateWorldBridge
  & GameSceneCreateInputBridge
  & GameSceneCreateGameplayBridge
  & GameSceneCreateHudBridge
  & GameSceneCreatePauseBridge;
