import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';
import { getVisualQualityProfile } from '../config/visualQuality';
import { applyCameraColorGrade, applyCameraColorPulse, clearCameraFilters } from '../utils/renderingCompat';
import { PARTICLE, generateEffectsParticleTextures } from './effects/particleTextureFactory';
import { EngineFlame, type EngineFlameTarget } from './effects/engineFlame';
import { NEUTRAL_EXPLOSION_STYLE, getEnemyExplosionStyle, type ExplosionStyle } from './effects/explosionStyles';
import {
  createScorePopup as createOverlayScorePopup,
  createSpawnWarning as createOverlaySpawnWarning,
} from './effects/ephemeralOverlayTweens';
import {
  EMITTERS,
  createPooledEmitter,
  getBulletTrailConfig,
  getDebrisConfig,
  getEmberConfig,
  getEnemyBulletTrailConfig,
  getExhaustConfig,
  getFireConfig,
  getMuzzleConfig,
  getPowerUpBurstConfig,
  getSmokeConfig,
  getSparkConfig,
  type EmitterName,
} from './effects/emitterSetup';
import {
  runtimePerformanceBudget,
  scaleRuntimeParticleQuantity,
  shouldRenderRuntimeSecondaryEffects,
} from './RuntimePerformanceBudget';
import { LightingRig } from './lighting/LightingRig';
import { resolveLightingBudget } from './lighting/lightingBudget';
import { isTouchMobileDevice } from '../utils/device';

export class EffectsManager {
  private scene!: Phaser.Scene;
  private colorMatrix: Phaser.Filters.ColorMatrix | null = null;
  private emitters: Partial<Record<EmitterName, Phaser.GameObjects.Particles.ParticleEmitter>> = {};
  private exhaustConfigIntensityTenths = -1;
  private currentLevelConfig: LevelConfig | null = null;
  private colorPulseToken = 0;
  private lighting: LightingRig | null = null;
  private engineFlames: EngineFlame[] = [];
  private unsubscribeLightingBudget: (() => void) | null = null;

  private getParticleQuantity(quantity: number): number {
    return scaleRuntimeParticleQuantity(quantity * getVisualQualityProfile().particleQuantityScale);
  }

  setup(scene: Phaser.Scene): void {
    this.scene = scene;
    this.clearCameraFX();
    this.generateParticleTextures();
    this.createParticleEmitters();
    this.lighting = new LightingRig(scene, this.resolveLightingBudget());
    this.unsubscribeLightingBudget = runtimePerformanceBudget.subscribe(() =>
      this.lighting?.setBudget(this.resolveLightingBudget())
    );
  }

  /** Advances light pulses on gameplay time; not called while the game is paused. */
  updateLighting(delta: number): void {
    this.lighting?.update(delta);
  }

  /** A short dynamic light flash (no particles); respects the tier's light budget. */
  pulseLight(x: number, y: number, color: number, radius: number, intensity: number, durationMs: number): void {
    this.lighting?.pulse(x, y, color, radius, intensity, durationMs);
  }

  /**
   * Burning engines for a ship: a flickering twin flame plus a cyan light that shades its tail rather
   * than washing out the whole hull. Returns a release function.
   */
  attachEngine(target: EngineFlameTarget): () => void {
    const flame = new EngineFlame(this.scene, target);
    this.engineFlames.push(flame);
    const releaseLight = this.lighting?.follow(target, 0x5ff2ff, 36, 0.4, 26);
    return () => {
      releaseLight?.();
      const index = this.engineFlames.indexOf(flame);
      if (index >= 0) this.engineFlames.splice(index, 1)[0]!.destroy();
    };
  }

  private resolveLightingBudget() {
    return resolveLightingBudget(getVisualQualityProfile(), {
      touchDevice: isTouchMobileDevice(),
      pressureLevel: runtimePerformanceBudget.getSnapshot().pressureLevel,
      reducedMotion:
        typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
    });
  }

