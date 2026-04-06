import Phaser from 'phaser';
import { LevelConfig } from '../config/LevelsConfig';

export class EffectsManager {
  private scene!: Phaser.Scene;
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private explosionEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private muzzleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private exhaustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  setup(scene: Phaser.Scene): void {
    this.scene = scene;
    this.clearCameraFX();
    this.setupCameraFX();
    this.generateParticleTextures();
    this.createParticleEmitters();
  }

  destroy(): void {
    this.destroyEmitters();
    this.clearCameraFX();
    this.colorMatrix = null;
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
      camera.postFX.addVignette(0.5, 0.5, 0.78, 0.28);
    }
  }

  private generateParticleTextures(): void {
    this.generateCircleTexture('particle-explosion', 16, 8);
    this.generateCircleTexture('particle-spark', 8, 4);
    this.generateCircleTexture('particle-muzzle', 12, 6);
    this.generateCircleTexture('particle-exhaust', 6, 3);
  }

  private generateCircleTexture(key: string, size: number, radius: number): void {
    if (this.scene.textures.exists(key)) {
      return;
    }

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(size / 2, size / 2, radius);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private createParticleEmitters(): void {
    this.destroyEmitters();

    this.explosionEmitter = this.createPooledEmitter(
      'particle-explosion',
      this.getExplosionConfig(1, 20),
      6,
      192
    );
    this.sparkEmitter = this.createPooledEmitter(
      'particle-spark',
      this.getSparkConfig(),
      6,
      48
    );
    this.muzzleEmitter = this.createPooledEmitter(
      'particle-muzzle',
      this.getMuzzleConfig(),
      6,
      48
    );
    this.exhaustEmitter = this.createPooledEmitter(
      'particle-exhaust',
      this.getExhaustConfig(1, 2),
      4,
      64
    );
  }

  private createPooledEmitter(
    textureKey: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    depth: number,
    reserveCount: number
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.scene.add.particles(0, 0, textureKey, {
      ...config,
      emitting: false,
    });

    emitter.setDepth(depth);
    emitter.reserve(reserveCount);

    return emitter;
  }

  private clearCameraFX(): void {
    const camera = this.scene?.cameras?.main;
    camera?.postFX?.clear();
  }

  private destroyEmitters(): void {
    this.explosionEmitter?.destroy();
    this.sparkEmitter?.destroy();
    this.muzzleEmitter?.destroy();
    this.exhaustEmitter?.destroy();

    this.explosionEmitter = null;
    this.sparkEmitter = null;
    this.muzzleEmitter = null;
    this.exhaustEmitter = null;
  }

  private getExplosionConfig(
    intensity: number,
    quantity: number
  ): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 50, max: 200 * intensity },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8 * intensity, end: 0 },
      lifespan: { min: 300, max: 600 },
      blendMode: Phaser.BlendModes.ADD,
      quantity,
      tint: [0xff4444, 0xff8800, 0xffcc00, 0xffff44],
    };
  }

  private getSparkConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 30, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: { min: 100, max: 300 },
      blendMode: Phaser.BlendModes.NORMAL,
      quantity: 8,
      tint: [0x00ffff, 0x88ffff, 0xffffff],
    };
  }

  private getMuzzleConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 20, max: 80 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.6, end: 0 },
      lifespan: { min: 60, max: 120 },
      blendMode: Phaser.BlendModes.NORMAL,
      quantity: 5,
      tint: [0x00ffff, 0x88ffff, 0xffffff, 0x44aaff],
    };
  }

  private getExhaustConfig(
    intensity: number,
    quantity: number
  ): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 30, max: 60 + intensity * 40 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.4, end: 0 },
      lifespan: { min: 80, max: 200 },
      blendMode: Phaser.BlendModes.NORMAL,
      quantity,
      tint: [0x0088ff, 0x00aaff, 0x44ccff, 0xffffff],
    };
  }

  createExplosion(x: number, y: number, intensity: number = 1): void {
    if (!this.explosionEmitter) {
      return;
    }

    const particleCount = Math.floor(20 * intensity);

    this.explosionEmitter.updateConfig(this.getExplosionConfig(intensity, particleCount));
    this.explosionEmitter.explode(particleCount, x, y);

    this.scene.cameras.main.shake(
      Math.floor(100 * intensity),
      0.005 * intensity
    );
  }

  createSparkBurst(x: number, y: number): void {
    this.sparkEmitter?.explode(8, x, y);
  }

  createMuzzleFlash(x: number, y: number): void {
    this.muzzleEmitter?.explode(5, x, y);
  }

  createEngineExhaust(x: number, y: number, intensity: number): void {
    if (!this.exhaustEmitter) {
      return;
    }

    const count = Math.ceil(intensity * 2);

    this.exhaustEmitter.updateConfig(this.getExhaustConfig(intensity, count));
    this.exhaustEmitter.explode(count, x, y);
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
