import Phaser from 'phaser';
import { isTouchMobileDevice } from '../utils/device';
import { getViewportBounds } from '../utils/layout';
import { drawNeonFrame, NEON } from '../scenes/shared/neonUiTheme';
import { beginDrag, dragDesiredVelocity, dragTarget, type DragState } from './input/relativeDrag';

const CONTROLS_DEPTH = 1000;
const PAUSE_BUTTON_SIZE = 44;
const PAUSE_BUTTON_TOP_INSET = 84;
const PAUSE_BUTTON_RIGHT_INSET = 22;
/** Keeps the dragged ship clear of the very edge so it stays fully visible. */
const DRAG_EDGE_MARGIN = 18;

/**
 * Touch controls for momentum flight: drag anywhere and the ship follows the finger's movement,
 * while the main gun autofires. A pause button stays available in the top-right corner.
 */
export class MobileControls {
  private scene: Phaser.Scene | null = null;
  private pauseButtonBg: Phaser.GameObjects.Graphics | null = null;
  private pauseButtonIcon: Phaser.GameObjects.Graphics | null = null;
  private pauseButtonHitArea: Phaser.GameObjects.Zone | null = null;
  private enabledForTouchDevice: boolean = false;
  private blocked: boolean = false;
  /** Set once a hardware keyboard is in use; cleared by the next touch. */
  private touchSteeringSuppressed: boolean = false;
  private pauseButtonPointerId: number | null = null;
  private pauseButtonX: number = 0;
  private pauseButtonY: number = 0;
  private pauseButtonHandler: (() => void) | null = null;
  private dragPointerId: number | null = null;
  private dragState: DragState | null = null;
  private dragFingerX: number = 0;
  private dragFingerY: number = 0;
  private dragAnchorGeneration: number | null = null;

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isEnabled() || this.dragPointerId !== null || this.isOverPauseButton(pointer)) {
      return;
    }

    this.dragPointerId = pointer.id;
    this.dragFingerX = pointer.x;
    this.dragFingerY = pointer.y;
    // Anchored against the ship on the first velocity query, when the ship position is known.
    this.dragState = null;
    this.dragAnchorGeneration = null;
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.dragPointerId) {
      this.dragFingerX = pointer.x;
      this.dragFingerY = pointer.y;
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.dragPointerId) {
      this.releaseDrag();
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

    this.pauseButtonBg = scene.add.graphics().setDepth(CONTROLS_DEPTH).setScrollFactor(0);
    this.pauseButtonIcon = scene.add
      .graphics()
      .setDepth(CONTROLS_DEPTH + 1)
      .setScrollFactor(0);
    this.pauseButtonHitArea = scene.add
      .zone(0, 0, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE)
      .setOrigin(0.5)
      .setDepth(CONTROLS_DEPTH + 2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.pauseButtonHitArea.on('pointerdown', this.handlePauseButtonDown, this);

    scene.input.on('pointerdown', this.handlePointerDown);
    scene.input.on('pointermove', this.handlePointerMove);
    scene.input.on('pointerup', this.handlePointerUp);
    scene.input.on('pointerupoutside', this.handlePointerUp);

    this.refreshVisibility();
    this.updatePauseButtonVisual();

    return this;
  }

  destroy(): void {
    if (this.scene) {
      this.scene.input.off('pointerdown', this.handlePointerDown);
      this.scene.input.off('pointermove', this.handlePointerMove);
      this.scene.input.off('pointerup', this.handlePointerUp);
      this.scene.input.off('pointerupoutside', this.handlePointerUp);
    }

    this.releaseActiveTouches();
    this.pauseButtonHitArea?.off('pointerdown', this.handlePauseButtonDown, this);
    this.pauseButtonBg?.destroy();
    this.pauseButtonIcon?.destroy();
    this.pauseButtonHitArea?.destroy();

    this.scene = null;
    this.pauseButtonBg = null;
    this.pauseButtonIcon = null;
    this.pauseButtonHitArea = null;
    this.enabledForTouchDevice = false;
    this.blocked = false;
    this.touchSteeringSuppressed = false;
    this.pauseButtonHandler = null;
  }

  relayout(): void {
    if (!this.scene || !this.enabledForTouchDevice) {
      return;
    }

    this.updateControlAnchors();
    this.releaseActiveTouches();
    this.refreshVisibility();
    this.updatePauseButtonVisual();
  }

  setBlocked(blocked: boolean): void {
    this.blocked = blocked;

    if (blocked) {
      this.releaseActiveTouches();
    }

    this.refreshVisibility();
    this.updatePauseButtonVisual();
  }

  /** A hardware keyboard takes over steering and firing; the next touch hands control back. */
  setTouchSteeringSuppressed(suppressed: boolean): void {
    this.touchSteeringSuppressed = suppressed;
    if (suppressed) {
      this.releaseDrag();
    }
  }

  isEnabled(): boolean {
    return this.enabledForTouchDevice && !this.blocked && this.scene !== null;
  }

  /** True while touch is the active input, which also means the main gun autofires. */
  isTouchSteeringActive(): boolean {
    return this.isEnabled() && !this.touchSteeringSuppressed;
  }

  isControlPointer(pointer: Phaser.Input.Pointer): boolean {
    return (
      this.enabledForTouchDevice && (pointer.id === this.pauseButtonPointerId || pointer.id === this.dragPointerId)
    );
  }

  setPauseButtonHandler(handler: (() => void) | null): void {
    this.pauseButtonHandler = handler;
  }

  /**
   * Desired ship velocity from the active drag, or null when no finger is steering.
   * `anchorGeneration` changes whenever the ship moved without the drag (respawn, keyboard steering),
   * so a held finger re-anchors to the ship's current position.
   */
  getDragDesiredVelocity(
    shipX: number,
    shipY: number,
    anchorGeneration: number,
    maxSpeed: number
  ): { vx: number; vy: number } | null {
    if (!this.scene || !this.isEnabled() || this.dragPointerId === null) {
      return null;
    }

    if (this.dragState === null || this.dragAnchorGeneration !== anchorGeneration) {
      this.dragState = beginDrag(this.dragFingerX, this.dragFingerY, shipX, shipY);
      this.dragAnchorGeneration = anchorGeneration;
    }

    const viewport = getViewportBounds(this.scene);
    const target = dragTarget(this.dragState, this.dragFingerX, this.dragFingerY, {
      left: viewport.left + DRAG_EDGE_MARGIN,
      top: viewport.top + DRAG_EDGE_MARGIN,
      right: viewport.right - DRAG_EDGE_MARGIN,
      bottom: viewport.bottom - DRAG_EDGE_MARGIN,
    });
    return dragDesiredVelocity(shipX, shipY, target.x, target.y, maxSpeed);
  }

  private handlePauseButtonDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled()) {
      return;
    }

    this.pauseButtonPointerId = pointer.id;
    this.updatePauseButtonVisual();
    this.pauseButtonHandler?.();
  }

  private refreshVisibility(): void {
    const pauseVisible = this.enabledForTouchDevice && this.scene !== null;

    this.pauseButtonBg?.setVisible(pauseVisible);
    this.pauseButtonIcon?.setVisible(pauseVisible);
    this.pauseButtonHitArea?.setVisible(pauseVisible);

    if (this.pauseButtonHitArea?.input) {
      this.pauseButtonHitArea.input.enabled = pauseVisible && !this.blocked;
    }
  }

  private releaseActiveTouches(): void {
    this.releasePauseButton();
    this.releaseDrag();
  }

  private releaseDrag(): void {
    this.dragPointerId = null;
    this.dragState = null;
    this.dragAnchorGeneration = null;
  }

  private releasePauseButton(): void {
    this.pauseButtonPointerId = null;
    this.updatePauseButtonVisual();
  }

  private isOverPauseButton(pointer: Phaser.Input.Pointer): boolean {
    const half = PAUSE_BUTTON_SIZE / 2;
    return Math.abs(pointer.x - this.pauseButtonX) <= half && Math.abs(pointer.y - this.pauseButtonY) <= half;
  }

  private updateControlAnchors(): void {
    if (!this.scene) {
      return;
    }

    const viewport = getViewportBounds(this.scene);
    this.pauseButtonX = viewport.right - PAUSE_BUTTON_RIGHT_INSET - PAUSE_BUTTON_SIZE / 2;
    this.pauseButtonY = viewport.top + PAUSE_BUTTON_TOP_INSET + PAUSE_BUTTON_SIZE / 2;
  }

  private updatePauseButtonVisual(): void {
    const active = this.pauseButtonPointerId !== null && this.isEnabled();
    const x = this.pauseButtonX;
    const y = this.pauseButtonY;
    const half = PAUSE_BUTTON_SIZE / 2;

    this.pauseButtonBg?.clear();
    if (this.pauseButtonBg) {
      drawNeonFrame(this.pauseButtonBg, x - half, y - half, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE, {
        accentColor: active ? NEON.cyanBright : NEON.cyan,
        fillAlpha: active ? 0.82 : 0.62,
        strokeAlpha: 0.92,
        cornerCut: 12,
        glow: true,
      });
    }

    this.pauseButtonIcon?.clear();
    this.pauseButtonIcon?.fillStyle(0xe8f9ff, active ? 1 : 0.92);
    this.pauseButtonIcon?.fillRoundedRect(x - 8, y - 10, 5, 20, 2);
    this.pauseButtonIcon?.fillRoundedRect(x + 3, y - 10, 5, 20, 2);
    this.pauseButtonHitArea?.setPosition(x, y);
  }
}