  destroy(): void {
    this.colorPulseToken += 1;
    this.unsubscribeLightingBudget?.();
    this.unsubscribeLightingBudget = null;
    this.lighting?.destroy();
    this.lighting = null;
    for (const flame of this.engineFlames) flame.destroy();
    this.engineFlames = [];
    this.destroyEmitters();
    this.clearCameraFX();
    this.colorMatrix = null;
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
    const configs: Record<EmitterName, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig> = {
      smoke: getSmokeConfig(1),
      fire: getFireConfig(1),
      ember: getEmberConfig(NEUTRAL_EXPLOSION_STYLE.palette),
      spark: getSparkConfig(NEUTRAL_EXPLOSION_STYLE.palette),
      debris: getDebrisConfig(),
      muzzle: getMuzzleConfig(),
      exhaust: getExhaustConfig(1),
      trail: getBulletTrailConfig(),
      enemyTrail: getEnemyBulletTrailConfig(),
      burst: getPowerUpBurstConfig(),
    };
    for (const name of Object.keys(EMITTERS) as EmitterName[]) {
      this.emitters[name] = createPooledEmitter(this.scene, name, configs[name]);
    }
  }

  /** Re-tints a pooled emitter and bursts it; quantity is scaled by quality tier and runtime pressure. */
  private burst(
    name: EmitterName,
    quantity: number,
    x: number,
    y: number,
    config?: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig
  ): void {
    const emitter = this.emitters[name];
    if (!emitter) return;
    if (config) emitter.updateConfig(config);
    const count = this.getParticleQuantity(quantity);
    if (count > 0) emitter.explode(count, x, y);
  }

  private clearCameraFX(): void {
    const camera = this.scene?.cameras?.main;
    if (!camera) {
      return;
    }

    clearCameraFilters(camera);
  }

  private destroyEmitters(): void {
    for (const emitter of Object.values(this.emitters)) emitter?.destroy();
    this.emitters = {};
    this.exhaustConfigIntensityTenths = -1;
  }

  // ---------------------------------------------------------------------------
  // Public effect methods
  // ---------------------------------------------------------------------------

  createExplosion(x: number, y: number, intensity: number = 1, particleBudgetScale: number = 1): void {
    this.detonate(x, y, intensity, NEUTRAL_EXPLOSION_STYLE, Phaser.Math.Clamp(particleBudgetScale, 0.1, 1));
  }

  createEnemyExplosion(x: number, y: number, enemyType: string, intensity: number = 1): void {
    this.detonate(x, y, intensity, getEnemyExplosionStyle(enemyType), 1);
  }

  /**
   * Layered blast: a white flash and flare, a billowing fireball cooling from white to red, sparks and
   * embers in the hull's accent, a shockwave ring, lingering smoke and (for heavy hulls) debris, plus a
   * dynamic light pulse that shades nearby lit sprites.
   */
  private detonate(x: number, y: number, intensity: number, style: ExplosionStyle, budget: number): void {
    if (!this.emitters.fire) return;
    const scaled = (count: number) => Math.max(1, Math.round(count * intensity * budget));
    this.burst('fire', scaled(12), x, y, getFireConfig(intensity));
    this.burst('spark', scaled(12), x, y, getSparkConfig(style.palette, intensity));
    this.burst('ember', scaled(7), x, y, getEmberConfig(style.palette));
    if (shouldRenderRuntimeSecondaryEffects()) {
      this.burst('smoke', scaled(style.heavy ? 7 : 4), x, y, getSmokeConfig(intensity));
      this.createExplosionShockwave(x, y, intensity, style);
    }
    if (style.heavy && intensity >= 0.9) this.burst('debris', scaled(7), x, y);
    this.lighting?.pulse(x, y, style.ringTint, 160 * intensity, 1.2 * intensity, 460);
  }

