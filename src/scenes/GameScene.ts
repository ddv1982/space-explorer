import Phaser from 'phaser';
import { finishShipyardLoading, queueShipyardAssets } from '../utils/shipyardAssets';

import { getActiveSection, getSectionProgress, type BossConfig } from '@/config/LevelsConfig';
import type { Player } from '@/entities/Player';
import type { Boss } from '@/entities/enemies/Boss';
import type { PowerUpType } from '@/entities/PowerUp';
import { audioManager } from '@/systems/AudioManager';
import type { BulletPool } from '@/systems/BulletPool';
import type { CollisionManager } from '@/systems/CollisionManager';
import type { EffectsManager } from '@/systems/EffectsManager';
import type { EnemyPool } from '@/systems/EnemyPool';
import { applyPowerUpPickup, GAME_SCENE_EVENTS } from '@/systems/GameplayFlow';
import type { HUD } from '@/systems/HUD';
import type { InputManager } from '@/systems/InputManager';
import type { LastLifeHelperWing } from '@/systems/LastLifeHelperWing';
import type { LevelManager } from '@/systems/LevelManager';
import type { MobileControls } from '@/systems/MobileControls';
import type { ParallaxBackground } from '@/systems/ParallaxBackground';
import type { PicketTurretSystem } from '@/systems/PicketTurretSystem';
import {
  getPlayerState,
  noteRunDifficulty,
  saveHelperWingState,
  setPlayerState,
  setRunSummary,
  type PersistentHelperWingState,
  type PlayerStateData,
} from '@/systems/PlayerState';
import type { GrazeSurgeSystem } from '@/systems/GrazeSurgeSystem';
import type { ScoreManager } from '@/systems/ScoreManager';
import { resolveSectionMusicIntensity } from '@/systems/sectionIdentity';
import type { WarpTransition } from '@/systems/WarpTransition';
import type { WaveManager } from '@/systems/WaveManager';
import { runBestEffort } from '@/utils/runBestEffort';

import { createGameSceneCombatFeedbackHandlers } from './gameScene/combatFeedbackHandlers';
import { GameSceneFlowController, type GameSceneFlowContext } from './gameScene/GameSceneFlowController';
import {
  createGameSceneGameplayFrameBehavior,
  type GameSceneGameplayFrameBehavior,
} from './gameScene/gameplayFrameBehavior';
import { updateHud as updateHudOrchestration } from './gameScene/hudSyncOrchestration';
import { PauseStateController } from './gameScene/PauseStateController';
import { resolveRespawnFrameProbeEnabled } from './gameScene/respawnFrameProbe';
import { createGameSceneRuntimeLifecycle } from './gameScene/runtimeLifecycle';
import { runGameSceneCreateBootstrap, type GameSceneBootstrapRuntime } from './gameScene/runGameSceneCreateBootstrap';
import type { SceneEventBinding } from './gameScene/sceneEvents';
import { GameplayClock, runGameSceneUpdateFrame } from './gameScene/updateFrame';
import { HitStop } from '@/systems/HitStop';
import { getGameplayDifficultyTier } from '@/config/gameplayDifficulty';
import type { ShipSystemsRuntime } from '@/systems/ShipSystemsRuntime';
import { getShipSystemName } from '@/config/shipSystems';
import { createShipLabel } from '@/systems/effects/ephemeralOverlayTweens';
import { NEON_TEXT } from './shared/neonUiTheme';
import { clampPlayerToViewport, getPlayerSpawnPoint, syncSceneViewport } from './gameScene/viewport';
import { startRegisteredScene } from './sceneRegistry';

export class GameScene extends Phaser.Scene {
  private static readonly BOSS_EXPLOSION_VISUAL_INTENSITY = 3.0;
  private static readonly PLAYER_DEATH_EXPLOSION_VISUAL_INTENSITY = 2.2;
  private static readonly PLAYER_DEATH_PARTICLE_BUDGET_SCALE = 0.6;

