import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { Player } from '../Player';
import type {
  BossAnchor,
  BossAttackConfig,
  BossConfig,
  BossPhaseConfig,
  BossShotPattern,
} from '../../config/LevelsConfig';
import { GAME_SCENE_EVENTS } from '../../systems/GameplayFlow';
import { fireAt, fireBossPattern } from './boss/volleys';
import { resolveBossMovement, resolveBossTravel } from './boss/movement';
import { resolveBossPhaseIndex } from './boss/phaseTransition';
import { BossAttackSchedule, resolveFastKillBonus } from './boss/attackSchedule';
import { getViewportBounds } from '../../utils/layout';
import { bossTextureKey } from '../../config/shipyardSprites';
import { BossVisualRig } from './boss/BossVisualRig';
import { BossAttackRuntime, type BossBeamLauncher, type BossSummonHandler } from './boss/BossAttackRuntime';
import { shakeCamera } from '@/systems/effects/cameraShake';

/** The line a boss descends to on arrival, before any anchor moves it. */
const ARRIVAL_Y = 80;
/** How fast a boss flies between anchors: quick enough to keep the rotation moving, slow enough to follow. */
const TRAVEL_SPEED = 260;
const SHIELD_TINT = 0x77ccff;

/** A queued shot of an aimed burst, due at a time on the boss's gameplay clock. */
interface QueuedShot {
  at: number;
  speed: number;
  originY: number;
}

