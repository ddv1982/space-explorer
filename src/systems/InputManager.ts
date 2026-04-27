import Phaser from 'phaser';
import { isTouchMobileDevice } from '../utils/device';
import type { MobileControls } from './MobileControls';

export class InputManager {
  private static readonly mobileDirectionEngageThreshold = 0.35;
  private static readonly mobileDirectionReleaseThreshold = 0.18;
  private static readonly mobileSecondaryAxisEngageRatio = 0.72;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private space!: Phaser.Input.Keyboard.Key;
  private escape!: Phaser.Input.Keyboard.Key;
  private scene!: Phaser.Scene;
  private mobileControls: MobileControls | null = null;
  private mobileInputMode: boolean = false;
  private mobileHorizontalDirection: -1 | 0 | 1 = 0;
  private mobileVerticalDirection: -1 | 0 | 1 = 0;
  private lastMobileRawX: number = Number.NaN;
  private lastMobileRawY: number = Number.NaN;
  private readonly movementVector = new Phaser.Math.Vector2();
  private readonly resolvedMovementVector = new Phaser.Math.Vector2();

  create(scene: Phaser.Scene, mobileControls: MobileControls | null = null): void {
    this.scene = scene;
    this.mobileControls = mobileControls;
    this.mobileInputMode = isTouchMobileDevice() && mobileControls !== null;
    this.mobileHorizontalDirection = 0;
    this.mobileVerticalDirection = 0;
    this.lastMobileRawX = Number.NaN;
    this.lastMobileRawY = Number.NaN;
    this.resolvedMovementVector.set(0, 0);
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.space = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escape = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.wasd = {
      W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  isLeft(): boolean {
    return this.cursors.left.isDown || this.wasd.A.isDown || this.getMobileMovementVector().x < 0;
  }

  isRight(): boolean {
    return this.cursors.right.isDown || this.wasd.D.isDown || this.getMobileMovementVector().x > 0;
  }

  isUp(): boolean {
    return this.cursors.up.isDown || this.wasd.W.isDown || this.getMobileMovementVector().y < 0;
  }

  isDown(): boolean {
    return this.cursors.down.isDown || this.wasd.S.isDown || this.getMobileMovementVector().y > 0;
  }

  isFiring(): boolean {
    if (this.mobileInputMode) {
      return this.space.isDown || this.hasMobileFireTouch();
    }

    return this.space.isDown || this.scene.input.activePointer.isDown;
  }

  getPointer(): Phaser.Input.Pointer {
    return this.scene.input.activePointer;
  }

  consumePauseToggleRequest(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.escape);
  }

  private getMobileMovementVector(): Phaser.Math.Vector2 {
    if (!this.mobileInputMode) {
      this.mobileHorizontalDirection = 0;
      this.mobileVerticalDirection = 0;
      this.lastMobileRawX = Number.NaN;
      this.lastMobileRawY = Number.NaN;
      return this.resolvedMovementVector.set(0, 0);
    }

    const movementVector = this.mobileControls?.getMovementVector(this.movementVector) ?? this.movementVector.set(0, 0);

    if (movementVector.x === this.lastMobileRawX && movementVector.y === this.lastMobileRawY) {
      return this.resolvedMovementVector;
    }

    this.lastMobileRawX = movementVector.x;
    this.lastMobileRawY = movementVector.y;

    const rawXDirection = movementVector.x === 0 ? 0 : movementVector.x < 0 ? -1 : 1;
    const rawYDirection = movementVector.y === 0 ? 0 : movementVector.y < 0 ? -1 : 1;
    const absX = Math.abs(movementVector.x);
    const absY = Math.abs(movementVector.y);

    let horizontalActive = rawXDirection !== 0 && absX >= this.getAxisThreshold(this.mobileHorizontalDirection, rawXDirection);
    let verticalActive = rawYDirection !== 0 && absY >= this.getAxisThreshold(this.mobileVerticalDirection, rawYDirection);

    if (horizontalActive && verticalActive) {
      const dominantMagnitude = Math.max(absX, absY);
      const secondaryMagnitude = Math.min(absX, absY);
      const secondaryRatio = dominantMagnitude === 0 ? 0 : secondaryMagnitude / dominantMagnitude;

      if (secondaryRatio < InputManager.mobileSecondaryAxisEngageRatio) {
        if (absX > absY) {
          verticalActive = false;
        } else {
          horizontalActive = false;
        }
      }
    }

    this.mobileHorizontalDirection = horizontalActive ? rawXDirection : 0;
    this.mobileVerticalDirection = verticalActive ? rawYDirection : 0;

    return this.resolvedMovementVector.set(
      horizontalActive ? movementVector.x : 0,
      verticalActive ? movementVector.y : 0
    );
  }

  private getAxisThreshold(previousDirection: -1 | 0 | 1, nextDirection: -1 | 0 | 1): number {
    return previousDirection !== 0 && previousDirection === nextDirection
      ? InputManager.mobileDirectionReleaseThreshold
      : InputManager.mobileDirectionEngageThreshold;
  }

  private hasMobileFireTouch(): boolean {
    const camera = this.scene.cameras.main;
    const cameraRight = camera.x + camera.width;
    const cameraBottom = camera.y + camera.height;
    const cameraCenterX = camera.x + camera.width / 2;

    return this.scene.input.manager.pointers.some((pointer) => {
      return (
        pointer.isDown &&
        pointer.downX >= camera.x &&
        pointer.downX <= cameraRight &&
        pointer.downY >= camera.y &&
        pointer.downY <= cameraBottom &&
        pointer.downX >= cameraCenterX &&
        this.mobileControls?.isControlPointer(pointer) !== true
      );
    });
  }
}
