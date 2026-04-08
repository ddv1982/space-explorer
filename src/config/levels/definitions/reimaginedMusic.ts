import {
  createMusicProfile,
  layerExpressionPresets,
  noiseExpressionPresets,
  trackExpressionPresets,
} from '../musicHelpers';
import type {
  MusicArrangementConfig,
  MusicCompositionalDescriptorsConfig,
  MusicLayerRhythmConfig,
  MusicTimeSignatureConfig,
} from '../types';

type PatternFactory = (root: number) => Array<number | null>;

interface MusicSeed {
  cueName: string;
  bossCueName: string;
  mood: string;
  tempoFeel: string;
  style: string;
  intensity: string;
  shifts: string[];
  tempo: number;
  rootHz: number;
  patternRoot: number;
  bassPattern: PatternFactory;
  pulsePattern: PatternFactory;
  leadPattern: PatternFactory;
  bossBassPattern?: PatternFactory;
  bossPulsePattern?: PatternFactory;
  bossLeadPattern?: PatternFactory;
  masterGain?: number;
  bossTempo?: number;
  bossGain?: number;
  rhythm?: {
    stage?: {
      bass?: MusicLayerRhythmConfig;
      pulse?: MusicLayerRhythmConfig;
      lead?: MusicLayerRhythmConfig;
      noise?: MusicLayerRhythmConfig;
    };
    boss?: {
      bass?: MusicLayerRhythmConfig;
      pulse?: MusicLayerRhythmConfig;
      lead?: MusicLayerRhythmConfig;
      noise?: MusicLayerRhythmConfig;
    };
  };
  intent: {
    deterministicSeed: string;
    timeSignature: MusicTimeSignatureConfig;
    stage: MusicCompositionalDescriptorsConfig;
    boss: MusicCompositionalDescriptorsConfig;
  };
  arrangement?: {
    stage?: MusicArrangementConfig;
    boss?: MusicArrangementConfig;
  };
}

const DEFAULT_NOISE_PATTERN: Array<0 | 1> = [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0];

const DEFAULT_STAGE_LAYER_RHYTHM: Record<'bass' | 'pulse' | 'lead' | 'noise', MusicLayerRhythmConfig> = {
  bass: { division: 4, phase: 0, gate: 0.95, accentAmount: 0.08, accentPattern: [0, 8] },
  pulse: { division: 8, phase: 0, gate: 0.9, accentAmount: 0.1, accentPattern: [0, 4, 8, 12] },
  lead: { division: 8, phase: 0, gate: 0.78, accentAmount: 0.06, accentPattern: [4, 12] },
  noise: { division: 8, phase: 0, gate: 0.62, accentAmount: 0.05, accentPattern: [4, 12] },
};

const DEFAULT_BOSS_LAYER_RHYTHM: Record<'bass' | 'pulse' | 'lead' | 'noise', MusicLayerRhythmConfig> = {
  bass: { division: 4, phase: 0, gate: 1, accentAmount: 0.12, accentPattern: [0, 4, 8, 12] },
  pulse: { division: 8, phase: 0, gate: 0.94, accentAmount: 0.14, accentPattern: [0, 4, 8, 12] },
  lead: { division: 8, phase: 0, gate: 0.84, accentAmount: 0.1, accentPattern: [2, 6, 10, 14] },
  noise: { division: 8, phase: 0, gate: 0.72, accentAmount: 0.08, accentPattern: [0, 4, 8, 12] },
};

const DEFAULT_STAGE_ARRANGEMENT: MusicArrangementConfig = {
  loop: true,
  sections: [
    { phase: 'intro', barsDuration: 4, density: 0.74, energyLift: 0.16, layerGainMultipliers: { bass: 0.94, pulse: 0.86, lead: 0.8, noise: 0.72 } },
    { phase: 'build', barsDuration: 8, density: 0.82, energyLift: 0.24, layerGainMultipliers: { bass: 1, pulse: 0.98, lead: 0.92, noise: 0.86 } },
    { phase: 'peak', barsDuration: 4, density: 0.9, energyLift: 0.34, layerGainMultipliers: { bass: 1.06, pulse: 1.12, lead: 1.04, noise: 0.94 } },
    { phase: 'release', barsDuration: 4, density: 0.78, energyLift: 0.2, layerGainMultipliers: { bass: 0.98, pulse: 0.9, lead: 0.84, noise: 0.76 } },
  ],
};

