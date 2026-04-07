import {
  createMusicProfile,
  layerExpressionPresets,
  noiseExpressionPresets,
  trackExpressionPresets,
} from '../musicHelpers';

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
}

const DEFAULT_NOISE_PATTERN: Array<0 | 1> = [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0];

export function createSignatureMusic(seed: MusicSeed) {
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
        expression: {
          ...noiseExpressionPresets.shimmer,
          accent: { amount: 0.09, patternBias: 0.16, emphasisSteps: [2, 6, 10, 14] },
        },
      },
    },
    {
      tempo: seed.bossTempo ?? seed.tempo + 10,
      masterGain: seed.bossGain ?? Math.min(1.08, (seed.masterGain ?? 0.9) + 0.14),
      expression: {
        ...trackExpressionPresets.chase,
        accent: { amount: 0.22, patternBias: 0.38, emphasisSteps: [0, 4, 8, 12] },
      },
      bass: {
        waveform: 'square',
        pattern: (seed.bossBassPattern ?? seed.bassPattern)(seed.patternRoot),
        gain: 0.2,
        filterHz: 880,
      },
      pulse: {
        waveform: 'sawtooth',
        pattern: (seed.bossPulsePattern ?? seed.pulsePattern)(seed.patternRoot),
        gain: 0.052,
        filterHz: 2000,
      },
      lead: {
        waveform: 'sawtooth',
        pattern: (seed.bossLeadPattern ?? seed.leadPattern)(seed.patternRoot + 12),
        gain: 0.044,
        filterHz: 1650,
      },
      noise: {
        gain: 0.02,
        filterHz: 2100,
        expression: {
          ...noiseExpressionPresets.rumble,
          accent: { amount: 0.14, patternBias: 0.3, emphasisSteps: [0, 4, 8, 12] },
        },
      },
    }
  );
}
