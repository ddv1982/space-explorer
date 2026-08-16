import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { HazardBeamSystem } = await import('../src/systems/HazardBeamSystem');
const { HazardBeam } = await import('../src/entities/HazardBeam');

type LaunchConfig = Record<string, unknown>;

function createHarness() {
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
      getViewPort: () => ({ x: 0, y: 0, width: 800, height: 600 }),
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
    expect(config.x).toBe(-30);
    expect(config.y).toBe(300);
    expect(config.width).toBe(33);
    expect(config.height).toBe(660);
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
