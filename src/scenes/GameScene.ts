import Phaser from 'phaser';
import { BULLET_SPEED } from '../utils/constants';
import {
  getActiveSection,
  getSectionProgress,
  getTotalLevels,
  type BossConfig,
} from '../config/LevelsConfig';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { InputManager } from '../systems/InputManager';
import { Player } from '../entities/Player';
import { BulletPool } from '../systems/BulletPool';
import { EnemyPool } from '../systems/EnemyPool';
import { CollisionManager } from '../systems/CollisionManager';
import { WaveManager } from '../systems/WaveManager';
import { ScoreManager } from '../systems/ScoreManager';
import { HUD } from '../systems/HUD';
import { LevelManager } from '../systems/LevelManager';
import { EffectsManager } from '../systems/EffectsManager';
import {
  getPlayerState,
} from '../systems/PlayerState';
import { Boss } from '../entities/enemies/Boss';
import { WarpTransition } from '../systems/WarpTransition';
import { audioManager } from '../systems/AudioManager';
import { PowerUp, PowerUpType, resolvePowerUpOverlap } from '../entities/PowerUp';
import {
  applyPowerUpPickup,
  GAME_SCENE_EVENTS,
  trySpawnRandomPowerUp,
} from '../systems/GameplayFlow';
import { GameSceneFlowController, type GameSceneFlowContext } from './gameScene/GameSceneFlowController';
import { showControlsHint } from './gameScene/showControlsHint';
import { MobileViewportGuard } from '../systems/MobileViewportGuard';
import { MobileControls } from '../systems/MobileControls';
import { isTouchMobileDevice } from '../utils/device';
import { getViewportBounds } from '../utils/layout';
import { rebindSceneLifecycleHandlers } from '../utils/sceneLifecycle';
import { createScaledBossConfig } from '../systems/balance/bossScaling';
import { resolveSectionMusicIntensity } from '../systems/sectionIdentity';

export class GameScene extends Phaser.Scene {
  private static readonly BOSS_EXPLOSION_VISUAL_INTENSITY = 3.0;
  private static readonly BOSS_EXPLOSION_AUDIO_INTENSITY = 2.0;
  private static readonly PLAYER_DEATH_EXPLOSION_VISUAL_INTENSITY = 2.2;
  private static readonly PLAYER_DEATH_EXPLOSION_AUDIO_INTENSITY = 1.4;

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
  private mobileControls: MobileControls | null = null;
  private scaledBossConfig: BossConfig | null = null;
  private powerUpGroup!: Phaser.Physics.Arcade.Group;
  private readonly flow = new GameSceneFlowController();
  private lastFireTime: number = 0;
  private boss: Boss | null = null;
  private lastHudShieldCount: number | null = null;
  private readonly shotDirection = new Phaser.Math.Vector2();
  private readonly shotOrigin = new Phaser.Math.Vector2();
  private readonly muzzleFlashOrigin = new Phaser.Math.Vector2();

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    this.lastFireTime = 0;
    this.boss = null;
    this.scaledBossConfig = null;
    this.lastHudShieldCount = null;

    this.registerLifecycleHandlers();

    const state = getPlayerState(this.registry);
    this.flow.reset(state.remainingLives);

    this.levelManager = new LevelManager();
    this.levelManager.init(state.level);

    const levelConfig = this.levelManager.getLevelConfig();
    if (levelConfig.boss) {
      this.scaledBossConfig = createScaledBossConfig(levelConfig.boss, {
        levelNumber: state.level,
        totalLevels: getTotalLevels(),
        upgrades: state.upgrades,
      });
    }

    audioManager.init();
    audioManager.startMusic(levelConfig.music.stage);
    const initialSection = getActiveSection(levelConfig, 0);
    const initialSectionProgress = initialSection ? getSectionProgress(initialSection, 0) : 0;
    audioManager.setMusicIntensity(resolveSectionMusicIntensity(initialSection, initialSectionProgress));

    this.cameras.main.setBackgroundColor(levelConfig.bgColor);
    this.syncViewportBounds();
    const playerSpawnPoint = this.getPlayerSpawnPoint();

    this.parallax = new ParallaxBackground();
    this.parallax.create(this, levelConfig);
    this.registerScaleHandlers();

    this.effectsManager = new EffectsManager();
    this.effectsManager.setup(this);
    this.effectsManager.applyLevelColorGrade(levelConfig);

    this.mobileControls = new MobileControls();
    this.mobileControls.create(this);

    this.inputManager = new InputManager();
    this.inputManager.create(this, this.mobileControls);

