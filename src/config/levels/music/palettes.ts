import { layerExpressionPresets, noiseExpressionPresets, trackExpressionPresets } from './expressionPresets';
import type {
  MusicDrumsConfig,
  MusicPadConfig,
  MusicSpaceConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicTrackExpressionConfig,
  ProceduralNoiseLayerConfig,
} from './types';

/** Everything about a tone layer except its notes and rhythm, which each level supplies. */
type LayerVoice = Omit<ProceduralMusicLayerConfig, 'pattern' | 'rhythm'>;
type NoiseVoice = Omit<ProceduralNoiseLayerConfig, 'pattern' | 'rhythm'>;

/** One instrument set: how a level's patterns are voiced, and the room they play in. */
export interface PaletteVoices {
  expression: ProceduralMusicTrackExpressionConfig;
  bass: LayerVoice;
  pulse: LayerVoice;
  lead: LayerVoice;
  noise: NoiseVoice;
  pad?: MusicPadConfig;
  drums?: MusicDrumsConfig;
  space: MusicSpaceConfig;
}

interface MusicPalette {
  stage: PaletteVoices;
  boss: PaletteVoices;
}

// Drum patterns: one velocity per sixteenth step.
const KICK = {
  four: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  half: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0],
  broken: [1, 0, 0, 0.6, 0, 0, 1, 0, 0, 0, 0.8, 0, 0, 0.6, 0, 0],
  drive: [1, 0, 0, 0, 1, 0, 0, 0.5, 1, 0, 0, 0, 1, 0, 0.6, 0],
} as const;
const SNARE = {
  back: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  half: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  march: [0, 0, 0, 0, 1, 0, 0, 0.4, 0, 0, 0, 0, 1, 0, 0.4, 0.5],
  none: [],
} as const;
const HAT = {
  eighths: [0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0],
  sixteenths: [0.8, 0.3, 0.5, 0.3, 0.8, 0.3, 0.5, 0.3, 0.8, 0.3, 0.5, 0.3, 0.8, 0.3, 0.5, 0.4],
  off: [0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0],
  swing: [0.8, 0, 0, 0.5, 0.7, 0, 0, 0.5, 0.8, 0, 0, 0.5, 0.7, 0, 0.4, 0.5],
} as const;

const BASE_STAGE: PaletteVoices = {
  expression: {
    ...trackExpressionPresets.expansiveSpace,
    ...trackExpressionPresets.gentleFlow,
    accent: { amount: 0.11, patternBias: 0.24, emphasisSteps: [0, 4, 8, 12] },
  },
  bass: {
    waveform: 'triangle',
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
    gain: 0.05,
    durationSteps: 1,
    octaveShift: 1,
    filterHz: 1750,
    enterAt: 0.15,
    expression: {
      ...layerExpressionPresets.softPluck,
      ...layerExpressionPresets.orbit,
      accent: { amount: 0.14, patternBias: 0.22, emphasisSteps: [0, 3, 6, 9, 12, 15] },
    },
  },
  lead: {
    waveform: 'sine',
    gain: 0.042,
    durationSteps: 2,
    octaveShift: 0,
    filterHz: 1400,
    enterAt: 0.4,
    expression: { ...layerExpressionPresets.slowSwell, ...layerExpressionPresets.gentleVibrato },
  },
  noise: {
    gain: 0.011,
    filterHz: 1900,
    durationSteps: 1,
    enterAt: 0.3,
    expression: {
      ...noiseExpressionPresets.shimmer,
      accent: { amount: 0.09, patternBias: 0.16, emphasisSteps: [2, 6, 10, 14] },
    },
  },
  pad: { waveform: 'triangle', gain: 0.012, filterHz: 1500 },
  space: { reverb: 0.4, delay: 0.2 },
};

const BASE_BOSS: PaletteVoices = {
  expression: {
    ...trackExpressionPresets.chase,
    accent: { amount: 0.22, patternBias: 0.38, emphasisSteps: [0, 4, 8, 12] },
  },
  bass: { ...BASE_STAGE.bass, waveform: 'square', gain: 0.15, filterHz: 880 },
  pulse: { ...BASE_STAGE.pulse, waveform: 'sawtooth', gain: 0.052, filterHz: 2000, enterAt: 0 },
  lead: { ...BASE_STAGE.lead, waveform: 'sawtooth', gain: 0.044, filterHz: 1650, enterAt: 0.2 },
  noise: {
    ...BASE_STAGE.noise,
    gain: 0.02,
    filterHz: 2100,
    enterAt: 0,
    expression: {
      ...noiseExpressionPresets.rumble,
      accent: { amount: 0.14, patternBias: 0.3, emphasisSteps: [0, 4, 8, 12] },
    },
  },
  pad: { waveform: 'sawtooth', gain: 0.01, filterHz: 1200 },
  drums: { kit: 'heavy', gain: 0.15, kick: KICK.drive, snare: SNARE.back, hat: HAT.sixteenths },
  space: { reverb: 0.26, delay: 0.14 },
};

