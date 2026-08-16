import { describe, expect, test } from 'bun:test';

import type { ChoreographedWaveConfig, EnemyType } from '@/config/LevelsConfig';
import type { ChoreographedSpawnOptions } from '../src/systems/wave/waveChoreography';

const { CHOREO_LANE_COUNT, getLaneCenterX, resolveFormationPositions, WaveChoreographer } =
  await import('../src/systems/wave/waveChoreography');

type FakeMember = {
  active: boolean;
  defeatCount: number;
  getDefeatCount(): number;
};

function createDeps(viewportWidth = 800) {
  const spawns: Array<{ type: EnemyType; x: number; y: number; options?: ChoreographedSpawnOptions }> = [];
  const warnings: number[] = [];
  const wormholes: Array<{ x: number; y: number }> = [];
  let eliteCount = 0;
  const members: FakeMember[] = [];

  const deps = {
    spawn: (type: EnemyType, x: number, y: number, options?: ChoreographedSpawnOptions): FakeMember => {
      spawns.push({ type, x, y, options });
      const member: FakeMember = {
        active: true,
        defeatCount: 0,
        getDefeatCount() {
          return this.defeatCount;
        },
      };
      members.push(member);
      return member;
    },
    emitWarning: (x: number) => {
      warnings.push(x);
    },
    emitWormhole: (x: number, y: number) => {
      wormholes.push({ x, y });
    },
    emitEliteWave: () => {
      eliteCount += 1;
    },
    getViewportWidth: () => viewportWidth,
  };

  return {
    deps,
    spawns,
    warnings,
    wormholes,
    members,
    getEliteCount: () => eliteCount,
  };
}

function createWave(overrides: Partial<ChoreographedWaveConfig> = {}): ChoreographedWaveConfig {
  return {
    id: 'wave',
    atMs: 300,
    formation: 'line',
    type: 'scout',
    count: 3,
    lane: 3,
    telegraph: 'warning',
    ...overrides,
  };
}

describe('getLaneCenterX', () => {
  test('places 7 lanes inside 8 percent margins', () => {
    expect(getLaneCenterX(0, 800)).toBe(112);
    expect(getLaneCenterX(3, 800)).toBe(400);
    expect(getLaneCenterX(6, 800)).toBe(688);
  });

  test('clamps out-of-range lane indices', () => {
    expect(getLaneCenterX(-2, 800)).toBe(112);
    expect(getLaneCenterX(CHOREO_LANE_COUNT + 5, 800)).toBe(688);
  });
});

describe('resolveFormationPositions', () => {
  test('line centers members around the anchor', () => {
    expect(resolveFormationPositions('line', 3, 400, 800)).toEqual([
      { x: 344, y: -60 },
      { x: 400, y: -60 },
      { x: 456, y: -60 },
    ]);
  });

  test('column stacks members upward from the anchor', () => {
    expect(resolveFormationPositions('column', 3, 400, 800)).toEqual([
      { x: 400, y: -60 },
      { x: 400, y: -116 },
      { x: 400, y: -172 },
    ]);
  });

  test('pincer alternates the outer lanes', () => {
    expect(resolveFormationPositions('pincer', 4, 400, 800)).toEqual([
      { x: 112, y: -60 },
      { x: 688, y: -60 },
      { x: 112, y: -116 },
      { x: 688, y: -116 },
    ]);
  });
});

