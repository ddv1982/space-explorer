import Phaser from 'phaser';
import { FLIGHT_CONFIG } from '../config/flightConfig';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { V2_SHIPS, bankToFrame } from '../config/v2Ships';
import { keyboardDesiredVelocity, stepFlight } from '../systems/flight/flightModel';
import { InputManager } from '../systems/InputManager';
import { PlayerStateData, getPlayerMaxHp, getPlayerFireRate, getPlayerDamage } from '../systems/PlayerState';
import { GAME_SCENE_EVENTS } from '../systems/GameSceneEvents';
import { ensurePlayerTexture } from '../utils/SpriteFactory';
import type { PlayerDamageContext, PlayerDamageResult, PlayerFatalResult } from '../systems/PlayerDamage';

/** The bank frames carry most of the visible roll; a small rotation adds a sense of yaw. */
const MOMENTUM_BANK_ROTATION = (4 * Math.PI) / 180;
const PLAYER_BANK_FRAMES = V2_SHIPS[0].bankFrames;

interface DesiredVelocity {
  vx: number;
  vy: number;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number = PLAYER_CONFIG.baseMaxHp;
  maxHp: number = PLAYER_CONFIG.baseMaxHp;
  damage: number = PLAYER_CONFIG.baseDamage;
  fireRate: number = PLAYER_CONFIG.baseFireRate;
  shields: number = 0;
  isAlive: boolean = true;
  isMovingUp: boolean = false;
  private deathStarted: boolean = false;
  private invulnerable: boolean = false;
  private invulnerableTimer: number = 0;
  private exhaustTimer: number = 0;
  private readonly exhaustInterval: number = 50;
  private visualFlashToken = 0;
  private bank = 0;
  /**
   * Changes whenever the ship moved without the drag (a respawn or keyboard steering), so a held
   * touch drag re-anchors to the ship's current position instead of pulling it back.
   */
  private dragAnchorGeneration = 0;
  private bankFrame = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensurePlayerTexture(scene);

