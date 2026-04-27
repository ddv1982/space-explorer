import Phaser from 'phaser';

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

export function getSparkConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
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

export function getMuzzleConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
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

export function getExhaustConfig(
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

export function getBulletTrailConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
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

export function getEnemyBulletTrailConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
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

export function getHitSplashConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
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

export function getAmbientSparkleConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
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

export function getPowerUpBurstConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
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

export function getDebrisConfig(): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
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
