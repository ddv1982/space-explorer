import { describe, expect, test } from 'bun:test';

import type { MusicArrangementConfig, MusicLayerRhythmConfig, ProceduralMusicTrackConfig } from '../src/config/LevelsConfig';
import { resolveArrangementForBar } from '../src/systems/audio/procedural/arrangement';
import { resolveHarmonicContext } from '../src/systems/audio/procedural/harmony';
import { getMeterStepContext } from '../src/systems/audio/procedural/musicIntent';
import { resolveLayerRhythmScheduling } from '../src/systems/audio/procedural/rhythm';

function createTrack(args: {
  seed: string;
  mode: string;
  beatsPerBar: number;
  beatUnit: 2 | 4 | 8 | 16;
  harmonySteps: NonNullable<ProceduralMusicTrackConfig['intent']['descriptors']['harmony']>['steps'];
  arrangement: MusicArrangementConfig;
  rootHz?: number;
  tempo?: number;
}): ProceduralMusicTrackConfig {
  return {
    tempo: args.tempo ?? 110,
    rootHz: args.rootHz ?? 110,
    stepsPerBeat: 4,
    masterGain: 0.8,
    intent: {
      deterministicSeed: args.seed,
      timeSignature: { beatsPerBar: args.beatsPerBar, beatUnit: args.beatUnit },
      descriptors: {
        mode: args.mode,
        chordProgressionTags: ['deterministic-replay-fixture'],
        rhythmicFeel: 'fixture-grid',
        energyProfile: { baseline: 0.2, peak: 0.8, curve: 'build' },
        harmony: { steps: args.harmonySteps },
        arrangement: args.arrangement,
      },
    },
    bass: {
      waveform: 'triangle',
      pattern: [0],
      gain: 0.1,
      durationSteps: 1,
    },
  };
}

function buildProjectionTimeline(args: {
  track: ProceduralMusicTrackConfig;
  rhythm: MusicLayerRhythmConfig;
  totalSteps: number;
}): string[] {
  return Array.from({ length: args.totalSteps }, (_, stepIndex) => {
    const meter = getMeterStepContext(args.track, stepIndex);
    const harmonic = resolveHarmonicContext(args.track, meter.barIndex);
    const arrangement = resolveArrangementForBar(args.track.intent.descriptors.arrangement, meter.barIndex);
    const scheduling = resolveLayerRhythmScheduling(
      args.rhythm,
      {
        barIndex: meter.barIndex,
        stepInBar: meter.stepInBar,
        stepsPerBar: meter.stepsPerBar,
      },
      {
        density: arrangement.density,
        gainMultiplier: arrangement.layerGainMultipliers?.bass ?? 1,
      }
    );

    return `${stepIndex}:${arrangement.phase}:${harmonic.chordIndex}:${scheduling.patternStepIndex}:${scheduling.shouldTrigger ? 1 : 0}:${scheduling.gainScale.toFixed(2)}`;
  });
}

