import { describe, expect, test } from 'bun:test';

import type { MusicHarmonicChordStepConfig, ProceduralMusicTrackConfig } from '../src/config/LevelsConfig';
import { resolveHarmonicContext } from '../src/systems/audio/procedural/harmony';
import { getMeterStepContext } from '../src/systems/audio/procedural/musicIntent';

function createTrack(args: {
  seed: string;
  mode: string;
  beatsPerBar: number;
  beatUnit: 2 | 4 | 8 | 16;
  rootHz?: number;
  steps?: MusicHarmonicChordStepConfig[];
}): ProceduralMusicTrackConfig {
  return {
    tempo: 110,
    rootHz: args.rootHz ?? 110,
    stepsPerBeat: 4,
    masterGain: 0.9,
    intent: {
      deterministicSeed: args.seed,
      timeSignature: { beatsPerBar: args.beatsPerBar, beatUnit: args.beatUnit },
      descriptors: {
        mode: args.mode,
        chordProgressionTags: ['test-harmony-loop'],
        rhythmicFeel: 'test-harmony-rhythm',
        energyProfile: { baseline: 0.2, peak: 0.8, curve: 'build' },
        harmony: {
          steps: args.steps ?? [
            { degree: 1, barsDuration: 1, quality: 'major' },
            { degree: 5, barsDuration: 1, quality: 'major' },
          ],
        },
      },
    },
    bass: {
      waveform: 'triangle',
      pattern: [0, null, 7, null],
      gain: 0.1,
      durationSteps: 1,
    },
  };
}

describe('harmonic progression resolver', () => {
  test('resolves progression wraparound with multi-bar durations', () => {
    const track = createTrack({
      seed: 'wraparound-seed',
      mode: 'ionian',
      beatsPerBar: 4,
      beatUnit: 4,
      steps: [
        { degree: 1, barsDuration: 1, quality: 'major' },
        { degree: 5, barsDuration: 1, quality: 'major' },
        { degree: 6, barsDuration: 2, quality: 'minor' },
      ],
    });

    const checkpoints = [0, 1, 2, 3, 4, 5].map((barIndex) => {
      const context = resolveHarmonicContext(track, barIndex);
      return {
        barIndex,
        chordIndex: context.chordIndex,
        rootSemitoneOffset: context.rootSemitoneOffset,
      };
    });

    expect(checkpoints).toEqual([
      { barIndex: 0, chordIndex: 0, rootSemitoneOffset: 0 },
      { barIndex: 1, chordIndex: 1, rootSemitoneOffset: 7 },
      { barIndex: 2, chordIndex: 2, rootSemitoneOffset: 9 },
      { barIndex: 3, chordIndex: 2, rootSemitoneOffset: 9 },
      { barIndex: 4, chordIndex: 0, rootSemitoneOffset: 0 },
      { barIndex: 5, chordIndex: 1, rootSemitoneOffset: 7 },
    ]);
  });

  test('falls back to aeolian mode offsets for unknown mode labels', () => {
    const track = createTrack({
      seed: 'unknown-mode-seed',
      mode: 'not-a-real-mode',
      beatsPerBar: 4,
      beatUnit: 4,
      steps: [{ degree: 6, barsDuration: 1, quality: 'minor' }],
    });

    const context = resolveHarmonicContext(track, 0);
    // Aeolian degree 6 => +8 semitones.
    expect(context.rootSemitoneOffset).toBe(8);
  });

  test('applies octaveShift to harmonic root resolution', () => {
    const track = createTrack({
      seed: 'octave-shift-seed',
      mode: 'dorian',
      beatsPerBar: 4,
      beatUnit: 4,
      rootHz: 100,
      steps: [{ degree: 2, barsDuration: 1, quality: 'minor', octaveShift: 1 }],
    });

    const context = resolveHarmonicContext(track, 0);
    // Dorian degree 2 => +2 semitones, plus +12 from octaveShift.
    expect(context.rootSemitoneOffset).toBe(14);
    expect(context.harmonicRootHz).toBeCloseTo(100 * Math.pow(2, 14 / 12), 6);
  });

  test('is deterministic for identical bar input', () => {
    const track = createTrack({
      seed: 'stable-seed',
      mode: 'phrygian',
      beatsPerBar: 7,
      beatUnit: 8,
      steps: [
        { degree: 1, barsDuration: 1, quality: 'minor' },
        { degree: 4, barsDuration: 1, quality: 'minor' },
      ],
    });

    const first = resolveHarmonicContext(track, 4);
    const second = resolveHarmonicContext(track, 4);

    expect(first.rootSemitoneOffset).toBe(second.rootSemitoneOffset);
    expect(first.harmonicRootHz).toBe(second.harmonicRootHz);
    expect(first.chordIndex).toBe(second.chordIndex);
  });
});

describe('odd-meter bar boundary progression', () => {
  test('changes harmonic context when 7/8 crosses to next bar', () => {
    const track = createTrack({
      seed: 'seven-eight-transition',
      mode: 'dorian',
      beatsPerBar: 7,
      beatUnit: 8,
      steps: [
        { degree: 1, barsDuration: 1, quality: 'minor' },
        { degree: 4, barsDuration: 1, quality: 'major' },
      ],
    });

    const beforeBoundaryMeter = getMeterStepContext(track, 13);
    const afterBoundaryMeter = getMeterStepContext(track, 14);
    const beforeBoundaryHarmony = resolveHarmonicContext(track, beforeBoundaryMeter.barIndex);
    const afterBoundaryHarmony = resolveHarmonicContext(track, afterBoundaryMeter.barIndex);

    expect(beforeBoundaryMeter.barIndex).toBe(0);
    expect(afterBoundaryMeter.barIndex).toBe(1);
    expect(beforeBoundaryHarmony.chordIndex).toBe(0);
    expect(afterBoundaryHarmony.chordIndex).toBe(1);
    expect(beforeBoundaryHarmony.harmonicRootHz).not.toBe(afterBoundaryHarmony.harmonicRootHz);
  });
});
