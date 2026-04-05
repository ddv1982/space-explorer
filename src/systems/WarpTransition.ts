import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

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
  private centerX: number = GAME_WIDTH / 2;
  private centerY: number = GAME_HEIGHT / 2;
  private maxDistance: number = 0;

  create(scene: Phaser.Scene): void {
    this.scene = scene;
    this.maxDistance = Math.sqrt(this.centerX * this.centerX + this.centerY * this.centerY) + 100;
  }

  play(onComplete: () => void): void {
    if (!this.scene || this.running) return;

    this.running = true;
    this.elapsed = 0;
    this.onCompleteCallback = onComplete;
    this.streaks = [];

    // Create overlay for fade-to-white effect
    this.overlay = this.scene.add.graphics();
    this.overlay.setDepth(1000);
    this.overlay.fillStyle(0x000000, 0);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Create star streaks
    const streakCount = 60;
    for (let i = 0; i < streakCount; i++) {
      const angle = (Math.PI * 2 * i) / streakCount + (Math.random() - 0.5) * 0.3;
      const line = this.scene.add.graphics();
      line.setDepth(1001);

      const streak: WarpStreak = {
        line,
        angle,
        distance: Math.random() * 50 + 10,
        speed: Math.random() * 200 + 150,
        length: 2,
        alpha: Math.random() * 0.5 + 0.5,
      };
      this.streaks.push(streak);
    }

    // Start the update loop
    this.scene.events.on('update', this.update, this);
  }

  private update(_time: number, delta: number): void {
    if (!this.running || !this.scene) return;

    this.elapsed += delta;
    const progress = Math.min(this.elapsed / this.duration, 1);

    // Acceleration curve - starts slow, speeds up dramatically
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

      // Fade out streaks that go off screen
      if (streak.distance > this.maxDistance * 0.7) {
        streak.alpha = Math.max(0, streak.alpha - delta * 0.003);
      }

      // Brightness increases with progress
      const brightness = Math.floor(150 + progress * 105);
      const color = (brightness << 16) | (brightness << 8) | brightness;

      streak.line.lineStyle(
        Math.max(1, 3 - progress * 2),
        color,
        streak.alpha
      );
      streak.line.beginPath();
      streak.line.moveTo(startX, startY);
      streak.line.lineTo(endX, endY);
      streak.line.strokePath();
    }

    // Fade overlay to white in last third
    if (this.overlay && progress > 0.6) {
      const fadeProgress = (progress - 0.6) / 0.4;
      this.overlay.clear();
      this.overlay.fillStyle(0xffffff, fadeProgress);
      this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Complete
    if (progress >= 1) {
      this.cleanup();
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
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

    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    this.running = false;
    this.onCompleteCallback = null;
  }

  isRunning(): boolean {
    return this.running;
  }
}
