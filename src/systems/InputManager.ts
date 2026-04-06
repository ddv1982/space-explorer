import Phaser from 'phaser';
import { isTouchMobileDevice } from '../utils/device';
import type { MobileControls } from './MobileControls';

export class InputManager {
  private static readonly mobileDirectionThreshold = 0.35;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private space!: Phaser.Input.Keyboard.Key;
  private scene!: Phaser.Scene;
  private mobileControls: MobileControls | null = null;
  private mobileInputMode: boolean = false;
  private readonly movementVector = new Phaser.Math.Vector2();

  create(scene: Phaser.Scene, mobileControls: MobileControls | null = null): void {
    this.scene = scene;
    this.mobileControls = mobileControls;
    this.mobileInputMode = isTouchMobileDevice() && mobileControls !== null;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.space = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.wasd = {
      W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  isLeft(): boolean {
    return this.cursors.left.isDown || this.wasd.A.isDown || this.getMobileMovementVector().x <= -InputManager.mobileDirectionThreshold;
  }

  isRight(): boolean {
    return this.cursors.right.isDown || this.wasd.D.isDown || this.getMobileMovementVector().x >= InputManager.mobileDirectionThreshold;
  }

  isUp(): boolean {
    return this.cursors.up.isDown || this.wasd.W.isDown || this.getMobileMovementVector().y <= -InputManager.mobileDirectionThreshold;
  }

  isDown(): boolean {
    return this.cursors.down.isDown || this.wasd.S.isDown || this.getMobileMovementVector().y >= InputManager.mobileDirectionThreshold;
  }

  isFiring(): boolean {
    if (this.mobileInputMode) {
      return this.space.isDown || this.mobileControls?.isFiring() === true;
    }

    return this.space.isDown || this.scene.input.activePointer.isDown;
  }

  getPointer(): Phaser.Input.Pointer {
    return this.scene.input.activePointer;
  }

  private getMobileMovementVector(): Phaser.Math.Vector2 {
    if (!this.mobileInputMode) {
      return this.movementVector.set(0, 0);
    }

    return this.mobileControls?.getMovementVector(this.movementVector) ?? this.movementVector.set(0, 0);
  }
}
