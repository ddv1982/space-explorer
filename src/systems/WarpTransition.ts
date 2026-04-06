import Phaser from 'phaser';
import { getViewportBounds } from '../utils/layout';

interface WarpStreak {
  line: Phaser.GameObjects.Graphics;
  angle: number;
  distance: number;
  speed: number;
  length: number;
  alpha: number;
}

export class WarpTransition {
  private scene: Phaser.Scene | null = null;
  private streaks: WarpStreak[] = [];
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private elapsed: number = 0;
  private duration: number = 1500;
  private running: boolean = false;
  private onCompleteCallback: (() => void) | null = null;
  private centerX: number = 0;
  private centerY: number = 0;
  private viewportWidth: number = 0;
  private viewportHeight: number = 0;
  private maxDistance: number = 0;

  private readonly handleScaleResize = (): void => {
    this.resize();
  };

  private readonly handleSceneShutdown = (): void => {
    this.destroy();
  };

  create(scene: Phaser.Scene): void {
    if (this.scene) {
      this.destroy();
    }

    this.scene = scene;
    this.syncLayout();

    scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    scene.events.off(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);
  }

  play(onComplete: () => void): void {
    if (!this.scene || this.running) return;

    this.syncLayout();
    this.running = true;
    this.elapsed = 0;
    this.onCompleteCallback = onComplete;
    this.streaks = [];

    this.overlay = this.scene.add.graphics();
    this.overlay.setDepth(1000).setScrollFactor(0);
    this.drawOverlay(0x000000, 0);

    const streakCount = 60;
    for (let i = 0; i < streakCount; i++) {
      const angle = (Math.PI * 2 * i) / streakCount + (Math.random() - 0.5) * 0.3;
      const line = this.scene.add.graphics();
      line.setDepth(1001).setScrollFactor(0);

      this.streaks.push({
        line,
        angle,
        distance: Math.random() * 50 + 10,
        speed: Math.random() * 200 + 150,
        length: 2,
        alpha: Math.random() * 0.5 + 0.5,
      });
    }

    this.scene.events.on('update', this.update, this);
  }

  resize(): void {
    if (!this.scene) {
      return;
    }

    this.syncLayout();

    if (this.overlay && this.running) {
      const progress = Math.min(this.elapsed / this.duration, 1);
      const fadeProgress = progress > 0.6 ? (progress - 0.6) / 0.4 : 0;
      this.drawOverlay(0xffffff, fadeProgress);
    }
  }

  private syncLayout(): void {
    if (!this.scene) {
      return;
    }

    const viewport = getViewportBounds(this.scene);

    this.centerX = viewport.centerX;
    this.centerY = viewport.centerY;
    this.viewportWidth = viewport.width;
    this.viewportHeight = viewport.height;
    this.maxDistance = Math.sqrt((viewport.width / 2) ** 2 + (viewport.height / 2) ** 2) + 100;
  }

  private drawOverlay(color: number, alpha: number): void {
    this.overlay?.clear();
    this.overlay?.fillStyle(color, alpha);
    this.overlay?.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
  }

  private update(_time: number, delta: number): void {
    if (!this.running || !this.scene) return;

    this.elapsed += delta;
    const progress = Math.min(this.elapsed / this.duration, 1);
    const accelFactor = 1 + progress * progress * 8;

    for (const streak of this.streaks) {
      streak.speed += accelFactor * delta * 0.5;
      streak.distance += streak.speed * (delta / 1000);
      streak.length = Math.min(streak.speed * 0.15, 80);

      const endX = this.centerX + Math.cos(streak.angle) * streak.distance;
      const endY = this.centerY + Math.sin(streak.angle) * streak.distance;
      const startX = this.centerX + Math.cos(streak.angle) * Math.max(0, streak.distance - streak.length);
      const startY = this.centerY + Math.sin(streak.angle) * Math.max(0, streak.distance - streak.length);

      streak.line.clear();

      if (streak.distance > this.maxDistance * 0.7) {
        streak.alpha = Math.max(0, streak.alpha - delta * 0.003);
      }

      const brightness = Math.floor(150 + progress * 105);
      const color = (brightness << 16) | (brightness << 8) | brightness;

      streak.line.lineStyle(Math.max(1, 3 - progress * 2), color, streak.alpha);
      streak.line.beginPath();
      streak.line.moveTo(startX, startY);
      streak.line.lineTo(endX, endY);
      streak.line.strokePath();
    }

    if (this.overlay && progress > 0.6) {
      this.drawOverlay(0xffffff, (progress - 0.6) / 0.4);
    }

    if (progress >= 1) {
      const onComplete = this.onCompleteCallback;
      this.cleanup();
      onComplete?.();
    }
  }

  private cleanup(): void {
    if (this.scene) {
      this.scene.events.off('update', this.update, this);
    }

    for (const streak of this.streaks) {
      streak.line.destroy();
    }
    this.streaks = [];

    this.overlay?.destroy();
    this.overlay = null;

    this.running = false;
    this.onCompleteCallback = null;
  }

  cancel(): void {
    this.cleanup();
  }

  destroy(): void {
    this.cleanup();

    if (!this.scene) {
      return;
    }

    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);
    this.scene = null;
  }

  isRunning(): boolean {
    return this.running;
  }
}
