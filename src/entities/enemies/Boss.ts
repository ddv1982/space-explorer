import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { EnemyBullet } from '../EnemyBullet';
import { Player } from '../Player';
import type { BossAttackStyle, BossConfig, EnemyType } from '../../config/LevelsConfig';
import { ENEMY_BULLET_SPEED, GAME_WIDTH } from '../../utils/constants';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';

const DEFAULT_BOSS_CONFIG: BossConfig = {
  name: 'Dreadnought Core',
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

type BossSummonHandler = (type: EnemyType, x: number, y: number) => void;

export class Boss extends EnemyBase {
  phase = 1;
  private targetY = 80;
  private moveDir = 1;
  private moveSpeed = 80;
  private lastFireTime = 0;
  private phase1Cooldown = DEFAULT_BOSS_CONFIG.phase1Cooldown;
  private phase2Cooldown = DEFAULT_BOSS_CONFIG.phase2Cooldown;
  private phase2MoveSpeed = DEFAULT_BOSS_CONFIG.phase2MoveSpeed;
  private attackStyle: BossAttackStyle = DEFAULT_BOSS_CONFIG.attackStyle;
  private phase1SpreadShotCount = DEFAULT_BOSS_CONFIG.phase1SpreadShotCount;
  private phase1SpreadArcDegrees = DEFAULT_BOSS_CONFIG.phase1SpreadArcDegrees;
  private phase1BulletSpeedScale = DEFAULT_BOSS_CONFIG.phase1BulletSpeedScale;
  private phase2SpiralShotCount = DEFAULT_BOSS_CONFIG.phase2SpiralShotCount;
  private phase2SpiralTurnRate = DEFAULT_BOSS_CONFIG.phase2SpiralTurnRate;
  private phase2BulletSpeedScale = DEFAULT_BOSS_CONFIG.phase2BulletSpeedScale;
  private bulletGroup: Phaser.Physics.Arcade.Group | null = null;
  private arrived = false;
  private attackCycle = 0;
  private shieldActive = false;
  private summonHandler: BossSummonHandler | null = null;
  private phaseStartedAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const key = 'boss-texture';
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();

      g.fillStyle(0xcc2244, 1);
      g.fillRect(16, 8, 48, 32);
      g.fillStyle(0xaa1133, 1);
      g.fillRect(0, 20, 16, 16);
      g.fillRect(64, 20, 16, 16);

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

      g.fillStyle(0xff6688, 1);
      g.fillCircle(40, 24, 8);

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

  override takeDamage(amount: number): void {
    if (this.shieldActive) {
      this.flashShieldImpact();
      return;
    }

    super.takeDamage(amount);
  }

  setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.bulletGroup = group;
  }

  setSummonHandler(handler: BossSummonHandler): void {
    this.summonHandler = handler;
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
    this.shieldActive = false;
    this.phaseStartedAt = 0;
    this.setVelocityY(60);
    this.clearTint();
  }

  updateBehavior(time: number, delta: number): void {
    if (!this.arrived) {
      if (this.y >= this.targetY) {
        this.arrived = true;
        this.phaseStartedAt = time;
        this.setVelocityY(0);
      }
      return;
    }

    this.updateMovement(time, delta);
    this.updatePhaseState(time);
    this.updateShieldState(time);

    const cooldown = this.phase === 1 ? this.phase1Cooldown : this.phase2Cooldown;
    if (this.bulletGroup && time > this.lastFireTime + cooldown) {
      this.lastFireTime = time;
      this.firePattern(time);
      this.attackCycle += 1;
    }
  }

  private updateMovement(time: number, delta: number): void {
    switch (this.attackStyle) {
      case 'carrier':
        this.x += this.moveSpeed * 0.72 * this.moveDir * delta / 1000;
        this.y = this.targetY + Math.sin(time * 0.0026) * 10;
        if (this.x > GAME_WIDTH - 90) this.moveDir = -1;
        if (this.x < 90) this.moveDir = 1;
        break;
      case 'pursuit': {
        const player = this.getPlayer();
        const targetX = Phaser.Math.Clamp(player?.x ?? this.x + this.moveDir * 120, 70, GAME_WIDTH - 70);
        const maxStep = this.moveSpeed * 1.15 * delta / 1000;
        this.x += Phaser.Math.Clamp(targetX - this.x, -maxStep, maxStep);
        this.y = this.targetY + Math.sin(time * 0.005) * 14;
        this.moveDir = targetX >= this.x ? 1 : -1;
        break;
      }
      case 'bulwark':
        this.x += this.moveSpeed * 0.45 * this.moveDir * delta / 1000;
        this.y = this.targetY + Math.sin(time * 0.0018) * 6;
        if (this.x > GAME_WIDTH - 100) this.moveDir = -1;
        if (this.x < 100) this.moveDir = 1;
        break;
      default:
        this.x += this.moveSpeed * this.moveDir * delta / 1000;
        if (this.x > GAME_WIDTH - 60) this.moveDir = -1;
        if (this.x < 60) this.moveDir = 1;
        break;
    }
  }

  private updatePhaseState(time: number): void {
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.5 && this.phase === 1) {
      this.phase = 2;
      this.moveSpeed = this.phase2MoveSpeed;
      this.phaseStartedAt = time;
      this.flashPhaseChange();
    }
  }

  private updateShieldState(time: number): void {
    if (this.attackStyle !== 'bulwark') {
      this.setShieldActive(false);
      return;
    }

    const cycleDuration = this.phase === 1 ? 2500 : 1900;
    const openWindow = this.phase === 1 ? 820 : 620;
    const cycleProgress = (time - this.phaseStartedAt) % cycleDuration;
    this.setShieldActive(cycleProgress > openWindow);
  }

  private setShieldActive(active: boolean): void {
    if (this.shieldActive === active) {
      return;
    }

    this.shieldActive = active;
    if (active) {
      this.setTint(0x77ccff);
      return;
    }

    this.clearTint();
  }

  private firePattern(time: number): void {
    switch (this.attackStyle) {
      case 'carrier':
        if (this.phase === 1) {
          this.fireCarrierPattern();
        } else {
          this.fireCarrierAssault(time);
        }
        return;
      case 'pursuit':
        if (this.phase === 1) {
          this.firePursuitVolley();
        } else {
          this.firePursuitBurst();
        }
        return;
      case 'bulwark':
        if (this.phase === 1) {
          this.fireBulwarkSpread();
        } else {
          this.fireBulwarkRotary(time);
        }
        return;
      default:
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
  }

  private fireSpiral(time: number): void {
    if (!this.bulletGroup) return;
    const shotCount = Math.max(1, this.phase2SpiralShotCount);
    const angleStep = 360 / shotCount;
    const timeDivisor = this.attackStyle === 'pressure' ? 420 : 500;
    const turnRate = this.phase2SpiralTurnRate * (this.attackStyle === 'pressure' ? 1.15 : 1);
    const baseAngle = (time / timeDivisor) * turnRate;
    const spiralAngles = this.attackStyle === 'maelstrom' ? [baseAngle, -baseAngle + angleStep / 2] : [baseAngle];

    for (const spiralAngle of spiralAngles) {
      this.fireRadialPattern(this.x, this.y + 30, shotCount, spiralAngle, angleStep, this.phase2BulletSpeedScale);
    }
  }

  private fireCarrierPattern(): void {
    this.fireArc(this.x - 22, this.y + 24, 4, 54, this.phase1BulletSpeedScale * 0.95, -8);
    this.fireArc(this.x + 22, this.y + 24, 4, 54, this.phase1BulletSpeedScale * 0.95, 8);

    if (this.attackCycle % 2 === 0) {
      this.summonEscorts(['swarm', 'scout']);
    }
  }

  private fireCarrierAssault(time: number): void {
    this.fireSpiral(time);
    this.fireArc(this.x, this.y + 26, 5, 38, this.phase2BulletSpeedScale, this.moveDir * 4);

    if (this.attackCycle % 2 === 1) {
      this.summonEscorts(['fighter', 'swarm']);
    }
  }

  private firePursuitVolley(): void {
    this.fireAimedArc(this.getPlayerAimAngle(), 5, 32, this.phase1BulletSpeedScale);
  }

  private firePursuitBurst(): void {
    this.fireAimedArc(this.getPlayerAimAngle(), 7, 24, this.phase2BulletSpeedScale * 1.02);
    this.fireArc(this.x, this.y + 28, 3, 18, this.phase2BulletSpeedScale, this.moveDir * 10);
  }

  private fireBulwarkSpread(): void {
    const laneOffsets = [-28, 0, 28];
    laneOffsets.forEach((offset) => {
      this.fireArc(this.x + offset, this.y + 26, 3, 18, this.phase1BulletSpeedScale, offset * 0.08);
    });
  }

  private fireBulwarkRotary(time: number): void {
    const spokes = Math.max(4, this.phase2SpiralShotCount);
    const angleStep = 360 / spokes;
    const baseAngle = (time / 520) * this.phase2SpiralTurnRate;

    this.fireRadialPattern(this.x, this.y + 26, spokes, baseAngle, angleStep, this.phase2BulletSpeedScale);

    if (!this.shieldActive) {
      this.fireArc(this.x, this.y + 26, 5, 28, this.phase2BulletSpeedScale * 0.95, this.moveDir * 4);
    }
  }

  private fireAimedArc(baseAngle: number, shotCount: number, arcDegrees: number, speedScale: number): void {
    this.fireArcPattern(this.x, this.y + 28, baseAngle, shotCount, arcDegrees, speedScale);
  }

  private fireArc(
    originX: number,
    originY: number,
    shotCount: number,
    arcDegrees: number,
    speedScale: number,
    angleOffset = 0
  ): void {
    this.fireArcPattern(originX, originY, 90 + angleOffset, shotCount, arcDegrees, speedScale);
  }

  private fireArcPattern(
    originX: number,
    originY: number,
    baseAngle: number,
    shotCount: number,
    arcDegrees: number,
    speedScale: number
  ): void {
    const halfArc = arcDegrees / 2;

    for (let i = 0; i < shotCount; i++) {
      const progress = shotCount === 1 ? 0.5 : i / (shotCount - 1);
      const angleDeg = Phaser.Math.Linear(-halfArc, halfArc, progress) + baseAngle;
      const rad = Phaser.Math.DegToRad(angleDeg);

      this.fireBullet(
        originX,
        originY,
        Math.cos(rad) * ENEMY_BULLET_SPEED * speedScale,
        Math.sin(rad) * ENEMY_BULLET_SPEED * speedScale
      );
    }
  }

  private fireRadialPattern(
    originX: number,
    originY: number,
    shotCount: number,
    baseAngle: number,
    angleStep: number,
    speedScale: number
  ): void {
    for (let i = 0; i < shotCount; i++) {
      const angleDeg = baseAngle + i * angleStep;
      const rad = Phaser.Math.DegToRad(angleDeg);

      this.fireBullet(
        originX,
        originY,
        Math.cos(rad) * ENEMY_BULLET_SPEED * speedScale,
        Math.sin(rad) * ENEMY_BULLET_SPEED * speedScale
      );
    }
  }

  private summonEscorts(types: EnemyType[]): void {
    const summonHandler = this.summonHandler;
    if (!summonHandler) {
      return;
    }

    types.forEach((type, index) => {
      const offset = index === 0 ? -36 : 36;
      summonHandler(type, this.x + offset, this.y + 10);
    });
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

  private getPlayer(): Player | null {
    const match = this.scene.children.list.find((child) => child instanceof Player && child.active);
    return (match as Player | undefined) ?? null;
  }

  private getPlayerAimAngle(): number {
    const player = this.getPlayer();
    return player ? Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y)) : 90;
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

  private flashShieldImpact(): void {
    this.setTint(0xddeeff);
    this.scene.time.delayedCall(70, () => {
      if (this.active && this.shieldActive) {
        this.setTint(0x77ccff);
      }
    });
  }

  private flashPhaseChange(): void {
    this.setTint(0xff0000);
    this.scene.cameras.main.shake(300, 0.02);
    this.scene.time.delayedCall(300, () => {
      if (!this.active) {
        return;
      }

      if (this.shieldActive) {
        this.setTint(0x77ccff);
      } else {
        this.clearTint();
      }
    });
  }

  die(): void {
    this.scene.events.emit(GAME_SCENE_EVENTS.bossDeath, this.scoreValue, this.x, this.y);
    this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y);
    this.shieldActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.clearTint();
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }
}
