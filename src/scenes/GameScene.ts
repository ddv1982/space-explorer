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
import { PowerUp, PowerUpType } from '../entities/PowerUp';

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
  private powerUpGroup!: Phaser.Physics.Arcade.Group;
  private lastFireTime: number = 0;
  private gameOver: boolean = false;
  private gameOverTransition: Phaser.Time.TimerEvent | null = null;
  private boss: Boss | null = null;

  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    this.gameOver = false;
    this.gameOverTransition = null;
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
        const powerUp = _obj1 as PowerUp;
        if (powerUp.active && this.player.isAlive) {
          this.applyPowerUp(powerUp.powerUpType);
          powerUp.kill();
        }
      }
    );

    this.hud = new HUD();
    this.hud.create(this);
    this.hud.showLevelAnnouncement(levelConfig.name, state.level);
    this.hud.updateShields(this.player.shields);

    this.warpTransition = new WarpTransition();
    this.warpTransition.create(this);

    // Controls hint overlay (fades out after 5 seconds)
    this.showControlsHint();

    this.events.on('enemy-death', (score: number, x: number, y: number) => {
      this.scoreManager.addScore(score);
      this.effectsManager.createScorePopup(x, y, score);
      audioManager.playExplosion(0.5);
      this.tryDropPowerUp(x, y);
    });

    this.events.on('player-death', () => {
      if (this.gameOverTransition) return;

      const finalScore = this.scoreManager.getScore();

      this.gameOver = true;
      this.gameOverTransition = this.time.delayedCall(1500, () => {
        this.scene.start('GameOver');
      });

      this.runBestEffort(() => audioManager.stopMusic());
      this.runBestEffort(() => audioManager.playExplosion(2.0));
      this.runBestEffort(() => this.effectsManager.createExplosion(this.player.x, this.player.y, 2.0));
      this.runBestEffort(() => saveScoreToState(this.registry, finalScore));
      this.runBestEffort(() => this.registry.set('finalScore', finalScore));
      this.runBestEffort(() => this.registry.set('levelReached', state.level));
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
      this.hud.showBossWarning();
      this.spawnBoss();
    });

    this.events.on('player-hit', () => {
      audioManager.playPlayerHit();
    });

    this.events.on('player-exhaust', (x: number, y: number, intensity: number) => {
      this.effectsManager.createEngineExhaust(x, y, intensity);
    });

    this.events.on('enemy-spawn-warning', (x: number) => {
      this.effectsManager.createSpawnWarning(x);
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

  private showControlsHint(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(cx - 160, cy - 40, 320, 80, 8);
    bg.setDepth(200).setScrollFactor(0);

    const title = this.add.text(cx, cy - 20, 'WASD / Arrows to Move', {
      fontSize: '16px',
      color: '#88ccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    const fireHint = this.add.text(cx, cy + 10, 'SPACE / Click to Fire', {
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

  private tryDropPowerUp(x: number, y: number): void {
    // 12% chance to drop a power-up
    if (Math.random() > 0.12) return;

    const types: PowerUpType[] = ['health', 'shield', 'rapidfire'];
    const type = types[Math.floor(Math.random() * types.length)];

    const powerUp =
      (this.powerUpGroup.getFirstDead(false) as PowerUp | null) ??
      (this.powerUpGroup.get(x, y) as PowerUp | null);

    if (powerUp) {
      powerUp.spawn(x, y, type);
    }
  }

  private applyPowerUp(type: PowerUpType): void {
    audioManager.playPowerUpPickup();

    switch (type) {
      case 'health':
        this.player.hp = Math.min(this.player.hp + 2, this.player.maxHp);
        this.effectsManager.createSparkBurst(this.player.x, this.player.y);
        break;
      case 'shield':
        this.player.shields += 1;
        this.effectsManager.createSparkBurst(this.player.x, this.player.y);
        break;
      case 'rapidfire':
        this.player.fireRate = Math.max(40, this.player.fireRate - 20);
        this.effectsManager.createSparkBurst(this.player.x, this.player.y);
        break;
    }

    // Show pickup text
    const labels: Record<PowerUpType, string> = {
      health: '+HP',
      shield: '+SHIELD',
      rapidfire: 'FIRE RATE UP',
    };
    const colors: Record<PowerUpType, string> = {
      health: '#00ff44',
      shield: '#4488ff',
      rapidfire: '#ffcc00',
    };

    const text = this.add.text(this.player.x, this.player.y - 40, labels[type], {
      fontSize: '14px',
      color: colors[type],
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: text,
      y: this.player.y - 70,
      alpha: { from: 1, to: 0 },
      duration: 600,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    this.parallax.update(delta);
    this.player.update(this.inputManager);

    if (this.inputManager.isFiring() && this.player.isAlive) {
      if (time > this.lastFireTime + this.player.fireRate) {
        this.lastFireTime = time;
        this.bulletPool.fire(this.player.x, this.player.y - 20);
        this.effectsManager.createMuzzleFlash(this.player.x, this.player.y - 24);
        audioManager.playLaser();
      }
    }

    if (!this.levelManager.hasBossSpawned()) {
      this.waveManager.update(time, delta, this.levelManager.getEncounterProgress());
    }

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
    this.hud.updateShields(this.player.shields);
  }
}
