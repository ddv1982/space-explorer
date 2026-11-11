import { describe, expect, mock, test } from 'bun:test';

import { LEVELS } from '../src/config/levels/registry';
import type { LevelConfig, LevelSectionConfig, ScriptedHazardConfig } from '../src/config/levels/types';

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      Linear: (start: number, end: number, t: number) => start + (end - start) * t,
    },
  },
}));

const { canTriggerHazard, consumeHazardPressure, decayHazardPressure, isHazardWithinDuration } =
  await import('../src/systems/wave/hazardPressurePolicy');

type MusicTrack = LevelConfig['music']['stage'];
type Rhythm = MusicTrack['bass']['rhythm'];

const positive = (value: number | undefined): boolean => value !== undefined && Number.isFinite(value) && value > 0;
const within = (value: number | undefined, min: number, max: number): boolean =>
  value !== undefined && Number.isFinite(value) && value >= min && value <= max;
const finiteOrUnset = (value: number | undefined): boolean => value === undefined || Number.isFinite(value);

/** Replays the runtime hazard pressure policy and counts how often each hazard gets to fire. */
function hazardTriggerCounts(hazards: readonly ScriptedHazardConfig[]): number[] {
  const stepMs = 100;
  const maxCadenceMs = Math.max(...hazards.map((hazard) => hazard.cadenceMs ?? 2000));
  const horizonMs = Math.max(maxCadenceMs * 6, ...hazards.map((hazard) => hazard.durationMs ?? 0));
  const counts = hazards.map(() => 0);
  const lastTriggered = hazards.map(() => 0);
  let pressure = 0;
  for (let time = stepMs; time <= horizonMs; time += stepMs) {
    pressure = decayHazardPressure(pressure, stepMs);
    hazards.forEach((hazard, index) => {
      if (!isHazardWithinDuration(hazard, time)) return;
      if (time <= lastTriggered[index] + (hazard.cadenceMs ?? 2000)) return;
      if (!canTriggerHazard(pressure, hazard)) return;
      pressure = consumeHazardPressure(pressure, hazard);
      lastTriggered[index] = time;
      counts[index] += 1;
    });
  }
  return counts;
}

function hazardProblems(section: LevelSectionConfig): string[] {
  const hazards = section.hazardEvents ?? [];
  const problems: string[] = [];
  hazards.forEach((hazard, index) => {
    const at = `${section.id} hazard[${index}] ${hazard.type}`;
    if (hazard.cadenceMs !== undefined && !positive(hazard.cadenceMs)) problems.push(`${at}: cadenceMs`);
    if (hazard.durationMs !== undefined && !positive(hazard.durationMs)) problems.push(`${at}: durationMs`);
    if (hazard.intensity !== undefined && !within(hazard.intensity, 0, 1.25)) problems.push(`${at}: intensity`);
    if (hazard.laneCount !== undefined && !within(hazard.laneCount, 1, 3)) problems.push(`${at}: laneCount`);
    if (hazard.damage !== undefined && hazard.damage < 0) problems.push(`${at}: damage`);
    if (hazard.coverHp !== undefined && !positive(hazard.coverHp)) problems.push(`${at}: coverHp`);
  });
  if (hazards.length > 0) {
    hazardTriggerCounts(hazards).forEach((count, index) => {
      if (count === 0) problems.push(`${section.id} hazard[${index}]: never pressure-reachable; stagger cadence`);
    });
  }
  return problems;
}

function sectionProblems(level: LevelConfig): string[] {
  const problems: string[] = [];
  const sections = [...level.sections].sort((a, b) => a.startProgress - b.startProgress);
  const terminal = level.hasBoss ? level.bossTriggerProgress : 1;
  if (sections.length === 0) return ['no sections'];
  if (Math.abs(sections[0].startProgress) > 1e-6) problems.push('first section must start at 0');
  if (Math.abs(sections[sections.length - 1].endProgress - terminal) > 1e-6) {
    problems.push(`last section must end at ${terminal}`);
  }
  sections.forEach((section, index) => {
    const next = sections[index + 1];
    if (section.startProgress < 0 || section.endProgress > 1) problems.push(`${section.id}: outside [0, 1]`);
    if (section.endProgress <= section.startProgress) problems.push(`${section.id}: empty span`);
    if (next && Math.abs(next.startProgress - section.endProgress) > 1e-6) {
      problems.push(`${section.id} -> ${next.id}: gap or overlap`);
    }
    const override = section.encounterSizeOverride;
    if (override && (override.min < 1 || override.max < override.min)) problems.push(`${section.id}: encounter size`);
    if (section.spawnRateMultiplier !== undefined && !positive(section.spawnRateMultiplier)) {
      problems.push(`${section.id}: spawnRateMultiplier`);
    }
    if (section.asteroidInterval !== undefined && !positive(section.asteroidInterval)) {
      problems.push(`${section.id}: asteroidInterval`);
    }
    for (const beat of [...(section.signatureWaves ?? []), ...(section.recoveryDrops ?? [])]) {
      if (beat.id.trim() === '') problems.push(`${section.id}: authored beat without an id`);
      if (!within(beat.triggerProgress, 0, 1)) problems.push(`${section.id} ${beat.id}: triggerProgress`);
    }
    section.signatureWaves?.forEach((wave) => {
      if (wave.enemies.length === 0) problems.push(`${section.id} ${wave.id}: no enemies`);
    });
    problems.push(...hazardProblems(section));
  });
  return problems;
}

