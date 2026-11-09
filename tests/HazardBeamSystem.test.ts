import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';
import { flareGap, latticeGap, proveBeamRoute } from './helpers/beamRouteProof';
import type { HazardBeamLaunchConfig } from '../src/entities/HazardBeam';

mockPhaserModule();

const { HazardBeamSystem } = await import('../src/systems/HazardBeamSystem');
const { HazardBeam } = await import('../src/entities/HazardBeam');
const { BEAM_HIT_FRACTION } = await import('../src/entities/hazardBeamGeometry');
const Phaser = (await import('phaser')).default;

let randomPick: 'min' | 'max' = 'min';
const originalBetween = Phaser.Math.Between;
// Scoped to this file: other suites share the mocked Phaser module.
beforeAll(() => {
  Phaser.Math.Between = ((min: number, max?: number) => (randomPick === 'max' ? (max ?? min) : min)) as never;
});
afterAll(() => {
  Phaser.Math.Between = originalBetween;
});

type LaunchConfig = HazardBeamLaunchConfig;

function createHarness(width = 800, height = 600, pick: 'min' | 'max' = 'min') {
  randomPick = pick;
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

    expect(groupConfigs).toEqual([{ maxSize: -1, classType: HazardBeam, runChildUpdate: true }]);
  });

  test('spawnSolarFlare launches a full-height bullet-clearing wall with one gap, sweeping from the left', () => {
    const harness = createHarness();

    harness.system.spawnSolarFlare(0.5);

    expect(harness.launches.length).toBe(2);
    const [upper, lower] = harness.launches;
    for (const segment of [upper, lower]) {
      expect(segment.x).toBe(16.5);
      expect(segment.width).toBe(33);
      expect(segment.tint).toBe(0xffb066);
      expect(segment.telegraphMs).toBe(1300);
      expect(segment.velocityX).toBe(205);
      expect(segment.clearsBullets).toBe(true);
      expect(segment.activeMs as number).toBeCloseTo((860 / 205) * 1000 + 200, 5);
    }
    // Reaches past both screen edges; the only way through is the 120 px gap.
    expect(upper.y - upper.height / 2).toBe(-30);
    expect(lower.y + lower.height / 2).toBe(630);
    expect(lower.y - lower.height / 2 - (upper.y + upper.height / 2)).toBe(120);
    expect(upper.y + upper.height / 2).toBe(330 - 60);
  });

  test('spawnLaserLattice packs a curtain from both edges to one gap, plus a crossbeam', () => {
    const harness = createHarness();

    harness.system.spawnLaserLattice(0.5);

    const crossBeam = harness.launches.at(-1)!;
    const curtain = harness.launches.slice(0, -1).sort((a, b) => a.x - b.x);
    expect(crossBeam).toMatchObject({ x: 400, y: 120, width: 840, height: 27, activeMs: 2200 });
    // Gap centre at 200 (the min pick): 600 px to the far edge sets the telegraph.
    const telegraphMs = Math.round(450 + 80 * Math.sqrt(600));
    expect(crossBeam.telegraphMs).toBe(telegraphMs);
    for (const beam of curtain) {
      expect(beam).toMatchObject({ y: 300, width: 27, height: 640, tint: 0xff6a8d, telegraphMs, activeMs: 2200 });
    }
    expect(curtain[0]!.x).toBeLessThan(0);
    expect(curtain.at(-1)!.x).toBeGreaterThan(800);
    expect(latticeGap(harness.launches, 600)).toEqual({
      left: 131.5 + (27 * BEAM_HIT_FRACTION) / 2,
      right: 268.5 - (27 * BEAM_HIT_FRACTION) / 2,
    });
  });

  test.each([
    [390, 844],
    [844, 390],
    [1280, 720],
  ])('the lattice curtain has no ship-sized hole outside its gap at %ix%i', (width: number, height: number) => {
    for (const intensity of [0, 0.5, 1]) {
      const harness = createHarness(width, height);
      harness.system.spawnLaserLattice(intensity);
      const curtain = harness.launches.filter((beam) => beam.height >= height).sort((a, b) => a.x - b.x);
      const gap = latticeGap(harness.launches, height)!;
      let openings = 0;
      for (let index = 1; index < curtain.length; index++) {
        const hitHalf = (curtain[index]!.width * BEAM_HIT_FRACTION) / 2;
        const opening = curtain[index]!.x - curtain[index - 1]!.x - hitHalf * 2;
        if (opening >= 24) openings += 1;
      }
      expect(openings).toBe(1);
      expect(gap.right - gap.left).toBeGreaterThan(24 + 24);
      expect(curtain[0]!.x - (curtain[0]!.width * BEAM_HIT_FRACTION) / 2).toBeLessThan(24);
      expect(curtain.at(-1)!.x + (curtain.at(-1)!.width * BEAM_HIT_FRACTION) / 2).toBeGreaterThan(width - 24);
    }
  });

  test.each([
    [390, 844],
    [844, 390],
    [1280, 720],
  ])('an inertial ship reaches the lattice gap from either edge at %ix%i', (width: number, height: number) => {
    for (const pick of ['min', 'max'] as const) {
      for (const intensity of [0, 1]) {
        const harness = createHarness(width, height, pick);
        harness.system.spawnLaserLattice(intensity);
        // Hugging either wall (the ship's body is 24 px wide) or the middle of the screen.
        for (const x of [13, width / 2, width - 13]) {
          const result = proveBeamRoute({ width, height, x, y: height * 0.8, beams: harness.launches });
          expect(result.safe).toBe(true);
        }
      }
    }
  });

  test.each([
    [390, 844],
    [844, 390],
    [800, 600],
  ])('flare spans the full height with a gap inside the screen at %ix%i', (width: number, height: number) => {
    for (const pick of ['min', 'max'] as const) {
      const harness = createHarness(width, height, pick);
      harness.system.spawnSolarFlare(0.55);
      const gap = flareGap(harness.launches);
      expect(harness.launches[0]!.y - harness.launches[0]!.height / 2).toBeLessThan(0);
      expect(harness.launches[1]!.y + harness.launches[1]!.height / 2).toBeGreaterThan(height);
      expect(gap.bottom - gap.top).toBeGreaterThanOrEqual(120);
      expect(gap.top).toBeGreaterThan(height * 0.3);
      // The ship fits in the gap below the lowest lattice crossbeam.
      expect(gap.bottom - Math.max(gap.top, height * 0.45 + 16)).toBeGreaterThan(32 + 8);
      expect(gap.bottom).toBeLessThan(height - 32);
    }
  });

  test.each([
    [390, 844],
    [844, 390],
    [800, 600],
  ])(
    'v1.19 inertial flight threads a simultaneous flare gap and lattice at %ix%i after 250ms reaction',
    (width: number, height: number) => {
      for (const pick of ['min', 'max'] as const) {
        const harness = createHarness(width, height, pick);
        harness.system.spawnSolarFlare(0.55);
        harness.system.spawnLaserLattice(0.5);
        for (const reflected of [false, true]) {
          const beams = reflected
            ? harness.launches.map((beam) => ({ ...beam, x: width - beam.x, velocityX: -(beam.velocityX ?? 0) }))
            : harness.launches;
          // Shift the lattice gap across its on-screen range (the min pick sits at its left end).
          const shift = pick === 'min' ? width * 0.25 : 0;
          for (const latticeShift of [0, reflected ? -shift : shift]) {
            const sampleBeams = beams.map((beam) =>
              (beam.velocityX ?? 0) === 0 ? { ...beam, x: beam.x + latticeShift } : beam
            );
            for (const xRatio of [0.2, 0.5, 0.8]) {
              for (const yRatio of [0.6, 0.75, 0.9]) {
                const result = proveBeamRoute({
                  width,
                  height,
                  x: width * xRatio,
                  y: height * yRatio,
                  beams: sampleBeams,
                });
                expect(result.safe).toBe(true);
                expect(result.inGapAtMs).not.toBeNull();
              }
            }
          }
        }
      }
    }
  );

  test('route proof rejects a flare whose gap is too small to fit the ship', () => {
    const harness = createHarness(390, 844);
    harness.system.spawnSolarFlare(0.55);
    const [upper, lower] = harness.launches;
    const result = proveBeamRoute({
      width: 390,
      height: 844,
      x: 195,
      y: 844 * 0.6,
      beams: [
        { ...upper!, height: upper!.height + 100, y: upper!.y + 50 },
        { ...lower!, height: lower!.height + 100, y: lower!.y - 50 },
      ],
    });
    expect(result.safe).toBe(false);
  });

  test('a follow-up lattice keeps its gap within 200 px of the last one on wide screens', () => {
    const harness = createHarness(2560, 1440, 'max');
    harness.system.spawnLaserLattice(0.55);
    const first = latticeGap(harness.launches, 1440)!;
    harness.launches.length = 0;
    randomPick = 'min';
    harness.system.spawnLaserLattice(0.55);
    const second = latticeGap(harness.launches, 1440)!;
    const centre = (gap: { left: number; right: number }) => (gap.left + gap.right) / 2;
    expect(centre(first)).toBeCloseTo(1920, 0);
    expect(centre(first) - centre(second)).toBeCloseTo(200, 0);
  });

  test('higher intensity narrows the lattice safe gap', () => {
    const gentle = createHarness();
    gentle.system.spawnLaserLattice(0);

    const hard = createHarness();
    hard.system.spawnLaserLattice(1);

    const gentleGap = latticeGap(gentle.launches, 600)!;
    const hardGap = latticeGap(hard.launches, 600)!;

    expect(gentleGap.right - gentleGap.left).toBeGreaterThan(hardGap.right - hardGap.left);
  });
});
