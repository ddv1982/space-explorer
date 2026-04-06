import Phaser from 'phaser';
import { isPortraitTouchViewport } from '../utils/device';

type OnBlockedHandler = () => void;

export class MobileViewportGuard {
  private scene: Phaser.Scene | null = null;
  private onBlocked: OnBlockedHandler | null = null;
  private blocked: boolean = false;
  private pausedPhysicsWorld: boolean = false;

  private readonly handleViewportChange = (): void => {
    this.refresh();
  };

  static create(scene: Phaser.Scene, onBlocked: OnBlockedHandler): MobileViewportGuard {
    return new MobileViewportGuard().create(scene, onBlocked);
  }

  create(scene: Phaser.Scene, onBlocked: OnBlockedHandler): this {
    this.destroy();

    this.scene = scene;
    this.onBlocked = onBlocked;

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleViewportChange, this);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleViewportChange);
      window.addEventListener('orientationchange', this.handleViewportChange);
    }

    this.refresh();

    return this;
  }

  destroy(): void {
    if (!this.scene) {
      return;
    }

    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleViewportChange, this);

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleViewportChange);
      window.removeEventListener('orientationchange', this.handleViewportChange);
    }

    if (this.pausedPhysicsWorld) {
      this.scene.physics.world.resume();
    }

    this.scene = null;
    this.onBlocked = null;
    this.blocked = false;
    this.pausedPhysicsWorld = false;
  }

  isBlocked(): boolean {
    return this.blocked;
  }

  refresh(): boolean {
    if (!this.scene) {
      this.blocked = false;
      return this.blocked;
    }

    const nextBlocked = isPortraitTouchViewport();

    if (nextBlocked === this.blocked) {
      return this.blocked;
    }

    this.blocked = nextBlocked;

    if (nextBlocked) {
      this.onBlocked?.();

      if (!this.scene.physics.world.isPaused) {
        this.scene.physics.world.pause();
        this.pausedPhysicsWorld = true;
      }

      return this.blocked;
    }

    if (this.pausedPhysicsWorld) {
      this.scene.physics.world.resume();
      this.pausedPhysicsWorld = false;
    }

    return this.blocked;
  }
}
