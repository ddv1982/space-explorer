import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
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
import { getPlayerState, saveScoreToState, saveCurrentHp } from '../systems/PlayerState';
import { Boss } from '../entities/enemies/Boss';
import { WarpTransition } from '../systems/WarpTransition';
import { audioManager } from '../systems/AudioManager';

export class GameScene extends Phaser.Scene {
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
  private lastFireTime: number = 0;
  private gameOver: boolean = false;
  private boss: Boss | null = null;

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    this.gameOver = false;
    this.boss = null;

    audioManager.init();
    audioManager.startMusic();

    const state = getPlayerState(this.registry);

    this.levelManager = new LevelManager();
    this.levelManager.init(state.level);

    const levelConfig = this.levelManager.getLevelConfig();
    this.cameras.main.setBackgroundColor(levelConfig.bgColor);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.parallax = new ParallaxBackground();
    this.parallax.create(this, levelConfig);

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

    this.hud = new HUD();
    this.hud.create(this);

    this.warpTransition = new WarpTransition();
    this.warpTransition.create(this);

    this.events.on('enemy-death', (score: number) => {
      this.scoreManager.addScore(score);
      audioManager.playExplosion(0.5);
    });

    this.events.on('player-death', () => {
      this.gameOver = true;
      audioManager.stopMusic();
      audioManager.playExplosion(2.0);
      this.effectsManager.createExplosion(this.player.x, this.player.y, 2.0);
      saveScoreToState(this.registry, this.scoreManager.getScore());
      this.registry.set('finalScore', this.scoreManager.getScore());
      this.registry.set('levelReached', state.level);
      this.time.delayedCall(1500, () => {
        this.scene.start('GameOver');
      });
    });

    this.events.on('level-complete', () => {
      saveScoreToState(this.registry, this.scoreManager.getScore());
      saveCurrentHp(this.registry, this.player.hp);
      this.registry.set('finalScore', this.scoreManager.getScore());
      this.warpTransition.play(() => {
        this.scene.start('PlanetIntermission');
      });
    });

    this.events.on('boss-spawn', () => {
      this.levelManager.markBossSpawned();
      this.spawnBoss();
    });

    this.events.on('player-hit', () => {
      audioManager.playPlayerHit();
    });

    this.events.on('boss-death', () => {
      if (this.boss) {
        this.effectsManager.createExplosion(this.boss.x, this.boss.y, 3.0);
        audioManager.playExplosion(2.0);
        this.hud.hideBossBar();
      }
      this.boss = null;
      this.levelManager.markBossDefeated();
    });
  }

  private spawnBoss(): void {
    const boss = this.enemyPool.spawnBoss(GAME_WIDTH / 2, -60);
    if (boss) {
      this.boss = boss;
      this.hud.showBossBar();
    }
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    this.parallax.update(delta);
    this.player.update(this.inputManager);

    if (this.inputManager.isFiring() && this.player.isAlive) {
      if (time > this.lastFireTime + this.player.fireRate) {
        this.lastFireTime = time;
        this.bulletPool.fire(this.player.x, this.player.y - 20);
        audioManager.playLaser();
      }
    }

    this.waveManager.update(time, delta, this.levelManager.progress);

    const prevComplete = this.levelManager.isComplete();
    this.levelManager.update(delta);

    if (this.levelManager.shouldSpawnBoss()) {
      this.events.emit('boss-spawn');
    }

    if (this.levelManager.isComplete() && !prevComplete) {
      this.events.emit('level-complete');
    }

    // Update boss HUD
    if (this.boss && this.boss.active) {
      this.hud.updateBossHp(this.boss.hp, this.boss.maxHp);
    }

    this.hud.update(
      this.player.hp,
      this.player.maxHp,
      this.scoreManager.getScore(),
      this.levelManager.progress
    );
  }
}
