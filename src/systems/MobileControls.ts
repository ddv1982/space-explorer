import Phaser from 'phaser';
import { isTouchMobileDevice } from '../utils/device';
import { getViewportBounds } from '../utils/layout';
import { drawAngledRectPath, NEON } from '../scenes/shared/neonUiTheme';
import { scaleUiGlowAlpha } from '../utils/renderingCompat';
import { beginDrag, dragDesiredVelocity, dragTarget, type DragState } from './input/relativeDrag';
import { SPECIAL_GUN_CHARGE, type MainGunId } from '../config/shipSystems';

const CONTROLS_DEPTH = 1000;
const PAUSE_BUTTON_SIZE = 44;
const PAUSE_BUTTON_TOP_INSET = 84;
const PAUSE_BUTTON_RIGHT_INSET = 22;
/** The gun-swap key sits under pause: on the edge, clear of the steering thumb and the lane centre. */
const SWAP_BUTTON_GAP = 14;
/** The charge bar redraws in steps, not every frame. */
const SWAP_CHARGE_STEPS = 20;
/** Keeps the dragged ship clear of the very edge so it stays fully visible. */
const DRAG_EDGE_MARGIN = 18;

interface ControlKey {
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Graphics;
  hitArea: Phaser.GameObjects.Zone;
}

/**
 * Touch controls for momentum flight: drag anywhere and the ship follows the finger's movement,
 * while the main gun autofires. A pause button stays available in the top-right corner, and from sector 3
 * a swap button sits under it that borrows a special gun and shows the charge.
 */
export class MobileControls {
  private scene: Phaser.Scene | null = null;
  private pauseKey: ControlKey | null = null;
  private swapKey: ControlKey | null = null;
  private enabledForTouchDevice: boolean = false;
  private blocked: boolean = false;
  /** Set once a hardware keyboard is in use; cleared by the next touch. */
  private touchSteeringSuppressed: boolean = false;
  private pauseButtonPointerId: number | null = null;
  private pauseButtonX: number = 0;
  private pauseButtonY: number = 0;
  private pauseButtonHandler: (() => void) | null = null;
  private swapButtonPointerId: number | null = null;
  private swapButtonY: number = 0;
  private swapAvailable: boolean = false;
  /** A special gun is out and burning the charge. */
  private swapDraining: boolean = false;
  /** Special-gun charge, in `SWAP_CHARGE_STEPS` (the full count = full). */
  private swapChargeStep: number = SWAP_CHARGE_STEPS;
  private swapPressPending: boolean = false;
  private dragPointerId: number | null = null;
  private dragState: DragState | null = null;
  private dragFingerX: number = 0;
  private dragFingerY: number = 0;
  /** Touch-down point, used for the first anchor so movement before the next ship update still counts. */
  private dragDownX: number = 0;
  private dragDownY: number = 0;
  private dragAnchorGeneration: number | null = null;

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    // Drag steering is a touch control: trackpad or mouse presses on hybrid devices never start it.
    // Suppression is not checked here because this listener runs before the bootstrap's touch restore.
    if (!pointer.wasTouch || !this.isEnabled() || this.dragPointerId !== null || this.isOverControlKey(pointer)) {
      return;
    }

    this.dragPointerId = pointer.id;
    this.dragFingerX = pointer.x;
    this.dragFingerY = pointer.y;
    this.dragDownX = pointer.x;
    this.dragDownY = pointer.y;
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
    if (pointer.id === this.swapButtonPointerId) {
      this.releaseSwapButton();
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

    this.pauseKey = createControlKey(scene);
    this.pauseKey.hitArea.on('pointerdown', this.handlePauseButtonDown, this);
    this.swapKey = createControlKey(scene);
    this.swapKey.hitArea.on('pointerdown', this.handleSwapButtonDown, this);

    scene.input.on('pointerdown', this.handlePointerDown);
    scene.input.on('pointermove', this.handlePointerMove);
    scene.input.on('pointerup', this.handlePointerUp);
    scene.input.on('pointerupoutside', this.handlePointerUp);

    this.refreshVisibility();
    this.updateKeyVisuals();

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
    for (const key of [this.pauseKey, this.swapKey]) {
      key?.bg.destroy();
      key?.icon.destroy();
      key?.hitArea.destroy();
    }

    this.scene = null;
    this.pauseKey = null;
    this.swapKey = null;
    this.enabledForTouchDevice = false;
    this.blocked = false;
    this.touchSteeringSuppressed = false;
    this.pauseButtonHandler = null;
    this.swapAvailable = false;
    this.swapDraining = false;
    this.swapChargeStep = SWAP_CHARGE_STEPS;
    this.swapPressPending = false;
  }