function voices(base: PaletteVoices, changes: Partial<PaletteVoices>): PaletteVoices {
  return { ...base, ...changes };
}

/**
 * Instrument sets. Levels keep their own notes, key, tempo and meter; the palette decides how those
 * notes sound, so each sector has a timbre of its own.
 */
export const MUSIC_PALETTES = {
  /** Bells and soft pulses in a wide room: openings and calm water. */
  glass: {
    stage: voices(BASE_STAGE, {
      drums: { kit: 'soft', gain: 0.1, kick: KICK.half, snare: SNARE.none, hat: HAT.off },
      space: { reverb: 0.5, delay: 0.26 },
    }),
    boss: voices(BASE_BOSS, {
      pulse: { ...BASE_BOSS.pulse, waveform: 'triangle', gain: 0.06 },
      drums: { kit: 'tight', gain: 0.13, kick: KICK.four, snare: SNARE.back, hat: HAT.eighths },
    }),
  },
  /** Sine arps trailing long echoes over a rolling soft kick: tides. */
  tide: {
    stage: voices(BASE_STAGE, {
      pulse: { ...BASE_STAGE.pulse, waveform: 'sine', gain: 0.05, filterHz: 2400 },
      lead: { ...BASE_STAGE.lead, waveform: 'triangle', gain: 0.036 },
      pad: { waveform: 'sine', gain: 0.02, filterHz: 1800 },
      drums: { kit: 'soft', gain: 0.11, kick: KICK.broken, snare: SNARE.none, hat: HAT.eighths },
      space: { reverb: 0.42, delay: 0.32 },
    }),
    boss: voices(BASE_BOSS, {
      pulse: { ...BASE_BOSS.pulse, waveform: 'square', gain: 0.04 },
      drums: { kit: 'tight', gain: 0.14, kick: KICK.broken, snare: SNARE.back, hat: HAT.sixteenths },
      space: { reverb: 0.3, delay: 0.24 },
    }),
  },
  /** Plucked squares over a filtered saw bass with a tight kit: chases. */
  chase: {
    stage: voices(BASE_STAGE, {
      bass: { ...BASE_STAGE.bass, waveform: 'sawtooth', gain: 0.13, filterHz: 620 },
      pulse: {
        ...BASE_STAGE.pulse,
        waveform: 'square',
        gain: 0.03,
        filterHz: 2200,
        expression: { ...layerExpressionPresets.pluck, ...layerExpressionPresets.orbit },
      },
      lead: { ...BASE_STAGE.lead, waveform: 'triangle', gain: 0.036 },
      pad: { waveform: 'sawtooth', gain: 0.008, filterHz: 1100 },
      drums: { kit: 'tight', gain: 0.12, kick: KICK.broken, snare: SNARE.back, hat: HAT.eighths },
      space: { reverb: 0.3, delay: 0.22 },
    }),
    boss: voices(BASE_BOSS, {
      drums: { kit: 'heavy', gain: 0.15, kick: KICK.drive, snare: SNARE.back, hat: HAT.sixteenths },
    }),
  },
  /** Slow swelling voices in a long hall with a distant drum: cathedral dread. */
  choir: {
    stage: voices(BASE_STAGE, {
      pulse: { ...BASE_STAGE.pulse, waveform: 'sine', gain: 0.045, filterHz: 1500 },
      lead: {
        ...BASE_STAGE.lead,
        waveform: 'triangle',
        gain: 0.038,
        enterAt: 0.25,
        expression: { ...layerExpressionPresets.swell, ...layerExpressionPresets.vibrato },
      },
      pad: { waveform: 'triangle', gain: 0.02, filterHz: 1300 },
      drums: { kit: 'soft', gain: 0.11, kick: KICK.half, snare: SNARE.half, hat: [] },
      space: { reverb: 0.62, delay: 0.18 },
    }),
    boss: voices(BASE_BOSS, {
      lead: { ...BASE_BOSS.lead, waveform: 'triangle', gain: 0.05 },
      pad: { waveform: 'sawtooth', gain: 0.014, filterHz: 1000 },
      drums: { kit: 'heavy', gain: 0.15, kick: KICK.half, snare: SNARE.half, hat: HAT.eighths },
      space: { reverb: 0.45, delay: 0.14 },
    }),
  },
  /** Warm saw pad and plucks over a swung hat: smouldering storms. */
  ember: {
    stage: voices(BASE_STAGE, {
      bass: { ...BASE_STAGE.bass, waveform: 'sawtooth', gain: 0.12, filterHz: 540 },
      pulse: { ...BASE_STAGE.pulse, gain: 0.046 },
      pad: { waveform: 'sawtooth', gain: 0.011, filterHz: 900 },
      drums: { kit: 'soft', gain: 0.12, kick: KICK.four, snare: SNARE.half, hat: HAT.swing },
      space: { reverb: 0.38, delay: 0.24 },
    }),
    boss: voices(BASE_BOSS, {
      drums: { kit: 'tight', gain: 0.15, kick: KICK.drive, snare: SNARE.back, hat: HAT.swing },
    }),
  },
  /** Square bass and pulse with a dry marching kit: clockwork and siege. */
  machine: {
    stage: voices(BASE_STAGE, {
      bass: { ...BASE_STAGE.bass, waveform: 'square', gain: 0.1, filterHz: 700 },
      pulse: {
        ...BASE_STAGE.pulse,
        waveform: 'square',
        gain: 0.028,
        filterHz: 1900,
        expression: { ...layerExpressionPresets.pluck, ...layerExpressionPresets.drift },
      },
      lead: { ...BASE_STAGE.lead, waveform: 'triangle', gain: 0.036 },
      pad: { waveform: 'square', gain: 0.006, filterHz: 800 },
      drums: { kit: 'tight', gain: 0.13, kick: KICK.four, snare: SNARE.march, hat: HAT.sixteenths },
      space: { reverb: 0.2, delay: 0.16 },
    }),
    boss: voices(BASE_BOSS, {
      drums: { kit: 'heavy', gain: 0.15, kick: KICK.four, snare: SNARE.march, hat: HAT.sixteenths },
      space: { reverb: 0.18, delay: 0.12 },
    }),
  },
  /** Driving saws and busy hats: swarms. */
  surge: {
    stage: voices(BASE_STAGE, {
      bass: { ...BASE_STAGE.bass, waveform: 'sawtooth', gain: 0.13, filterHz: 680 },
      pulse: { ...BASE_STAGE.pulse, waveform: 'sawtooth', gain: 0.03, filterHz: 2100 },
      lead: { ...BASE_STAGE.lead, waveform: 'square', gain: 0.026, filterHz: 1700, enterAt: 0.35 },
      pad: { waveform: 'sawtooth', gain: 0.01, filterHz: 1000 },
      drums: { kit: 'tight', gain: 0.13, kick: KICK.drive, snare: SNARE.back, hat: HAT.sixteenths },
      space: { reverb: 0.28, delay: 0.18 },
    }),
    boss: voices(BASE_BOSS, {
      pad: { waveform: 'sawtooth', gain: 0.014, filterHz: 1300 },
      drums: { kit: 'heavy', gain: 0.16, kick: KICK.four, snare: SNARE.back, hat: HAT.sixteenths },
    }),
  },
  /** The heaviest set, with a full kit from the start: the last sector. */
  finale: {
    stage: voices(BASE_STAGE, {
      bass: { ...BASE_STAGE.bass, waveform: 'square', gain: 0.11, filterHz: 760 },
      pulse: { ...BASE_STAGE.pulse, waveform: 'sawtooth', gain: 0.034, filterHz: 2300, enterAt: 0 },
      lead: { ...BASE_STAGE.lead, waveform: 'sawtooth', gain: 0.03, filterHz: 1800, enterAt: 0.3 },
      pad: { waveform: 'sawtooth', gain: 0.014, filterHz: 1200 },
      drums: { kit: 'heavy', gain: 0.13, kick: KICK.four, snare: SNARE.half, hat: HAT.eighths },
      space: { reverb: 0.36, delay: 0.16 },
    }),
    boss: voices(BASE_BOSS, {
      lead: { ...BASE_BOSS.lead, waveform: 'square', gain: 0.04 },
      pad: { waveform: 'sawtooth', gain: 0.016, filterHz: 1400 },
      drums: { kit: 'heavy', gain: 0.17, kick: KICK.drive, snare: SNARE.march, hat: HAT.sixteenths },
    }),
  },
} as const satisfies Record<string, MusicPalette>;

export type MusicPaletteName = keyof typeof MUSIC_PALETTES;
