import { describe, expect, test } from 'bun:test';
import {
  GameFeelRecording,
  readGameFeelLoadout,
  type GameFeelFrame,
  type GameFeelOptions,
} from '../src/browserHarness/gameFeelRecording';

const options: GameFeelOptions = {
  scenario: 'controls',
  buildSha: 'test-build',
  source: 'automation',
  deviceLabel: 'unit',
};
const frame = (wallMs: number): GameFeelFrame => ({
  wallMs,
  segmentId: 1,
  deltaMs: 16,
  gameplayMs: wallMs,
  level: 1,
  section: 'opening',
  progress: 0,
  x: 100,
  y: 100,
  accelerationX: 0,
  accelerationY: 0,
  velocityX: 0,
  velocityY: 0,
  firingIntent: false,
  lastFireGameplayMs: 0,
  hp: 5,
  shields: 0,
  alive: true,
  manualPause: false,
  physicsPause: false,
  flowLock: false,
  captureCostMs: 0,
});

function setup(overrides: Partial<GameFeelOptions> = {}) {
  let cleanupCount = 0;
  const recorder = new GameFeelRecording(() => {
    cleanupCount += 1;
  });
  recorder.start({ ...options, ...overrides }, '2026-09-06T00:00:00.000Z');
  return { recorder, cleanups: () => cleanupCount };
}

describe('bounded game feel recording', () => {
  test('stops at frame capacity, preserves first input and ignores later writes', () => {
    const { recorder, cleanups } = setup({ maxFrames: 2 });
    recorder.event({ kind: 'key', code: 'ArrowRight', action: 'down', repeat: false, wallMs: 1, segmentId: 1 });
    recorder.frame(frame(2));
    recorder.frame(frame(3));
    recorder.frame(frame(4));
    recorder.stop('requested', 5);
    const result = recorder.read();
    expect(result?.frames.map((sample) => sample.wallMs)).toEqual([2, 3]);
    expect(result?.events[0]?.wallMs).toBe(1);
    expect(result?.status).toEqual({ kind: 'stopped', reason: 'frame-cap', wallMs: 3 });
    expect(cleanups()).toBe(1);
  });

  test('event capacity and elapsed duration stop independently with one cleanup', () => {
    const bounded = setup({ maxEvents: 1 });
    bounded.recorder.event({
      kind: 'player-death',
      cause: 'unknown',
      outcome: 'fatal',
      hullDamage: 1,
      wallMs: 1,
      segmentId: 1,
    });
    bounded.recorder.event({
      kind: 'player-death',
      cause: 'unknown',
      outcome: 'fatal',
      hullDamage: 1,
      wallMs: 2,
      segmentId: 1,
    });
    expect(bounded.recorder.read()?.events).toHaveLength(1);
    expect(bounded.recorder.read()?.status).toEqual({ kind: 'stopped', reason: 'event-cap', wallMs: 1 });
    expect(bounded.cleanups()).toBe(1);
    const timed = setup({ maxDurationMs: 10 });
    timed.recorder.frame(frame(9));
    timed.recorder.frame(frame(10));
    expect(timed.recorder.read()?.frames).toHaveLength(1);
    expect(timed.recorder.read()?.status).toEqual({ kind: 'stopped', reason: 'duration-cap', wallMs: 10 });
    expect(timed.cleanups()).toBe(1);
  });

  test('active start is idempotent; stopped restart replaces data; clear releases data', () => {
    const { recorder, cleanups } = setup();
    recorder.frame(frame(1));
    expect(recorder.start({ ...options, scenario: 'ignored' }, 'later')).toBe(false);
    expect(recorder.read()?.metadata.scenario).toBe('controls');
    recorder.stop('requested', 2);
    expect(recorder.start({ ...options, scenario: 'second' }, 'later')).toBe(true);
    expect(recorder.read()?.frames).toHaveLength(0);
    recorder.clear();
    recorder.clear();
    expect(recorder.read()).toBeNull();
    expect(cleanups()).toBe(2);
  });

  test('exports are detached JSON values, including metadata and status', () => {
    const { recorder } = setup();
    recorder.frame(frame(1));
    recorder.event({
      kind: 'player-hit',
      cause: 'unknown',
      outcome: 'damaged',
      hullDamage: 1,
      wallMs: 1,
      segmentId: 1,
    });
    const exported = recorder.read();
    if (!exported) throw new Error('missing recording');
    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
    exported.metadata.scenario = 'mutated';
    exported.frames[0]!.x = 999;
    exported.events.length = 0;
    exported.status = { kind: 'stopped', reason: 'requested', wallMs: 10 };
    expect(recorder.read()?.metadata.scenario).toBe('controls');
    expect(recorder.read()?.frames[0]?.x).toBe(100);
    expect(recorder.read()?.events).toHaveLength(1);
    expect(recorder.active).toBe(true);
  });

  test('rejects invalid metadata and numeric bounds before replacing a stopped export', () => {
    const { recorder } = setup();
    recorder.stop('requested', 1);
    for (const limits of [
      { maxFrames: 0 },
      { maxFrames: 120_001 },
      { maxFrames: 1.5 },
      { maxEvents: Infinity },
      { maxDurationMs: NaN },
      { maxDurationMs: 1_800_001 },
    ]) {
      expect(() => recorder.start({ ...options, ...limits }, 'later')).toThrow();
    }
    for (const metadata of [
      { scenario: '' },
      { scenario: 's'.repeat(161) },
      { deviceLabel: 'd'.repeat(161) },
      { buildSha: 's'.repeat(65) },
    ]) {
      expect(() => recorder.start({ ...options, ...metadata }, 'later')).toThrow();
    }
    expect(recorder.read()?.metadata.scenario).toBe('controls');
    expect(recorder.active).toBe(false);
  });
});

test('loadout observation does not write or replace the registry object', () => {
  const stored = { level: 3, score: 123, upgrades: { damage: 2 } };
  const before = structuredClone(stored);
  let current = stored;
  let writes = 0;
  const registry = {
    get: () => current,
    set: (_key: string, value: typeof stored) => {
      current = value;
      writes += 1;
    },
  };
  const loadout = readGameFeelLoadout(registry);
  expect(writes).toBe(0);
  expect(current).toBe(stored);
  expect(stored).toEqual(before);
  expect(loadout.level).toBe(3);
  expect(loadout.upgrades.damage).toBe(2);
  loadout.upgrades.damage = 0;
  expect(stored.upgrades.damage).toBe(2);
});
