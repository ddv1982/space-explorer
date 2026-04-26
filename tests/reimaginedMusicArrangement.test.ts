import { describe, expect, test } from 'bun:test';

import type {
  MusicArrangementConfig,
  MusicCompositionalDescriptorsConfig,
  MusicLayerRhythmConfig,
  MusicTimeSignatureConfig,
} from '../src/config/LevelsConfig';
import { createSignatureMusic } from '../src/config/levels/definitions/reimaginedMusic';

const patternFactory = (root: number): Array<number | null> => [root, null, root + 7, null];

const STAGE_DESCRIPTORS: MusicCompositionalDescriptorsConfig = {
  mode: 'minor',
  chordProgressionTags: ['i', 'VI', 'III', 'VII'],
  rhythmicFeel: 'syncopated',
  energyProfile: { baseline: 0.4, peak: 0.8, curve: 'build' },
  harmony: {
    steps: [
      { degree: 1, barsDuration: 1, quality: 'minor' },
      { degree: 6, barsDuration: 1, quality: 'major' },
    ],
  },
};

const BOSS_DESCRIPTORS: MusicCompositionalDescriptorsConfig = {
  mode: 'phrygian',
  chordProgressionTags: ['i', 'bII', 'v'],
  rhythmicFeel: 'driving',
  energyProfile: { baseline: 0.6, peak: 0.95, curve: 'surge' },
  harmony: {
    steps: [
      { degree: 1, barsDuration: 1, quality: 'minor' },
      { degree: 2, barsDuration: 1, quality: 'major' },
    ],
  },
};

const BASE_TIME_SIGNATURE: MusicTimeSignatureConfig = {
  beatsPerBar: 4,
  beatUnit: 4,
};

const BASE_STAGE_RHYTHM: MusicLayerRhythmConfig = {
  division: 4,
  phase: 0,
  gate: 0.9,
};

function createSeed(overrides: {
  arrangement?: {
    stage?: MusicArrangementConfig;
    boss?: MusicArrangementConfig;
  };
} = {}) {
  return {
    cueName: 'test cue',
    bossCueName: 'test boss cue',
    mood: 'tense',
    tempoFeel: 'steady',
    style: 'synthwave',
    intensity: 'medium',
    shifts: ['spawn'],
    tempo: 126,
    rootHz: 220,
    patternRoot: 0,
    bassPattern: patternFactory,
    pulsePattern: patternFactory,
    leadPattern: patternFactory,
    rhythm: {
      stage: { bass: BASE_STAGE_RHYTHM },
      boss: { bass: BASE_STAGE_RHYTHM },
    },
    intent: {
      deterministicSeed: 'regression-test',
      timeSignature: BASE_TIME_SIGNATURE,
      stage: STAGE_DESCRIPTORS,
      boss: BOSS_DESCRIPTORS,
    },
    ...overrides,
  };
}

describe('createSignatureMusic arrangement regression coverage', () => {
  test('uses stage arrangement override values', () => {
    const stageOverride: MusicArrangementConfig = {
      loop: false,
      sections: [
        {
          phase: 'intro',
          barsDuration: 1,
          density: 0.33,
          energyLift: 0.11,
          layerGainMultipliers: { bass: 0.5 },
        },
      ],
    };

    const music = createSignatureMusic(createSeed({ arrangement: { stage: stageOverride } }));

    expect(music.stage.intent.descriptors.arrangement).toEqual(stageOverride);
  });

  test('clones stage override nested layerGainMultipliers', () => {
    const stageOverride: MusicArrangementConfig = {
      loop: true,
      sections: [
        {
          phase: 'build',
          barsDuration: 2,
          density: 0.61,
          energyLift: 0.22,
          layerGainMultipliers: { bass: 0.66, lead: 0.88 },
        },
      ],
    };

    const music = createSignatureMusic(createSeed({ arrangement: { stage: stageOverride } }));

    stageOverride.sections[0].layerGainMultipliers!.bass = 0.01;

    expect(music.stage.intent.descriptors.arrangement?.sections[0].layerGainMultipliers?.bass).toBe(0.66);
  });

  test('returns fresh default arrangements on each call', () => {
    const first = createSignatureMusic(createSeed());
    const second = createSignatureMusic(createSeed());

    first.stage.intent.descriptors.arrangement!.sections[0].layerGainMultipliers!.bass = 0;

    expect(second.stage.intent.descriptors.arrangement?.sections[0].layerGainMultipliers?.bass).toBe(0.94);
  });

  test('clones boss override nested layerGainMultipliers', () => {
    const bossOverride: MusicArrangementConfig = {
      loop: true,
      sections: [
        {
          phase: 'peak',
          barsDuration: 3,
          density: 0.93,
          energyLift: 0.4,
          layerGainMultipliers: { pulse: 1.4, noise: 0.9 },
        },
      ],
    };

    const music = createSignatureMusic(createSeed({ arrangement: { boss: bossOverride } }));

    bossOverride.sections[0].layerGainMultipliers!.pulse = 0.2;

    expect(music.boss.intent.descriptors.arrangement?.sections[0].layerGainMultipliers?.pulse).toBe(1.4);
  });
});
