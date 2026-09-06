import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';
import { proveLowerBeamRoute } from './helpers/beamRouteProof';
import type { HazardBeamLaunchConfig } from '../src/entities/HazardBeam';

mockPhaserModule();

const { HazardBeamSystem } = await import('../src/systems/HazardBeamSystem');
const { HazardBeam } = await import('../src/entities/HazardBeam');

type LaunchConfig = HazardBeamLaunchConfig;

function createHarness(width = 800, height = 600) {
  const launches: LaunchConfig[] = [];
  const groupConfigs: unknown[] = [];

  const scene = {
    physics: {
      add: {
        group: (config: unknown) => {
          groupConfigs.push(config);
          return {
            getFirstDead: (): null => null,
            get: (_x: number, _y: number): { launch: (launchConfig: LaunchConfig) => void } => ({
              launch: (launchConfig: LaunchConfig) => {
                launches.push(launchConfig);
              },
            }),
          };
        },
      },
    },
    scale: {
      getViewPort: () => ({ x: 0, y: 0, width, height }),
    },
  };

  const system = new HazardBeamSystem();
  system.create(scene as never);

  return { system, launches, groupConfigs };
}

describe('HazardBeamSystem', () => {
  test('create builds a pooled hazard beam group', () => {
    const { groupConfigs } = createHarness();

    expect(groupConfigs).toEqual([{ maxSize: 8, classType: HazardBeam, runChildUpdate: true }]);
  });

  test('spawnSolarFlare launches one bullet-clearing beam sweeping from the left edge', () => {
    const harness = createHarness();

    harness.system.spawnSolarFlare(0.5);

    expect(harness.launches.length).toBe(1);
    const config = harness.launches[0];
    expect(config.x).toBe(16.5);
    expect(config.y).toBe(219);
    expect(config.width).toBe(33);
    expect(config.height).toBe(498);
    expect(config.tint).toBe(0xffb066);
    expect(config.telegraphMs).toBe(700);
    expect(config.velocityX).toBe(205);
    expect(config.clearsBullets).toBe(true);
    expect(config.activeMs as number).toBeCloseTo((860 / 205) * 1000 + 200, 5);
  });

  test('spawnLaserLattice launches a vertical beam pair with a safe gap plus a crossbeam', () => {
    const harness = createHarness();

    harness.system.spawnLaserLattice(0.5);

    expect(harness.launches.length).toBe(3);

    const [leftBeam, rightBeam, crossBeam] = harness.launches;
    expect(leftBeam).toEqual({
      x: 131.5,
      y: 300,
      width: 27,
      height: 640,
      tint: 0xff6a8d,
      telegraphMs: 800,
      activeMs: 2200,
      velocityX: undefined,
      clearsBullets: undefined,
      damage: undefined,
    });
    expect(rightBeam).toEqual({
      x: 268.5,
      y: 300,
      width: 27,
      height: 640,
      tint: 0xff6a8d,
      telegraphMs: 800,
      activeMs: 2200,
      velocityX: undefined,
      clearsBullets: undefined,
      damage: undefined,
    });
    expect(crossBeam).toEqual({
      x: 400,
      y: 120,
      width: 840,
      height: 27,
      tint: 0xff6a8d,
      telegraphMs: 800,
      activeMs: 2200,
      velocityX: undefined,
      clearsBullets: undefined,
      damage: undefined,
    });
  });

  test.each([
    [390, 844],
    [844, 390],
    [800, 600],
  ])(
    'flare has a traversable lower escape lane at %ix%i while lattice still reaches the bottom',
    (width: number, height: number) => {
      const harness = createHarness(width, height);
      harness.system.spawnSolarFlare(0.55);
      harness.system.spawnLaserLattice(0.5);
      const [flare, latticeLeft, latticeRight] = harness.launches;
      const bottomOfFlare = flare.y + flare.height / 2;
      const playerHalfHeight = 16;
      expect(flare.x - flare.width / 2).toBeGreaterThanOrEqual(0);
      expect(flare.x + flare.width / 2).toBeLessThanOrEqual(width);
      expect(height - bottomOfFlare).toBeGreaterThan(playerHalfHeight * 2 + 24);
      expect(latticeLeft.y + latticeLeft.height / 2).toBeGreaterThan(height);
      expect(latticeRight.y + latticeRight.height / 2).toBeGreaterThan(height);
      const gapLeft = latticeLeft.x + latticeLeft.width / 2;
      const gapRight = latticeRight.x - latticeRight.width / 2;
      expect(gapRight - gapLeft).toBeGreaterThan(24 + 24);
      // The center gap continues below the flare without crossing a damaging lattice wall.
      expect((gapLeft + gapRight) / 2 - 12).toBeGreaterThan(gapLeft);
      expect((gapLeft + gapRight) / 2 + 12).toBeLessThan(gapRight);
    }
  );

  test.each([
    [390, 844],
    [844, 390],
    [800, 600],
  ])(
    'selected P1 motion escapes a simultaneous flare and lattice at %ix%i after 250ms reaction',
    (width: number, height: number) => {
      const harness = createHarness(width, height);
      harness.system.spawnSolarFlare(0.55);
      harness.system.spawnLaserLattice(0.5);
      for (const reflected of [false, true]) {
        const beams = reflected
          ? harness.launches.map((beam) => ({
              ...beam,
              x: width - beam.x,
              velocityX: -(beam.velocityX ?? 0),
            }))
          : harness.launches;
        for (const latticeShift of [0, reflected ? -width * 0.25 : width * 0.25]) {
          const sampleBeams = beams.map((beam, index) =>
            index === 1 || index === 2 ? { ...beam, x: beam.x + latticeShift } : beam
          );
          for (const xRatio of [0.2, 0.5, 0.8]) {
            for (const yRatio of [0.6, 0.75, 0.9]) {
              const result = proveLowerBeamRoute({
                width,
                height,
                x: width * xRatio,
                y: height * yRatio,
                beams: sampleBeams,
              });
              expect(result.safe).toBe(true);
              expect(result.escapedAtMs).not.toBeNull();
            }
          }
        }
      }
    }
  );

  test('route proof rejects the previous full-height flare geometry', () => {
    const harness = createHarness(390, 844);
    harness.system.spawnSolarFlare(0.55);
    const flare = harness.launches[0];
    const result = proveLowerBeamRoute({
      width: 390,
      height: 844,
      x: 195,
      y: 844 * 0.6,
      beams: [{ ...flare, y: 422, height: 904 }],
    });
    expect(result.safe).toBe(false);
  });

  test('higher intensity narrows the lattice safe gap', () => {
    const gentle = createHarness();
    gentle.system.spawnLaserLattice(0);

    const hard = createHarness();
    hard.system.spawnLaserLattice(1);

    const gentleGap = (gentle.launches[1].x as number) - (gentle.launches[0].x as number);
    const hardGap = (hard.launches[1].x as number) - (hard.launches[0].x as number);

    expect(gentleGap).toBeGreaterThan(hardGap);
  });
});
