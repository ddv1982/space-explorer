import Phaser from 'phaser';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { scaleRuntimeParticleQuantity } from '../RuntimePerformanceBudget';

function burstScale(value: number): number {
  return value * getVisualQualityProfile().particleBurstScale;
}

function burstQuantity(value: number): number {
  return scaleRuntimeParticleQuantity(value * getVisualQualityProfile().particleQuantityScale);
}

export function createPooledEmitter(
  scene: Phaser.Scene,
  textureKey: string,
  config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  depth: number,
  reserveCount: number
): Phaser.GameObjects.Particles.ParticleEmitter {
  const emitter = scene.add.particles(0, 0, textureKey, {
    ...config,
    emitting: false,
  });

  emitter.setDepth(depth);
  emitter.reserve(reserveCount);

  return emitter;
}

export function getExplosionConfig(
  intensity: number,
  quantity: number,
  tint: number[] = [0xff4444, 0xff8800, 0xffcc00, 0xffff44]
): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 50, max: burstScale(200 * intensity) },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.8 * intensity), end: 0 },
    lifespan: { min: 300, max: 600 },
    blendMode: Phaser.BlendModes.ADD,
    quantity: burstQuantity(quantity),
    tint,
  };
}

export function getSparkConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 30, max: 100 },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.5), end: 0 },
    lifespan: { min: 100, max: 300 },
    blendMode: Phaser.BlendModes.ADD,
    quantity: burstQuantity(8),
    rotate: {
      // Phaser runs rotate.onEmit before assigning the particle's velocity, so
      // aligning on emit would read stale (or zero) velocity. onUpdate runs after
      // velocity integration and keeps the streak aligned with its travel direction.
      onUpdate: (particle?: Phaser.GameObjects.Particles.Particle) =>
        particle ? Phaser.Math.RadToDeg(Math.atan2(particle.velocityY, particle.velocityX)) : 0,
    },
    tint: [0x5bd8ff, 0xbff6ff, 0xffffff],
  };
}

export function getMuzzleConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 20, max: 80 },
    angle: { min: 240, max: 300 },
    scale: { start: burstScale(0.6), end: 0 },
    lifespan: { min: 60, max: 120 },
    blendMode: Phaser.BlendModes.ADD,
    quantity: burstQuantity(5),
    tint: [0x5bd8ff, 0xbff6ff, 0xffffff, 0x2f94ff],
  };
}

export function getExhaustConfig(
  intensity: number,
  quantity: number
): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 30, max: 60 + intensity * 40 },
    angle: { min: 250, max: 290 },
    scale: { start: burstScale(0.4), end: 0 },
    lifespan: { min: 80, max: 200 },
    blendMode: Phaser.BlendModes.ADD,
    quantity: burstQuantity(quantity),
    alpha: { start: 0.7, end: 0 },
    tint: [0x2f94ff, 0x5bd8ff, 0x58f0d8, 0xbff6ff],
  };
}

export function getBulletTrailConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 5, max: 15 },
    angle: { min: 80, max: 100 },
    scale: { start: burstScale(0.3), end: 0 },
    lifespan: { min: 100, max: 200 },
    blendMode: Phaser.BlendModes.ADD,
    quantity: burstQuantity(1),
    tint: [0x5bd8ff, 0xbff6ff],
    alpha: { start: 0.5, end: 0 },
  };
}

export function getEnemyBulletTrailConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 5, max: 15 },
    angle: { min: 260, max: 280 },
    scale: { start: burstScale(0.25), end: 0 },
    lifespan: { min: 80, max: 150 },
    blendMode: Phaser.BlendModes.ADD,
    quantity: burstQuantity(1),
    tint: [0xff4d8d, 0xff9bc4, 0xffe0ee],
    alpha: { start: 0.7, end: 0 },
  };
}

export function getHitSplashConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 40, max: 120 },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.5), end: 0 },
    lifespan: { min: 150, max: 350 },
    blendMode: Phaser.BlendModes.ADD,
    quantity: burstQuantity(10),
    tint: [0xffffff, 0xffcc44, 0xff8800],
  };
}

export function getPowerUpBurstConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 60, max: 160 },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.5), end: 0 },
    lifespan: { min: 300, max: 600 },
    blendMode: Phaser.BlendModes.ADD,
    quantity: burstQuantity(14),
    tint: [0xffffff, 0xffee88],
  };
}

export function getDebrisConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: 80, max: 250 },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.4), end: 0.1 },
    lifespan: { min: 400, max: 800 },
    blendMode: Phaser.BlendModes.NORMAL,
    quantity: burstQuantity(12),
    rotate: { min: 0, max: 360 },
    tint: [0x886644, 0x665533, 0x998866],
  };
}
