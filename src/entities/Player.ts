import Phaser from 'phaser';
import { PLAYER_CONFIG } from '../config/playerConfig';
import { InputManager } from '../systems/InputManager';
import { PlayerStateData, getPlayerMaxHp, getPlayerFireRate, getPlayerDamage } from '../systems/PlayerState';
import { GAME_SCENE_EVENTS } from '../systems/GameplayFlow';
import { ensurePlayerTexture } from '../utils/SpriteFactory';
import { applyGameObjectGlow } from '../utils/renderingCompat';

export type PlayerDamageOutcome = 'ignored' | 'absorbed' | 'damaged' | 'fatal';

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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensurePlayerTexture(scene);

    super(scene, x, y, 'player-ship');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(5);
    (this.body as Phaser.Physics.Arcade.Body).setSize(24, 32);
    this.setDrag(PLAYER_CONFIG.drag);
    this.setCollideWorldBounds(true);
    this.setOrigin(0.5);

    applyGameObjectGlow(this, 0x00aaff, { clearFirst: false });
  }

  applyState(state: PlayerStateData): void {
    this.maxHp = getPlayerMaxHp(state);
    this.hp = state.currentHp > 0 ? Math.min(state.currentHp, this.maxHp) : this.maxHp;
    this.damage = getPlayerDamage(state);
    this.fireRate = getPlayerFireRate(state);
    this.shields = state.currentShields;
  }

  takeDamage(amount: number): PlayerDamageOutcome {
    if (this.shouldIgnoreDamage()) {
      return 'ignored';
    }

    if (this.absorbShieldHit()) {
      return 'absorbed';
    }

    return this.applyHullDamage(amount);
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
    return out.set(0, -1).rotate(this.getShotRotation()).normalize();
  }

  getMuzzlePosition(distance: number, out: Phaser.Math.Vector2 = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    this.getFireDirection(out).scale(distance);
    out.x += this.x;
    out.y += this.y;
    return out;
  }

  private getShotRotation(): number {
    const shotRotationDeadzone = Phaser.Math.DegToRad(1);
    return Math.abs(this.rotation) < shotRotationDeadzone ? 0 : this.rotation;
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

  private applyHullDamage(amount: number): PlayerDamageOutcome {
    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return 'fatal';
    }

    this.setInvulnerable(1500);
    this.flashWhite();
    return 'damaged';
  }

  private setInvulnerable(duration: number): void {
    this.invulnerable = true;
    this.invulnerableTimer = duration;
    this.setAlpha(0.5);
  }

  private flashWhite(): void {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, this.clearTintIfAlive, undefined, this);
  }

  private flashShield(): void {
    this.setTint(0x44aaff);
    this.scene.time.delayedCall(150, this.clearTintIfAlive, undefined, this);
  }

  private clearTintIfAlive(): void {
    if (this.isAlive) {
      this.clearTint();
    }
  }

  private die(): void {
    if (this.deathStarted) {
      return;
    }

    this.deathStarted = true;
    this.invulnerable = true;
    this.invulnerableTimer = 0;
    this.isAlive = false;
    this.isMovingUp = false;
    this.applyDeathVisualState();
    this.disableBodyForDeath();

    this.scene.events.emit(GAME_SCENE_EVENTS.playerDeath);
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

  update(inputManager: InputManager): void {
    if (!this.isAlive) return;
    const delta = this.scene.game.loop.delta;

    this.updateInvulnerability(delta);

    const movement = this.resolveMovementAcceleration(inputManager);
    this.applyMovementAcceleration(movement.ax, movement.ay);
    this.updateRotationFromMovement(movement.ax);
    this.isMovingUp = movement.isMovingUp;
    this.emitExhaustIfDue(delta, movement.ax, movement.ay);
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

  private resolveMovementAcceleration(inputManager: InputManager): {
    ax: number;
    ay: number;
    isMovingUp: boolean;
  } {
    let ax = 0;
    let ay = 0;

    if (inputManager.isLeft()) ax -= PLAYER_CONFIG.speed;
    if (inputManager.isRight()) ax += PLAYER_CONFIG.speed;
    if (inputManager.isUp()) ay -= PLAYER_CONFIG.speed;
    if (inputManager.isDown()) ay += PLAYER_CONFIG.speed;

    return {
      ax,
      ay,
      isMovingUp: inputManager.isUp(),
    };
  }

  private applyMovementAcceleration(ax: number, ay: number): void {
    this.setAcceleration(ax, ay);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.maxVelocity.set(PLAYER_CONFIG.speed);
  }

  private updateRotationFromMovement(ax: number): void {
    const targetRotation = (ax / PLAYER_CONFIG.speed) * Phaser.Math.DegToRad(15);
    this.rotation = Phaser.Math.Linear(this.rotation, targetRotation, 0.1);
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

  spawn(
    x: number,
    y: number,
    options: { hp?: number; invulnerabilityDuration?: number } = {}
  ): void {
    this.enableBody(true, x, y, true, true);
    this.resetSpawnState(options.hp);
    this.stopBodyMotion();
    this.applySpawnInvulnerability(options.invulnerabilityDuration ?? 0);
  }

  private resetSpawnState(hp: number | undefined): void {
    this.hp = hp ?? this.maxHp;
    this.isAlive = true;
    this.isMovingUp = false;
    this.deathStarted = false;
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

    this.scene.tweens.killTweensOf(this);
    this.clearTint();
    this.setVisible(false);
    this.setAlpha(0);
  }
}
