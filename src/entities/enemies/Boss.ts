import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { Player } from '../Player';
import type { BossAttackStyle, BossConfig, EnemyType } from '../../config/LevelsConfig';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';
import { fireBossPattern } from './boss/attacks';
import { getBossShieldActive, updateBossMovement } from './boss/behavior';
import { resolveBossPhaseTransition } from './boss/phaseTransition';
import { bossAttackWindup, firstVolleyLastFireTime } from './boss/attackWindup';
import { getViewportBounds } from '../../utils/layout';
import { bossTextureKey } from '../../config/shipyardSprites';
import { BossVisualRig } from './boss/BossVisualRig';
import { BossAttackRuntime } from './boss/BossAttackRuntime';
import { shakeCamera } from '@/systems/effects/cameraShake';

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
  /** 0-1 charge before the next volley, drawn by the visual rig. */
  private attackWindup = 0;
  private phase1Cooldown = DEFAULT_BOSS_CONFIG.phase1Cooldown;
  private phase2Cooldown = DEFAULT_BOSS_CONFIG.phase2Cooldown;
  private phase2MoveSpeed = DEFAULT_BOSS_CONFIG.phase2MoveSpeed;
  private phaseTransitionPauseMs = DEFAULT_BOSS_CONFIG.phaseTransitionPauseMs ?? 320;
  private attackStyle: BossAttackStyle = DEFAULT_BOSS_CONFIG.attackStyle;
  private phase2AttackStyle: BossAttackStyle | null = null;
  private bossName: string = DEFAULT_BOSS_CONFIG.name;
  private phase1SpreadShotCount = DEFAULT_BOSS_CONFIG.phase1SpreadShotCount;
  private phase1SpreadArcDegrees = DEFAULT_BOSS_CONFIG.phase1SpreadArcDegrees;
  private phase1BulletSpeedScale = DEFAULT_BOSS_CONFIG.phase1BulletSpeedScale;
  private phase2SpiralShotCount = DEFAULT_BOSS_CONFIG.phase2SpiralShotCount;
  private phase2SpiralTurnRate = DEFAULT_BOSS_CONFIG.phase2SpiralTurnRate;
  private phase2BulletSpeedScale = DEFAULT_BOSS_CONFIG.phase2BulletSpeedScale;
  private arrived = false;
  private attackCycle = 0;
  private shieldActive = false;
  private phaseStartedAt = 0;
  private bossFlashToken = 0;
  private readonly visualRig: BossVisualRig;
  private attackRuntime!: BossAttackRuntime;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const textureKey = bossTextureKey(DEFAULT_BOSS_CONFIG.attackStyle);

    super(scene, x, y, textureKey);
    this.maxHp = DEFAULT_BOSS_CONFIG.maxHp;
    this.hp = DEFAULT_BOSS_CONFIG.maxHp;
    this.speed = 0;
    this.scoreValue = 2000;
    this.enemyType = 'boss';
    this.despawnOffscreen = false;
    this.visualRig = new BossVisualRig(scene);
    this.attackRuntime = new BossAttackRuntime(scene, () => ({ x: this.x, y: this.y }));
  }

  override takeDamage(amount: number): void {
    if (this.shieldActive) {
      this.flashShieldImpact();
      return;
    }

    super.takeDamage(amount);
  }

  setEnemyBulletGroup(group: Phaser.Physics.Arcade.Group): void {
    this.getAttackRuntime().setBulletGroup(group);
  }

  setSummonHandler(handler: BossSummonHandler): void {
    this.getAttackRuntime().setSummonHandler(handler);
  }

  setPlayer(player: Player | null): void {
    this.getAttackRuntime().setPlayer(player);
  }

  spawn(x: number, y: number, config: BossConfig = DEFAULT_BOSS_CONFIG): void {
    this.bossFlashToken += 1;
    this.applyConfig(config);
    this.setTexture(bossTextureKey(config.attackStyle));
    super.spawn(x, y);
    this.resetCombatState();
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.visualRig.update({
      active: this.active,
      x: this.x,
      y: this.y,
      time,
      phase: this.phase,
      shieldActive: this.shieldActive,
      windup: this.attackWindup,
    });
  }

  override despawn(): void {
    this.visualRig?.hide();
    super.despawn();
  }

  updateBehavior(time: number, delta: number): void {
    this.attackWindup = 0;
    if (!this.arrived) {
      this.handleArrival(time);
      return;
    }

    this.updateMovement(time, delta);
    this.updatePhaseState(time);
    this.updateShieldState(time);

    this.tryFirePattern(time);
    if (this.getAttackRuntime().hasBulletGroup()) {
      this.attackWindup = bossAttackWindup(time, this.lastFireTime, this.getCurrentAttackCooldown());
    }
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
    this.lastFireTime = firstVolleyLastFireTime(time, this.lastFireTime, this.getCurrentAttackCooldown());
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
      playerX: this.getAttackRuntime().getPlayer()?.x,
      minX: viewport.left,
      maxX: viewport.right,
    });

    this.x = movement.x;
    this.y = movement.y;
    this.moveDir = movement.moveDir;
  }

  private updatePhaseState(time: number): void {
    const transition = resolveBossPhaseTransition({
      phase: this.phase,
      hp: this.hp,
      maxHp: this.maxHp,
      time,
      phase2MoveSpeed: this.phase2MoveSpeed,
      phaseTransitionPauseMs: this.phaseTransitionPauseMs,
      attackStyle: this.attackStyle,
      phase2AttackStyle: this.phase2AttackStyle,
    });
    if (!transition) return;

    this.phase = transition.phase;
    this.moveSpeed = transition.moveSpeed;
    this.phaseStartedAt = transition.phaseStartedAt;
    this.lastFireTime = transition.nextFireTime;
    if (transition.textureChanges) {
      this.attackStyle = transition.attackStyle;
      this.setTexture(bossTextureKey(this.attackStyle));
    }
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
    this.invalidateHitFlash();
    if (active) {
      this.setTint(0x77ccff);
      this.setTintMode(Phaser.TintModes.MULTIPLY);
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
    if (!this.getAttackRuntime().hasBulletGroup()) {
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
      fireBullet: (x, y, velocityX, velocityY) => this.getAttackRuntime().fireBullet(x, y, velocityX, velocityY),
      summonEscorts: (types) => this.getAttackRuntime().summonEscorts(types),
      getPlayerAimAngle: () => this.getAttackRuntime().getPlayerAimAngle(),
    });
  }

  private getAttackRuntime(): BossAttackRuntime {
    this.attackRuntime ??= new BossAttackRuntime(this.scene, () => ({ x: this.x, y: this.y }));
    return this.attackRuntime;
  }

  private applyConfig(config: BossConfig): void {
    this.maxHp = config.maxHp;
    this.phase1Cooldown = config.phase1Cooldown;
    this.phase2Cooldown = config.phase2Cooldown;
    this.phase2MoveSpeed = config.phase2MoveSpeed;
    this.phaseTransitionPauseMs = config.phaseTransitionPauseMs ?? DEFAULT_BOSS_CONFIG.phaseTransitionPauseMs ?? 320;
    this.attackStyle = config.attackStyle;
    this.phase2AttackStyle = config.phase2AttackStyle ?? null;
    this.bossName = config.name;
    this.phase1SpreadShotCount = config.phase1SpreadShotCount;
    this.phase1SpreadArcDegrees = config.phase1SpreadArcDegrees;
    this.phase1BulletSpeedScale = config.phase1BulletSpeedScale;
    this.phase2SpiralShotCount = config.phase2SpiralShotCount;
    this.phase2SpiralTurnRate = config.phase2SpiralTurnRate;
    this.phase2BulletSpeedScale = config.phase2BulletSpeedScale;
  }

  protected override restoreBaseTint(): void {
    if (this.shieldActive) {
      this.setTint(0x77ccff);
      this.setTintMode(Phaser.TintModes.MULTIPLY);
      return;
    }

    super.restoreBaseTint();
  }

  private flashShieldImpact(): void {
    const flashToken = ++this.bossFlashToken;
    this.setTint(0xddeeff);
    this.setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, this.restoreShieldTintAfterImpact, [flashToken], this);
  }

  private flashPhaseChange(): void {
    const flashToken = ++this.bossFlashToken;
    this.invalidateHitFlash();
    this.setTint(0xff0000);
    this.setTintMode(Phaser.TintModes.MULTIPLY);
    shakeCamera(this.scene, 300, 0.02);
    this.scene.time.delayedCall(300, this.restoreTintAfterPhaseChangeFlash, [flashToken], this);
  }

  private restoreShieldTintAfterImpact(flashToken: number): void {
    if (this.active && this.shieldActive && flashToken === this.bossFlashToken) {
      this.setTint(0x77ccff);
      this.setTintMode(Phaser.TintModes.MULTIPLY);
    }
  }

  private restoreTintAfterPhaseChangeFlash(flashToken: number): void {
    if (!this.active || flashToken !== this.bossFlashToken) {
      return;
    }

    this.restoreBaseTint();
  }

  override die(): void {
    this.scene.events.emit(GAME_SCENE_EVENTS.bossDeath, this.scoreValue, this.x, this.y);
    this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y);
    this.shieldActive = false;
    this.clearTint();
    this.despawn();
  }
}
