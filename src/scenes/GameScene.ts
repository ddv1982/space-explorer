import Phaser from 'phaser';
import { BULLET_SPEED, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
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
  saveScoreToState,
  saveCurrentHp,
  saveRemainingLives,
  setRunSummary,
} from '../systems/PlayerState';
import { Boss } from '../entities/enemies/Boss';
import { WarpTransition } from '../systems/WarpTransition';
import { audioManager } from '../systems/AudioManager';
import { PowerUp, PowerUpType, resolvePowerUpOverlap } from '../entities/PowerUp';
import {
  applyPowerUpPickup,
  GAME_SCENE_EVENTS,
  TERMINAL_TRANSITIONS,
  trySpawnRandomPowerUp,
  type TerminalTransitionState,
} from '../systems/GameplayFlow';
import { centerHorizontally, getViewportLayout } from '../utils/layout';

export class GameScene extends Phaser.Scene {
  private static readonly PLAYER_RESPAWN_DELAY_MS = 1000;
  private static readonly PLAYER_RESPAWN_FREEZE_DELAY_MS = 240;
  private static readonly PLAYER_RESPAWN_INVULNERABILITY_MS = 2000;
  private static readonly PLAYER_RESPAWN_WATCHDOG_BUFFER_MS = 250;
  private static readonly PLAYER_DEATH_EXPLOSION_INTENSITY = 1.35;

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
  private powerUpGroup!: Phaser.Physics.Arcade.Group;
  private lastFireTime: number = 0;
  private gameOver: boolean = false;
  private gameOverTransition: Phaser.Time.TimerEvent | null = null;
  private gameOverWatchdog: ReturnType<typeof setTimeout> | null = null;
  private gameOverSceneStarted: boolean = false;
  private pendingLevelCompleteTransition: Phaser.Time.TimerEvent | null = null;
  private pendingRespawn: Phaser.Time.TimerEvent | null = null;
  private pendingRespawnFreeze: Phaser.Time.TimerEvent | null = null;
  private respawnWatchdog: ReturnType<typeof setTimeout> | null = null;
  private boss: Boss | null = null;
  private terminalTransitionState: TerminalTransitionState = TERMINAL_TRANSITIONS.none;
  private levelCompleteQueued: boolean = false;
  private lastHudShieldCount: number | null = null;
  private remainingLives: number = 0;
  private respawnInProgress: boolean = false;
  private respawnScenePaused: boolean = false;
  private readonly shotDirection = new Phaser.Math.Vector2();
  private readonly shotOrigin = new Phaser.Math.Vector2();
  private readonly muzzleFlashOrigin = new Phaser.Math.Vector2();

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    this.lastFireTime = 0;
    this.gameOver = false;
    this.gameOverTransition = null;
    this.gameOverWatchdog = null;
    this.gameOverSceneStarted = false;
    this.pendingLevelCompleteTransition = null;
    this.pendingRespawn = null;
    this.pendingRespawnFreeze = null;
    this.respawnWatchdog = null;
    this.boss = null;
    this.terminalTransitionState = TERMINAL_TRANSITIONS.none;
    this.levelCompleteQueued = false;
    this.lastHudShieldCount = null;
    this.respawnInProgress = false;
    this.respawnScenePaused = false;

    this.registerLifecycleHandlers();

    audioManager.init();
    audioManager.startMusic();

    const state = getPlayerState(this.registry);
    this.remainingLives = state.remainingLives;

    this.levelManager = new LevelManager();
    this.levelManager.init(state.level);

    const levelConfig = this.levelManager.getLevelConfig();
    this.cameras.main.setBackgroundColor(levelConfig.bgColor);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.parallax = new ParallaxBackground();
    this.parallax.create(this, levelConfig);
    this.registerScaleHandlers();

    this.effectsManager = new EffectsManager();
    this.effectsManager.setup(this);
    this.effectsManager.applyLevelColorGrade(levelConfig);