    this.player = new Player(this, playerSpawnPoint.x, playerSpawnPoint.y);
    this.player.applyState(state);

    this.bulletPool = new BulletPool();
    this.bulletPool.create(this);

    this.enemyPool = new EnemyPool();
    this.enemyPool.create(this);

    this.waveManager = new WaveManager();
    const asteroidGroup = this.waveManager.create(this, this.enemyPool);
    this.waveManager.setLevelConfig(state.level);

    this.collisionManager = new CollisionManager();
    this.collisionManager.setup(this, this.player, this.bulletPool, this.enemyPool, asteroidGroup);
    this.collisionManager.setEffectsManager(this.effectsManager);
    this.collisionManager.setBulletDamage(this.player.damage);

    this.scoreManager = new ScoreManager();
    this.scoreManager.addScore(state.score);

    // Power-up group
    this.powerUpGroup = this.physics.add.group({
      maxSize: 20,
      classType: PowerUp,
      runChildUpdate: true,
    });

    // Power-ups vs Player
    this.physics.add.overlap(
      this.powerUpGroup, this.player,
      (_obj1, _obj2) => {
        const powerUp = resolvePowerUpOverlap(_obj1, _obj2);
        if (!powerUp || !powerUp.active || !this.player.isAlive || this.flow.isTerminalTransitionActive()) return;

        this.applyPowerUp(powerUp.powerUpType);
        powerUp.kill();
      }
    );

    this.hud = new HUD();
    this.hud.create(this, levelConfig);
    this.hud.showLevelAnnouncement(levelConfig.name, state.level);
    this.syncHudShields();

    this.warpTransition = new WarpTransition();
    this.warpTransition.create(this);
    this.warpTransition.setAccentColor(levelConfig.accentColor);

    this.mobileViewportGuard = MobileViewportGuard.create(this, () => this.stopPlayerMotion());
    this.syncMobileControlsBlockedState();

    showControlsHint(this, { mobile: isTouchMobileDevice() });

