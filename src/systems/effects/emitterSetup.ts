import Phaser from 'phaser';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { PARTICLE } from './particleTextureFactory';

type EmitterConfig = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

function burstScale(value: number): number {
  return value * getVisualQualityProfile().particleBurstScale;
}

/** Keeps streak textures pointing along their travel (Phaser assigns velocity after onEmit). */
const ALIGN_TO_VELOCITY = {
  onUpdate: (particle?: Phaser.GameObjects.Particles.Particle) =>
    particle ? Phaser.Math.RadToDeg(Math.atan2(particle.velocityY, particle.velocityX)) : 0,
};

/** Pooled, non-emitting particle emitters, one per effect layer. Depth decides draw order. */
export const EMITTERS = {
  smoke: { texture: PARTICLE.smoke, depth: 5, reserve: 48 },
  fire: { texture: PARTICLE.fire, depth: 6, reserve: 96 },
  ember: { texture: PARTICLE.glow, depth: 6, reserve: 96 },
  spark: { texture: PARTICLE.spark, depth: 7, reserve: 96 },
  debris: { texture: PARTICLE.debris, depth: 5, reserve: 48 },
  muzzle: { texture: PARTICLE.flare, depth: 6, reserve: 16 },
  exhaust: { texture: PARTICLE.glow, depth: 3, reserve: 64 },
  trail: { texture: PARTICLE.glow, depth: 3, reserve: 96 },
  enemyTrail: { texture: PARTICLE.glow, depth: 3, reserve: 64 },
  burst: { texture: PARTICLE.glow, depth: 8, reserve: 32 },
} as const;

export type EmitterName = keyof typeof EMITTERS;

/** Hot fireball: white core cooling through yellow and orange to a dull red as it billows out. */
export function getFireConfig(intensity: number): EmitterConfig {
  return {
    speed: { min: 8, max: 62 * intensity },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.44 * intensity), end: burstScale(0.8 * intensity) },
    alpha: { start: 0.75, end: 0 },
    rotate: { min: 0, max: 360 },
    lifespan: { min: 360, max: 720 },
    blendMode: Phaser.BlendModes.ADD,
    color: [0xffffff, 0xfff0c0, 0xffb050, 0xe05020, 0x501408],
    colorEase: 'Linear',
  };
}

/** Dark smoke that lingers after the fire, drawn normally so it occludes the stars behind it. */
export function getSmokeConfig(intensity: number): EmitterConfig {
  return {
    speed: { min: 8, max: 46 * intensity },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.3 * intensity), end: burstScale(0.95 * intensity) },
    alpha: { start: 0.7, end: 0 },
    rotate: { min: 0, max: 360 },
    lifespan: { min: 800, max: 1400 },
    blendMode: Phaser.BlendModes.NORMAL,
    tint: [0x4a4452, 0x5a5262, 0x3a3644],
  };
}

export function getSparkConfig(palette: readonly number[], intensity = 1): EmitterConfig {
  return {
    speed: { min: 140, max: 420 * Math.max(0.7, intensity) },
    angle: { min: 0, max: 360 },
    scaleX: { start: burstScale(0.8), end: 0.1 },
    scaleY: { start: burstScale(0.9), end: 0.3 },
    lifespan: { min: 160, max: 400 },
    blendMode: Phaser.BlendModes.ADD,
    rotate: ALIGN_TO_VELOCITY,
    tint: [...palette],
  };
}

/** Slow glowing motes that drift out of the blast and wink out. */
export function getEmberConfig(palette: readonly number[]): EmitterConfig {
  return {
    speed: { min: 30, max: 150 },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.12), end: 0 },
    alpha: { start: 1, end: 0.2 },
    lifespan: { min: 450, max: 950 },
    blendMode: Phaser.BlendModes.ADD,
    tint: [...palette],
  };
}

export function getDebrisConfig(tint: readonly number[] = [0xc9c0a7, 0x6a7078, 0x938268]): EmitterConfig {
  return {
    speed: { min: 70, max: 260 },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(1), end: 0.4 },
    lifespan: { min: 380, max: 800 },
    alpha: { start: 1, end: 0 },
    blendMode: Phaser.BlendModes.NORMAL,
    rotate: { start: 0, end: 540 },
    tint: [...tint],
  };
}

export function getMuzzleConfig(): EmitterConfig {
  return {
    speed: { min: 0, max: 20 },
    scale: { start: burstScale(0.32), end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: { min: 60, max: 110 },
    blendMode: Phaser.BlendModes.ADD,
    tint: [0x9fe9ff, 0xdffbff],
  };
}

export function getExhaustConfig(intensity: number): EmitterConfig {
  return {
    speed: { min: 40, max: 90 + intensity * 60 },
    angle: { min: 84, max: 96 },
    scale: { start: burstScale(0.16 + intensity * 0.05), end: 0 },
    lifespan: { min: 90, max: 220 },
    blendMode: Phaser.BlendModes.ADD,
    alpha: { start: 0.8, end: 0 },
    color: [0xffffff, 0x9fe9ff, 0x2f94ff, 0x0b2a66],
  };
}

export function getBulletTrailConfig(): EmitterConfig {
  return {
    speed: { min: 4, max: 14 },
    angle: { min: 80, max: 100 },
    scale: { start: burstScale(0.14), end: 0 },
    lifespan: { min: 140, max: 260 },
    blendMode: Phaser.BlendModes.ADD,
    tint: [0x5bd8ff, 0xbff6ff],
    alpha: { start: 0.6, end: 0 },
  };
}

export function getEnemyBulletTrailConfig(): EmitterConfig {
  return {
    speed: { min: 4, max: 14 },
    angle: { min: 260, max: 280 },
    scale: { start: burstScale(0.12), end: 0 },
    lifespan: { min: 100, max: 190 },
    blendMode: Phaser.BlendModes.ADD,
    tint: [0xff4d8d, 0xff9bc4],
    alpha: { start: 0.7, end: 0 },
  };
}

export function getPowerUpBurstConfig(color = 0xffee88): EmitterConfig {
  return {
    speed: { min: 60, max: 180 },
    angle: { min: 0, max: 360 },
    scale: { start: burstScale(0.22), end: 0 },
    lifespan: { min: 320, max: 640 },
    blendMode: Phaser.BlendModes.ADD,
    tint: [0xffffff, color],
  };
}

export function createPooledEmitter(
  scene: Phaser.Scene,
  name: EmitterName,
  config: EmitterConfig
): Phaser.GameObjects.Particles.ParticleEmitter {
  const { texture, depth, reserve } = EMITTERS[name];
  const emitter = scene.add.particles(0, 0, texture, { ...config, emitting: false });
  emitter.setDepth(depth);
  emitter.reserve(reserve);
  return emitter;
}
