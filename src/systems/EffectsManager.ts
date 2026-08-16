import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';
import { getVisualQualityProfile } from '../config/visualQuality';
import { UI_FONT_MONO } from '../utils/uiFonts';
import {
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
import {
  scaleRuntimeParticleQuantity,
  shouldRenderRuntimeSecondaryEffects,
} from './RuntimePerformanceBudget';

export class EffectsManager {
  private static readonly SCORE_POPUP_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '16px',
    color: '#ffc36e',
    fontFamily: UI_FONT_MONO,
    fontStyle: 'bold',
  };

  private scene!: Phaser.Scene;
  private colorMatrix: Phaser.Filters.ColorMatrix | null = null;
  private explosionEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private muzzleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private exhaustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bulletTrailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private enemyBulletTrailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private hitSplashEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private powerUpBurstEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private debrisEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private exhaustConfigIntensityTenths = -1;
  private exhaustConfigCount = -1;
  private currentLevelConfig: LevelConfig | null = null;
  private colorPulseToken = 0;

  private getParticleQuantity(quantity: number): number {
    return scaleRuntimeParticleQuantity(quantity * getVisualQualityProfile().particleQuantityScale);
  }

  setup(scene: Phaser.Scene): void {
    this.scene = scene;
    this.clearCameraFX();
    this.generateParticleTextures();
    this.createParticleEmitters();
  }

  destroy(): void {
    this.colorPulseToken += 1;
    this.destroyEmitters();
    this.clearCameraFX();
    this.colorMatrix = null;
    this.exhaustConfigIntensityTenths = -1;
    this.exhaustConfigCount = -1;
    this.currentLevelConfig = null;
  }

  applyLevelColorGrade(config: LevelConfig): void {
    this.colorPulseToken += 1;
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
    const pulseToken = ++this.colorPulseToken;
    this.colorMatrix = applyCameraColorPulse(camera, this.colorMatrix, pulse);

    this.scene.time.delayedCall(durationMs, () => {
      this.restoreCameraColorGradeAfterPulse(pulseToken, existingGrade);
    });
  }

  private restoreCameraColorGradeAfterPulse(
    pulseToken: number,
    existingGrade: { brightness: number; contrast: number; saturation: number }
  ): void {
    if (pulseToken !== this.colorPulseToken || !this.scene?.cameras?.main) {
      return;
    }

    this.colorMatrix = applyCameraColorGrade(this.scene.cameras.main, this.colorMatrix, existingGrade);
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
    this.powerUpBurstEmitter?.destroy();
    this.debrisEmitter?.destroy();

    this.explosionEmitter = null;
    this.sparkEmitter = null;
    this.muzzleEmitter = null;
    this.exhaustEmitter = null;
    this.bulletTrailEmitter = null;
    this.enemyBulletTrailEmitter = null;
    this.hitSplashEmitter = null;
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
    this.explosionEmitter.explode(this.getParticleQuantity(particleCount), x, y);
    this.createExplosionShockwave(x, y, intensity, 0xffb066);

    // Add debris for larger explosions
    if (intensity >= 1.0 && this.debrisEmitter) {
      const debrisCount = Math.max(1, Math.floor(8 * intensity * burstScale));
      this.debrisEmitter.explode(this.getParticleQuantity(debrisCount), x, y);
    }
  }

  createEnemyExplosion(x: number, y: number, enemyType: string, intensity: number = 1): void {
    if (!this.explosionEmitter) {
      return;
    }

    const style = this.getEnemyExplosionStyle(enemyType);
    const particleCount = Math.max(1, Math.floor(20 * intensity));
    this.explosionEmitter.updateConfig(getExplosionConfig(intensity, particleCount, style.palette));
    this.explosionEmitter.explode(this.getParticleQuantity(particleCount), x, y);
    this.createExplosionShockwave(x, y, intensity, style.ringTint, style.ringScaleX, style.ringScaleY);

    if (this.debrisEmitter && ['bomber', 'gunship', 'sower', 'lancer'].includes(enemyType)) {
      this.debrisEmitter.explode(this.getParticleQuantity(6), x, y);
    }
  }

  private getEnemyExplosionStyle(enemyType: string): {
    palette: number[];
    ringTint: number;
    ringScaleX: number;
    ringScaleY: number;
  } {
    if (enemyType === 'swarm' || enemyType === 'swarmling') {
      return { palette: [0xffff5d, 0xffd73d, 0xffffff], ringTint: 0xffff73, ringScaleX: 1, ringScaleY: 0.72 };
    }
    if (enemyType === 'diver' || enemyType === 'splitter') {
      return { palette: [0xff5df0, 0xff5d9e, 0xffffff], ringTint: 0xff73df, ringScaleX: 0.72, ringScaleY: 1.2 };
    }
    if (enemyType === 'dodger' || enemyType === 'gunship') {
      return { palette: [0x4bf0ff, 0x63a4ff, 0xffffff], ringTint: 0x63dfff, ringScaleX: 1.3, ringScaleY: 0.7 };
    }
    if (enemyType === 'bomber' || enemyType === 'sower') {
      return { palette: [0xffb14b, 0xff6a3d, 0xfff0c4], ringTint: 0xffa45d, ringScaleX: 1.18, ringScaleY: 1.18 };
    }
    if (enemyType === 'lancer') {
      return { palette: [0xd8e9ff, 0x8bb9ff, 0xffffff], ringTint: 0xc9e3ff, ringScaleX: 0.58, ringScaleY: 1.45 };
    }
    if (enemyType === 'fighter') {
      return { palette: [0x52f28e, 0x2fbd70, 0xe2ffed], ringTint: 0x69f6a1, ringScaleX: 1, ringScaleY: 1 };
    }
    return { palette: [0xff5d73, 0xff8c52, 0xffe0e5], ringTint: 0xff6f82, ringScaleX: 1, ringScaleY: 1 };
  }

  /** White-hot flash pop followed by an expanding neon shockwave ring. */
  private createExplosionShockwave(
    x: number,
    y: number,
    intensity: number,
    ringTint: number,
    ringScaleX: number = 1,
    ringScaleY: number = 1
  ): void {
    if (!shouldRenderRuntimeSecondaryEffects()) return;
    const flash = this.scene.add
      .image(x, y, 'particle-burst')
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffe6b0)
      .setScale(0.4 * intensity);

    this.scene.tweens.add({
      targets: flash,
      scale: 1.6 * intensity,
      alpha: 0,
      duration: 140,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const ring = this.scene.add
      .image(x, y, 'particle-ring')
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(ringTint)
      .setScale(0.25 * intensity * ringScaleX, 0.25 * intensity * ringScaleY);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.4 * intensity * ringScaleX,
      scaleY: 2.4 * intensity * ringScaleY,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  createSparkBurst(x: number, y: number): void {
    this.sparkEmitter?.explode(this.getParticleQuantity(8), x, y);
  }

  createGrazeSpark(x: number, y: number): void {
    this.sparkEmitter?.explode(this.getParticleQuantity(3), x, y);
  }

  /** Cyan Surge Pulse: soft flash pop plus a wide expanding neon ring. */
  createSurgePulse(x: number, y: number): void {
    const flash = this.scene.add
      .image(x, y, 'particle-burst')
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xd6f6ff)
      .setScale(0.6);

    this.scene.tweens.add({
      targets: flash,
      scale: 2.2,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const ring = this.scene.add
      .image(x, y, 'particle-ring')
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x9be8ff)
      .setScale(0.4);

    this.scene.tweens.add({
      targets: ring,
      scale: 3.4,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  createMuzzleFlash(x: number, y: number): void {
    this.muzzleEmitter?.explode(this.getParticleQuantity(5), x, y);
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

    this.exhaustEmitter.explode(this.getParticleQuantity(count), x, y);
  }

  createSpawnWarning(x: number): void {
    createOverlaySpawnWarning(this.scene, x);
  }

  /** Wormhole warp-in telegraph: neon ring shrinking onto the arrival point. */
  createWormholeTelegraph(x: number, y: number): void {
    const ring = this.scene.add
      .image(x, y, 'particle-ring')
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xb48cff)
      .setScale(2.2)
      .setAlpha(0.9);

    this.scene.tweens.add({
      targets: ring,
      scale: 0.35,
      alpha: 0.25,
      duration: 600,
      ease: 'Cubic.easeIn',
      onComplete: () => ring.destroy(),
    });

    const core = this.scene.add
      .image(x, y, 'particle-burst')
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xd9c8ff)
      .setScale(0.2)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: core,
      scale: 1.1,
      alpha: { from: 0, to: 0.85 },
      duration: 600,
      ease: 'Quad.easeIn',
      onComplete: () => core.destroy(),
    });
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
    this.hitSplashEmitter?.explode(this.getParticleQuantity(10), x, y);
  }

  createPowerUpBurst(x: number, y: number, color?: number): void {
    if (!this.powerUpBurstEmitter) return;

    if (color) {
      this.powerUpBurstEmitter.updateConfig({
        ...getPowerUpBurstConfig(),
        tint: [0xffffff, color],
      });
    }

    this.powerUpBurstEmitter.explode(this.getParticleQuantity(14), x, y);
  }

  createAsteroidDebris(x: number, y: number): void {
    this.debrisEmitter?.explode(this.getParticleQuantity(10), x, y);
  }
}
