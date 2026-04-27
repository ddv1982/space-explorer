import Phaser from 'phaser';
import {
  getActiveSection,
  getSectionProgress,
  type BossConfig,
} from '../config/LevelsConfig';
import { type ParallaxBackground } from '../systems/ParallaxBackground';
import type { InputManager } from '../systems/InputManager';
import type { Player } from '../entities/Player';
import { BulletPool } from '../systems/BulletPool';
import { EnemyPool } from '../systems/EnemyPool';
import { CollisionManager } from '../systems/CollisionManager';
import { WaveManager } from '../systems/WaveManager';
import { ScoreManager } from '../systems/ScoreManager';
import type { HUD } from '../systems/HUD';
import { LevelManager } from '../systems/LevelManager';
import { type EffectsManager } from '../systems/EffectsManager';
import { getPlayerState } from '../systems/PlayerState';
import { Boss } from '../entities/enemies/Boss';
import type { WarpTransition } from '../systems/WarpTransition';
import { audioManager } from '../systems/AudioManager';
import { PowerUpType } from '../entities/PowerUp';
import { applyPowerUpPickup, GAME_SCENE_EVENTS } from '../systems/GameplayFlow';
import { GameSceneFlowController, type GameSceneFlowContext } from './gameScene/GameSceneFlowController';
import { PauseStateController } from './gameScene/PauseStateController';
import { LastLifeHelperWing } from '../systems/LastLifeHelperWing';
import { MobileViewportGuard } from '../systems/MobileViewportGuard';
import { runGameSceneCreateBootstrap } from './gameScene/runGameSceneCreateBootstrap';
import type { MobileControls } from '../systems/MobileControls';
import { resolveSectionMusicIntensity } from '../systems/sectionIdentity';
import { resolveRespawnFrameProbeEnabled } from './gameScene/respawnFrameProbe';
import { type SceneEventBinding } from './gameScene/sceneEvents';
import {
  clampPlayerToViewport,
  getPlayerSpawnPoint,
  syncSceneViewport,
} from './gameScene/viewport';
import { createGameSceneRuntimeLifecycle } from './gameScene/runtimeLifecycle';
import { runGameSceneUpdateFrame } from './gameScene/updateFrame';
import { createGameSceneGameplayFrameBehavior } from './gameScene/gameplayFrameBehavior';
import { createGameSceneCombatFeedbackHandlers, runBestEffort } from './gameScene/combatFeedbackHandlers';
import {
  persistHelperWingState,
  syncLastLifeHelperWingState,
} from './gameScene/helperWingStateBridge';
import { createGameSceneFlowContext } from './gameScene/flowContextBridge';
import { updateHud as updateHudOrchestration } from './gameScene/hudSyncOrchestration';

export class GameScene extends Phaser.Scene {
  private static readonly BOSS_EXPLOSION_VISUAL_INTENSITY = 3.0;
  private static readonly BOSS_EXPLOSION_AUDIO_INTENSITY = 2.0;
  private static readonly PLAYER_DEATH_EXPLOSION_VISUAL_INTENSITY = 2.2;
  private static readonly PLAYER_DEATH_EXPLOSION_AUDIO_INTENSITY = 1.4;
  private static readonly PLAYER_DEATH_PARTICLE_BUDGET_SCALE = 0.6;