  /** White-hot flash and lens flare, then an expanding shockwave ring shaped to the hull. */
  private createExplosionShockwave(x: number, y: number, intensity: number, style: ExplosionStyle): void {
    const flare = this.addFlash(x, y, PARTICLE.flare, 0xffffff, 0.3 * intensity);
    this.scene.tweens.add({
      targets: flare,
      scale: 0.9 * intensity,
      alpha: 0,
      duration: 160,
      ease: 'Cubic.easeOut',
      onComplete: () => flare.destroy(),
    });

    const glow = this.addFlash(x, y, PARTICLE.glow, 0xffd59a, 0.5 * intensity);
    this.scene.tweens.add({
      targets: glow,
      scale: 1.8 * intensity,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => glow.destroy(),
    });

    const ring = this.addFlash(x, y, PARTICLE.ring, style.ringTint, 0.08 * intensity);
    ring.setScale(0.08 * intensity * style.ringScaleX, 0.08 * intensity * style.ringScaleY);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 0.7 * intensity * style.ringScaleX,
      scaleY: 0.7 * intensity * style.ringScaleY,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private addFlash(x: number, y: number, texture: string, tint: number, scale: number): Phaser.GameObjects.Image {
    return this.scene.add
      .image(x, y, texture)
      .setDepth(8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(tint)
      .setScale(scale);
  }

  createSparkBurst(x: number, y: number): void {
    this.burst('spark', 8, x, y, getSparkConfig(NEUTRAL_EXPLOSION_STYLE.palette, 0.7));
  }

  createShieldImpact(x: number, y: number): void {
    const reducedMotion =
      typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const ring = this.scene.add
      .image(x, y, PARTICLE.ring)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x44aaff)
      .setScale(reducedMotion ? 0.25 : 0.11)
      .setAlpha(0.8);
    this.scene.tweens.add({
      targets: ring,
      scale: reducedMotion ? 0.25 : 0.27,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  createGrazeSpark(x: number, y: number): void {
    this.burst('spark', 3, x, y, getSparkConfig([0x9fe9ff, 0xdffbff], 0.6));
  }

  /** Cyan Surge Pulse: soft flash pop plus a wide expanding neon ring. */
  createSurgePulse(x: number, y: number): void {
    const flash = this.scene.add
      .image(x, y, PARTICLE.glow)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xd6f6ff)
      .setScale(0.13);

    this.scene.tweens.add({
      targets: flash,
      scale: 0.5,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const ring = this.scene.add
      .image(x, y, PARTICLE.ring)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x9be8ff)
      .setScale(0.1);

    this.scene.tweens.add({
      targets: ring,
      scale: 0.85,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  createMuzzleFlash(x: number, y: number): void {
    this.burst('muzzle', 1, x, y);
  }

  createEngineExhaust(x: number, y: number, intensity: number): void {
    // Re-configuring every frame would churn the emitter; only re-tune when the throttle changes.
    const intensityTenths = Math.round(intensity * 10);
    const config = intensityTenths === this.exhaustConfigIntensityTenths ? undefined : getExhaustConfig(intensity);
    this.exhaustConfigIntensityTenths = intensityTenths;
    this.burst('exhaust', Math.ceil(intensity * 2), x, y, config);
  }

  createSpawnWarning(x: number): void {
    createOverlaySpawnWarning(this.scene, x);
  }

  /** Wormhole warp-in telegraph: neon ring shrinking onto the arrival point. */
  createWormholeTelegraph(x: number, y: number): void {
    const ring = this.scene.add
      .image(x, y, PARTICLE.ring)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xb48cff)
      .setScale(0.55)
      .setAlpha(0.9);

    this.scene.tweens.add({
      targets: ring,
      scale: 0.09,
      alpha: 0.25,
      duration: 600,
      ease: 'Cubic.easeIn',
      onComplete: () => ring.destroy(),
    });

    const core = this.scene.add
      .image(x, y, PARTICLE.glow)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xd9c8ff)
      .setScale(0.05)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: core,
      scale: 0.25,
      alpha: { from: 0, to: 0.85 },
      duration: 600,
      ease: 'Quad.easeIn',
      onComplete: () => core.destroy(),
    });
  }

  createScorePopup(x: number, y: number, score: number): void {
    createOverlayScorePopup(this.scene, x, y, score);
  }

  createBulletTrail(x: number, y: number): void {
    this.emitters.trail?.explode(1, x, y);
  }

  createEnemyBulletTrail(x: number, y: number): void {
    this.emitters.enemyTrail?.explode(1, x, y);
  }

  createHitSplash(x: number, y: number): void {
    this.burst('spark', 6, x, y, getSparkConfig([0xffffff, 0xffcc44, 0xff8800], 0.6));
    const flare = this.addFlash(x, y, PARTICLE.flare, 0xffe2b0, 0.16);
    this.scene.tweens.add({
      targets: flare,
      scale: 0.3,
      alpha: 0,
      duration: 90,
      onComplete: () => flare.destroy(),
    });
  }

  createPowerUpBurst(x: number, y: number, color?: number): void {
    this.burst('burst', 14, x, y, getPowerUpBurstConfig(color));
  }

  createAsteroidDebris(x: number, y: number): void {
    this.burst('debris', 10, x, y);
    this.burst('smoke', 3, x, y, getSmokeConfig(0.6));
  }
}
