import Phaser from 'phaser';

export class InputManager {
  private static readonly touchMoveDeadzone = 24;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private space!: Phaser.Input.Keyboard.Key;
  private scene!: Phaser.Scene;

  create(scene: Phaser.Scene): void {
    this.scene = scene;
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
    return this.cursors.left.isDown || this.wasd.A.isDown || this.getTouchDragDelta().x < -InputManager.touchMoveDeadzone;
  }

  isRight(): boolean {
    return this.cursors.right.isDown || this.wasd.D.isDown || this.getTouchDragDelta().x > InputManager.touchMoveDeadzone;
  }

  isUp(): boolean {
    return this.cursors.up.isDown || this.wasd.W.isDown || this.getTouchDragDelta().y < -InputManager.touchMoveDeadzone;
  }

  isDown(): boolean {
    return this.cursors.down.isDown || this.wasd.S.isDown || this.getTouchDragDelta().y > InputManager.touchMoveDeadzone;
  }

  isFiring(): boolean {
    return this.space.isDown || this.scene.input.activePointer.isDown;
  }

  getPointer(): Phaser.Input.Pointer {
    return this.scene.input.activePointer;
  }

  private getTouchDragDelta(): { x: number; y: number } {
    const pointer = this.scene.input.activePointer;

    if (!pointer.isDown || !pointer.wasTouch) {
      return { x: 0, y: 0 };
    }

    return {
      x: pointer.x - pointer.downX,
      y: pointer.y - pointer.downY,
    };
  }
}