    this.inputManager = new InputManager();
    this.inputManager.create(this);

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 80);
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
        if (!powerUp || !powerUp.active || !this.player.isAlive || this.terminalTransitionState !== TERMINAL_TRANSITIONS.none) return;

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

    // Controls hint overlay (fades out after 5 seconds)
    this.showControlsHint();

    this.registerSceneEventHandlers();
  }

  private registerLifecycleHandlers(): void {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.handleSceneDestroy, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneDestroy, this);
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
    this.removeSceneEventHandlers();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    this.parallax?.destroy();
    this.effectsManager?.destroy();

    this.clearGameOverTransitionTimers();
    this.clearPendingLevelCompleteTransition();
    this.clearPendingRespawn();
    this.collisionManager.setRespawnInProgress(false);

    this.lastFireTime = 0;
    this.gameOver = false;
    this.gameOverSceneStarted = false;
    this.boss = null;
    this.terminalTransitionState = TERMINAL_TRANSITIONS.none;
    this.levelCompleteQueued = false;
    this.lastHudShieldCount = null;
    this.remainingLives = 0;
    this.respawnInProgress = false;
    this.respawnScenePaused = false;
  }

  private handleSceneDestroy(): void {
    this.removeSceneEventHandlers();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    this.parallax?.destroy();
    this.effectsManager?.destroy();
  }

  private handleScaleResize(): void {
    this.parallax?.resize(this.cameras.main.width, this.cameras.main.height);
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

    if (this.remainingLives > 1) {
      this.remainingLives -= 1;
      saveRemainingLives(this.registry, this.remainingLives);
      this.beginRespawnTransition();
      return;
    }

    this.levelCompleteQueued = false;
    this.clearPendingLevelCompleteTransition();

    if (!this.beginTerminalTransition(TERMINAL_TRANSITIONS.playerDeath)) return;

    const finalScore = this.scoreManager.getScore();
    const level = this.levelManager.currentLevel;

    this.gameOver = true;
    this.scheduleGameOverTransition();

    this.runBestEffort(() => audioManager.stopMusic());
    this.runBestEffort(() => saveRemainingLives(this.registry, 0));
    this.runBestEffort(() => saveScoreToState(this.registry, finalScore));
    this.runBestEffort(() => setRunSummary(this.registry, { finalScore, levelReached: level }));
  }

  private handlePlayerFatalHit(): void {
    if (this.terminalTransitionState !== TERMINAL_TRANSITIONS.playerDeath) {
      return;
    }

    this.runBestEffort(() => this.cameras.main.flash(120, 255, 96, 96, false));
  }

  private handleLevelComplete(): void {
    this.queueLevelComplete();
  }

  private handleBossSpawn(): void {
    this.levelManager.markBossSpawned();
    this.hud.showBossWarning();
    this.spawnBoss();
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
      this.effectsManager.createExplosion(this.boss.x, this.boss.y, 3.0);
      audioManager.playExplosion(2.0);
      this.hud.hideBossBar();
    }
    this.boss = null;
    this.levelManager.markBossDefeated();
    this.queueLevelComplete();
  }

  private queueLevelComplete(): void {
    if (
      this.levelCompleteQueued ||
      this.respawnInProgress ||
      this.terminalTransitionState !== TERMINAL_TRANSITIONS.none
    ) {
      return;
    }

    this.levelCompleteQueued = true;
    this.scheduleLevelCompleteTransition();
  }

  private spawnBoss(): void {
    const boss = this.enemyPool.spawnBoss(
      GAME_WIDTH / 2,
      -60,
      this.levelManager.getLevelConfig().boss ?? undefined
    );
    if (boss) {
      this.boss = boss;
      this.hud.showBossBar();
    }
  }

  private showControlsHint(): void {
    const layout = getViewportLayout(this);
    const hintWidth = 320;
    const hintHeight = 80;
    const bgX = centerHorizontally(layout, hintWidth);
    const bgY = layout.centerY - hintHeight / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(bgX, bgY, hintWidth, hintHeight, 8);
    bg.setDepth(200).setScrollFactor(0);

    const title = this.add.text(layout.centerX, layout.centerY - 20, 'WASD / Arrows to Move', {
      fontSize: '16px',
      color: '#88ccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    const fireHint = this.add.text(layout.centerX, layout.centerY + 10, 'SPACE / Click to Fire', {
      fontSize: '16px',
      color: '#88ccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    // Fade out after 5 seconds
    this.tweens.add({
      targets: [bg, title, fireHint],
      alpha: { from: 1, to: 0 },
      duration: 1000,
      delay: 4000,
      ease: 'Power2',
      onComplete: () => {
        bg.destroy();
        title.destroy();
        fireHint.destroy();
      },
    });
  }

  private runBestEffort(effect: () => void): void {
    try {
      effect();
    } catch {
      // Keep the GameOver transition alive even if optional cleanup/effects fail.
    }
  }

  private scheduleGameOverTransition(): void {
    this.clearGameOverTransitionTimers();

    this.gameOverTransition = this.time.delayedCall(1500, () => {
      this.completePlayerDeathTransition();
    });

    // Backstop the Phaser timer so death still completes if that callback is disrupted.
    this.gameOverWatchdog = setTimeout(() => {
      this.completePlayerDeathTransition();
    }, 2000);
  }

  private completePlayerDeathTransition(): void {
    if (this.gameOverSceneStarted || this.terminalTransitionState !== TERMINAL_TRANSITIONS.playerDeath) {
      return;
    }

    this.gameOverSceneStarted = true;
    this.clearGameOverTransitionTimers();
    this.scene.start('GameOver');
  }

  private clearGameOverTransitionTimers(): void {
    if (this.gameOverTransition) {
      this.gameOverTransition.remove(false);
      this.gameOverTransition = null;
    }

    if (this.gameOverWatchdog !== null) {
      clearTimeout(this.gameOverWatchdog);
      this.gameOverWatchdog = null;
    }
  }

  private clearPendingLevelCompleteTransition(): void {
    if (this.pendingLevelCompleteTransition) {
      this.pendingLevelCompleteTransition.remove(false);
      this.pendingLevelCompleteTransition = null;
    }
  }

  private scheduleLevelCompleteTransition(): void {
    if (this.pendingLevelCompleteTransition || !this.levelCompleteQueued) {
      return;
    }

    this.pendingLevelCompleteTransition = this.time.delayedCall(0, () => {
      this.pendingLevelCompleteTransition = null;
      this.flushQueuedLevelCompleteTransition();
    });
  }

  private flushQueuedLevelCompleteTransition(): void {
    if (
      !this.levelCompleteQueued ||
      this.respawnInProgress ||
      !this.player.isAlive ||
      this.terminalTransitionState !== TERMINAL_TRANSITIONS.none
    ) {
      return;
    }

    this.levelCompleteQueued = false;

    if (!this.beginTerminalTransition(TERMINAL_TRANSITIONS.levelComplete)) {
      this.levelCompleteQueued = true;
      return;
    }

    saveScoreToState(this.registry, this.scoreManager.getScore());
    saveCurrentHp(this.registry, this.player.hp);
    saveRemainingLives(this.registry, this.remainingLives);
    setRunSummary(this.registry, { finalScore: this.scoreManager.getScore() });
    this.warpTransition.play(() => {
      this.scene.start('PlanetIntermission');
    });
  }

  private scheduleRespawn(): void {
    this.clearPendingRespawn();

    this.pendingRespawn = this.time.delayedCall(GameScene.PLAYER_RESPAWN_DELAY_MS, () => {
      this.completeRespawnTransition();
    });

    this.pendingRespawnFreeze = this.time.delayedCall(GameScene.PLAYER_RESPAWN_FREEZE_DELAY_MS, () => {
      this.pendingRespawnFreeze = null;
      this.pauseSceneForRespawn();
    });

    this.respawnWatchdog = setTimeout(() => {
      this.completeRespawnTransition();
    }, GameScene.PLAYER_RESPAWN_DELAY_MS + GameScene.PLAYER_RESPAWN_WATCHDOG_BUFFER_MS);
  }

  private clearPendingRespawn(): void {
    if (this.pendingRespawn) {
      this.pendingRespawn.remove(false);
      this.pendingRespawn = null;
    }

    if (this.pendingRespawnFreeze) {
      this.pendingRespawnFreeze.remove(false);
      this.pendingRespawnFreeze = null;
    }

    if (this.respawnWatchdog !== null) {
      clearTimeout(this.respawnWatchdog);
      this.respawnWatchdog = null;
    }
  }

  private beginRespawnTransition(): void {
    if (this.respawnInProgress || this.terminalTransitionState !== TERMINAL_TRANSITIONS.none) {
      return;
    }

    this.respawnInProgress = true;
    this.clearPendingLevelCompleteTransition();
    this.stopPlayerMotion();
    this.collisionManager.setRespawnInProgress(true);
    this.collisionManager.clearPlayerHazards();
    this.scheduleRespawn();
  }

  private pauseSceneForRespawn(): void {
    if (!this.respawnInProgress || this.respawnScenePaused) {
      return;
    }

    this.collisionManager.clearPlayerHazards();
    this.player.prepareForRespawn();
    this.respawnScenePaused = true;
    this.scene.pause();
  }

  private resumeSceneAfterRespawnPause(): void {
    if (!this.respawnScenePaused) {
      return;
    }

    this.respawnScenePaused = false;
    this.scene.resume();
  }

  private completeRespawnTransition(): void {
    if (!this.respawnInProgress) {
      return;
    }

    this.clearPendingRespawn();
    this.resumeSceneAfterRespawnPause();

    if (this.terminalTransitionState !== TERMINAL_TRANSITIONS.none || this.player.isAlive) {
      this.respawnInProgress = false;
      this.collisionManager.setRespawnInProgress(false);
      return;
    }

    this.collisionManager.clearPlayerHazards();
    this.player.spawn(GAME_WIDTH / 2, GAME_HEIGHT - 80, {
      hp: this.player.maxHp,
      invulnerabilityDuration: GameScene.PLAYER_RESPAWN_INVULNERABILITY_MS,
    });
    this.respawnInProgress = false;
    this.collisionManager.setRespawnInProgress(false);
    this.flushQueuedLevelCompleteTransition();
  }

  private beginTerminalTransition(state: Exclude<TerminalTransitionState, 'none'>): boolean {
    if (state === TERMINAL_TRANSITIONS.playerDeath) {
      this.clearPendingLevelCompleteTransition();
    }

    if (
      state === TERMINAL_TRANSITIONS.playerDeath &&
      this.terminalTransitionState === TERMINAL_TRANSITIONS.levelComplete
    ) {
      this.cancelLevelCompleteTransition();
    }

    if (this.terminalTransitionState !== TERMINAL_TRANSITIONS.none) {
      return false;
    }

    this.terminalTransitionState = state;
    this.stopPlayerMotion();
    this.collisionManager.setTerminalTransitionActive(true);
    return true;
  }

  private cancelLevelCompleteTransition(): void {
    if (this.terminalTransitionState !== TERMINAL_TRANSITIONS.levelComplete) {
      return;
    }

    this.warpTransition.cancel();
    this.terminalTransitionState = TERMINAL_TRANSITIONS.none;
    this.collisionManager.setTerminalTransitionActive(false);
  }

  private playPlayerDeathCue(x: number, y: number): void {
    this.player.playDeathAnimation();
    this.time.delayedCall(120, () => {
      if (this.player.isAlive && this.terminalTransitionState !== TERMINAL_TRANSITIONS.playerDeath) {
        return;
      }

      audioManager.playExplosion(GameScene.PLAYER_DEATH_EXPLOSION_INTENSITY);
      this.effectsManager.createExplosion(x, y, GameScene.PLAYER_DEATH_EXPLOSION_INTENSITY);
    });
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

  private applyPowerUp(type: PowerUpType): void {
    applyPowerUpPickup(this, this.player, this.effectsManager, type);
  }

  private syncHudShields(): void {
    if (this.lastHudShieldCount === this.player.shields) {
      return;
    }

    this.lastHudShieldCount = this.player.shields;
    this.hud.updateShields(this.player.shields);
  }

  update(time: number, delta: number): void {
    if (this.gameOver || this.respawnInProgress || this.terminalTransitionState !== TERMINAL_TRANSITIONS.none) {
      this.hud.update(
        this.player.hp,
        this.player.maxHp,
        this.scoreManager.getScore(),
        this.levelManager.progress,
        this.remainingLives
      );
      this.syncHudShields();
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
      this.waveManager.update(time, delta, this.levelManager.getEncounterProgress());
    }

    const prevComplete = this.levelManager.isComplete();
    this.levelManager.update(delta);

    if (this.levelManager.shouldSpawnBoss()) {
      this.events.emit(GAME_SCENE_EVENTS.bossSpawn);
    }

    if (
      this.terminalTransitionState === TERMINAL_TRANSITIONS.none &&
      this.levelManager.isComplete() &&
      !prevComplete
    ) {
      this.events.emit(GAME_SCENE_EVENTS.levelComplete);
    }

    // Update boss HUD
    if (this.boss && this.boss.active) {
      this.hud.updateBossHp(this.boss.hp, this.boss.maxHp);
    }

    this.hud.update(
      this.player.hp,
      this.player.maxHp,
      this.scoreManager.getScore(),
      this.levelManager.progress,
      this.remainingLives
    );
    this.syncHudShields();
  }
}
