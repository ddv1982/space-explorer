import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';
import type { BossShotPattern } from '../src/config/LevelsConfig';
import type { BossVolleyContext } from '../src/entities/enemies/boss/volleys';

mockPhaserModule();

const { fireBossPattern } = await import('../src/entities/enemies/boss/volleys');

function createContext(overrides: Partial<BossVolleyContext> = {}) {
  const shots: Array<{ x: number; y: number; vx: number; vy: number }> = [];
  const context: BossVolleyContext = {
    x: 200,
    y: 80,
    moveDir: 1,
    volley: 0,
    time: 0,
    patternUses: 0,
    viewport: { left: 0, width: 400 },
    fireBullet: (x, y, vx, vy) => shots.push({ x, y, vx, vy }),
    getPlayerAimAngle: () => 90,
    summonEscorts: mock(),
    launchBeam: mock(),
    queueAimedShot: mock(),
    ...overrides,
  };
  return { context, shots };
}

const headingOf = (shot: { vx: number; vy: number }): number => (Math.atan2(shot.vy, shot.vx) * 180) / Math.PI;

describe('boss volley building blocks', () => {
  test('a wall covers the screen except one gap wide enough to fly through, stepping through its gaps', () => {
    const wall: BossShotPattern = {
      kind: 'wall',
      gaps: [0.25, 0.75],
      gapWidth: 100,
      spacing: 40,
      speed: 0.6,
      originY: 30,
    };
    const first = createContext();
    fireBossPattern(wall, first.context);
    const second = createContext({ patternUses: 1 });
    fireBossPattern(wall, second.context);

    const xs = first.shots.map((shot) => shot.x);
    expect(xs.some((x) => Math.abs(x - 100) < 50)).toBe(false);
    expect(xs.some((x) => x > 300)).toBe(true);
    expect(second.shots.some((shot) => Math.abs(shot.x - 300) < 50)).toBe(false);
    expect(first.shots.every((shot) => Math.abs(shot.vx) < 1e-9 && shot.vy > 0 && shot.y === 110)).toBe(true);
  });

  test("a wall's gap stays fully on screen even when authored at the edge", () => {
    const wall: BossShotPattern = { kind: 'wall', gaps: [0], gapWidth: 100, spacing: 20, speed: 0.6, originY: 30 };
    const { context, shots } = createContext();
    fireBossPattern(wall, context);
    expect(Math.min(...shots.map((shot) => shot.x))).toBeGreaterThanOrEqual(100);
  });

  test('an aimed burst fires once now and queues the rest of the burst after one wind-up', () => {
    const queueAimedShot = mock();
    const { context, shots } = createContext({ queueAimedShot, getPlayerAimAngle: () => 60 });
    fireBossPattern({ kind: 'aimedBurst', shots: 4, intervalMs: 120, speed: 1.1, originY: 28 }, context);

    expect(shots).toHaveLength(1);
    expect(headingOf(shots[0]!)).toBeCloseTo(60);
    expect(queueAimedShot.mock.calls).toEqual([
      [120, 1.1, 28],
      [240, 1.1, 28],
      [360, 1.1, 28],
    ]);
  });

  test('a lean that applies every other volley interleaves consecutive fans', () => {
    const fan: BossShotPattern = {
      kind: 'arc',
      shots: 1,
      arcDegrees: 0,
      speed: 1,
      originY: 30,
      lean: 6,
      leanEveryOther: true,
    };
    const even = createContext({ volley: 0, moveDir: -1 });
    const odd = createContext({ volley: 1, moveDir: -1 });
    fireBossPattern(fan, even.context);
    fireBossPattern(fan, odd.context);
    expect(headingOf(even.shots[0]!)).toBeCloseTo(90);
    expect(headingOf(odd.shots[0]!)).toBeCloseTo(84);
  });

  test('a mirrored spiral adds a counter-rotating set of spokes', () => {
    const { context, shots } = createContext({ time: 500 });
    fireBossPattern(
      { kind: 'spiral', shots: 4, degreesPerSecond: 180, speed: 1, originY: 30, mirrored: true },
      context
    );
    expect(shots).toHaveLength(8);
  });

  test('escorts limited to even or odd volleys only launch on those', () => {
    const summonEscorts = mock();
    const summon: BossShotPattern = { kind: 'summon', escorts: ['swarm'], onVolleys: 'odd' };
    fireBossPattern(summon, createContext({ volley: 0, summonEscorts }).context);
    fireBossPattern(summon, createContext({ volley: 1, summonEscorts }).context);
    expect(summonEscorts).toHaveBeenCalledTimes(1);
  });

  test('a beam drops from below the boss with its own telegraph', () => {
    const launchBeam = mock();
    fireBossPattern(
      { kind: 'beam', width: 34, telegraphMs: 600, activeMs: 700, originY: 30 },
      createContext({ launchBeam }).context
    );
    expect(launchBeam).toHaveBeenCalledWith({ x: 200, top: 110, width: 34, telegraphMs: 600, activeMs: 700 });
  });
});