export class Boss extends EnemyBase {
  /** 1-based, as announced to the player. */
  phase = 1;
  private config: BossConfig | null = null;
  private schedule = new BossAttackSchedule(0, false);
  private baseY = ARRIVAL_Y;
  private moveDir = 1;
  /** 0-1 charge before the next volley, drawn by the visual rig. */
  private attackWindup = 0;
  private arrived = false;
  private volleysFired = 0;
  private readonly patternUses = new Map<BossShotPattern, number>();
  private queuedShots: QueuedShot[] = [];
  /** Where the boss is flying for the next attack, or null once there (or when it has no anchor). */
  private travelTarget: { x: number; y: number } | null = null;
  /** The anchored attack the boss has reached and holds still for until it fires. */
  private holdingFor: BossAttackConfig | null = null;
  private shieldActive = false;
  private bossFlashToken = 0;
  private readonly visualRig: BossVisualRig;
  private attackRuntime!: BossAttackRuntime;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, bossTextureKey('barrage'));
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

  setBeamLauncher(launcher: BossBeamLauncher): void {
    this.getAttackRuntime().setBeamLauncher(launcher);
  }

  setPlayer(player: Player | null): void {
    this.getAttackRuntime().setPlayer(player);
  }

  /** `config` is required on first spawn; a pooled respawn without one replays the last fight. */
  override spawn(x: number, y: number, config: BossConfig | null = this.config): void {
    if (!config) throw new Error('A boss needs its fight config to spawn');
    this.bossFlashToken += 1;
    this.config = config;
    this.maxHp = config.maxHp;
    this.schedule = new BossAttackSchedule(config.parSeconds * 1000, config.escalatesPastPar);
    this.setTexture(bossTextureKey(this.getPhaseConfig().style));
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

  /** `time` is this boss's gameplay clock: milliseconds of unpaused fight since it spawned. */
  updateBehavior(time: number, delta: number): void {
    this.attackWindup = 0;
    if (!this.config) return;
    if (!this.arrived) {
      this.schedule.hold(time);
      this.handleArrival(time);
      return;
    }

    this.updatePhaseState(time);
    this.updateMovement(time, delta);
    this.setShieldActive(this.schedule.upcoming?.shielded === true);
    if (!this.getAttackRuntime().hasBulletGroup()) return;

    this.fireQueuedShots(time);
    const attack = this.schedule.takeDue(time);
    if (attack) this.fireAttack(attack, time);
    this.attackWindup = this.schedule.windup(time);
  }

  private resetCombatState(): void {
    this.phase = 1;
    this.arrived = false;
    this.baseY = ARRIVAL_Y;
    this.moveDir = 1;
    this.volleysFired = 0;
    this.patternUses.clear();
    this.queuedShots = [];
    this.travelTarget = null;
    this.holdingFor = null;
    this.shieldActive = false;
    this.schedule.start(this.getPhaseConfig().attacks, 0);
    this.setVelocityY(60);
    this.clearTint();
  }

  private getPhaseConfig(): BossPhaseConfig {
    const phases = this.config?.phases ?? [];
    const phase = phases[this.phase - 1] ?? phases[0];
    if (!phase) throw new Error('A boss needs at least one phase');
    return phase;
  }

  private handleArrival(time: number): void {
    if (this.y < this.baseY) {
      return;
    }

    this.arrived = true;
    this.schedule.hold(time);
    this.setVelocityY(0);
  }

  private updateMovement(time: number, delta: number): void {
    const viewport = getViewportBounds(this.scene);
    const upcoming = this.schedule.upcoming;
    if (upcoming?.anchor && this.holdingFor !== upcoming) {
      this.travelTarget ??= this.resolveAnchor(upcoming.anchor, viewport);
      const step = resolveBossTravel({ x: this.x, y: this.y }, this.travelTarget, TRAVEL_SPEED, delta);
      this.x = step.x;
      this.y = step.y;
      // The volley waits until the boss is in place, then charges in full.
      this.schedule.hold(time);
      if (step.arrived) {
        this.holdingFor = upcoming;
        this.travelTarget = null;
        this.baseY = step.y;
      }
      return;
    }
    if (this.holdingFor) return;

    const movement = resolveBossMovement({
      movement: this.getPhaseConfig().movement,
      x: this.x,
      baseY: this.baseY,
      moveDir: this.moveDir,
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

  private resolveAnchor(anchor: BossAnchor, viewport: ReturnType<typeof getViewportBounds>): { x: number; y: number } {
    return { x: viewport.left + anchor.x * viewport.width, y: viewport.top + anchor.y };
  }

  private updatePhaseState(time: number): void {
    const config = this.config;
    if (!config) return;
    const next = resolveBossPhaseIndex(config.phases, this.phase - 1, this.hp / this.maxHp);
    if (next === null) return;

    const previousStyle = this.getPhaseConfig().style;
    this.phase = next + 1;
    const phase = this.getPhaseConfig();
    this.schedule.start(phase.attacks, time, config.phaseChangePauseMs);
    this.queuedShots = [];
    this.travelTarget = null;
    this.holdingFor = null;
    if (phase.style !== previousStyle) this.setTexture(bossTextureKey(phase.style));
    this.scene.events.emit(GAME_SCENE_EVENTS.bossPhaseChange, this.phase);
    this.flashPhaseChange();
  }

  private setShieldActive(active: boolean): void {
    if (this.shieldActive === active) {
      return;
    }

    this.shieldActive = active;
    this.invalidateHitFlash();
    if (active) {
      this.setTint(SHIELD_TINT);
      this.setTintMode(Phaser.TintModes.MULTIPLY);
      return;
    }

    this.clearTint();
  }

  private fireAttack(attack: BossAttackConfig, time: number): void {
    const runtime = this.getAttackRuntime();
    const viewport = getViewportBounds(this.scene);
    for (const pattern of attack.volley) {
      const uses = this.patternUses.get(pattern) ?? 0;
      this.patternUses.set(pattern, uses + 1);
      fireBossPattern(pattern, {
        x: this.x,
        y: this.y,
        moveDir: this.moveDir,
        volley: this.volleysFired,
        time,
        patternUses: uses,
        viewport: { left: viewport.left, width: viewport.width },
        fireBullet: (x, y, velocityX, velocityY) => runtime.fireBullet(x, y, velocityX, velocityY),
        getPlayerAimAngle: () => runtime.getPlayerAimAngle(),
        summonEscorts: (types) => runtime.summonEscorts(types),
        launchBeam: (beam) => runtime.launchBeam(beam),
        queueAimedShot: (delayMs, speed, originY) => this.queuedShots.push({ at: time + delayMs, speed, originY }),
      });
    }
    this.volleysFired += 1;
    this.holdingFor = null;
  }

  private fireQueuedShots(time: number): void {
    if (this.queuedShots.length === 0) return;
    const runtime = this.getAttackRuntime();
    const due = this.queuedShots.filter((shot) => shot.at <= time);
    this.queuedShots = this.queuedShots.filter((shot) => shot.at > time);
    for (const shot of due) {
      fireAt(
        (x, y, velocityX, velocityY) => runtime.fireBullet(x, y, velocityX, velocityY),
        this.x,
        this.y + shot.originY,
        runtime.getPlayerAimAngle(),
        shot.speed
      );
    }
  }

  private getAttackRuntime(): BossAttackRuntime {
    this.attackRuntime ??= new BossAttackRuntime(this.scene, () => ({ x: this.x, y: this.y }));
    return this.attackRuntime;
  }

  protected override restoreBaseTint(): void {
    if (this.shieldActive) {
      this.setTint(SHIELD_TINT);
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
      this.setTint(SHIELD_TINT);
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
    // The fight clock is this boss's gameplay time, so pauses and hit-stops never cost the bonus.
    const parMs = (this.config?.parSeconds ?? 0) * 1000;
    const fastKillBonus = resolveFastKillBonus(this.getGameplayTime(), parMs);
    this.scene.events.emit(GAME_SCENE_EVENTS.bossDeath, this.scoreValue, this.x, this.y, fastKillBonus);
    this.scene.events.emit(GAME_SCENE_EVENTS.enemyDeath, this.scoreValue, this.x, this.y);
    this.shieldActive = false;
    this.clearTint();
    this.despawn();
  }
}