  private parallax!: ParallaxBackground;
  private inputManager!: InputManager;
  private player!: Player;
  private bulletPool!: BulletPool;
  private enemyPool!: EnemyPool;
  private collisionManager!: CollisionManager;
  private waveManager!: WaveManager;
  private scoreManager!: ScoreManager;
  private hud!: HUD;
  private levelManager!: LevelManager;
  private effectsManager!: EffectsManager;
  private warpTransition!: WarpTransition;
  private mobileViewportGuard: MobileViewportGuard | null = null;
  private pauseStateController: PauseStateController | null = null;
  private mobileControls: MobileControls | null = null;
  private scaledBossConfig: BossConfig | null = null;
  private powerUpGroup!: Phaser.Physics.Arcade.Group;
  private readonly flow = new GameSceneFlowController();
  private lastFireTime: number = 0;
  private boss: Boss | null = null;
  private lastLifeHelperWing: LastLifeHelperWing | null = null;
  private lastHudShieldCount: number | null = null;
  private readonly shotDirection = new Phaser.Math.Vector2();
  private readonly shotOrigin = new Phaser.Math.Vector2();
  private readonly muzzleFlashOrigin = new Phaser.Math.Vector2();
  private readonly combatFeedbackHandlers = createGameSceneCombatFeedbackHandlers({
    scene: this,
    player: () => this.player,
    scoreManager: () => this.scoreManager,
    effectsManager: () => this.effectsManager,
    flow: () => this.flow,
    getFlowContext: () => this.getFlowContext(),
    levelManager: () => this.levelManager,
    collisionManager: () => this.collisionManager,
    enemyPool: () => this.enemyPool,
    hud: () => this.hud,
    getBoss: () => this.boss,
    setBoss: (boss) => {
      this.boss = boss;
    },
    getScaledBossConfig: () => this.scaledBossConfig,
    getLastLifeHelperWing: () => this.lastLifeHelperWing,
    powerUpGroup: () => this.powerUpGroup,
    persistHelperWingState: () => persistHelperWingState(this.registry, this.lastLifeHelperWing),
    syncLastLifeHelperWingState: () =>
      syncLastLifeHelperWingState(this.lastLifeHelperWing, this.flow.getRemainingLives()),
    constants: {
      bossExplosionVisualIntensity: GameScene.BOSS_EXPLOSION_VISUAL_INTENSITY,
      bossExplosionAudioIntensity: GameScene.BOSS_EXPLOSION_AUDIO_INTENSITY,
      playerDeathExplosionVisualIntensity: GameScene.PLAYER_DEATH_EXPLOSION_VISUAL_INTENSITY,
      playerDeathExplosionAudioIntensity: GameScene.PLAYER_DEATH_EXPLOSION_AUDIO_INTENSITY,
      playerDeathParticleBudgetScale: GameScene.PLAYER_DEATH_PARTICLE_BUDGET_SCALE,
    },
  });
  private readonly sceneEventBindings: SceneEventBinding[] = [
    { event: GAME_SCENE_EVENTS.enemyDeath, handler: this.combatFeedbackHandlers.handleEnemyDeath },
    { event: GAME_SCENE_EVENTS.playerDeath, handler: this.combatFeedbackHandlers.handlePlayerDeath },
    { event: GAME_SCENE_EVENTS.playerFatalHit, handler: this.combatFeedbackHandlers.handlePlayerFatalHit },
    { event: GAME_SCENE_EVENTS.levelComplete, handler: this.combatFeedbackHandlers.handleLevelComplete },
    { event: GAME_SCENE_EVENTS.bossSpawn, handler: this.combatFeedbackHandlers.handleBossSpawn },
    { event: GAME_SCENE_EVENTS.playerHit, handler: this.combatFeedbackHandlers.handlePlayerHit },
    { event: GAME_SCENE_EVENTS.playerExhaust, handler: this.combatFeedbackHandlers.handlePlayerExhaust },
    { event: GAME_SCENE_EVENTS.enemySpawnWarning, handler: this.combatFeedbackHandlers.handleEnemySpawnWarning },
    { event: GAME_SCENE_EVENTS.bossDeath, handler: this.combatFeedbackHandlers.handleBossDeath },
    { event: GAME_SCENE_EVENTS.bossPhaseChange, handler: this.combatFeedbackHandlers.handleBossPhaseChange },
    { event: GAME_SCENE_EVENTS.helperWingActivated, handler: this.combatFeedbackHandlers.handleHelperWingActivated },
    { event: GAME_SCENE_EVENTS.helperWingDepleted, handler: this.combatFeedbackHandlers.handleHelperWingDepleted },
    { event: GAME_SCENE_EVENTS.playerBulletTrail, handler: this.combatFeedbackHandlers.handlePlayerBulletTrail },
    { event: GAME_SCENE_EVENTS.enemyBulletTrail, handler: this.combatFeedbackHandlers.handleEnemyBulletTrail },
  ];
  private readonly runtimeLifecycle = createGameSceneRuntimeLifecycle({
    scene: this,
    sceneEventBindings: this.sceneEventBindings,
    syncLastLifeHelperWingState: () =>
      syncLastLifeHelperWingState(this.lastLifeHelperWing, this.flow.getRemainingLives()),
    getScaleResizeContext: () => ({
      scene: this,
      parallax: this.parallax,
      mobileControls: this.mobileControls,
      hud: this.hud,
      warpTransition: this.warpTransition,
      pauseStateController: this.pauseStateController,
      clampPlayerToViewport: () => this.clampPlayerToViewport(),
    }),
    destroyMobileViewportGuard: () => {
      this.mobileViewportGuard?.destroy();
      this.mobileViewportGuard = null;
    },
    destroyPauseStateController: () => {
      this.pauseStateController?.destroy();
      this.pauseStateController = null;
    },
    destroyMobileControls: () => {
      this.mobileControls?.destroy();
      this.mobileControls = null;
    },
    persistHelperWingState: () => persistHelperWingState(this.registry, this.lastLifeHelperWing),
    destroyLastLifeHelperWing: () => {
      this.lastLifeHelperWing?.destroy();
      this.lastLifeHelperWing = null;
    },
    destroyParallax: () => {
      this.parallax?.destroy();
    },
    destroyEffectsManager: () => {
      this.effectsManager?.destroy();
    },
    shutdownFlow: () => {
      this.flow.shutdown(this.collisionManager);
    },
    resetRuntimeStateAfterShutdown: () => {
      this.lastFireTime = 0;
      this.boss = null;
      this.lastHudShieldCount = null;
    },
  });

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    runGameSceneCreateBootstrap(this);
  }

  private resetRuntimeState(): void {
    this.lastFireTime = 0;
    this.boss = null;
    this.lastLifeHelperWing = null;
    this.scaledBossConfig = null;
    this.lastHudShieldCount = null;
  }

  private initializePlayerRunState(): ReturnType<typeof getPlayerState> {
    const state = getPlayerState(this.registry);
    this.flow.reset(state.remainingLives);
    this.flow.setRespawnFrameProbeEnabled(resolveRespawnFrameProbeEnabled());
    return state;
  }

  private initializeAudioForLevel(levelConfig: ReturnType<LevelManager['getLevelConfig']>): {
    initialSection: ReturnType<typeof getActiveSection>;
    initialSectionProgress: number;
  } {
    audioManager.init();
    audioManager.startMusic(levelConfig.music.stage);

    const initialSection = getActiveSection(levelConfig, 0);
    const initialSectionProgress = initialSection ? getSectionProgress(initialSection, 0) : 0;
    audioManager.setMusicIntensity(resolveSectionMusicIntensity(initialSection, initialSectionProgress));

    return { initialSection, initialSectionProgress };
  }

  private getPlayerSpawnPoint(): { x: number; y: number } {
    return getPlayerSpawnPoint(this);
  }

  private syncViewportBounds(): ReturnType<typeof syncSceneViewport> {
    return syncSceneViewport(this);
  }

  private clampPlayerToViewport(): void {
    clampPlayerToViewport(this, this.player);
  }

  private syncViewportIfNeeded(): void {
    this.runtimeLifecycle.syncViewportIfNeeded();
  }

  private stopPlayerMotion(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      return;
    }

    this.player.isMovingUp = false;
    this.player.setAcceleration(0, 0);
    body.stop();
  }

  private applyPowerUp(type: PowerUpType): void {
    applyPowerUpPickup(this, this.player, this.effectsManager, type);
  }

  private getFlowContext(): GameSceneFlowContext {
    return createGameSceneFlowContext({
      scene: this,
      registry: this.registry,
      player: this.player,
      collisionManager: this.collisionManager,
      levelManager: this.levelManager,
      scoreManager: this.scoreManager,
      warpTransition: this.warpTransition,
      stopPlayerMotion: () => this.stopPlayerMotion(),
      runBestEffort,
      getPlayerRespawnPosition: () => this.getPlayerSpawnPoint(),
    });
  }

  private updateHud(): void {
    this.lastHudShieldCount = updateHudOrchestration({
      hud: this.hud,
      player: this.player,
      scoreManager: this.scoreManager,
      levelManager: this.levelManager,
      flow: this.flow,
      lastHudShieldCount: this.lastHudShieldCount,
    });
  }

  private createGameplayFrameBehavior() {
    return createGameSceneGameplayFrameBehavior({
      inputManager: this.inputManager,
      pauseStateController: this.pauseStateController,
      flow: this.flow,
      parallax: this.parallax,
      player: this.player,
      lastLifeHelperWing: this.lastLifeHelperWing,
      waveManager: this.waveManager,
      levelManager: this.levelManager,
      events: this.events,
      hud: this.hud,
      bulletPool: this.bulletPool,
      effectsManager: this.effectsManager,
      boss: this.boss,
      getLastFireTime: () => this.lastFireTime,
      setLastFireTime: (nextTime: number) => {
        this.lastFireTime = nextTime;
      },
      shotDirection: this.shotDirection,
      shotOrigin: this.shotOrigin,
      muzzleFlashOrigin: this.muzzleFlashOrigin,
    });
  }

  update(time: number, delta: number): void {
    const frameBehavior = this.createGameplayFrameBehavior();

    runGameSceneUpdateFrame(
      {
        syncViewportIfNeeded: () => this.syncViewportIfNeeded(),
        handlePauseInput: () => frameBehavior.handlePauseInput(),
        isPausedOrLockedFrame: () => frameBehavior.isPausedOrLockedFrame(),
        updatePausedFrame: (pausedDelta) => frameBehavior.updatePausedFrame(pausedDelta, () => this.updateHud()),
        updateGameplayFrame: (gameTime, gameDelta) => frameBehavior.updateGameplayFrame(gameTime, gameDelta),
        updateHud: () => this.updateHud(),
      },
      time,
      delta
    );
  }
}