    super(scene, x, y, 'player-ship');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(5);
    (this.body as Phaser.Physics.Arcade.Body).setSize(24, 32);
    this.setMaxVelocity(FLIGHT_CONFIG.maxSpeed);
    (this.body as Phaser.Physics.Arcade.Body).setMaxSpeed(FLIGHT_CONFIG.maxSpeed);
    this.setCollideWorldBounds(true);
    this.setOrigin(0.5);
  }

  applyState(state: PlayerStateData): void {
    this.maxHp = getPlayerMaxHp(state);
    this.hp = state.currentHp > 0 ? Math.min(state.currentHp, this.maxHp) : this.maxHp;
    this.damage = getPlayerDamage(state);
    this.fireRate = getPlayerFireRate(state);
    this.shields = state.currentShields;
  }

  takeDamage(context: PlayerDamageContext): PlayerDamageResult {
    if (this.shouldIgnoreDamage()) {
      return { outcome: 'ignored', source: context.source, hullDamage: 0 };
    }

    if (this.absorbShieldHit()) {
      return { outcome: 'absorbed', source: context.source, hullDamage: 0 };
    }

    return this.applyHullDamage(context);
  }

  playDeathAnimation(): void {
    this.scene.tweens.killTweensOf(this);
    this.setVisible(true);
    this.setAlpha(1);
    this.setScale(1);
    this.setAngle(0);
    this.setTint(0xff6644);

    this.scene.tweens.add({
      targets: this,
      y: this.y - 28,
      angle: 35,
      scaleX: 1.1,
      scaleY: 0.3,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.setVisible(false);
      },
    });
  }

  getFireDirection(out: Phaser.Math.Vector2 = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    return out.set(0, -1);
  }

  getMuzzlePosition(distance: number, out: Phaser.Math.Vector2 = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    return out.set(this.x, this.y - distance);
  }

  private shouldIgnoreDamage(): boolean {
    return this.invulnerable || !this.isAlive || this.deathStarted;
  }

  private absorbShieldHit(): boolean {
    if (this.shields <= 0) {
      return false;
    }

    this.shields--;
    this.setInvulnerable(800);
    this.flashShield();
    return true;
  }

  private applyHullDamage(context: PlayerDamageContext): PlayerDamageResult {
    const hullDamage = Math.min(this.hp, context.amount);
    this.hp -= context.amount;

    if (this.hp <= 0) {
      this.hp = 0;
      const result: PlayerFatalResult = { outcome: 'fatal', source: context.source, hullDamage };
      this.die(result);
      return result;
    }

    this.setInvulnerable(1500);
    this.flashWhite();
    return { outcome: 'damaged', source: context.source, hullDamage };
  }

  private setInvulnerable(duration: number): void {
    this.invulnerable = true;
    this.invulnerableTimer = duration;
    this.setAlpha(0.5);
  }

  private flashWhite(): void {
    const flashToken = ++this.visualFlashToken;
    this.setTint(0xffffff);
    this.setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(100, this.clearTintIfAlive, [flashToken], this);
  }

  private flashShield(): void {
    const flashToken = ++this.visualFlashToken;
    this.setTint(0x44aaff);
    this.setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(150, this.clearTintIfAlive, [flashToken], this);
  }

  private clearTintIfAlive(flashToken: number): void {
    if (this.isAlive && flashToken === this.visualFlashToken) {
      this.clearTint();
    }
  }

  private die(result: PlayerFatalResult): void {
    if (this.deathStarted) {
      return;
    }

    this.deathStarted = true;
    this.visualFlashToken += 1;
    this.invulnerable = true;
    this.invulnerableTimer = 0;
    this.isAlive = false;
    this.isMovingUp = false;
    this.applyDeathVisualState();
    this.disableBodyForDeath();

    this.scene.events.emit(GAME_SCENE_EVENTS.playerDeath, result);
  }

  private applyDeathVisualState(): void {
    this.scene.tweens.killTweensOf(this);
    this.setAcceleration(0, 0);
    this.setAlpha(1);
    this.setScale(1);
    this.setAngle(0);
    this.setTint(0xff6644);
  }

  private disableBodyForDeath(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      return;
    }

    body.stop();
    body.enable = false;
  }

  update(inputManager: InputManager, delta: number): void {
    if (!this.isAlive) return;

    this.updateInvulnerability(delta);

    const horizontal = (Number(inputManager.isRight()) - Number(inputManager.isLeft())) as -1 | 0 | 1;
    const vertical = (Number(inputManager.isDown()) - Number(inputManager.isUp())) as -1 | 0 | 1;
    this.updateFlight(inputManager, horizontal, vertical, delta);
  }

  /** Current visual bank, -1 (full left) to 1 (full right). */
  getBank(): number {
    return this.bank;
  }

  private updateFlight(inputManager: InputManager, horizontal: -1 | 0 | 1, vertical: -1 | 0 | 1, delta: number): void {
    const keyboardSteering = horizontal !== 0 || vertical !== 0;
    if (keyboardSteering) this.dragAnchorGeneration += 1;
    const desired: DesiredVelocity = keyboardSteering
      ? keyboardDesiredVelocity(horizontal, vertical, FLIGHT_CONFIG.maxSpeed)
      : (inputManager.getTouchDesiredVelocity(this.x, this.y, this.dragAnchorGeneration, FLIGHT_CONFIG.maxSpeed) ?? {
          vx: 0,
          vy: 0,
        });
    // The body is the velocity source of truth so respawns, bounds and push-backs are respected.
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    const next = stepFlight(
      { vx: body?.velocity.x ?? 0, vy: body?.velocity.y ?? 0, bank: this.bank },
      desired.vx,
      desired.vy,
      delta,
      FLIGHT_CONFIG
    );
    this.setAcceleration(0, 0);
    this.setVelocity(next.vx, next.vy);
    this.bank = next.bank;
    this.rotation = next.bank * MOMENTUM_BANK_ROTATION;
    this.applyBankFrame();
    this.isMovingUp = desired.vy < 0;
    this.emitExhaustIfDue(delta, desired.vx, desired.vy);
  }

  /** Shows the rendered bank frame for the current bank when the v2 sheet is loaded. */
  private applyBankFrame(): void {
    const frame = bankToFrame(this.bank, PLAYER_BANK_FRAMES);
    if (frame === this.bankFrame || this.texture?.has(String(frame)) !== true) {
      return;
    }
    this.setFrame(frame, false, false);
    this.bankFrame = frame;
  }

  private updateInvulnerability(delta: number): void {
    if (!this.invulnerable) {
      return;
    }

    this.invulnerableTimer -= delta;
    if (this.invulnerableTimer <= 0) {
      this.invulnerable = false;
      this.setAlpha(1);
    }
  }

  private emitExhaustIfDue(delta: number, ax: number, ay: number): void {
    this.exhaustTimer -= delta;
    if (this.exhaustTimer > 0) {
      return;
    }

    const isMoving = ax !== 0 || ay !== 0;
    const intensity = isMoving ? 1.0 : 0.3;
    this.scene.events.emit(GAME_SCENE_EVENTS.playerExhaust, this.x, this.y + 20, intensity);
    this.exhaustTimer = this.exhaustInterval;
  }

  spawn(x: number, y: number, options: { hp?: number; invulnerabilityDuration?: number } = {}): void {
    this.enableBody(true, x, y, true, true);
    this.resetSpawnState(options.hp);
    this.stopBodyMotion();
    this.applySpawnInvulnerability(options.invulnerabilityDuration ?? 0);
  }

  private resetSpawnState(hp: number | undefined): void {
    this.visualFlashToken += 1;
    this.hp = hp ?? this.maxHp;
    this.isAlive = true;
    this.isMovingUp = false;
    this.deathStarted = false;
    this.bank = 0;
    this.dragAnchorGeneration += 1;
    this.applyBankFrame();
    this.setAcceleration(0, 0);
    this.setVisible(true);
    this.setAlpha(1);
    this.setScale(1);
    this.setAngle(0);
    this.invulnerable = false;
    this.invulnerableTimer = 0;
    this.clearTint();
  }

  private stopBodyMotion(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.stop();
  }

  private applySpawnInvulnerability(duration: number): void {
    if (duration > 0) {
      this.setInvulnerable(duration);
    }
  }

  prepareForRespawn(): void {
    if (this.isAlive) {
      return;
    }

    this.visualFlashToken += 1;
    this.scene.tweens.killTweensOf(this);
    this.clearTint();
    this.setVisible(false);
    this.setAlpha(0);
  }
}