const DEFAULT_BOSS_ARRANGEMENT: MusicArrangementConfig = {
  loop: true,
  sections: [
    { phase: 'intro', barsDuration: 2, density: 0.84, energyLift: 0.26, layerGainMultipliers: { bass: 1.1, pulse: 1.06, lead: 1.02, noise: 0.94 } },
    { phase: 'build', barsDuration: 4, density: 0.92, energyLift: 0.34, layerGainMultipliers: { bass: 1.16, pulse: 1.18, lead: 1.12, noise: 1 } },
    { phase: 'peak', barsDuration: 4, density: 0.98, energyLift: 0.44, layerGainMultipliers: { bass: 1.22, pulse: 1.24, lead: 1.18, noise: 1.04 } },
    { phase: 'release', barsDuration: 2, density: 0.86, energyLift: 0.3, layerGainMultipliers: { bass: 1.14, pulse: 1.08, lead: 1, noise: 0.92 } },
  ],
};

function cloneArrangement(config: MusicArrangementConfig): MusicArrangementConfig {
  return {
    loop: config.loop,
    sections: config.sections.map((section) => ({
      ...section,
      layerGainMultipliers: section.layerGainMultipliers ? { ...section.layerGainMultipliers } : undefined,
    })),
  };
}

function mergeArrangement(
  defaults: MusicArrangementConfig,
  override?: MusicArrangementConfig
): MusicArrangementConfig {
  if (!override) {
    return cloneArrangement(defaults);
  }

  return {
    ...cloneArrangement(defaults),
    ...override,
    sections: (override.sections ?? defaults.sections).map((section) => ({
      ...section,
      layerGainMultipliers: section.layerGainMultipliers ? { ...section.layerGainMultipliers } : undefined,
    })),
  };
}

