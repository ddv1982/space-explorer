import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { EnemyBullet } from '../EnemyBullet';
import { Player } from '../Player';
import type { BossAttackStyle, BossConfig, EnemyType } from '../../config/LevelsConfig';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';
import { fireBossPattern } from './boss/attacks';
import { getBossShieldActive, shouldEnterBossPhaseTwo, updateBossMovement } from './boss/behavior';
import { getViewportBounds } from '../../utils/layout';
import { ensureBossTextureVariant } from '../../utils/SpriteFactory';

const DEFAULT_BOSS_CONFIG: BossConfig = {
  name: 'Dreadnought Core',
  maxHp: 48,
  phase1Cooldown: 1200,
  phase2Cooldown: 650,
  phase2MoveSpeed: 150,
  phaseTransitionPauseMs: 320,
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
  private phaseTransitionPauseMs = DEFAULT_BOSS_CONFIG.phaseTransitionPauseMs ?? 320;
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
  private playerRef: Player | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const textureKey = ensureBossTextureVariant(scene, DEFAULT_BOSS_CONFIG.attackStyle, DEFAULT_BOSS_CONFIG.name);

    super(scene, x, y, textureKey);
    this.maxHp = DEFAULT_BOSS_CONFIG.maxHp;
    this.hp = DEFAULT_BOSS_CONFIG.maxHp;
    this.speed = 0;
    this.scoreValue = 2000;
    this.enemyType = 'boss';
    this.despawnOffscreen = false;
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

  setPlayer(player: Player | null): void {
    this.playerRef = player;
  }

  spawn(x: number, y: number, config: BossConfig = DEFAULT_BOSS_CONFIG): void {
    this.applyConfig(config);
    this.setTexture(ensureBossTextureVariant(this.scene, config.attackStyle, config.name));
    super.spawn(x, y);
    this.resetCombatState();
  }

  updateBehavior(time: number, delta: number): void {
    if (!this.arrived) {
      this.handleArrival(time);
      return;
    }

    this.updateMovement(time, delta);
    this.updatePhaseState(time);
    this.updateShieldState(time);

    this.tryFirePattern(time);
  }

  private resetCombatState(): void {
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

  private handleArrival(time: number): void {
    if (this.y < this.targetY) {
      return;
    }

    this.arrived = true;
    this.phaseStartedAt = time;
    this.setVelocityY(0);
  }

  private updateMovement(time: number, delta: number): void {
    const viewport = getViewportBounds(this.scene);
    const movement = updateBossMovement({
      attackStyle: this.attackStyle,
      x: this.x,
      targetY: this.targetY,
      moveDir: this.moveDir,
      moveSpeed: this.moveSpeed,
      time,
      delta,
      playerX: this.getPlayer()?.x,
      minX: viewport.left,
      maxX: viewport.right,
    });

    this.x = movement.x;
    this.y = movement.y;
    this.moveDir = movement.moveDir;
  }

  private updatePhaseState(time: number): void {
    if (shouldEnterBossPhaseTwo(this.phase, this.hp, this.maxHp)) {
      this.transitionToPhaseTwo(time);
    }
  }

  private transitionToPhaseTwo(time: number): void {
    this.phase = 2;
    this.moveSpeed = this.phase2MoveSpeed;
    this.phaseStartedAt = time;
    this.lastFireTime = time + this.phaseTransitionPauseMs;
    this.scene.events.emit(GAME_SCENE_EVENTS.bossPhaseChange, this.phase);
    this.flashPhaseChange();
  }

  private updateShieldState(time: number): void {
    this.setShieldActive(getBossShieldActive(this.attackStyle, this.phase, this.phaseStartedAt, time));
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

  private tryFirePattern(time: number): void {
    if (!this.canFirePattern(time)) {
      return;
    }

    this.lastFireTime = time;
    this.firePattern(time);
    this.attackCycle += 1;
  }

  private canFirePattern(time: number): boolean {
    if (!this.bulletGroup) {
      return false;
    }

    return time > this.lastFireTime + this.getCurrentAttackCooldown();
  }

  private getCurrentAttackCooldown(): number {
    return this.phase === 1 ? this.phase1Cooldown : this.phase2Cooldown;
  }

  private firePattern(time: number): void {
    fireBossPattern({
      attackStyle: this.attackStyle,
      phase: this.phase,
      x: this.x,
      y: this.y,
      moveDir: this.moveDir,
      attackCycle: this.attackCycle,
      shieldActive: this.shieldActive,
      phase1SpreadShotCount: this.phase1SpreadShotCount,
      phase1SpreadArcDegrees: this.phase1SpreadArcDegrees,
      phase1BulletSpeedScale: this.phase1BulletSpeedScale,
      phase2SpiralShotCount: this.phase2SpiralShotCount,
      phase2SpiralTurnRate: this.phase2SpiralTurnRate,
      phase2BulletSpeedScale: this.phase2BulletSpeedScale,
      time,
      fireBullet: (x, y, velocityX, velocityY) => this.fireBullet(x, y, velocityX, velocityY),
      summonEscorts: (types) => this.summonEscorts(types),
      getPlayerAimAngle: () => this.getPlayerAimAngle(),
    });
  }

  private summonEscorts(types: EnemyType[]): void {
    const summonHandler = this.summonHandler;
    if (!summonHandler) {
      return;
    }

    const summonBounds = this.getSummonBounds();

    types.forEach((type, index) => {
      const offset = index === 0 ? -36 : 36;
      const summonX = Phaser.Math.Clamp(this.x + offset, summonBounds.minX, summonBounds.maxX);
      summonHandler(type, summonX, this.y + 10);
    });
  }

  private getSummonBounds(): { minX: number; maxX: number } {
    const viewport = getViewportBounds(this.scene);
    const effectivePadding = Math.min(50, viewport.width / 2);
    const minX = viewport.left + effectivePadding;

    return {
      minX,
      maxX: Math.max(minX, viewport.right - effectivePadding),
    };
  }

  private fireBullet(x: number, y: number, velocityX: number, velocityY: number): void {
    const bullet = this.getAvailableBullet(x, y);
    if (!bullet) {
      return;
    }

    bullet.fire(x, y);
    bullet.setVelocity(velocityX, velocityY);
  }

  private getAvailableBullet(x: number, y: number): EnemyBullet | null {
    if (!this.bulletGroup) {
      return null;
    }

    return (
      (this.bulletGroup.getFirstDead(false) as EnemyBullet | null) ??
      (this.bulletGroup.get(x, y) as EnemyBullet | null)
    );
  }

  private getPlayer(): Player | null {
    const cachedPlayer = this.playerRef;
    if (this.isValidCachedPlayer(cachedPlayer)) {
      return cachedPlayer;
    }

    this.playerRef = this.findActivePlayer();
    return this.playerRef;
  }

  private isValidCachedPlayer(player: Player | null): player is Player {
    return Boolean(player && player.scene === this.scene && player.active);
  }

  private findActivePlayer(): Player | null {
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
    this.phaseTransitionPauseMs = config.phaseTransitionPauseMs ?? DEFAULT_BOSS_CONFIG.phaseTransitionPauseMs ?? 320;
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
    this.scene.time.delayedCall(70, this.restoreShieldTintAfterImpact, undefined, this);
  }

  private flashPhaseChange(): void {
    this.setTint(0xff0000);
    this.scene.cameras.main.shake(300, 0.02);
    this.scene.time.delayedCall(300, this.restoreTintAfterPhaseChangeFlash, undefined, this);
  }

  private restoreShieldTintAfterImpact(): void {
    if (this.active && this.shieldActive) {
      this.setTint(0x77ccff);
    }
  }

  private restoreTintAfterPhaseChangeFlash(): void {
    if (!this.active) {
      return;
    }

    if (this.shieldActive) {
      this.setTint(0x77ccff);
    } else {
      this.clearTint();
    }
  }

  override die(): void {
    this.scene.events.emit(GAME_SCENE_EVENTS.bossDeath, this.scoreValue, this.x, this.y);
    this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y);
    this.shieldActive = false;
    this.clearTint();
    this.despawn();
  }
}