  private parallax!: ParallaxBackground;
  private inputManager!: InputManager;
  private player!: Player;
  private bulletPool!: BulletPool;
  private enemyPool!: EnemyPool;
  private collisionManager!: CollisionManager;
  private waveManager!: WaveManager;
  private scoreManager!: ScoreManager;
  private grazeSurge!: GrazeSurgeSystem;
  private hud!: HUD;
  private levelManager!: LevelManager;
  private effectsManager!: EffectsManager;
  private warpTransition!: WarpTransition;
  private pauseStateController: PauseStateController | null = null;
  private mobileControls: MobileControls | null = null;
  private scaledBossConfig: BossConfig | null = null;
  private powerUpGroup!: Phaser.Physics.Arcade.Group;
  private shipSystems!: ShipSystemsRuntime;
  private readonly flow = new GameSceneFlowController();
  private boss: Boss | null = null;
  private lastLifeHelperWing: LastLifeHelperWing | null = null;
  private picketTurrets: PicketTurretSystem | null = null;
  private lastHudShieldCount: number | null = null;
  private readonly shotDirection = new Phaser.Math.Vector2();
  private readonly shotOrigin = new Phaser.Math.Vector2();
  private readonly muzzleFlashOrigin = new Phaser.Math.Vector2();
  private gameplayFrameBehavior: GameSceneGameplayFrameBehavior | null = null;
  private readonly gameplayClock = new GameplayClock();
  private readonly hitStop = new HitStop({
    isPaused: () => this.physics.world.isPaused,
    pause: () => this.physics.world.pause(),
    resume: () => this.physics.world.resume(),
    isHeldElsewhere: () =>
      Boolean(this.pauseStateController?.isGameplayPaused()) || Boolean(this.flow?.isRespawnScenePaused()),
  });
  private readonly sceneEventBindings: SceneEventBinding[] = [];
  private readonly runtimeLifecycle = this.createRuntimeLifecycle();

  constructor() {
    super({ key: 'Game' });
  }

  preload(): void {
    queueShipyardAssets(this);
  }

  create(): void {
    if (!finishShipyardLoading(this)) return;
    this.gameplayClock.reset();
    this.hitStop.reset();
    const runtime = runGameSceneCreateBootstrap({
      scene: this,
      runtimeLifecycle: this.runtimeLifecycle,
      previousHudShieldCount: this.lastHudShieldCount,
      resetRuntimeState: () => this.resetRuntimeState(),
      initializePlayerRunState: () => this.initializePlayerRunState(),
      initializeAudioForLevel: (levelConfig) => this.initializeAudioForLevel(levelConfig),
      syncViewportBounds: () => this.syncViewportBounds(),
      getPlayerSpawnPoint: () => this.getPlayerSpawnPoint(),
      applyPowerUp: (type) => this.applyPowerUp(type),
      isTerminalTransitionActive: () => this.flow.isTerminalTransitionActive(),
      isGameplayLocked: () => this.flow.isGameplayLocked(),
      stopPlayerMotion: () => this.stopPlayerMotion(),
      captureCurrentRunStateForSave: () => this.captureCurrentRunStateForSave(),
      canSaveCurrentRun: () => this.canSaveCurrentRun(),
      getGameplayNow: () => this.gameplayClock.now,
    });
    this.installBootstrapRuntime(runtime);
    const handlers = this.createCombatFeedbackHandlers();
    this.sceneEventBindings.push(...this.createSceneEventBindings(handlers));
    this.runtimeLifecycle.registerSceneEventHandlers();
    this.syncLastLifeHelperWingState();
    this.gameplayFrameBehavior = this.createGameplayFrameBehavior();
  }

  private installBootstrapRuntime(runtime: GameSceneBootstrapRuntime): void {
    this.levelManager = runtime.levelManager;
    this.scaledBossConfig = runtime.scaledBossConfig;
    this.parallax = runtime.parallax;
    this.effectsManager = runtime.effectsManager;
    this.mobileControls = runtime.mobileControls;
    this.inputManager = runtime.inputManager;
    this.player = runtime.player;
    this.bulletPool = runtime.bulletPool;
    this.enemyPool = runtime.enemyPool;
    this.lastLifeHelperWing = runtime.lastLifeHelperWing;
    this.picketTurrets = runtime.picketTurrets;
    this.waveManager = runtime.waveManager;
    this.collisionManager = runtime.collisionManager;
    this.scoreManager = runtime.scoreManager;
    this.grazeSurge = runtime.grazeSurge;
    this.powerUpGroup = runtime.powerUpGroup;
    this.shipSystems = runtime.shipSystems;
    this.effectsManager.attachEngine(this.player);
    this.hud = runtime.hud;
    this.warpTransition = runtime.warpTransition;
    this.lastHudShieldCount = runtime.lastHudShieldCount;
    this.pauseStateController = runtime.pauseStateController;
  }

  private resetRuntimeState(): void {
    this.runtimeLifecycle.removeSceneEventHandlers();
    this.sceneEventBindings.length = 0;
    this.boss = null;
    this.lastLifeHelperWing = null;
    this.picketTurrets = null;
    this.scaledBossConfig = null;
    this.lastHudShieldCount = null;
    this.gameplayFrameBehavior = null;
  }

  private initializePlayerRunState(): ReturnType<typeof getPlayerState> {
    noteRunDifficulty(this.registry, getGameplayDifficultyTier());
    const state = getPlayerState(this.registry);
    this.flow.reset(state.remainingLives);
    this.flow.setRespawnFrameProbeEnabled(resolveRespawnFrameProbeEnabled());
    return state;
  }