export function createSignatureMusic(seed: MusicSeed) {
  const stageDescriptors: MusicCompositionalDescriptorsConfig = {
    ...seed.intent.stage,
    arrangement: mergeArrangement(DEFAULT_STAGE_ARRANGEMENT, seed.arrangement?.stage),
  };

  const bossDescriptors: MusicCompositionalDescriptorsConfig = {
    ...seed.intent.boss,
    arrangement: mergeArrangement(DEFAULT_BOSS_ARRANGEMENT, seed.arrangement?.boss),
  };

  return createMusicProfile(
    {
      cueName: seed.cueName,
      mood: seed.mood,
      tempoFeel: seed.tempoFeel,
      musicalStyle: seed.style,
      intensity: seed.intensity,
      shiftMoments: seed.shifts,
      bossCueName: seed.bossCueName,
    },
    {
      tempo: seed.tempo,
      rootHz: seed.rootHz,
      stepsPerBeat: 4,
      masterGain: seed.masterGain ?? 0.9,
      intent: {
        deterministicSeed: `${seed.intent.deterministicSeed}:stage`,
        timeSignature: seed.intent.timeSignature,
        descriptors: stageDescriptors,
      },
      expression: {
        ...trackExpressionPresets.expansiveSpace,
        ...trackExpressionPresets.gentleFlow,
        accent: { amount: 0.11, patternBias: 0.24, emphasisSteps: [0, 4, 8, 12] },
      },
      bass: {
        waveform: 'triangle',
        pattern: seed.bassPattern(seed.patternRoot),
        gain: 0.16,
        durationSteps: 3,
        rhythm: { ...DEFAULT_STAGE_LAYER_RHYTHM.bass, ...seed.rhythm?.stage?.bass },
        filterHz: 980,
        expression: {
          ...layerExpressionPresets.longPad,
          ...layerExpressionPresets.wideSpace,
          accent: { amount: 0.08, patternBias: 0.14, emphasisSteps: [0, 8] },
        },
      },
      pulse: {
        waveform: 'triangle',
        pattern: seed.pulsePattern(seed.patternRoot),
        gain: 0.04,
        durationSteps: 1,
        rhythm: { ...DEFAULT_STAGE_LAYER_RHYTHM.pulse, ...seed.rhythm?.stage?.pulse },
        octaveShift: 1,
        filterHz: 1750,
        expression: {
          ...layerExpressionPresets.softPluck,
          ...layerExpressionPresets.orbit,
          accent: { amount: 0.14, patternBias: 0.22, emphasisSteps: [0, 3, 6, 9, 12, 15] },
        },
      },
      lead: {
        waveform: 'sine',
        pattern: seed.leadPattern(seed.patternRoot + 12),
        gain: 0.032,
        durationSteps: 2,
        rhythm: { ...DEFAULT_STAGE_LAYER_RHYTHM.lead, ...seed.rhythm?.stage?.lead },
        octaveShift: 0,
        filterHz: 1400,
        expression: {
          ...layerExpressionPresets.slowSwell,
          ...layerExpressionPresets.gentleVibrato,
        },
      },
      noise: {
        pattern: DEFAULT_NOISE_PATTERN,
        gain: 0.011,
        filterHz: 1900,
        durationSteps: 1,
        rhythm: { ...DEFAULT_STAGE_LAYER_RHYTHM.noise, ...seed.rhythm?.stage?.noise },
        expression: {
          ...noiseExpressionPresets.shimmer,
          accent: { amount: 0.09, patternBias: 0.16, emphasisSteps: [2, 6, 10, 14] },
        },
      },
    },
    {
      tempo: seed.bossTempo ?? seed.tempo + 10,
      masterGain: seed.bossGain ?? Math.min(1.08, (seed.masterGain ?? 0.9) + 0.14),
      intent: {
        deterministicSeed: `${seed.intent.deterministicSeed}:boss`,
        timeSignature: seed.intent.timeSignature,
        descriptors: bossDescriptors,
      },
      expression: {
        ...trackExpressionPresets.chase,
        accent: { amount: 0.22, patternBias: 0.38, emphasisSteps: [0, 4, 8, 12] },
      },
      bass: {
        waveform: 'square',
        pattern: (seed.bossBassPattern ?? seed.bassPattern)(seed.patternRoot),
        gain: 0.2,
        rhythm: { ...DEFAULT_BOSS_LAYER_RHYTHM.bass, ...seed.rhythm?.boss?.bass },
        filterHz: 880,
      },
      pulse: {
        waveform: 'sawtooth',
        pattern: (seed.bossPulsePattern ?? seed.pulsePattern)(seed.patternRoot),
        gain: 0.052,
        rhythm: { ...DEFAULT_BOSS_LAYER_RHYTHM.pulse, ...seed.rhythm?.boss?.pulse },
        filterHz: 2000,
      },
      lead: {
        waveform: 'sawtooth',
        pattern: (seed.bossLeadPattern ?? seed.leadPattern)(seed.patternRoot + 12),
        gain: 0.044,
        rhythm: { ...DEFAULT_BOSS_LAYER_RHYTHM.lead, ...seed.rhythm?.boss?.lead },
        filterHz: 1650,
      },
      noise: {
        gain: 0.02,
        filterHz: 2100,
        rhythm: { ...DEFAULT_BOSS_LAYER_RHYTHM.noise, ...seed.rhythm?.boss?.noise },
        expression: {
          ...noiseExpressionPresets.rumble,
          accent: { amount: 0.14, patternBias: 0.3, emphasisSteps: [0, 4, 8, 12] },
        },
      },
    }
  );
}
