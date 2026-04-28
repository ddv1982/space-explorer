import type { MusicHarmonicChordStepConfig, ProceduralMusicTrackConfig } from '@/config/LevelsConfig';

const MODE_DEGREE_OFFSETS: Record<string, readonly number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'phrygian-dominant': [0, 1, 4, 5, 7, 8, 10],
  ultralocrian: [0, 1, 3, 4, 6, 8, 10],
};

const FALLBACK_MODE: readonly number[] = MODE_DEGREE_OFFSETS.aeolian;
const FALLBACK_STEP: MusicHarmonicChordStepConfig = {
  degree: 1,
  barsDuration: 1,
  quality: 'minor',
};

interface HarmonicContext {
  chordIndex: number;
  cycleBarIndex: number;
  rootSemitoneOffset: number;
  harmonicRootHz: number;
  chord: MusicHarmonicChordStepConfig;
}

function toPositiveInteger(value: number, fallback = 1): number {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : fallback;
}

function normalizeMode(mode: string): readonly number[] {
  return MODE_DEGREE_OFFSETS[mode.toLowerCase()] ?? FALLBACK_MODE;
}

function normalizeProgression(track: ProceduralMusicTrackConfig): MusicHarmonicChordStepConfig[] {
  const steps = track.intent.descriptors.harmony.steps
    .filter((step) => step && Number.isFinite(step.degree))
    .map((step) => ({
      ...step,
      degree: toPositiveInteger(step.degree, 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      barsDuration: toPositiveInteger(step.barsDuration, 1),
    }));

  return steps.length > 0 ? steps : [FALLBACK_STEP];
}

function toProgressionBarIndex(steps: MusicHarmonicChordStepConfig[], barIndex: number): number {
  const cycleBars = steps.reduce((total, step) => total + toPositiveInteger(step.barsDuration, 1), 0);
  const divisor = Math.max(1, cycleBars);
  return ((barIndex % divisor) + divisor) % divisor;
}

function resolveChordIndex(steps: MusicHarmonicChordStepConfig[], cycleBarIndex: number): number {
  let accumulatedBars = 0;

  for (let index = 0; index < steps.length; index++) {
    accumulatedBars += toPositiveInteger(steps[index].barsDuration, 1);
    if (cycleBarIndex < accumulatedBars) {
      return index;
    }
  }

  return steps.length - 1;
}

function resolveRootSemitoneOffset(mode: readonly number[], chord: MusicHarmonicChordStepConfig): number {
  const degreeIndex = ((toPositiveInteger(chord.degree, 1) - 1) % 7 + 7) % 7;
  const octaveShift = chord.octaveShift ?? 0;
  return mode[degreeIndex] + octaveShift * 12;
}

export function resolveHarmonicContext(track: ProceduralMusicTrackConfig, barIndex: number): HarmonicContext {
  const steps = normalizeProgression(track);
  const mode = normalizeMode(track.intent.descriptors.mode);
  const cycleBarIndex = toProgressionBarIndex(steps, barIndex);
  const chordIndex = resolveChordIndex(steps, cycleBarIndex);
  const chord = steps[chordIndex];
  const rootSemitoneOffset = resolveRootSemitoneOffset(mode, chord);

  return {
    chordIndex,
    cycleBarIndex,
    rootSemitoneOffset,
    harmonicRootHz: track.rootHz * Math.pow(2, rootSemitoneOffset / 12),
    chord,
  };
}