function bossProblems(level: LevelConfig): string[] {
  if (!level.hasBoss) {
    const problems = level.boss === null ? [] : ['hasBoss=false must use boss: null'];
    return within(level.bossTriggerProgress, Number.EPSILON, 1) ? problems : [...problems, 'bossTriggerProgress'];
  }
  const problems: string[] = [];
  if (!level.boss) return ['hasBoss=true requires a boss config'];
  if (!(level.bossTriggerProgress > 0 && level.bossTriggerProgress < 1)) problems.push('bossTriggerProgress');
  if (level.boss.guardCapacity !== undefined) {
    const { guardCapacity, guardDecayDelayMs, guardDecayPerSecond, guardBreakDurationMs } = level.boss;
    if (![guardCapacity, guardDecayDelayMs, guardDecayPerSecond, guardBreakDurationMs].every(positive)) {
      problems.push('Guard Break bosses need positive capacity, decay delay, decay rate and break duration');
    }
  }
  return problems;
}

function rhythmProblems(scope: string, rhythm: Rhythm | undefined): string[] {
  if (!rhythm) return [];
  const problems: string[] = [];
  if (!positive(rhythm.division)) problems.push(`${scope}: division`);
  if (!within(rhythm.gate, 0, 1)) problems.push(`${scope}: gate`);
  if (!finiteOrUnset(rhythm.phase) || !finiteOrUnset(rhythm.accentAmount)) problems.push(`${scope}: phase/accent`);
  if (rhythm.accentPattern?.some((step) => !Number.isFinite(step))) problems.push(`${scope}: accentPattern`);
  return problems;
}

function musicProblems(name: string, track: MusicTrack): string[] {
  const problems: string[] = [];
  const { intent } = track;
  for (const key of ['tempo', 'rootHz', 'stepsPerBeat', 'masterGain'] as const) {
    if (!positive(track[key])) problems.push(`${name}: ${key}`);
  }
  if (intent.deterministicSeed.trim() === '') problems.push(`${name}: empty deterministicSeed`);
  if (!positive(intent.timeSignature.beatsPerBar)) problems.push(`${name}: beatsPerBar`);
  if (![2, 4, 8, 16].includes(intent.timeSignature.beatUnit)) problems.push(`${name}: beatUnit`);
  const harmony = intent.descriptors.harmony.steps;
  if (harmony.length === 0) problems.push(`${name}: no harmony steps`);
  if (harmony.some((step) => !within(step.degree, 1, 7) || !positive(step.barsDuration))) {
    problems.push(`${name}: harmony step degree or duration`);
  }
  const arrangement = intent.descriptors.arrangement;
  if (arrangement?.sections.length === 0) problems.push(`${name}: empty arrangement`);
  arrangement?.sections.forEach((section, index) => {
    const multipliers = Object.values(section.layerGainMultipliers ?? {});
    if (
      !positive(section.barsDuration) ||
      !within(section.density, 0, 1) ||
      !Number.isFinite(section.energyLift) ||
      !multipliers.every((value) => finiteOrUnset(value))
    ) {
      problems.push(`${name}: arrangement section ${index}`);
    }
  });
  const layers = { bass: track.bass, pulse: track.pulse, lead: track.lead, noise: track.noise };
  for (const [layer, voice] of Object.entries(layers)) {
    problems.push(...rhythmProblems(`${name}.${layer}`, voice?.rhythm));
  }
  return problems;
}

describe('level authoring validation', () => {
  test.each(LEVELS.map((level) => [`${level.name} (${level.planetName})`, level] as const))(
    '%s is well-formed',
    (_label, level) => {
      const problems: string[] = [];
      if (!positive(level.spawnRateMultiplier)) problems.push('spawnRateMultiplier');
      if (!positive(level.asteroidInterval)) problems.push('asteroidInterval');
      if (!positive(level.levelDistance)) problems.push('levelDistance');
      if (level.encounterSize.min < 1 || level.encounterSize.max < level.encounterSize.min) {
        problems.push('encounterSize');
      }
      problems.push(...sectionProblems(level), ...bossProblems(level));
      problems.push(
        ...musicProblems('music.stage', level.music.stage),
        ...musicProblems('music.boss', level.music.boss)
      );
      expect(problems).toEqual([]);
    }
  );

  test('the pressure replay flags a hazard that can never fire', () => {
    // The first heavy well re-fires as soon as pressure allows, so its twin is starved forever.
    const well = { type: 'gravity-well', intensity: 1.25, cadenceMs: 100 } as const;
    const [first, starved] = hazardTriggerCounts([well, well]);
    expect(first).toBeGreaterThan(0);
    expect(starved).toBe(0);
  });
});