describe('WaveChoreographer', () => {
  test('fires a wave at its authored gameplay-time offset with one warning per distinct lane x', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([createWave()]);

    choreographer.update(299);
    expect(harness.spawns).toEqual([]);

    choreographer.update(1);
    expect(harness.spawns).toEqual([
      { type: 'scout', x: 344, y: -60 },
      { type: 'scout', x: 400, y: -60 },
      { type: 'scout', x: 456, y: -60 },
    ]);
    expect(harness.warnings).toEqual([344, 400, 456]);
  });

  test('fires each wave only once', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([createWave()]);

    choreographer.update(300);
    choreographer.update(100);

    expect(harness.spawns).toHaveLength(3);
  });

  test('advances on accumulated gameplay delta so paused wall-clock time cannot compress the schedule', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([createWave({ id: 'first', atMs: 300 }), createWave({ id: 'second', atMs: 900 })]);

    choreographer.update(300);
    expect(harness.spawns).toHaveLength(3);

    // A pause contributes no update calls; on resume the next wave still waits
    // for its full gameplay-time offset instead of burst-firing immediately.
    choreographer.update(599);
    expect(harness.spawns).toHaveLength(3);

    choreographer.update(1);
    expect(harness.spawns).toHaveLength(6);
  });

  test('restarts the section clock when a new section is set', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([createWave()]);
    choreographer.update(300);
    expect(harness.spawns).toHaveLength(3);

    choreographer.setSection([createWave({ id: 'next-section' })]);
    choreographer.update(299);
    expect(harness.spawns).toHaveLength(3);

    choreographer.update(1);
    expect(harness.spawns).toHaveLength(6);
  });

  test('emits wormhole telegraphs ahead of the wave before spawning it', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([createWave({ telegraph: 'wormhole', atMs: 1300 })]);

    choreographer.update(650);
    expect(harness.wormholes).toEqual([]);
    expect(harness.spawns).toEqual([]);

    choreographer.update(50);
    expect(harness.wormholes).toEqual([
      { x: 344, y: 72 },
      { x: 400, y: 72 },
      { x: 456, y: 72 },
    ]);
    expect(harness.spawns).toEqual([]);
    expect(harness.warnings).toEqual([]);

    choreographer.update(600);
    expect(harness.spawns).toHaveLength(3);
    expect(harness.warnings).toEqual([344, 400, 456]);
  });

  test('clamps wormhole telegraph rings into the viewport for off-screen formation rows', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([createWave({ telegraph: 'wormhole', formation: 'column', atMs: 1300 })]);

    choreographer.update(700);

    expect(harness.wormholes).toEqual([
      { x: 400, y: 72 },
      { x: 400, y: 72 },
      { x: 400, y: 72 },
    ]);
  });

  test('emits the elite event for mid-boss beats', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([createWave({ midBossBeat: true })]);

    choreographer.update(300);

    expect(harness.getEliteCount()).toBe(1);
  });

  test('spawns the bonus wave when members are cleared inside the gameplay-time window', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([
      createWave({
        bonusOnClearMs: 4000,
        bonusWave: { type: 'swarm', count: 5 },
      }),
    ]);

    choreographer.update(300);
    harness.members.forEach((member) => {
      member.active = false;
      member.defeatCount += 1;
    });
    choreographer.update(1700);

    const bonusSpawns = harness.spawns.filter((spawn) => spawn.type === 'swarm');
    expect(bonusSpawns).toHaveLength(5);
    expect(bonusSpawns.every((spawn) => spawn.y === -40)).toBe(true);
  });

  test('withholds the bonus wave when the clear is too slow', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([
      createWave({
        bonusOnClearMs: 4000,
        bonusWave: { type: 'swarm', count: 5 },
      }),
    ]);

    choreographer.update(300);
    harness.members.forEach((member) => {
      member.active = false;
      member.defeatCount += 1;
    });
    choreographer.update(4700);

    expect(harness.spawns.filter((spawn) => spawn.type === 'swarm')).toHaveLength(0);
  });

  test('does not count members that despawn without being defeated', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([
      createWave({
        bonusOnClearMs: 4000,
        bonusWave: { type: 'swarm', count: 5 },
      }),
    ]);

    choreographer.update(300);
    harness.members.forEach((member) => {
      member.active = false;
    });
    choreographer.update(1700);

    expect(harness.spawns.filter((spawn) => spawn.type === 'swarm')).toHaveLength(0);
  });

  test('recognizes defeated members after their pooled objects are reused', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([
      createWave({
        bonusOnClearMs: 4000,
        bonusWave: { type: 'swarm', count: 5 },
      }),
    ]);

    choreographer.update(300);
    harness.members.forEach((member) => {
      member.defeatCount += 1;
      member.active = true;
    });
    choreographer.update(1700);

    expect(harness.spawns.filter((spawn) => spawn.type === 'swarm')).toHaveLength(5);
  });

  test('waits for every member to be defeated before resolving the bonus', () => {
    const harness = createDeps();
    const choreographer = new WaveChoreographer(harness.deps);
    choreographer.setSection([
      createWave({
        bonusOnClearMs: 4000,
        bonusWave: { type: 'swarm', count: 5 },
      }),
    ]);

    choreographer.update(300);
    harness.members[0].active = false;
    harness.members[0].defeatCount += 1;
    choreographer.update(700);
    expect(harness.spawns.filter((spawn) => spawn.type === 'swarm')).toHaveLength(0);

    harness.members.forEach((member) => {
      member.active = false;
      member.defeatCount += 1;
    });
    choreographer.update(200);
    expect(harness.spawns.filter((spawn) => spawn.type === 'swarm')).toHaveLength(5);
  });
});
