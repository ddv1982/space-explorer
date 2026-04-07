import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';
import { resolvePerformancePolicy, SustainedFpsFallbackGate } from '../utils/performancePolicy';

export class EffectsManager {
  private scene!: Phaser.Scene;
  private colorMatrix: Phaser.Filters.ColorMatrix | null = null;
  private bloom: Phaser.Filters.Glow | null = null;
  private lowPerformanceMode: boolean = false;
  private adaptiveBurstScale = 1;
  private readonly runtimeFpsFallback = new SustainedFpsFallbackGate({ sampleWindowMs: 1500 });
  private runtimeThrottleApplied = false;
  private explosionEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private muzzleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private exhaustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bulletTrailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private enemyBulletTrailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private hitSplashEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private ambientSparkleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private powerUpBurstEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private debrisEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private emitterViewBounds: Phaser.Geom.Rectangle | null = null;
  private exhaustConfigKey: string | null = null;
  private explosionConfigKey: string | null = null;
  private powerUpBurstTintKey = 'default';
  private currentLevelConfig: LevelConfig | null = null;

  setup(scene: Phaser.Scene): void {
    this.scene = scene;
    const { width, height } = this.scene.scale.gameSize;
    const performancePolicy = resolvePerformancePolicy(width, height);
    this.lowPerformanceMode = performancePolicy.lowPerformanceMode;
    this.adaptiveBurstScale = performancePolicy.burstScale;
    this.runtimeFpsFallback.reset();
    this.runtimeThrottleApplied = false;
    this.emitterViewBounds = this.createEmitterViewBounds();
    this.clearCameraFX();
    this.setupCameraFX();
    this.generateParticleTextures();
    this.createParticleEmitters();
  }

  destroy(): void {
    this.destroyEmitters();
    this.clearCameraFX();
    this.colorMatrix = null;
    this.bloom = null;
    this.lowPerformanceMode = false;
    this.adaptiveBurstScale = 1;
    this.runtimeFpsFallback.reset();
    this.runtimeThrottleApplied = false;
    this.emitterViewBounds = null;
    this.exhaustConfigKey = null;
    this.explosionConfigKey = null;
    this.powerUpBurstTintKey = 'default';
    this.currentLevelConfig = null;
  }

  applyLevelColorGrade(config: LevelConfig): void {
    this.currentLevelConfig = config;
    if (!config.colorGrade) return;

    const camera = this.scene.cameras.main;

    if (!this.colorMatrix) {
      this.colorMatrix = camera.filters.internal.addColorMatrix();
    }

    const { brightness, contrast, saturation } = config.colorGrade;
    const matrix = this.colorMatrix.colorMatrix;
    const mappedBrightness = Phaser.Math.Clamp(
      brightness <= 0.35 ? 1 + brightness : brightness,
      0.8,
      1.4
    );
    const mappedContrast = Phaser.Math.Clamp(
      contrast >= 0.5 ? contrast - 1 : contrast,
      -0.8,
      1
    );
    const mappedSaturation = Phaser.Math.Clamp(
      saturation >= 0.5 ? saturation - 1 : saturation,
      -1,
      1.2
    );

    matrix.reset();
    matrix.brightness(mappedBrightness);
    matrix.contrast(mappedContrast, true);
    matrix.saturate(mappedSaturation, true);
  }

  private setupCameraFX(): void {
    const camera = this.scene.cameras.main;

    camera.filters.external.addVignette(0.5, 0.5, 0.93, this.lowPerformanceMode ? 0.08 : 0.1);

    if (!this.lowPerformanceMode) {
      // Keep only a lightweight glow on stronger devices
      this.bloom = camera.filters.external.addGlow(0x88c8ff, 0.32, 0.07, 1, false, 0, 5);
    } else {
      this.bloom = null;
    }
  }

  updateRuntimePerformance(delta: number): void {
    if (this.runtimeThrottleApplied) {
      return;
    }

    const fps = this.scene?.game?.loop?.actualFps ?? 60;
    if (this.runtimeFpsFallback.update(delta, fps)) {
      this.runtimeThrottleApplied = true;
      this.lowPerformanceMode = true;
      this.adaptiveBurstScale = Math.min(this.adaptiveBurstScale, 0.64);

      if (this.bloom) {
        this.bloom.active = false;
      }
    }
  }

  private generateParticleTextures(): void {
    this.generateCircleTexture('particle-explosion', 16, 8);
    this.generateCircleTexture('particle-spark', 8, 4);
    this.generateCircleTexture('particle-muzzle', 12, 6);
    this.generateCircleTexture('particle-exhaust', 6, 3);
    this.generateCircleTexture('particle-trail', 4, 2);
    this.generateCircleTexture('particle-hit', 10, 5);
    this.generateCircleTexture('particle-sparkle', 6, 3);
    this.generateCircleTexture('particle-burst', 12, 6);
    this.generateCircleTexture('particle-debris', 5, 2);
    this.generateSquareTexture('particle-ember', 3);
  }

