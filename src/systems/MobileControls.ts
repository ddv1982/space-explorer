import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/constants';
import { isTouchMobileDevice } from '../utils/device';

const CONTROLS_DEPTH = 1000;
const JOYSTICK_X = 170;
const JOYSTICK_Y = GAME_HEIGHT - 160;
const JOYSTICK_BASE_RADIUS = 76;
const JOYSTICK_HIT_RADIUS = 96;
const JOYSTICK_THUMB_RADIUS = 30;
const JOYSTICK_MAX_DISTANCE = 52;
const FIRE_BUTTON_X = GAME_WIDTH - 170;
const FIRE_BUTTON_Y = GAME_HEIGHT - 160;
const FIRE_BUTTON_RADIUS = 68;

export class MobileControls {
  private scene: Phaser.Scene | null = null;
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickCenter: Phaser.GameObjects.Arc | null = null;
  private joystickThumb: Phaser.GameObjects.Arc | null = null;
  private fireButton: Phaser.GameObjects.Arc | null = null;
  private fireCore: Phaser.GameObjects.Arc | null = null;
  private fireLabel: Phaser.GameObjects.Text | null = null;
  private enabledForTouchDevice: boolean = false;
  private blocked: boolean = false;
  private joystickPointerId: number | null = null;
  private firePointerId: number | null = null;
  private readonly movementVector = new Phaser.Math.Vector2();

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.joystickPointerId) {
      this.updateJoystick(pointer);
    }

    if (pointer.id === this.firePointerId && !this.isPointInsideFireButton(pointer.x, pointer.y)) {
      this.releaseFire();
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.joystickPointerId) {
      this.releaseJoystick();
    }

    if (pointer.id === this.firePointerId) {
      this.releaseFire();
    }
  };

  create(scene: Phaser.Scene): this {
    this.destroy();

    this.scene = scene;
    this.enabledForTouchDevice = isTouchMobileDevice();
    this.blocked = false;

    if (!this.enabledForTouchDevice) {
      return this;
    }

    const extraPointers = Math.max(0, 3 - scene.input.manager.pointersTotal);

    if (extraPointers > 0) {
      scene.input.addPointer(extraPointers);
    }

    this.joystickBase = scene.add.circle(JOYSTICK_X, JOYSTICK_Y, JOYSTICK_BASE_RADIUS, 0x0b1020, 0.4)
      .setStrokeStyle(5, 0x88ccff, 0.8)
      .setDepth(CONTROLS_DEPTH)
      .setScrollFactor(0);
    this.joystickBase.setInteractive(
      new Phaser.Geom.Circle(0, 0, JOYSTICK_HIT_RADIUS),
      Phaser.Geom.Circle.Contains
    );
    this.joystickBase.on('pointerdown', this.handleJoystickDown, this);

    this.joystickCenter = scene.add.circle(JOYSTICK_X, JOYSTICK_Y, 11, 0xdaf3ff, 0.3)
      .setStrokeStyle(2, 0xe7f8ff, 0.45)
      .setDepth(CONTROLS_DEPTH + 1)
      .setScrollFactor(0);

    this.joystickThumb = scene.add.circle(JOYSTICK_X, JOYSTICK_Y, JOYSTICK_THUMB_RADIUS, 0xa8e5ff, 0.95)
      .setStrokeStyle(3, 0xe7f8ff, 0.95)
      .setDepth(CONTROLS_DEPTH + 2)
      .setScrollFactor(0);

    this.fireButton = scene.add.circle(FIRE_BUTTON_X, FIRE_BUTTON_Y, FIRE_BUTTON_RADIUS, 0x6a1010, 0.72)
      .setStrokeStyle(5, 0xff7a5c, 0.95)
      .setDepth(CONTROLS_DEPTH)
      .setScrollFactor(0);
    this.fireButton.setInteractive(
      new Phaser.Geom.Circle(0, 0, FIRE_BUTTON_RADIUS),
      Phaser.Geom.Circle.Contains
    );
    this.fireButton.on('pointerdown', this.handleFireDown, this);

    this.fireCore = scene.add.circle(FIRE_BUTTON_X, FIRE_BUTTON_Y, FIRE_BUTTON_RADIUS - 20, 0xff5e3a, 0.45)
      .setDepth(CONTROLS_DEPTH + 1)
      .setScrollFactor(0);

    this.fireLabel = scene.add.text(FIRE_BUTTON_X, FIRE_BUTTON_Y, 'FIRE', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffe9d9',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setDepth(CONTROLS_DEPTH + 2)
      .setScrollFactor(0);

    scene.input.on('pointermove', this.handlePointerMove);
    scene.input.on('pointerup', this.handlePointerUp);
    scene.input.on('pointerupoutside', this.handlePointerUp);

    this.refreshVisibility();
    this.updateJoystickVisual();
    this.updateFireVisual();

    return this;
  }

  destroy(): void {
    if (this.scene) {
      this.scene.input.off('pointermove', this.handlePointerMove);
      this.scene.input.off('pointerup', this.handlePointerUp);
      this.scene.input.off('pointerupoutside', this.handlePointerUp);
    }

    this.releaseActiveTouches();

    this.joystickBase?.off('pointerdown', this.handleJoystickDown, this);
    this.fireButton?.off('pointerdown', this.handleFireDown, this);

    this.joystickBase?.destroy();
    this.joystickCenter?.destroy();
    this.joystickThumb?.destroy();
    this.fireButton?.destroy();
    this.fireCore?.destroy();
    this.fireLabel?.destroy();

    this.scene = null;
    this.joystickBase = null;
    this.joystickCenter = null;
    this.joystickThumb = null;
    this.fireButton = null;
    this.fireCore = null;
    this.fireLabel = null;
    this.enabledForTouchDevice = false;
    this.blocked = false;
  }

  setBlocked(blocked: boolean): void {
    this.blocked = blocked;

    if (blocked) {
      this.releaseActiveTouches();
    }

    this.refreshVisibility();
  }

  isEnabled(): boolean {
    return this.enabledForTouchDevice && !this.blocked && this.scene !== null;
  }

  isFiring(): boolean {
    return this.isEnabled() && this.firePointerId !== null;
  }

  getMovementVector(out: Phaser.Math.Vector2 = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    if (!this.isEnabled()) {
      return out.set(0, 0);
    }

    return out.copy(this.movementVector);
  }

  private handleJoystickDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled() || this.joystickPointerId !== null) {
      return;
    }

    this.joystickPointerId = pointer.id;
    this.updateJoystick(pointer);
    this.updateJoystickVisual();
  }

  private handleFireDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled() || this.firePointerId !== null) {
      return;
    }

    this.firePointerId = pointer.id;
    this.updateFireVisual();
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - JOYSTICK_X;
    const dy = pointer.y - JOYSTICK_Y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      this.movementVector.set(0, 0);
      this.updateJoystickVisual();
      return;
    }

    const limitedDistance = Math.min(distance, JOYSTICK_MAX_DISTANCE);
    const scale = limitedDistance / distance;

    this.movementVector.set(dx / JOYSTICK_MAX_DISTANCE, dy / JOYSTICK_MAX_DISTANCE).limit(1);

    this.joystickThumb?.setPosition(
      JOYSTICK_X + dx * scale,
      JOYSTICK_Y + dy * scale
    );
  }

  private updateJoystickVisual(): void {
    const active = this.joystickPointerId !== null && this.isEnabled();

    if (!active) {
      this.joystickThumb?.setPosition(JOYSTICK_X, JOYSTICK_Y);
    }

    this.joystickBase
      ?.setFillStyle(0x0b1020, active ? 0.48 : 0.4)
      .setStrokeStyle(5, active ? 0xb2e4ff : 0x88ccff, active ? 0.95 : 0.8);
    this.joystickCenter
      ?.setAlpha(active ? 0.85 : 0.55)
      .setScale(active ? 1.08 : 1);
    this.joystickThumb
      ?.setFillStyle(active ? 0xc5efff : 0xa8e5ff, active ? 1 : 0.95)
      .setStrokeStyle(3, 0xe7f8ff, active ? 1 : 0.95)
      .setScale(active ? 1.04 : 1);
  }

  private updateFireVisual(): void {
    const active = this.firePointerId !== null && this.isEnabled();

    this.fireButton
      ?.setFillStyle(active ? 0xa61f12 : 0x6a1010, active ? 0.92 : 0.72)
      .setScale(active ? 0.96 : 1);
    this.fireCore
      ?.setFillStyle(active ? 0xffc56b : 0xff5e3a, active ? 0.82 : 0.45)
      .setScale(active ? 0.92 : 1);
    this.fireLabel?.setAlpha(active ? 1 : 0.9);
  }

  private refreshVisibility(): void {
    const visible = this.isEnabled();

    this.joystickBase?.setVisible(visible);
    this.joystickCenter?.setVisible(visible);
    this.joystickThumb?.setVisible(visible);
    this.fireButton?.setVisible(visible);
    this.fireCore?.setVisible(visible);
    this.fireLabel?.setVisible(visible);

    if (this.joystickBase?.input) {
      this.joystickBase.input.enabled = visible;
    }

    if (this.fireButton?.input) {
      this.fireButton.input.enabled = visible;
    }
  }

  private releaseActiveTouches(): void {
    this.releaseJoystick();
    this.releaseFire();
  }

  private releaseJoystick(): void {
    this.joystickPointerId = null;
    this.movementVector.set(0, 0);
    this.updateJoystickVisual();
  }

  private releaseFire(): void {
    this.firePointerId = null;
    this.updateFireVisual();
  }

  private isPointInsideFireButton(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, FIRE_BUTTON_X, FIRE_BUTTON_Y) <= FIRE_BUTTON_RADIUS;
  }
}
