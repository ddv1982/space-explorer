import { describe, expect, test } from 'bun:test';

import {
  getMeterStepContext,
  getTrackStepsPerBar,
  resolveIntentEnergy,
} from '../src/systems/audio/procedural/musicIntent';
import type { ProceduralMusicTrackConfig } from '../src/config/LevelsConfig';

function createTrack(args: {
  seed: string;
  beatsPerBar: number;
  beatUnit: 2 | 4 | 8 | 16;
  curve?: 'steady' | 'build' | 'build-release' | 'surge';
}): ProceduralMusicTrackConfig {
  return {
    tempo: 110,
    rootHz: 110,
    stepsPerBeat: 4,
    masterGain: 0.8,
    intent: {
      deterministicSeed: args.seed,
      timeSignature: {
        beatsPerBar: args.beatsPerBar,
        beatUnit: args.beatUnit,
      },
      descriptors: {
        mode: 'dorian',
        chordProgressionTags: ['test-loop'],
        rhythmicFeel: 'test feel',
        energyProfile: {
          baseline: 0.2,
          peak: 0.9,
          curve: args.curve ?? 'build',
        },
        harmony: {
          steps: [
            { degree: 1, barsDuration: 1, quality: 'minor' },
            { degree: 4, barsDuration: 1, quality: 'major' },
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

describe('musicIntent meter math', () => {
  test('computes steps per bar for 4/4 and 7/8', () => {
    const fourFour = createTrack({ seed: 'alpha', beatsPerBar: 4, beatUnit: 4 });
    const sevenEight = createTrack({ seed: 'alpha', beatsPerBar: 7, beatUnit: 8 });
    const fiveFour = createTrack({ seed: 'alpha', beatsPerBar: 5, beatUnit: 4 });

    expect(getTrackStepsPerBar(fourFour)).toBe(16);
    expect(getTrackStepsPerBar(sevenEight)).toBe(14);
    expect(getTrackStepsPerBar(fiveFour)).toBe(20);
  });

  test('produces stable bar/step progression in 7/8', () => {
    const sevenEight = createTrack({ seed: 'odd-meter-seed', beatsPerBar: 7, beatUnit: 8 });
    const checkpoints = [0, 1, 13, 14, 15, 27, 28].map((step) => {
      const context = getMeterStepContext(sevenEight, step);
      return {
        step,
        stepsPerBar: context.stepsPerBar,
        barIndex: context.barIndex,
        stepInBar: context.stepInBar,
      };
    });

    expect(checkpoints).toEqual([
      { step: 0, stepsPerBar: 14, barIndex: 0, stepInBar: 0 },
      { step: 1, stepsPerBar: 14, barIndex: 0, stepInBar: 1 },
      { step: 13, stepsPerBar: 14, barIndex: 0, stepInBar: 13 },
      { step: 14, stepsPerBar: 14, barIndex: 1, stepInBar: 0 },
      { step: 15, stepsPerBar: 14, barIndex: 1, stepInBar: 1 },
      { step: 27, stepsPerBar: 14, barIndex: 1, stepInBar: 13 },
      { step: 28, stepsPerBar: 14, barIndex: 2, stepInBar: 0 },
    ]);
  });

  test('keeps modulo stepInBar behavior for negative step indices', () => {
    const sevenEight = createTrack({ seed: 'odd-meter-seed', beatsPerBar: 7, beatUnit: 8 });
    const context = getMeterStepContext(sevenEight, -1);

    expect(context.stepsPerBar).toBe(14);
    expect(context.stepInBar).toBe(13);
  });
});

describe('musicIntent deterministic pulse', () => {
  test('returns the same pulse for identical seed/bar/step across runs', () => {
    const track = createTrack({ seed: 'repeatable-seed', beatsPerBar: 4, beatUnit: 4 });

    const first = getMeterStepContext(track, 9).deterministicPulse;
    const second = getMeterStepContext(track, 9).deterministicPulse;

    expect(first).toBe(second);
  });

  test('changes pulse when seed or position changes', () => {
    const trackA = createTrack({ seed: 'seed-a', beatsPerBar: 4, beatUnit: 4 });
    const trackB = createTrack({ seed: 'seed-b', beatsPerBar: 4, beatUnit: 4 });

    const aPulse = getMeterStepContext(trackA, 9).deterministicPulse;
    const bPulse = getMeterStepContext(trackB, 9).deterministicPulse;
    const aPulseDifferentStep = getMeterStepContext(trackA, 10).deterministicPulse;

    expect(aPulse).not.toBe(bPulse);
    expect(aPulse).not.toBe(aPulseDifferentStep);
  });
});

describe('resolveIntentEnergy curve behavior', () => {
  test('steady curve stays at baseline', () => {
    const energy = resolveIntentEnergy({ baseline: 0.3, peak: 0.9, curve: 'steady' }, 0.65, 0.8);
    expect(energy).toBe(0.3);
  });

  test('build curve interpolates baseline->peak', () => {
    expect(resolveIntentEnergy({ baseline: 0.2, peak: 0.8, curve: 'build' }, 0, 0.5)).toBe(0.2);
    expect(resolveIntentEnergy({ baseline: 0.2, peak: 0.8, curve: 'build' }, 1, 0.5)).toBe(0.8);
  });

  test('build-release peaks at midpoint and returns to baseline at bar end', () => {
    const profile = { baseline: 0.1, peak: 0.9, curve: 'build-release' as const };
    expect(resolveIntentEnergy(profile, 0, 0.2)).toBe(0.1);
    expect(resolveIntentEnergy(profile, 0.5, 0.2)).toBe(0.9);
    expect(resolveIntentEnergy(profile, 1, 0.2)).toBe(0.1);
  });

  test('surge curve is deterministic for same inputs and stays in range', () => {
    const profile = { baseline: 0.25, peak: 0.95, curve: 'surge' as const };
    const first = resolveIntentEnergy(profile, 0.6, 0.42);
    const second = resolveIntentEnergy(profile, 0.6, 0.42);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(profile.baseline);
    expect(first).toBeLessThanOrEqual(profile.peak);
  });
});