  private generateCircleTexture(key: string, size: number, radius: number): void {
    if (this.scene.textures.exists(key)) {
      return;
    }

    const graphics = this.scene.add.graphics();
    const cx = size / 2;
    const cy = size / 2;

    for (let layer = 4; layer >= 1; layer--) {
      const layerRadius = radius * (layer / 4);
      const alpha = 0.08 + layer * 0.12;
      graphics.fillStyle(0xffffff, alpha);
      graphics.fillCircle(cx, cy, layerRadius);
    }

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(cx, cy, Math.max(1, radius * 0.35));

    graphics.fillStyle(0xffffff, 0.55);
    graphics.fillCircle(cx - radius * 0.18, cy - radius * 0.18, Math.max(0.6, radius * 0.18));

    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private generateSquareTexture(key: string, size: number): void {
    if (this.scene.textures.exists(key)) {
      return;
    }

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillRect(0, 0, size, size);
    graphics.fillStyle(0xffffff, 0.55);
    graphics.fillRect(0, 0, size, 1);
    graphics.fillRect(0, 0, 1, size);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private createParticleEmitters(): void {
    this.destroyEmitters();
    this.exhaustConfigKey = null;
    this.explosionConfigKey = null;
    this.powerUpBurstTintKey = 'default';

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
    this.bulletTrailEmitter = this.createPooledEmitter(
      'particle-trail',
      this.getBulletTrailConfig(),
      3,
      64
    );
    this.enemyBulletTrailEmitter = this.createPooledEmitter(
      'particle-trail',
      this.getEnemyBulletTrailConfig(),
      3,
      48
    );
    this.hitSplashEmitter = this.createPooledEmitter(
      'particle-hit',
      this.getHitSplashConfig(),
      7,
      32
    );
    this.ambientSparkleEmitter = this.createPooledEmitter(
      'particle-sparkle',
      this.getAmbientSparkleConfig(),
      1,
      24
    );
    this.powerUpBurstEmitter = this.createPooledEmitter(
      'particle-burst',
      this.getPowerUpBurstConfig(),
      8,
      32
    );
    this.debrisEmitter = this.createPooledEmitter(
      'particle-debris',
      this.getDebrisConfig(),
      5,
      48
    );
  }

  private createPooledEmitter(
    textureKey: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    depth: number,
    reserveCount: number
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const tunedConfig = this.lowPerformanceMode ? this.scaleEmitterConfig(config, 0.75) : config;

    const emitter = this.scene.add.particles(0, 0, textureKey, {
      ...tunedConfig,
      emitting: false,
    });

    emitter.setDepth(depth);

    const poolTarget = this.lowPerformanceMode ? Math.max(8, Math.round(reserveCount * 0.65)) : reserveCount;
    emitter.reserve(poolTarget);
    emitter.maxAliveParticles = poolTarget;
    emitter.maxParticles = Math.max(poolTarget, Math.round(poolTarget * 1.35));

    const viewBounds = this.emitterViewBounds ?? this.createEmitterViewBounds();
    emitter.viewBounds = viewBounds;

    return emitter;
  }

  private createEmitterViewBounds(): Phaser.Geom.Rectangle {
    const padding = this.lowPerformanceMode ? 80 : 120;
    const { width, height } = this.scene.scale.gameSize;
    return new Phaser.Geom.Rectangle(-padding, -padding, width + padding * 2, height + padding * 2);
  }

  private scaleEmitterConfig(
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    factor: number
  ): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    if (typeof config.quantity !== 'number') {
      return config;
    }

    return {
      ...config,
      quantity: Math.max(1, Math.round(config.quantity * factor)),
    };
  }

  private scaleBurstCount(count: number): number {
    const baseScale = this.lowPerformanceMode ? 0.72 : 1;
    return Math.max(1, Math.round(count * baseScale * this.adaptiveBurstScale));
  }

  private clearCameraFX(): void {
    const camera = this.scene?.cameras?.main;
    camera?.filters?.internal.clear();
    camera?.filters?.external.clear();
  }

  private destroyEmitters(): void {
    this.explosionEmitter?.destroy();
    this.sparkEmitter?.destroy();
    this.muzzleEmitter?.destroy();
    this.exhaustEmitter?.destroy();
    this.bulletTrailEmitter?.destroy();
    this.enemyBulletTrailEmitter?.destroy();
    this.hitSplashEmitter?.destroy();
    this.ambientSparkleEmitter?.destroy();
    this.powerUpBurstEmitter?.destroy();
    this.debrisEmitter?.destroy();

    this.explosionEmitter = null;
    this.sparkEmitter = null;
    this.muzzleEmitter = null;
    this.exhaustEmitter = null;
    this.bulletTrailEmitter = null;
    this.enemyBulletTrailEmitter = null;
    this.hitSplashEmitter = null;
    this.ambientSparkleEmitter = null;
    this.powerUpBurstEmitter = null;
    this.debrisEmitter = null;
    this.exhaustConfigKey = null;
    this.explosionConfigKey = null;
    this.powerUpBurstTintKey = 'default';
  }

  // ---------------------------------------------------------------------------
  // Emitter configs
  // ---------------------------------------------------------------------------

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

  private getBulletTrailConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 5, max: 15 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.3, end: 0 },
      lifespan: { min: 100, max: 200 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 1,
      tint: [0x00ccff, 0x00ffff],
      alpha: { start: 0.5, end: 0 },
    };
  }

  private getEnemyBulletTrailConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 5, max: 15 },
      angle: { min: 260, max: 280 },
      scale: { start: 0.25, end: 0 },
      lifespan: { min: 80, max: 150 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 1,
      tint: [0xff4422, 0xff6644],
      alpha: { start: 0.4, end: 0 },
    };
  }

  private getHitSplashConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 40, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: { min: 150, max: 350 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 10,
      tint: [0xffffff, 0xffcc44, 0xff8800],
    };
  }

  private getAmbientSparkleConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.2, end: 0 },
      lifespan: { min: 500, max: 1500 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 1,
      alpha: { start: 0.3, end: 0 },
      tint: [0xaaccff, 0xffffff, 0xffddaa],
    };
  }

  private getPowerUpBurstConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 60, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: { min: 300, max: 600 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 14,
      tint: [0xffffff, 0xffee88],
    };
  }

  private getDebrisConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    return {
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0.1 },
      lifespan: { min: 400, max: 800 },
      blendMode: Phaser.BlendModes.NORMAL,
      quantity: 12,
      rotate: { min: 0, max: 360 },
      tint: [0x886644, 0x665533, 0x998866],
    };
  }

  // ---------------------------------------------------------------------------
  // Public effect methods
  // ---------------------------------------------------------------------------

  createExplosion(x: number, y: number, intensity: number = 1): void {
    if (!this.explosionEmitter) {
      return;
    }

    const particleCount = this.scaleBurstCount(Math.floor(20 * intensity));
    const configKey = `${intensity.toFixed(2)}-${particleCount}`;

    if (this.explosionConfigKey !== configKey) {
      this.explosionEmitter.updateConfig(this.getExplosionConfig(intensity, particleCount));
      this.explosionConfigKey = configKey;
    }

    this.explosionEmitter.explode(particleCount, x, y);

    // Add debris for larger explosions
    if (intensity >= 1.0 && this.debrisEmitter) {
      const debrisCount = this.scaleBurstCount(Math.floor(8 * intensity));
      this.debrisEmitter.explode(debrisCount, x, y);
    }

    this.scene.cameras.main.shake(
      Math.floor(100 * intensity),
      (this.lowPerformanceMode ? 0.0038 : 0.005) * intensity
    );
  }

  createSparkBurst(x: number, y: number): void {
    this.sparkEmitter?.explode(this.scaleBurstCount(8), x, y);
  }

  createMuzzleFlash(x: number, y: number): void {
    this.muzzleEmitter?.explode(this.scaleBurstCount(5), x, y);
  }

  createEngineExhaust(x: number, y: number, intensity: number): void {
    if (!this.exhaustEmitter) {
      return;
    }

    const count = this.scaleBurstCount(Math.ceil(intensity * 2));
    const configKey = `${intensity.toFixed(1)}-${count}`;

    if (this.exhaustConfigKey !== configKey) {
      this.exhaustEmitter.updateConfig(this.getExhaustConfig(intensity, count));
      this.exhaustConfigKey = configKey;
    }

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

  createBulletTrail(x: number, y: number): void {
    this.bulletTrailEmitter?.explode(1, x, y);
  }

  createEnemyBulletTrail(x: number, y: number): void {
    this.enemyBulletTrailEmitter?.explode(1, x, y);
  }

  createHitSplash(x: number, y: number): void {
    this.hitSplashEmitter?.explode(this.scaleBurstCount(10), x, y);
  }

  createAmbientSparkle(x: number, y: number): void {
    this.ambientSparkleEmitter?.explode(1, x, y);
  }

  createPowerUpBurst(x: number, y: number, color?: number): void {
    if (!this.powerUpBurstEmitter) return;

    const tintKey = color ? `tinted-${color.toString(16)}` : 'default';
    if (this.powerUpBurstTintKey !== tintKey) {
      this.powerUpBurstEmitter.updateConfig({
        ...this.getPowerUpBurstConfig(),
        tint: color ? [0xffffff, color] : [0xffffff, 0xffee88],
      });

      this.powerUpBurstTintKey = tintKey;
    }

    this.powerUpBurstEmitter.explode(this.scaleBurstCount(14), x, y);
  }

  createAsteroidDebris(x: number, y: number): void {
    this.debrisEmitter?.explode(this.scaleBurstCount(10), x, y);
  }
}