    this.registerSceneEventHandlers();
  }

  private registerLifecycleHandlers(): void {
    rebindSceneLifecycleHandlers(this, {
      onShutdown: this.handleSceneShutdown,
      onDestroy: this.handleSceneDestroy,
      context: this,
    });
  }

  private registerSceneEventHandlers(): void {
    this.removeSceneEventHandlers();

    this.events.on(GAME_SCENE_EVENTS.enemyDeath, this.handleEnemyDeath, this);
    this.events.on(GAME_SCENE_EVENTS.playerDeath, this.handlePlayerDeath, this);
    this.events.on(GAME_SCENE_EVENTS.playerFatalHit, this.handlePlayerFatalHit, this);
    this.events.on(GAME_SCENE_EVENTS.levelComplete, this.handleLevelComplete, this);
    this.events.on(GAME_SCENE_EVENTS.bossSpawn, this.handleBossSpawn, this);
    this.events.on(GAME_SCENE_EVENTS.playerHit, this.handlePlayerHit, this);
    this.events.on(GAME_SCENE_EVENTS.playerExhaust, this.handlePlayerExhaust, this);
    this.events.on(GAME_SCENE_EVENTS.enemySpawnWarning, this.handleEnemySpawnWarning, this);
    this.events.on(GAME_SCENE_EVENTS.bossDeath, this.handleBossDeath, this);
  }

  private registerScaleHandlers(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
  }

  private removeSceneEventHandlers(): void {
    this.events.off(GAME_SCENE_EVENTS.enemyDeath, this.handleEnemyDeath, this);
    this.events.off(GAME_SCENE_EVENTS.playerDeath, this.handlePlayerDeath, this);
    this.events.off(GAME_SCENE_EVENTS.playerFatalHit, this.handlePlayerFatalHit, this);
    this.events.off(GAME_SCENE_EVENTS.levelComplete, this.handleLevelComplete, this);
    this.events.off(GAME_SCENE_EVENTS.bossSpawn, this.handleBossSpawn, this);
    this.events.off(GAME_SCENE_EVENTS.playerHit, this.handlePlayerHit, this);
    this.events.off(GAME_SCENE_EVENTS.playerExhaust, this.handlePlayerExhaust, this);
    this.events.off(GAME_SCENE_EVENTS.enemySpawnWarning, this.handleEnemySpawnWarning, this);
    this.events.off(GAME_SCENE_EVENTS.bossDeath, this.handleBossDeath, this);
  }

  private handleSceneShutdown(): void {
    this.teardownSceneResources();
    this.lastFireTime = 0;
    this.boss = null;
    this.lastHudShieldCount = null;
  }

  private handleSceneDestroy(): void {
    this.teardownSceneResources();
  }

  private teardownSceneResources(): void {
    this.removeSceneEventHandlers();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    this.mobileViewportGuard?.destroy();
    this.mobileViewportGuard = null;
    this.mobileControls?.destroy();
    this.mobileControls = null;
    this.parallax?.destroy();
    this.effectsManager?.destroy();
    this.flow.shutdown(this.collisionManager);
  }

  private handleScaleResize(): void {
    const viewport = this.syncViewportBounds();

    this.parallax?.resize(viewport.width, viewport.height);
    this.mobileControls?.relayout();
    this.hud?.relayout();
    this.warpTransition?.resize();
    this.clampPlayerToViewport();
    this.syncMobileControlsBlockedState();
  }

  private getPlayerSpawnPoint(): { x: number; y: number } {
    const viewport = getViewportBounds(this);

    return {
      x: viewport.centerX,
      y: viewport.bottom - 80,
    };
  }

  private syncViewportBounds(): ReturnType<typeof getViewportBounds> {
    const viewport = getViewportBounds(this);

    this.cameras.main.setViewport(0, 0, viewport.width, viewport.height);
    this.cameras.main.setSize(viewport.width, viewport.height);
    this.cameras.main.setBounds(0, 0, viewport.width, viewport.height);
    this.physics.world.setBounds(0, 0, viewport.width, viewport.height);

    return viewport;
  }

  private clampPlayerToViewport(): void {
    if (!this.player?.body) {
      return;
    }

    const viewport = getViewportBounds(this);
    const halfWidth = this.player.displayWidth / 2;
    const halfHeight = this.player.displayHeight / 2;
    const clampedX = Phaser.Math.Clamp(this.player.x, viewport.left + halfWidth, viewport.right - halfWidth);
    const clampedY = Phaser.Math.Clamp(this.player.y, viewport.top + halfHeight, viewport.bottom - halfHeight);

    this.player.setPosition(clampedX, clampedY);
    (this.player.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  private handleEnemyDeath(score: number, x: number, y: number): void {
    this.scoreManager.addScore(score);
    this.effectsManager.createScorePopup(x, y, score);
    audioManager.playExplosion(0.5);
    this.tryDropPowerUp(x, y);
  }

  private handlePlayerDeath(): void {
    const deathX = this.player.x;
    const deathY = this.player.y;

    this.runBestEffort(() => this.playPlayerDeathCue(deathX, deathY));
    this.flow.handlePlayerDeath(this.getFlowContext());
  }

  private handlePlayerFatalHit(): void {
    if (!this.flow.isPlayerDeathTransitionActive()) {
      return;
    }

    this.runBestEffort(() => this.cameras.main.flash(120, 255, 96, 96, false));
  }

  private handleLevelComplete(): void {
    this.flow.queueLevelComplete(this.getFlowContext());
  }

  private handleBossSpawn(): void {
    this.levelManager.markBossSpawned();
    this.clearFieldForBossIntro();
    this.hud.showBossWarning();
    audioManager.startMusic(this.levelManager.getLevelConfig().music.boss);
    this.spawnBoss();
  }

  private clearFieldForBossIntro(): void {
    this.collisionManager.clearPlayerHazards();

    for (const enemy of this.enemyPool.getAllEnemies()) {
      if (!enemy.active) {
        continue;
      }

      enemy.setActive(false);
      enemy.setVisible(false);
      enemy.clearTint();
      enemy.setVelocity(0, 0);

      const body = enemy.body as Phaser.Physics.Arcade.Body | null;
      body?.reset(0, 0);
    }
  }

  private handlePlayerHit(): void {
    this.runBestEffort(() => audioManager.playPlayerHit());
  }

  private handlePlayerExhaust(x: number, y: number, intensity: number): void {
    this.effectsManager.createEngineExhaust(x, y, intensity);
  }

  private handleEnemySpawnWarning(x: number): void {
    this.effectsManager.createSpawnWarning(x);
  }

  private handleBossDeath(): void {
    if (this.boss) {
      this.effectsManager.createExplosion(
        this.boss.x,
        this.boss.y,
        GameScene.BOSS_EXPLOSION_VISUAL_INTENSITY
      );
      audioManager.playExplosion(GameScene.BOSS_EXPLOSION_AUDIO_INTENSITY);
      this.hud.hideBossBar();
    }
    this.boss = null;
    this.levelManager.markBossDefeated();
    this.flow.queueLevelComplete(this.getFlowContext());
  }

  private spawnBoss(): void {
    const viewport = getViewportBounds(this);
    const boss = this.enemyPool.spawnBoss(
      viewport.centerX,
      -60,
      this.scaledBossConfig ?? this.levelManager.getLevelConfig().boss ?? undefined
    );
    if (boss) {
      this.boss = boss;
      this.hud.showBossBar(this.levelManager.getLevelConfig().boss?.name ?? 'BOSS');
    }
  }

  private runBestEffort(effect: () => void): void {
    try {
      effect();
    } catch {
      // Keep the GameOver transition alive even if optional cleanup/effects fail.
    }
  }

  private playPlayerDeathCue(x: number, y: number): void {
    this.player.playDeathAnimation();
    audioManager.playExplosion(GameScene.PLAYER_DEATH_EXPLOSION_AUDIO_INTENSITY);
    this.effectsManager.createExplosion(x, y, GameScene.PLAYER_DEATH_EXPLOSION_VISUAL_INTENSITY);
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

  private tryDropPowerUp(x: number, y: number): void {
    trySpawnRandomPowerUp(this.powerUpGroup, x, y);
  }

  private syncMobileControlsBlockedState(): void {
    this.mobileControls?.setBlocked(this.mobileViewportGuard?.isBlocked() ?? false);
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
      runBestEffort: (effect) => this.runBestEffort(effect),
      startScene: (key) => this.scene.start(key),
      pauseScene: () => this.scene.pause(),
      resumeScene: () => this.scene.resume(),
      getPlayerRespawnPosition: () => this.getPlayerSpawnPoint(),
    };
  }

  private syncHudShields(): void {
    if (this.lastHudShieldCount === this.player.shields) {
      return;
    }

    this.lastHudShieldCount = this.player.shields;
    this.hud.updateShields(this.player.shields);
  }

  private updateHud(): void {
    this.hud.update(
      this.player.hp,
      this.player.maxHp,
      this.scoreManager.getScore(),
      this.levelManager.progress,
      this.flow.getRemainingLives()
    );
    this.syncHudShields();
  }

  update(time: number, delta: number): void {
    this.syncMobileControlsBlockedState();

    if (this.mobileViewportGuard?.isBlocked() || this.flow.isGameplayLocked()) {
      this.updateHud();
      return;
    }

    this.parallax.update(delta);
    this.player.update(this.inputManager);

    if (this.inputManager.isFiring() && this.player.isAlive) {
      if (time > this.lastFireTime + this.player.fireRate) {
        this.lastFireTime = time;

        const shotSpeed = Math.abs(BULLET_SPEED);
        const shotDirection = this.player.getFireDirection(this.shotDirection);
        const shotOrigin = this.player.getMuzzlePosition(20, this.shotOrigin);
        const muzzleFlashOrigin = this.player.getMuzzlePosition(24, this.muzzleFlashOrigin);

        this.bulletPool.fire(
          shotOrigin.x,
          shotOrigin.y,
          shotDirection.x * shotSpeed,
          shotDirection.y * shotSpeed
        );
        this.effectsManager.createMuzzleFlash(muzzleFlashOrigin.x, muzzleFlashOrigin.y);
        audioManager.playLaser();
      }
    }

    if (!this.levelManager.hasBossSpawned()) {
      this.waveManager.update(time, delta, this.levelManager.progress);
    }

    const prevComplete = this.levelManager.isComplete();
    this.levelManager.update(delta);

    const activeSection = getActiveSection(this.levelManager.getLevelConfig(), this.levelManager.progress);
    const sectionProgress = activeSection
      ? getSectionProgress(activeSection, this.levelManager.progress)
      : 0;
    const sectionMusicIntensity = resolveSectionMusicIntensity(activeSection, sectionProgress);
    audioManager.setMusicIntensity(this.levelManager.hasBossSpawned() ? 1.1 : sectionMusicIntensity);

    if (this.levelManager.shouldSpawnBoss()) {
      this.events.emit(GAME_SCENE_EVENTS.bossSpawn);
    }

    if (
      !this.flow.isTerminalTransitionActive() &&
      this.levelManager.isComplete() &&
      !prevComplete
    ) {
      this.events.emit(GAME_SCENE_EVENTS.levelComplete);
    }

    // Update boss HUD
    if (this.boss && this.boss.active) {
      this.hud.updateBossHp(this.boss.hp, this.boss.maxHp);
    }

    this.updateHud();
  }
}