  relayout(): void {
    if (!this.scene || !this.enabledForTouchDevice) {
      return;
    }

    this.updateControlAnchors();
    this.releaseActiveTouches();
    this.refreshVisibility();
    this.updateKeyVisuals();
  }

  setBlocked(blocked: boolean): void {
    this.blocked = blocked;

    if (blocked) {
      this.releaseActiveTouches();
      this.swapPressPending = false;
    }

    this.refreshVisibility();
    this.updateKeyVisuals();
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

  /** True while touch is the active input; the gun then autofires unless touch autofire is off. */
  isTouchSteeringActive(): boolean {
    return this.isEnabled() && !this.touchSteeringSuppressed;
  }

  /** True while the steering finger is on the screen, whatever other fingers tap meanwhile. */
  isSteeringFingerDown(): boolean {
    return this.dragPointerId !== null;
  }

  isControlPointer(pointer: Phaser.Input.Pointer): boolean {
    return (
      this.enabledForTouchDevice &&
      (pointer.id === this.pauseButtonPointerId ||
        pointer.id === this.swapButtonPointerId ||
        pointer.id === this.dragPointerId)
    );
  }

  setPauseButtonHandler(handler: (() => void) | null): void {
    this.pauseButtonHandler = handler;
  }

  /**
   * Shows the swap button only while there is a gun to swap (sector 3 on), with the special-gun charge
   * along its foot: amber and draining while a special gun is out, cyan and refilling on Lance.
   */
  setGunChargeState(gun: MainGunId | null, charge: number): void {
    const available = gun !== null;
    const draining = available && gun !== 'lance';
    const steps = Math.max(0, Math.min(1, charge)) * SWAP_CHARGE_STEPS;
    // Rounded down on Lance, so the key never looks ready before the charge allows leaving; up while
    // draining, so a special gun never shows an empty bar.
    const step = draining ? Math.ceil(steps) : Math.floor(steps);
    if (available === this.swapAvailable && draining === this.swapDraining && step === this.swapChargeStep) return;
    const visibilityChanged = available !== this.swapAvailable;
    this.swapAvailable = available;
    this.swapDraining = draining;
    this.swapChargeStep = step;
    if (visibilityChanged) this.refreshVisibility();
    this.updateSwapButtonVisual();
  }

  /** True once per tap of the swap button. */
  consumeGunSwapPress(): boolean {
    const pressed = this.swapPressPending;
    this.swapPressPending = false;
    return pressed;
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

    if (this.dragState === null) {
      this.dragState = beginDrag(this.dragDownX, this.dragDownY, shipX, shipY);
      this.dragAnchorGeneration = anchorGeneration;
    } else if (this.dragAnchorGeneration !== anchorGeneration) {
      // The ship moved without the drag (respawn, keyboard): re-anchor where the finger is now.
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

  private handleSwapButtonDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled() || !this.swapAvailable) {
      return;
    }

    this.swapButtonPointerId = pointer.id;
    this.swapPressPending = true;
    this.updateSwapButtonVisual();
  }

  private refreshVisibility(): void {
    const pauseVisible = this.enabledForTouchDevice && this.scene !== null;
    // The pause panel covers the field, so the swap key hides with it.
    const swapVisible = pauseVisible && this.swapAvailable && !this.blocked;
    setControlKeyVisible(this.pauseKey, pauseVisible, pauseVisible && !this.blocked);
    setControlKeyVisible(this.swapKey, swapVisible, swapVisible);
  }

  private releaseActiveTouches(): void {
    this.releasePauseButton();
    this.releaseSwapButton();
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

  private releaseSwapButton(): void {
    this.swapButtonPointerId = null;
    this.updateSwapButtonVisual();
  }

  private isOverControlKey(pointer: Phaser.Input.Pointer): boolean {
    const half = PAUSE_BUTTON_SIZE / 2;
    const overColumn = Math.abs(pointer.x - this.pauseButtonX) <= half;
    const overPause = Math.abs(pointer.y - this.pauseButtonY) <= half;
    const overSwap = this.swapAvailable && Math.abs(pointer.y - this.swapButtonY) <= half;
    return overColumn && (overPause || overSwap);
  }

  private updateControlAnchors(): void {
    if (!this.scene) {
      return;
    }

    const viewport = getViewportBounds(this.scene);
    this.pauseButtonX = viewport.right - PAUSE_BUTTON_RIGHT_INSET - PAUSE_BUTTON_SIZE / 2;
    this.pauseButtonY = viewport.top + PAUSE_BUTTON_TOP_INSET + PAUSE_BUTTON_SIZE / 2;
    this.swapButtonY = this.pauseButtonY + PAUSE_BUTTON_SIZE + SWAP_BUTTON_GAP;
  }

  private updateKeyVisuals(): void {
    this.updatePauseButtonVisual();
    this.updateSwapButtonVisual();
  }

  private updatePauseButtonVisual(): void {
    const key = this.pauseKey;
    if (!key) return;
    const active = this.pauseButtonPointerId !== null && this.isEnabled();
    const x = this.pauseButtonX;
    const y = this.pauseButtonY;

    drawKeyFrame(key.bg, x, y, active, 1);
    key.icon.clear();
    key.icon.fillStyle(active ? NEON.ink : 0xe8f9ff, 1);
    key.icon.fillRect(x - 7, y - 8, 4.5, 16);
    key.icon.fillRect(x + 2.5, y - 8, 4.5, 16);
    key.hitArea.setPosition(x, y);
  }

  /**
   * Two opposed arrows over the charge bar. A special gun out lights the key's edge and bar amber while
   * it drains; on Lance the bar refills cyan, and the key dims until there is enough charge to leave.
   */
  private updateSwapButtonVisual(): void {
    const key = this.swapKey;
    if (!key) return;
    const active = this.swapButtonPointerId !== null && this.isEnabled();
    const charge = this.swapChargeStep / SWAP_CHARGE_STEPS;
    const ready = this.swapDraining || charge >= SPECIAL_GUN_CHARGE.minToLeaveLance;
    const x = this.pauseButtonX;
    const y = this.swapButtonY;
    const half = PAUSE_BUTTON_SIZE / 2;
    const barColor = this.swapDraining ? NEON.amber : NEON.cyanBright;

    drawKeyFrame(key.bg, x, y, active, ready ? 1 : 0.55, this.swapDraining ? NEON.amber : NEON.cyan);
    const barWidth = PAUSE_BUTTON_SIZE - 20;
    key.bg.fillStyle(barColor, 0.25);
    key.bg.fillRect(x - barWidth / 2, y + half - 8, barWidth, 3);
    key.bg.fillStyle(barColor, 0.95);
    key.bg.fillRect(x - barWidth / 2, y + half - 8, barWidth * charge, 3);

    key.icon.clear();
    key.icon.fillStyle(active ? NEON.ink : 0xe8f9ff, ready ? 1 : 0.45);
    key.icon.fillRect(x - 9, y - 6, 12, 3);
    key.icon.fillTriangle(x + 3, y - 10, x + 3, y + 1, x + 10, y - 4.5);
    key.icon.fillRect(x - 3, y + 3, 12, 3);
    key.icon.fillTriangle(x - 3, y - 1, x - 3, y + 10, x - 10, y + 4.5);
    key.hitArea.setPosition(x, y);
  }
}

function createControlKey(scene: Phaser.Scene): ControlKey {
  return {
    bg: scene.add.graphics().setDepth(CONTROLS_DEPTH).setScrollFactor(0),
    icon: scene.add
      .graphics()
      .setDepth(CONTROLS_DEPTH + 1)
      .setScrollFactor(0),
    hitArea: scene.add
      .zone(0, 0, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE)
      .setOrigin(0.5)
      .setDepth(CONTROLS_DEPTH + 2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true }),
  };
}

function setControlKeyVisible(key: ControlKey | null, visible: boolean, interactive: boolean): void {
  key?.bg.setVisible(visible);
  key?.icon.setVisible(visible);
  key?.hitArea.setVisible(visible);
  if (key?.hitArea.input) key.hitArea.input.enabled = interactive;
}

/**
 * Glass key in the shared cut-corner shape; pressing it lights it solid like a primary button. `edge`
 * tints the unpressed outline and glow (the swap key goes amber while a special gun is out).
 */
function drawKeyFrame(
  bg: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  active: boolean,
  alpha: number,
  edge: number = NEON.cyan
): void {
  const half = PAUSE_BUTTON_SIZE / 2;
  bg.clear();
  drawAngledRectPath(bg, x - half - 2, y - half - 2, PAUSE_BUTTON_SIZE + 4, PAUSE_BUTTON_SIZE + 4, 12);
  bg.lineStyle(3, edge, scaleUiGlowAlpha(active ? 0.3 : 0.1) * alpha);
  bg.strokePath();
  drawAngledRectPath(bg, x - half, y - half, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE, 11);
  bg.fillStyle(active ? NEON.cyan : NEON.panel, active ? 0.95 : 0.7);
  bg.fillPath();
  drawAngledRectPath(bg, x - half, y - half, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE, 11);
  bg.lineStyle(1.5, active ? NEON.cyanBright : edge, (active ? 1 : 0.75) * alpha);
  bg.strokePath();
}