  private createCombatFeedbackHandlers() {
    return createGameSceneCombatFeedbackHandlers({
      scene: this,
      player: this.player,
      scoreManager: this.scoreManager,
      effectsManager: this.effectsManager,
      flow: this.flow,
      getFlowContext: () => this.getFlowContext(),
      levelManager: this.levelManager,
      collisionManager: this.collisionManager,
      waveManager: this.waveManager,
      grazeSurge: this.grazeSurge,
      enemyPool: this.enemyPool,
      hud: this.hud,
      getBoss: () => this.boss,
      setBoss: (boss) => {
        this.boss = boss;
      },
      scaledBossConfig: this.scaledBossConfig,
      lastLifeHelperWing: this.lastLifeHelperWing,
      picketTurrets: this.picketTurrets,
      powerUpGroup: this.powerUpGroup,
      persistHelperWingState: () => this.persistHelperWingState(),
      syncLastLifeHelperWingState: () => this.syncLastLifeHelperWingState(),
      getGameplayNow: () => this.gameplayClock.now,
      getShipSystems: () => this.shipSystems.getSystems(),
      hitStop: (durationMs) => this.hitStop.trigger(durationMs),
      constants: {
        bossExplosionVisualIntensity: GameScene.BOSS_EXPLOSION_VISUAL_INTENSITY,
        playerDeathExplosionVisualIntensity: GameScene.PLAYER_DEATH_EXPLOSION_VISUAL_INTENSITY,
        playerDeathParticleBudgetScale: GameScene.PLAYER_DEATH_PARTICLE_BUDGET_SCALE,
      },
    });
  }

  private createSceneEventBindings(
    handlers: ReturnType<typeof createGameSceneCombatFeedbackHandlers>
  ): SceneEventBinding[] {
    return [
      { event: GAME_SCENE_EVENTS.enemyDeath, handler: handlers.handleEnemyDeath },
      { event: GAME_SCENE_EVENTS.playerDeath, handler: handlers.handlePlayerDeath },
      { event: GAME_SCENE_EVENTS.playerFatalHit, handler: handlers.handlePlayerFatalHit },
      { event: GAME_SCENE_EVENTS.levelComplete, handler: handlers.handleLevelComplete },
      { event: GAME_SCENE_EVENTS.bossSpawn, handler: handlers.handleBossSpawn },
      { event: GAME_SCENE_EVENTS.playerHit, handler: handlers.handlePlayerHit },
      { event: GAME_SCENE_EVENTS.playerExhaust, handler: handlers.handlePlayerExhaust },
      { event: GAME_SCENE_EVENTS.enemySpawnWarning, handler: handlers.handleEnemySpawnWarning },
      { event: GAME_SCENE_EVENTS.wormholeTelegraph, handler: handlers.handleWormholeTelegraph },
      { event: GAME_SCENE_EVENTS.eliteWave, handler: handlers.handleEliteWave },
      { event: GAME_SCENE_EVENTS.bossDeath, handler: handlers.handleBossDeath },
      { event: GAME_SCENE_EVENTS.bossPhaseChange, handler: handlers.handleBossPhaseChange },
      { event: GAME_SCENE_EVENTS.helperWingActivated, handler: handlers.handleHelperWingActivated },
      { event: GAME_SCENE_EVENTS.helperWingDepleted, handler: handlers.handleHelperWingDepleted },
      { event: GAME_SCENE_EVENTS.playerBulletTrail, handler: handlers.handlePlayerBulletTrail },
      { event: GAME_SCENE_EVENTS.enemyBulletTrail, handler: handlers.handleEnemyBulletTrail },
      { event: GAME_SCENE_EVENTS.picketOnline, handler: handlers.handlePicketOnline },
    ];
  }

  private createRuntimeLifecycle() {
    return createGameSceneRuntimeLifecycle({
      scene: this,
      sceneEventBindings: this.sceneEventBindings,
      getScaleResizeContext: () => this.getScaleResizeContext(),
      destroyPauseStateController: () => {
        this.pauseStateController?.destroy();
        this.pauseStateController = null;
      },
      destroyMobileControls: () => {
        this.mobileControls?.destroy();
        this.mobileControls = null;
      },
      persistHelperWingState: () => this.persistHelperWingState(),
      destroyLastLifeHelperWing: () => {
        this.lastLifeHelperWing?.destroy();
        this.lastLifeHelperWing = null;
      },
      destroyPicketTurrets: () => {
        this.picketTurrets?.destroy();
        this.picketTurrets = null;
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
        this.boss = null;
        this.lastHudShieldCount = null;
        this.gameplayFrameBehavior = null;
        this.sceneEventBindings.length = 0;
      },
    });
  }

