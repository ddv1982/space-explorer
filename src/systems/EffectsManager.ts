import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';
import {
  applyBaselineCameraFilters,
  applyCameraColorGrade,
  applyCameraColorPulse,
  clearCameraFilters,
} from '../utils/renderingCompat';
import { generateEffectsParticleTextures } from './effects/particleTextureFactory';
import {
  createScorePopup as createOverlayScorePopup,
  createSpawnWarning as createOverlaySpawnWarning,
} from './effects/ephemeralOverlayTweens';
import {
  createPooledEmitter,
  getAmbientSparkleConfig,
  getBulletTrailConfig,
  getDebrisConfig,
  getEnemyBulletTrailConfig,
  getExhaustConfig,
  getExplosionConfig,
  getHitSplashConfig,
  getMuzzleConfig,
  getPowerUpBurstConfig,
  getSparkConfig,
} from './effects/emitterSetup';

export class EffectsManager {
  private static readonly SCORE_POPUP_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '16px',
    color: '#ffcc00',
    fontFamily: 'monospace',
    fontStyle: 'bold',
  };

  private scene!: Phaser.Scene;
  private colorMatrix: Phaser.Filters.ColorMatrix | null = null;
  private bloom: Phaser.Filters.Glow | null = null;
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
  private exhaustConfigIntensityTenths = -1;
  private exhaustConfigCount = -1;
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
    this.exhaustConfigIntensityTenths = -1;
    this.exhaustConfigCount = -1;
    this.currentLevelConfig = null;
  }

  applyLevelColorGrade(config: LevelConfig): void {
    this.currentLevelConfig = config;
    if (!config.colorGrade) return;

    const camera = this.scene.cameras.main;
    this.colorMatrix = applyCameraColorGrade(camera, this.colorMatrix, config.colorGrade);
  }

  pulseCameraColor(
    pulse: { brightness?: number; contrast?: number; saturation?: number },
    durationMs: number = 180
  ): void {
    const camera = this.scene?.cameras?.main;
    if (!camera) {
      return;
    }

    const existingGrade = this.currentLevelConfig?.colorGrade ?? { brightness: 0, contrast: 1, saturation: 1 };
    this.colorMatrix = applyCameraColorPulse(camera, this.colorMatrix, pulse);

    this.scene.time.delayedCall(durationMs, () => {
      if (!this.scene?.cameras?.main) {
        return;
      }

      this.colorMatrix = applyCameraColorGrade(this.scene.cameras.main, this.colorMatrix, existingGrade);
    });
  }

  private setupCameraFX(): void {
    const camera = this.scene.cameras.main;
    this.bloom = applyBaselineCameraFilters(camera);
  }

  private generateParticleTextures(): void {
    generateEffectsParticleTextures(this.scene);
  }

  private createParticleEmitters(): void {
    this.destroyEmitters();
    this.exhaustConfigIntensityTenths = -1;
    this.exhaustConfigCount = -1;

    this.explosionEmitter = createPooledEmitter(this.scene, 'particle-explosion', getExplosionConfig(1, 20), 6, 192);
    this.sparkEmitter = createPooledEmitter(this.scene, 'particle-spark', getSparkConfig(), 6, 48);
    this.muzzleEmitter = createPooledEmitter(this.scene, 'particle-muzzle', getMuzzleConfig(), 6, 48);
    this.exhaustEmitter = createPooledEmitter(this.scene, 'particle-exhaust', getExhaustConfig(1, 2), 4, 64);
    this.bulletTrailEmitter = createPooledEmitter(this.scene, 'particle-trail', getBulletTrailConfig(), 3, 64);
    this.enemyBulletTrailEmitter = createPooledEmitter(
      this.scene,
      'particle-trail',
      getEnemyBulletTrailConfig(),
      3,
      48
    );
    this.hitSplashEmitter = createPooledEmitter(this.scene, 'particle-hit', getHitSplashConfig(), 7, 32);
    this.ambientSparkleEmitter = createPooledEmitter(
      this.scene,
      'particle-sparkle',
      getAmbientSparkleConfig(),
      1,
      24
    );
    this.powerUpBurstEmitter = createPooledEmitter(this.scene, 'particle-burst', getPowerUpBurstConfig(), 8, 32);
    this.debrisEmitter = createPooledEmitter(this.scene, 'particle-debris', getDebrisConfig(), 5, 48);
  }

  private clearCameraFX(): void {
    const camera = this.scene?.cameras?.main;
    if (!camera) {
      return;
    }

    clearCameraFilters(camera);
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
    this.exhaustConfigIntensityTenths = -1;
    this.exhaustConfigCount = -1;
  }

  // ---------------------------------------------------------------------------
  // Public effect methods
  // ---------------------------------------------------------------------------

  createExplosion(
    x: number,
    y: number,
    intensity: number = 1,
    particleBudgetScale: number = 1
  ): void {
    if (!this.explosionEmitter) {
      return;
    }

    const burstScale = Phaser.Math.Clamp(particleBudgetScale, 0.1, 1);
    const particleCount = Math.max(1, Math.floor(20 * intensity * burstScale));

    this.explosionEmitter.updateConfig(getExplosionConfig(intensity, particleCount));
    this.explosionEmitter.explode(particleCount, x, y);

    // Add debris for larger explosions
    if (intensity >= 1.0 && this.debrisEmitter) {
      const debrisCount = Math.max(1, Math.floor(8 * intensity * burstScale));
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
    const intensityTenths = Math.round(intensity * 10);

    if (this.exhaustConfigIntensityTenths !== intensityTenths || this.exhaustConfigCount !== count) {
      this.exhaustEmitter.updateConfig(getExhaustConfig(intensity, count));
      this.exhaustConfigIntensityTenths = intensityTenths;
      this.exhaustConfigCount = count;
    }

    this.exhaustEmitter.explode(count, x, y);
  }

  createSpawnWarning(x: number): void {
    createOverlaySpawnWarning(this.scene, x);
  }

  createScorePopup(x: number, y: number, score: number): void {
    createOverlayScorePopup(this.scene, x, y, score, EffectsManager.SCORE_POPUP_STYLE);
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
        ...getPowerUpBurstConfig(),
        tint: [0xffffff, color],
      });
    }

    this.powerUpBurstEmitter.explode(14, x, y);
  }

  createAsteroidDebris(x: number, y: number): void {
    this.debrisEmitter?.explode(10, x, y);
  }
}