describe('music replay deterministic fixtures', () => {
  test('replays exact 4/4 timeline projection across arrangement and harmony changes', () => {
    const track = createTrack({
      seed: 'fixture-4-4',
      mode: 'ionian',
      beatsPerBar: 4,
      beatUnit: 4,
      harmonySteps: [
        { degree: 1, barsDuration: 1, quality: 'major' },
        { degree: 4, barsDuration: 1, quality: 'major' },
        { degree: 5, barsDuration: 2, quality: 'major' },
      ],
      arrangement: {
        loop: true,
        sections: [
          { phase: 'intro', barsDuration: 1, density: 1, energyLift: 0, layerGainMultipliers: { bass: 0.8 } },
          { phase: 'build', barsDuration: 1, density: 0.65, energyLift: 0.2, layerGainMultipliers: { bass: 1 } },
          { phase: 'peak', barsDuration: 2, density: 1, energyLift: 0.4, layerGainMultipliers: { bass: 1.2 } },
        ],
      },
    });

    const rhythm: MusicLayerRhythmConfig = {
      division: 4,
      phase: 1,
      gate: 1,
      accentAmount: 0.4,
      accentPattern: [0, 4, 8, 12],
    };

    const projection = buildProjectionTimeline({ track, rhythm, totalSteps: 32 });

    expect(projection).toEqual([
      '0:intro:0:0:1:1.12',
      '1:intro:0:1:0:0.64',
      '2:intro:0:2:0:0.64',
      '3:intro:0:3:0:0.64',
      '4:intro:0:4:1:1.12',
      '5:intro:0:5:0:0.64',
      '6:intro:0:6:0:0.64',
      '7:intro:0:7:0:0.64',
      '8:intro:0:8:1:1.12',
      '9:intro:0:9:0:0.64',
      '10:intro:0:10:0:0.64',
      '11:intro:0:11:0:0.64',
      '12:intro:0:12:1:1.12',
      '13:intro:0:13:0:0.64',
      '14:intro:0:14:0:0.64',
      '15:intro:0:15:0:0.64',
      '16:build:1:0:1:1.40',
      '17:build:1:1:0:0.80',
      '18:build:1:2:0:0.80',
      '19:build:1:3:0:0.80',
      '20:build:1:4:0:1.40',
      '21:build:1:5:0:0.80',
      '22:build:1:6:0:0.80',
      '23:build:1:7:0:0.80',
      '24:build:1:8:0:1.40',
      '25:build:1:9:0:0.80',
      '26:build:1:10:0:0.80',
      '27:build:1:11:0:0.80',
      '28:build:1:12:1:1.40',
      '29:build:1:13:0:0.80',
      '30:build:1:14:0:0.80',
      '31:build:1:15:0:0.80',
    ]);
  });

  test('replays exact 7/8 timeline projection with odd-meter boundaries', () => {
    const track = createTrack({
      seed: 'fixture-7-8',
      mode: 'dorian',
      beatsPerBar: 7,
      beatUnit: 8,
      rootHz: 146.83,
      tempo: 96,
      harmonySteps: [
        { degree: 1, barsDuration: 1, quality: 'minor' },
        { degree: 6, barsDuration: 1, quality: 'major' },
        { degree: 2, barsDuration: 1, quality: 'minor' },
      ],
      arrangement: {
        loop: true,
        sections: [
          { phase: 'intro', barsDuration: 1, density: 1, energyLift: 0, layerGainMultipliers: { bass: 0.9 } },
          { phase: 'build', barsDuration: 1, density: 0.55, energyLift: 0.25, layerGainMultipliers: { bass: 1.1 } },
          { phase: 'release', barsDuration: 1, density: 0.8, energyLift: 0.1, layerGainMultipliers: { bass: 0.7 } },
        ],
      },
    });

    const rhythm: MusicLayerRhythmConfig = {
      division: 5,
      phase: 2,
      gate: 1,
      accentAmount: 0.3,
      accentPattern: [0, 3, 7, 10],
    };

    const projection = buildProjectionTimeline({ track, rhythm, totalSteps: 42 });

    expect(projection).toEqual([
      '0:intro:0:0:1:0.77',
      '1:intro:0:1:0:1.17',
      '2:intro:0:2:0:0.77',
      '3:intro:0:3:1:0.77',
      '4:intro:0:4:0:1.17',
      '5:intro:0:5:0:0.77',
      '6:intro:0:6:1:0.77',
      '7:intro:0:7:0:0.77',
      '8:intro:0:8:0:1.17',
      '9:intro:0:9:1:0.77',
      '10:intro:0:10:0:0.77',
      '11:intro:0:11:0:1.17',
      '12:intro:0:12:1:0.77',
      '13:intro:0:13:0:0.77',
      '14:build:1:0:1:0.94',
      '15:build:1:1:0:1.43',
      '16:build:1:2:0:0.94',
      '17:build:1:3:0:0.94',
      '18:build:1:4:0:1.43',
      '19:build:1:5:0:0.94',
      '20:build:1:6:0:0.94',
      '21:build:1:7:0:0.94',
      '22:build:1:8:0:1.43',
      '23:build:1:9:0:0.94',
      '24:build:1:10:0:0.94',
      '25:build:1:11:0:1.43',
      '26:build:1:12:1:0.94',
      '27:build:1:13:0:0.94',
      '28:release:2:0:1:0.59',
      '29:release:2:1:0:0.91',
      '30:release:2:2:0:0.59',
      '31:release:2:3:1:0.59',
      '32:release:2:4:0:0.91',
      '33:release:2:5:0:0.59',
      '34:release:2:6:1:0.59',
      '35:release:2:7:0:0.59',
      '36:release:2:8:0:0.91',
      '37:release:2:9:1:0.59',
      '38:release:2:10:0:0.59',
      '39:release:2:11:0:0.91',
      '40:release:2:12:1:0.59',
      '41:release:2:13:0:0.59',
    ]);
  });
});
