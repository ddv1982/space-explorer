import Phaser from 'phaser';
import { LevelConfig } from '../config/LevelsConfig';

export class EffectsManager {
  private scene!: Phaser.Scene;
  private particleTextures: boolean = false;
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;

  setup(scene: Phaser.Scene): void {
    this.scene = scene;
    this.setupCameraFX();
    this.generateParticleTextures();
  }

  applyLevelColorGrade(config: LevelConfig): void {
    if (!config.colorGrade) return;

    const camera = this.scene.cameras.main;
    if (!camera.postFX) return;

    if (!this.colorMatrix) {
      this.colorMatrix = camera.postFX.addColorMatrix();
    }

    const { brightness, contrast, saturation } = config.colorGrade;
    this.colorMatrix.brightness(brightness);
    this.colorMatrix.contrast(contrast);
    this.colorMatrix.saturate(saturation);
  }

  private setupCameraFX(): void {
    const camera = this.scene.cameras.main;

    if (camera.postFX) {
      camera.postFX.addBloom(0x000000, 1, 1, 1, 1.2);
      camera.postFX.addVignette(0.5, 0.5, 0.7, 0.6);
    }
  }

  private generateParticleTextures(): void {
    if (this.particleTextures) return;

    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('particle-explosion', 16, 16);
    g.destroy();

    const g2 = this.scene.add.graphics();
    g2.fillStyle(0xffffff, 1);
    g2.fillCircle(4, 4, 4);
    g2.generateTexture('particle-spark', 8, 8);
    g2.destroy();

    this.particleTextures = true;
  }

  createExplosion(x: number, y: number, intensity: number = 1): void {
    const particleCount = Math.floor(20 * intensity);

    const particles = this.scene.add.particles(x, y, 'particle-explosion', {
      speed: { min: 50, max: 200 * intensity },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8 * intensity, end: 0 },
      lifespan: { min: 300, max: 600 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: particleCount,
      emitting: false,
      tint: [0xff4444, 0xff8800, 0xffcc00, 0xffff44],
    });

    particles.explode(particleCount);
    particles.setDepth(6);

    this.scene.cameras.main.shake(
      Math.floor(100 * intensity),
      0.005 * intensity
    );

    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  createSparkBurst(x: number, y: number): void {
    const particles = this.scene.add.particles(x, y, 'particle-spark', {
      speed: { min: 30, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: { min: 100, max: 300 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 8,
      emitting: false,
      tint: [0x00ffff, 0x88ffff, 0xffffff],
    });

    particles.explode(8);
    particles.setDepth(6);

    this.scene.time.delayedCall(500, () => {
      particles.destroy();
    });
  }
}
