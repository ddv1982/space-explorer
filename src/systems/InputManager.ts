import Phaser from 'phaser';

export class InputManager {
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
    return this.space.isDown || this.scene.input.activePointer.isDown;
  }

  getPointer(): Phaser.Input.Pointer {
    return this.scene.input.activePointer;
  }
}
