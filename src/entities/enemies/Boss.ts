import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { EnemyBullet } from '../EnemyBullet';
import type { BossAttackStyle, BossConfig } from '../../config/LevelsConfig';
import { ENEMY_BULLET_SPEED, GAME_WIDTH } from '../../utils/constants';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';

const DEFAULT_BOSS_CONFIG: BossConfig = {
  maxHp: 48,
  phase1Cooldown: 1200,
  phase2Cooldown: 650,
  phase2MoveSpeed: 150,
  attackStyle: 'barrage',
  phase1SpreadShotCount: 5,
  phase1SpreadArcDegrees: 60,
  phase1BulletSpeedScale: 0.8,
  phase2SpiralShotCount: 3,
  phase2SpiralTurnRate: 60,
  phase2BulletSpeedScale: 0.9,
};

export class Boss extends EnemyBase {
  phase: number = 1;
  private targetY: number = 80;
  private moveDir: number = 1;
  private moveSpeed: number = 80;
  private lastFireTime: number = 0;
  private phase1Cooldown: number = DEFAULT_BOSS_CONFIG.phase1Cooldown;
  private phase2Cooldown: number = DEFAULT_BOSS_CONFIG.phase2Cooldown;
  private phase2MoveSpeed: number = DEFAULT_BOSS_CONFIG.phase2MoveSpeed;
  private attackStyle: BossAttackStyle = DEFAULT_BOSS_CONFIG.attackStyle;
  private phase1SpreadShotCount: number = DEFAULT_BOSS_CONFIG.phase1SpreadShotCount;
  private phase1SpreadArcDegrees: number = DEFAULT_BOSS_CONFIG.phase1SpreadArcDegrees;
  private phase1BulletSpeedScale: number = DEFAULT_BOSS_CONFIG.phase1BulletSpeedScale;
  private phase2SpiralShotCount: number = DEFAULT_BOSS_CONFIG.phase2SpiralShotCount;
  private phase2SpiralTurnRate: number = DEFAULT_BOSS_CONFIG.phase2SpiralTurnRate;
  private phase2BulletSpeedScale: number = DEFAULT_BOSS_CONFIG.phase2BulletSpeedScale;
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;
  private arrived: boolean = false;
  private attackCycle: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'boss-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();

      // Main hull
      g.fillStyle(0xcc2244, 1);
      g.fillRect(16, 8, 48, 32);
      g.fillStyle(0xaa1133, 1);
      g.fillRect(0, 20, 16, 16);
      g.fillRect(64, 20, 16, 16);

      // Wings
      g.fillStyle(0xdd3355, 1);
      g.beginPath();
      g.moveTo(0, 36);
      g.lineTo(16, 20);
      g.lineTo(16, 40);
      g.closePath();
      g.fillPath();
      g.beginPath();
      g.moveTo(80, 36);
      g.lineTo(64, 20);
      g.lineTo(64, 40);
      g.closePath();
      g.fillPath();

      // Core
      g.fillStyle(0xff6688, 1);
      g.fillCircle(40, 24, 8);

      // Cannons
      g.fillStyle(0x881122, 1);
      g.fillRect(20, 40, 8, 8);
      g.fillRect(36, 40, 8, 8);
      g.fillRect(52, 40, 8, 8);

