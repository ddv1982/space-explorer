import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';

export class EffectsManager {
  private scene!: Phaser.Scene;
  private colorMatrix: Phaser.Filters.ColorMatrix | null = null;
  private bloom: Phaser.Filters.Glow | null = null;
  private cameraBlur: Phaser.Filters.Blur | null = null;
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
  private exhaustConfigKey: string | null = null;
  private currentLevelConfig: LevelConfig | null = null;

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
    this.bloom = null;
    this.cameraBlur = null;
    this.exhaustConfigKey = null;
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
    matrix.reset();
    matrix.brightness(brightness);
    matrix.contrast(contrast);
    matrix.saturate(saturation);
  }

  private setupCameraFX(): void {
    const camera = this.scene.cameras.main;

    camera.filters.external.addVignette(0.5, 0.5, 0.78, 0.28);

    // Add subtle glow for highlighted elements
    this.bloom = camera.filters.external.addGlow(0x66bbff, 0.7, 0.2, 1, false, 0, 8);

    // Slight cinematic softness to push depth in busy scenes
    this.cameraBlur = camera.filters.external.addBlur(0, 0.7, 0.7, 0.35, 0xaaccff, 2);
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

    const particleCount = Math.floor(20 * intensity);

    this.explosionEmitter.updateConfig(this.getExplosionConfig(intensity, particleCount));
    this.explosionEmitter.explode(particleCount, x, y);

    // Add debris for larger explosions
    if (intensity >= 1.0 && this.debrisEmitter) {
      const debrisCount = Math.floor(8 * intensity);
      this.debrisEmitter.explode(debrisCount, x, y);
    }

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
    this.hitSplashEmitter?.explode(10, x, y);
  }

  createAmbientSparkle(x: number, y: number): void {
    this.ambientSparkleEmitter?.explode(1, x, y);
  }

  createPowerUpBurst(x: number, y: number, color?: number): void {
    if (!this.powerUpBurstEmitter) return;

    if (color) {
      this.powerUpBurstEmitter.updateConfig({
        ...this.getPowerUpBurstConfig(),
        tint: [0xffffff, color],
      });
    }

    this.powerUpBurstEmitter.explode(14, x, y);
  }

  createAsteroidDebris(x: number, y: number): void {
    this.debrisEmitter?.explode(10, x, y);
  }
}
