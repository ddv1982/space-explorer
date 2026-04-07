import Phaser from 'phaser';
import { isPortraitTouchViewport } from '../utils/device';

type OnBlockedStateChangeHandler = (blocked: boolean) => void;

export class MobileViewportGuard {
  private scene: Phaser.Scene | null = null;
  private onBlockedStateChange: OnBlockedStateChangeHandler | null = null;
  private blocked: boolean = false;

  private readonly handleViewportChange = (): void => {
    this.refresh();
  };

  static create(scene: Phaser.Scene, onBlockedStateChange: OnBlockedStateChangeHandler): MobileViewportGuard {
    return new MobileViewportGuard().create(scene, onBlockedStateChange);
  }

  create(scene: Phaser.Scene, onBlockedStateChange: OnBlockedStateChangeHandler): this {
    this.destroy();

    this.scene = scene;
    this.onBlockedStateChange = onBlockedStateChange;

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

    this.scene = null;
    this.onBlockedStateChange = null;
    this.blocked = false;
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

    this.onBlockedStateChange?.(nextBlocked);

    return this.blocked;
  }
}
