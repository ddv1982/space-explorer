import { describe, expect, mock, test } from 'bun:test';

mock.module('phaser', () => ({
  default: {
    GameObjects: {
      Particles: {
        ParticleEmitter: class {},
      },
    },
  },
}));

mock.module('../src/utils/renderingCompat', () => ({
  applyBaselineCameraFilters: mock(),
  applyCameraColorGrade: mock((_camera: unknown, matrix: unknown) => matrix ?? { id: 'grade-matrix' }),
  applyCameraColorPulse: mock((_camera: unknown, matrix: unknown) => matrix ?? { id: 'pulse-matrix' }),
  clearCameraFilters: mock(),
}));

mock.module('../src/systems/effects/particleTextureFactory', () => ({
  generateEffectsParticleTextures: mock(),
}));

mock.module('../src/systems/effects/ephemeralOverlayTweens', () => ({
  createScorePopup: mock(),
  createSpawnWarning: mock(),
}));

mock.module('../src/systems/effects/emitterSetup', () => ({
  createPooledEmitter: mock(),
  getAmbientSparkleConfig: mock(() => ({})),
  getBulletTrailConfig: mock(() => ({})),
  getDebrisConfig: mock(() => ({})),
  getEnemyBulletTrailConfig: mock(() => ({})),
  getExhaustConfig: mock(() => ({})),
  getExplosionConfig: mock(() => ({})),
  getHitSplashConfig: mock(() => ({})),
  getMuzzleConfig: mock(() => ({})),
  getPowerUpBurstConfig: mock(() => ({})),
  getSparkConfig: mock(() => ({})),
}));

const { applyCameraColorGrade, applyCameraColorPulse } = await import('../src/utils/renderingCompat');
const { EffectsManager } = await import('../src/systems/EffectsManager');

type ScheduledRestore = {
  delay: number;
  callback: () => void;
};

function createEffectsHarness() {
  const scheduled: ScheduledRestore[] = [];
  const camera = { id: 'main-camera' };
  const scene = {
    cameras: { main: camera },
    time: {
      delayedCall: (delay: number, callback: () => void) => {
        scheduled.push({ delay, callback });
      },
    },
  };

  const effects = Object.create(EffectsManager.prototype) as InstanceType<typeof EffectsManager>;
  (effects as unknown as Record<string, unknown>).scene = scene;
  (effects as unknown as Record<string, unknown>).colorMatrix = null;
  (effects as unknown as Record<string, unknown>).currentLevelConfig = {
    colorGrade: { brightness: 0, contrast: 1, saturation: 1 },
  };
  (effects as unknown as Record<string, unknown>).colorPulseToken = 0;

  return { effects, scheduled, camera };
}

describe('EffectsManager color pulse lifecycle', () => {
  test('stale pulse restore is ignored after a newer pulse starts', () => {
    const { effects, scheduled } = createEffectsHarness();
    const gradeMock = applyCameraColorGrade as ReturnType<typeof mock>;
    const pulseMock = applyCameraColorPulse as ReturnType<typeof mock>;
    gradeMock.mockClear();
    pulseMock.mockClear();

    effects.pulseCameraColor({ brightness: 1.1 }, 180);
    effects.pulseCameraColor({ brightness: 1.2 }, 180);

    expect(scheduled).toHaveLength(2);
    expect(pulseMock).toHaveBeenCalledTimes(2);

    scheduled[0].callback();
    expect(gradeMock).not.toHaveBeenCalled();

    scheduled[1].callback();
    expect(gradeMock).toHaveBeenCalledTimes(1);
  });

  test('pulse restore is ignored after destroy invalidates the lifecycle', () => {
    const { effects, scheduled } = createEffectsHarness();
    const gradeMock = applyCameraColorGrade as ReturnType<typeof mock>;
    gradeMock.mockClear();

    effects.pulseCameraColor({ brightness: 1.08 }, 220);
    expect(scheduled).toHaveLength(1);

    (effects as unknown as Record<string, unknown>).destroyEmitters = mock();
    (effects as unknown as Record<string, unknown>).clearCameraFX = mock();
    effects.destroy();

    scheduled[0].callback();
    expect(gradeMock).not.toHaveBeenCalled();
  });
});
