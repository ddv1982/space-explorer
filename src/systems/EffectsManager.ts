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
      camera.postFX.addBloom(0x9fd8ff, 1, 1, 1, 0.7);
      camera.postFX.addVignette(0.5, 0.5, 0.78, 0.28);
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

    // Muzzle flash particle
    const g3 = this.scene.add.graphics();
    g3.fillStyle(0xffffff, 1);
    g3.fillCircle(6, 6, 6);
    g3.generateTexture('particle-muzzle', 12, 12);
    g3.destroy();

    // Engine exhaust particle
    const g4 = this.scene.add.graphics();
    g4.fillStyle(0xffffff, 1);
    g4.fillCircle(3, 3, 3);
    g4.generateTexture('particle-exhaust', 6, 6);
    g4.destroy();

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

  createMuzzleFlash(x: number, y: number): void {
    const particles = this.scene.add.particles(x, y, 'particle-muzzle', {
      speed: { min: 20, max: 80 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.6, end: 0 },
      lifespan: { min: 60, max: 120 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 5,
      emitting: false,
      tint: [0x00ffff, 0x88ffff, 0xffffff, 0x44aaff],
    });

    particles.explode(5);
    particles.setDepth(6);

    this.scene.time.delayedCall(200, () => {
      particles.destroy();
    });
  }

  createEngineExhaust(x: number, y: number, intensity: number): void {
    const count = Math.ceil(intensity * 2);
    const particles = this.scene.add.particles(x, y, 'particle-exhaust', {
      speed: { min: 30, max: 60 + intensity * 40 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.4, end: 0 },
      lifespan: { min: 80, max: 200 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: count,
      emitting: false,
      tint: [0x0088ff, 0x00aaff, 0x44ccff, 0xffffff],
    });

    particles.explode(count);
    particles.setDepth(4);

    this.scene.time.delayedCall(250, () => {
      particles.destroy();
    });
  }

  createSpawnWarning(x: number): void {
    // Small downward-pointing triangle at top edge
    const arrow = this.scene.add.graphics();
    arrow.setDepth(150);
    arrow.setScrollFactor(0);

    const ay = 30;
    arrow.fillStyle(0xff4444, 0.8);
    arrow.fillTriangle(x - 6, ay - 6, x + 6, ay - 6, x, ay + 6);
    arrow.fillStyle(0xffffff, 0.5);
    arrow.fillTriangle(x - 3, ay - 3, x + 3, ay - 3, x, ay + 3);

    // Flash and fade
    this.scene.tweens.add({
      targets: arrow,
      alpha: { from: 1, to: 0 },
      duration: 600,
      ease: 'Power2',
      onComplete: () => arrow.destroy(),
    });
  }

  createScorePopup(x: number, y: number, score: number): void {
    const text = this.scene.add.text(x, y, `+${score}`, {
      fontSize: '16px',
      color: '#ffcc00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }
}