  private getScaleResizeContext() {
    return {
      scene: this,
      parallax: this.parallax,
      mobileControls: this.mobileControls,
      hud: this.hud,
      warpTransition: this.warpTransition,
      picketTurrets: this.picketTurrets,
      clampPlayerToViewport: () => this.clampPlayerToViewport(),
    };
  }

  private persistHelperWingState(): void {
    if (!this.lastLifeHelperWing) {
      saveHelperWingState(this.registry, { slots: [], grantedSlots: 0 });
      return;
    }

    saveHelperWingState(this.registry, this.lastLifeHelperWing.capturePersistentState());
  }

  private syncLastLifeHelperWingState(): void {
    this.lastLifeHelperWing?.updateLastLifeState(this.flow.getRemainingLives());
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

  private captureCurrentRunStateForSave(): PlayerStateData {
    const currentState = getPlayerState(this.registry);
    const helperWingState: PersistentHelperWingState =
      this.lastLifeHelperWing?.capturePersistentState() ?? currentState.helperWing;

    const nextState: PlayerStateData = {
      ...currentState,
      level: this.levelManager.currentLevel,
      score: this.scoreManager.getScore(),
      currentHp: this.player.hp,
      currentShields: this.player.shields,
      remainingLives: this.flow.getRemainingLives(),
      helperWing: helperWingState,
    };

    setPlayerState(this.registry, nextState);
    setRunSummary(this.registry, {
      finalScore: nextState.score,
      levelReached: nextState.level,
    });

    return getPlayerState(this.registry);
  }

  private canSaveCurrentRun(): boolean {
    if (this.flow.isGameplayLocked()) {
      return false;
    }

    if (!this.player || !this.levelManager || !this.scoreManager) {
      return false;
    }

    return this.player.isAlive;
  }

  private syncViewportBounds(): ReturnType<typeof syncSceneViewport> {
    return syncSceneViewport(this);
  }

  private clampPlayerToViewport(): void {
    clampPlayerToViewport(this, this.player);
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
    return {
      scene: this,
      registry: this.registry,
      player: this.player,
      collisionManager: this.collisionManager,
      levelManager: this.levelManager,
      scoreManager: this.scoreManager,
      warpTransition: this.warpTransition,
      stopPlayerMotion: () => this.stopPlayerMotion(),
      runBestEffort,
      startScene: (key) => startRegisteredScene(this, key),
      pauseScene: () => this.physics.world.pause(),
      resumeScene: () => {
        if (!this.pauseStateController?.isGameplayPaused()) {
          this.physics.world.resume();
        }
      },
      getPlayerRespawnPosition: () => this.getPlayerSpawnPoint(),
    };
  }

  private updateHud(): void {
    this.lastHudShieldCount = updateHudOrchestration({
      hud: this.hud,
      player: this.player,
      scoreManager: this.scoreManager,
      levelManager: this.levelManager,
      flow: this.flow,
      lastHudShieldCount: this.lastHudShieldCount,
      now: this.gameplayClock.now,
      surgeRatio: this.grazeSurge?.getGaugeRatio() ?? 0,
    });
  }

  private createGameplayFrameBehavior() {
    return createGameSceneGameplayFrameBehavior({
      inputManager: this.inputManager,
      pauseStateController: this.pauseStateController,
      flow: this.flow,
      parallax: this.parallax,
      player: this.player,
      getLastLifeHelperWing: () => this.lastLifeHelperWing,
      getPicketTurrets: () => this.picketTurrets,
      shipSystems: this.shipSystems,
      gunSwapFeedback: {
        swapped: (gun) => {
          createShipLabel(this, this.player.x, this.player.y, getShipSystemName(gun), NEON_TEXT.cyan);
          audioManager.playSfx('uiConfirm');
        },
        denied: () => audioManager.playSfx('uiClick'),
      },
      mobileControls: this.mobileControls,
      grazeSurge: this.grazeSurge,
      waveManager: this.waveManager,
      levelManager: this.levelManager,
      scoreManager: this.scoreManager,
      events: this.events,
      hud: this.hud,
      bulletPool: this.bulletPool,
      findBulletTarget: (x, y) => this.enemyPool.findNearestEnemyAhead(x, y),
      effectsManager: this.effectsManager,
      getBoss: () => this.boss,
      updateHud: () => this.updateHud(),
      shotDirection: this.shotDirection,
      shotOrigin: this.shotOrigin,
      muzzleFlashOrigin: this.muzzleFlashOrigin,
    });
  }

  update(time: number, delta: number): void {
    if (this.gameplayFrameBehavior) {
      runGameSceneUpdateFrame(this.gameplayFrameBehavior, time, delta, this.gameplayClock, this.hitStop);
    }
  }
}
