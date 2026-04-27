import Phaser from 'phaser';
import { isTouchMobileDevice } from '../utils/device';
import { getViewportBounds } from '../utils/layout';

const CONTROLS_DEPTH = 1000;
const MAX_HORIZONTAL_INSET = 170;
const MIN_HORIZONTAL_INSET = 104;
const MAX_VERTICAL_INSET = 160;
const MIN_VERTICAL_INSET = 112;
const JOYSTICK_BASE_RADIUS = 62;
const JOYSTICK_HIT_RADIUS = 96;
const JOYSTICK_THUMB_RADIUS = 25;
const JOYSTICK_MAX_DISTANCE = 44;
const JOYSTICK_INPUT_DISTANCE = 52;
const PAUSE_BUTTON_SIZE = 44;
const PAUSE_BUTTON_TOP_INSET = 84;
const PAUSE_BUTTON_RIGHT_INSET = 22;

export class MobileControls {
  private scene: Phaser.Scene | null = null;
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickCenter: Phaser.GameObjects.Arc | null = null;
  private joystickThumb: Phaser.GameObjects.Arc | null = null;
  private pauseButtonBg: Phaser.GameObjects.Graphics | null = null;
  private pauseButtonIcon: Phaser.GameObjects.Graphics | null = null;
  private pauseButtonHitArea: Phaser.GameObjects.Zone | null = null;
  private enabledForTouchDevice: boolean = false;
  private blocked: boolean = false;
  private joystickPointerId: number | null = null;
  private pauseButtonPointerId: number | null = null;
  private joystickX: number = 0;
  private joystickY: number = 0;
  private pauseButtonX: number = 0;
  private pauseButtonY: number = 0;
  private pauseButtonHandler: (() => void) | null = null;
  private readonly movementVector = new Phaser.Math.Vector2();

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.joystickPointerId) {
      this.updateJoystick(pointer);
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.joystickPointerId) {
      this.releaseJoystick();
    }
    if (pointer.id === this.pauseButtonPointerId) {
      this.releasePauseButton();
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

    this.updateControlAnchors();

    this.joystickBase = scene.add.circle(this.joystickX, this.joystickY, JOYSTICK_BASE_RADIUS, 0x0b1020, 0.4)
      .setStrokeStyle(5, 0x88ccff, 0.8)
      .setDepth(CONTROLS_DEPTH)
      .setScrollFactor(0);
    this.joystickBase.setInteractive(
      new Phaser.Geom.Circle(0, 0, JOYSTICK_HIT_RADIUS),
      Phaser.Geom.Circle.Contains
    );
    this.joystickBase.on('pointerdown', this.handleJoystickDown, this);

    this.joystickCenter = scene.add.circle(this.joystickX, this.joystickY, 11, 0xdaf3ff, 0.3)
      .setStrokeStyle(2, 0xe7f8ff, 0.45)
      .setDepth(CONTROLS_DEPTH + 1)
      .setScrollFactor(0);

    this.joystickThumb = scene.add.circle(this.joystickX, this.joystickY, JOYSTICK_THUMB_RADIUS, 0xa8e5ff, 0.95)
      .setStrokeStyle(3, 0xe7f8ff, 0.95)
      .setDepth(CONTROLS_DEPTH + 2)
      .setScrollFactor(0);

    this.pauseButtonBg = scene.add.graphics().setDepth(CONTROLS_DEPTH).setScrollFactor(0);
    this.pauseButtonIcon = scene.add.graphics().setDepth(CONTROLS_DEPTH + 1).setScrollFactor(0);
    this.pauseButtonHitArea = scene.add.zone(0, 0, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE)
      .setOrigin(0.5)
      .setDepth(CONTROLS_DEPTH + 2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.pauseButtonHitArea.on('pointerdown', this.handlePauseButtonDown, this);

    scene.input.on('pointermove', this.handlePointerMove);
    scene.input.on('pointerup', this.handlePointerUp);
    scene.input.on('pointerupoutside', this.handlePointerUp);

    this.refreshVisibility();
    this.updateJoystickVisual();

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
    this.pauseButtonHitArea?.off('pointerdown', this.handlePauseButtonDown, this);

    this.joystickBase?.destroy();
    this.joystickCenter?.destroy();
    this.joystickThumb?.destroy();
    this.pauseButtonBg?.destroy();
    this.pauseButtonIcon?.destroy();
    this.pauseButtonHitArea?.destroy();

    this.scene = null;
    this.joystickBase = null;
    this.joystickCenter = null;
    this.joystickThumb = null;
    this.pauseButtonBg = null;
    this.pauseButtonIcon = null;
    this.pauseButtonHitArea = null;
    this.enabledForTouchDevice = false;
    this.blocked = false;
    this.pauseButtonHandler = null;
  }

  relayout(): void {
    if (!this.scene || !this.enabledForTouchDevice) {
      return;
    }

    this.updateControlAnchors();
    this.releaseActiveTouches();

    this.joystickBase?.setPosition(this.joystickX, this.joystickY);
    this.joystickCenter?.setPosition(this.joystickX, this.joystickY);
    this.joystickThumb?.setPosition(this.joystickX, this.joystickY);

    this.refreshVisibility();
    this.updatePauseButtonVisual();
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

  getMovementVector(out: Phaser.Math.Vector2 = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    if (!this.isEnabled()) {
      return out.set(0, 0);
    }

    return out.copy(this.movementVector);
  }

  isJoystickPointer(pointer: Phaser.Input.Pointer): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    return pointer.id === this.joystickPointerId;
  }

  isControlPointer(pointer: Phaser.Input.Pointer): boolean {
    if (!this.enabledForTouchDevice) {
      return false;
    }

    return pointer.id === this.joystickPointerId || pointer.id === this.pauseButtonPointerId;
  }

  setPauseButtonHandler(handler: (() => void) | null): void {
    this.pauseButtonHandler = handler;
  }

  private handleJoystickDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled() || this.joystickPointerId !== null) {
      return;
    }

    this.joystickPointerId = pointer.id;
    this.updateJoystick(pointer);
    this.updateJoystickVisual();
  }

  private handlePauseButtonDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled()) {
      return;
    }

    this.pauseButtonPointerId = pointer.id;
    this.updatePauseButtonVisual();
    this.pauseButtonHandler?.();
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.joystickX;
    const dy = pointer.y - this.joystickY;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      this.movementVector.set(0, 0);
      this.updateJoystickVisual();
      return;
    }

    const limitedDistance = Math.min(distance, JOYSTICK_MAX_DISTANCE);
    const scale = limitedDistance / distance;

    this.movementVector.set(dx / JOYSTICK_INPUT_DISTANCE, dy / JOYSTICK_INPUT_DISTANCE).limit(1);

    this.joystickThumb?.setPosition(
      this.joystickX + dx * scale,
      this.joystickY + dy * scale
    );
  }

  private updateJoystickVisual(): void {
    const active = this.joystickPointerId !== null && this.isEnabled();

    if (!active) {
      this.joystickThumb?.setPosition(this.joystickX, this.joystickY);
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

  private refreshVisibility(): void {
    const visible = this.isEnabled();

    this.joystickBase?.setVisible(visible);
    this.joystickCenter?.setVisible(visible);
    this.joystickThumb?.setVisible(visible);
    this.pauseButtonBg?.setVisible(visible);
    this.pauseButtonIcon?.setVisible(visible);
    this.pauseButtonHitArea?.setVisible(visible);

    if (this.joystickBase?.input) {
      this.joystickBase.input.enabled = visible;
    }
    if (this.pauseButtonHitArea?.input) {
      this.pauseButtonHitArea.input.enabled = visible;
    }
  }

  private releaseActiveTouches(): void {
    this.releaseJoystick();
    this.releasePauseButton();
  }

  private releaseJoystick(): void {
    this.joystickPointerId = null;
    this.movementVector.set(0, 0);
    this.updateJoystickVisual();
  }

  private releasePauseButton(): void {
    this.pauseButtonPointerId = null;
    this.updatePauseButtonVisual();
  }

  private updateControlAnchors(): void {
    if (!this.scene) {
      return;
    }

    const viewport = getViewportBounds(this.scene);
    const horizontalInset = Phaser.Math.Clamp(viewport.width * 0.13, MIN_HORIZONTAL_INSET, MAX_HORIZONTAL_INSET);
    const verticalInset = Phaser.Math.Clamp(viewport.height * 0.22, MIN_VERTICAL_INSET, MAX_VERTICAL_INSET);

    this.joystickX = viewport.left + horizontalInset;
    this.joystickY = viewport.bottom - verticalInset;
    this.pauseButtonX = viewport.right - PAUSE_BUTTON_RIGHT_INSET - PAUSE_BUTTON_SIZE / 2;
    this.pauseButtonY = viewport.top + PAUSE_BUTTON_TOP_INSET + PAUSE_BUTTON_SIZE / 2;
  }

  private updatePauseButtonVisual(): void {
    const active = this.pauseButtonPointerId !== null && this.isEnabled();
    const x = this.pauseButtonX;
    const y = this.pauseButtonY;
    const half = PAUSE_BUTTON_SIZE / 2;

    this.pauseButtonBg?.clear();
    this.pauseButtonBg?.fillStyle(0x061222, active ? 0.82 : 0.62);
    this.pauseButtonBg?.lineStyle(2, active ? 0xbfefff : 0x76d8ff, 0.92);
    this.pauseButtonBg?.fillRoundedRect(x - half, y - half, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE, 12);
    this.pauseButtonBg?.strokeRoundedRect(x - half, y - half, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE, 12);

    this.pauseButtonIcon?.clear();
    this.pauseButtonIcon?.fillStyle(0xe8f9ff, active ? 1 : 0.92);
    this.pauseButtonIcon?.fillRoundedRect(x - 8, y - 10, 5, 20, 2);
    this.pauseButtonIcon?.fillRoundedRect(x + 3, y - 10, 5, 20, 2);
    this.pauseButtonHitArea?.setPosition(x, y);
  }
}
