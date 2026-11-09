import Phaser from 'phaser';
import type { MobileControls } from './MobileControls';

/** Keyboard and pointer intent for gameplay; touch steering comes from `MobileControls` drag. */
export class InputManager {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private space!: Phaser.Input.Keyboard.Key;
  private escape!: Phaser.Input.Keyboard.Key;
  private lastPausePressAt = 0;
  private scene!: Phaser.Scene;
  private mobileControls: MobileControls | null = null;

  create(scene: Phaser.Scene, mobileControls: MobileControls | null = null): void {
    this.scene = scene;
    this.mobileControls = mobileControls;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.space = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escape = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.lastPausePressAt = this.escape.timeDown;

    this.wasd = {
      W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  isLeft(): boolean {
    return this.cursors.left.isDown || this.wasd.A.isDown;
  }

  isRight(): boolean {
    return this.cursors.right.isDown || this.wasd.D.isDown;
  }

  isUp(): boolean {
    return this.cursors.up.isDown || this.wasd.W.isDown;
  }

  isDown(): boolean {
    return this.cursors.down.isDown || this.wasd.S.isDown;
  }

  isFiring(): boolean {
    // Touch flight autofires the main gun.
    if (this.mobileControls?.isTouchSteeringActive() === true) {
      return true;
    }

    return this.space.isDown || this.scene.input.activePointer.isDown;
  }

  /** Touch drag steering velocity for the ship at (x, y), or null when no finger is steering. */
  getTouchDesiredVelocity(
    shipX: number,
    shipY: number,
    anchorGeneration: number,
    maxSpeed: number
  ): { vx: number; vy: number } | null {
    return this.mobileControls?.getDragDesiredVelocity(shipX, shipY, anchorGeneration, maxSpeed) ?? null;
  }

  consumePauseToggleRequest(): boolean {
    const pressedAt = this.escape.timeDown;
    if (pressedAt === 0) {
      this.lastPausePressAt = 0;
      return false;
    }
    if (pressedAt === this.lastPausePressAt) return false;
    this.lastPausePressAt = pressedAt;
    return true;
  }
}