      g.generateTexture(key, 80, 48);
      g.destroy();
    }

    super(scene, x, y, key);
    this.maxHp = DEFAULT_BOSS_CONFIG.maxHp;
    this.hp = DEFAULT_BOSS_CONFIG.maxHp;
    this.speed = 0;
    this.scoreValue = 2000;
    this.enemyType = 'boss';
  }

  setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bulletGroup = group;
  }

  spawn(x: number, y: number, config: BossConfig = DEFAULT_BOSS_CONFIG): void {
    this.applyConfig(config);
    super.spawn(x, y);
    this.phase = 1;
    this.arrived = false;
    this.lastFireTime = 0;
    this.attackCycle = 0;
    this.moveDir = 1;
    this.moveSpeed = 80;
    this.setVelocityY(60);
  }

  updateBehavior(time: number, delta: number): void {
    if (!this.arrived) {
      if (this.y >= this.targetY) {
        this.arrived = true;
        this.setVelocityY(0);
      }
      return;
    }

    // Horizontal movement
    this.x += this.moveSpeed * this.moveDir * delta / 1000;
    if (this.x > GAME_WIDTH - 60) this.moveDir = -1;
    if (this.x < 60) this.moveDir = 1;

    // Phase check
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.5 && this.phase === 1) {
      this.phase = 2;
      this.moveSpeed = this.phase2MoveSpeed;
      this.flashPhaseChange();
    }

    // Attack based on phase
    const cooldown = this.phase === 1 ? this.phase1Cooldown : this.phase2Cooldown;
    if (this.bulletGroup && time > this.lastFireTime + cooldown) {
      this.lastFireTime = time;
      if (this.phase === 1) {
        this.fireSpread();
      } else {
        this.fireSpiral(time);
      }
    }
  }

  private fireSpread(): void {
    if (!this.bulletGroup) return;
    const shotCount = Math.max(1, this.phase1SpreadShotCount);
    const origins = this.attackStyle === 'barrage' ? [this.x - 18, this.x + 18] : [this.x];
    const arcScale = this.attackStyle === 'barrage' ? 1.15 : this.attackStyle === 'pressure' ? 0.55 : 1;
    const angleOffset = this.attackStyle === 'pressure' && this.attackCycle % 2 === 1 ? this.moveDir * 6 : 0;
    const halfArc = (this.phase1SpreadArcDegrees * arcScale) / 2;

    for (const originX of origins) {
      for (let i = 0; i < shotCount; i++) {
        const progress = shotCount === 1 ? 0.5 : i / (shotCount - 1);
        const angleDeg = Phaser.Math.Linear(-halfArc, halfArc, progress) + angleOffset;
        const rad = Phaser.Math.DegToRad(angleDeg + 90);
        this.fireBullet(
          originX,
          this.y + 30,
          Math.cos(rad) * ENEMY_BULLET_SPEED * this.phase1BulletSpeedScale,
          Math.sin(rad) * ENEMY_BULLET_SPEED * this.phase1BulletSpeedScale
        );
      }
    }

    this.attackCycle += 1;
  }

  private fireSpiral(time: number): void {
    if (!this.bulletGroup) return;
    const shotCount = Math.max(1, this.phase2SpiralShotCount);
    const angleStep = 360 / shotCount;
    const timeDivisor = this.attackStyle === 'pressure' ? 420 : 500;
    const turnRate = this.phase2SpiralTurnRate * (this.attackStyle === 'pressure' ? 1.15 : 1);
    const baseAngle = (time / timeDivisor) * turnRate;
    const spiralAngles =
      this.attackStyle === 'maelstrom'
        ? [baseAngle, -baseAngle + angleStep / 2]
        : [baseAngle];

    for (const spiralAngle of spiralAngles) {
      for (let i = 0; i < shotCount; i++) {
        const angleDeg = spiralAngle + i * angleStep;
        const rad = Phaser.Math.DegToRad(angleDeg);
        this.fireBullet(
          this.x,
          this.y + 30,
          Math.cos(rad) * ENEMY_BULLET_SPEED * this.phase2BulletSpeedScale,
          Math.sin(rad) * ENEMY_BULLET_SPEED * this.phase2BulletSpeedScale
        );
      }
    }

    this.attackCycle += 1;
  }

  private fireBullet(x: number, y: number, velocityX: number, velocityY: number): void {
    if (!this.bulletGroup) return;

    const bullet =
      (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
      (this.bulletGroup.get(x, y) as EnemyBullet | null);
    if (!bullet) return;

    bullet.fire(x, y);
    bullet.setVelocity(velocityX, velocityY);
  }

  private applyConfig(config: BossConfig): void {
    this.maxHp = config.maxHp;
    this.phase1Cooldown = config.phase1Cooldown;
    this.phase2Cooldown = config.phase2Cooldown;
    this.phase2MoveSpeed = config.phase2MoveSpeed;
    this.attackStyle = config.attackStyle;
    this.phase1SpreadShotCount = config.phase1SpreadShotCount;
    this.phase1SpreadArcDegrees = config.phase1SpreadArcDegrees;
    this.phase1BulletSpeedScale = config.phase1BulletSpeedScale;
    this.phase2SpiralShotCount = config.phase2SpiralShotCount;
    this.phase2SpiralTurnRate = config.phase2SpiralTurnRate;
    this.phase2BulletSpeedScale = config.phase2BulletSpeedScale;
  }

  private flashPhaseChange(): void {
    this.setTint(0xff0000);
    this.scene.cameras.main.shake(300, 0.02);
    this.scene.time.delayedCall(300, () => {
      if (this.active) this.clearTint();
    });
  }

  die(): void {
    this.scene.events.emit(GAME_SCENE_EVENTS.bossDeath, this.scoreValue, this.x, this.y);
    this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y);
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }
}
