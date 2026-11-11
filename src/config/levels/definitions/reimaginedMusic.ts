import { MUSIC_PALETTES, type MusicPaletteName, type PaletteVoices } from '../music/palettes';
import type {
  LevelMusicConfig,
  MusicArrangementConfig,
  MusicCompositionalDescriptorsConfig,
  MusicLayerRhythmConfig,
  MusicTimeSignatureConfig,
  ProceduralMusicTrackConfig,
} from '../types';

type PatternFactory = (root: number) => Array<number | null>;

type LayerRhythms = Partial<Record<'bass' | 'pulse' | 'lead' | 'noise', MusicLayerRhythmConfig>>;

/** A level's score: its notes, key, tempo and meter, voiced by one of the shared palettes. */
interface MusicSeed {
  palette: MusicPaletteName;
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
  rhythm?: { stage?: LayerRhythms; boss?: LayerRhythms };
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
    {
      phase: 'intro',
      barsDuration: 4,
      density: 0.74,
      energyLift: 0.16,
      layerGainMultipliers: { bass: 0.94, pulse: 0.86, lead: 0.8, noise: 0.72 },
    },
    {
      phase: 'build',
      barsDuration: 8,
      density: 0.82,
      energyLift: 0.24,
      layerGainMultipliers: { bass: 1, pulse: 0.98, lead: 0.92, noise: 0.86 },
    },
    {
      phase: 'peak',
      barsDuration: 4,
      density: 0.9,
      energyLift: 0.34,
      layerGainMultipliers: { bass: 1.06, pulse: 1.12, lead: 1.04, noise: 0.94 },
    },
    {
      phase: 'release',
      barsDuration: 4,
      density: 0.78,
      energyLift: 0.2,
      layerGainMultipliers: { bass: 0.98, pulse: 0.9, lead: 0.84, noise: 0.76 },
    },
  ],
};

const DEFAULT_BOSS_ARRANGEMENT: MusicArrangementConfig = {
  loop: true,
  sections: [
    {
      phase: 'intro',
      barsDuration: 2,
      density: 0.84,
      energyLift: 0.26,
      layerGainMultipliers: { bass: 1.1, pulse: 1.06, lead: 1.02, noise: 0.94 },
    },
    {
      phase: 'build',
      barsDuration: 4,
      density: 0.92,
      energyLift: 0.34,
      layerGainMultipliers: { bass: 1.16, pulse: 1.18, lead: 1.12, noise: 1 },
    },
    {
      phase: 'peak',
      barsDuration: 4,
      density: 0.98,
      energyLift: 0.44,
      layerGainMultipliers: { bass: 1.22, pulse: 1.24, lead: 1.18, noise: 1.04 },
    },
    {
      phase: 'release',
      barsDuration: 2,
      density: 0.86,
      energyLift: 0.3,
      layerGainMultipliers: { bass: 1.14, pulse: 1.08, lead: 1, noise: 0.92 },
    },
  ],
};

interface TrackParts {
  seed: MusicSeed;
  voices: PaletteVoices;
  seedSuffix: string;
  tempo: number;
  masterGain: number;
  descriptors: MusicCompositionalDescriptorsConfig;
  rhythmDefaults: Record<'bass' | 'pulse' | 'lead' | 'noise', MusicLayerRhythmConfig>;
  rhythm: LayerRhythms | undefined;
  patterns: { bass: PatternFactory; pulse: PatternFactory; lead: PatternFactory };
}

function buildTrack(parts: TrackParts): ProceduralMusicTrackConfig {
  const { seed, voices, rhythmDefaults, rhythm, patterns } = parts;
  return {
    tempo: parts.tempo,
    rootHz: seed.rootHz,
    stepsPerBeat: 4,
    masterGain: parts.masterGain,
    intent: {
      deterministicSeed: `${seed.intent.deterministicSeed}:${parts.seedSuffix}`,
      timeSignature: seed.intent.timeSignature,
      descriptors: parts.descriptors,
    },
    expression: voices.expression,
    bass: {
      ...voices.bass,
      pattern: patterns.bass(seed.patternRoot),
      rhythm: { ...rhythmDefaults.bass, ...rhythm?.bass },
    },
    pulse: {
      ...voices.pulse,
      pattern: patterns.pulse(seed.patternRoot),
      rhythm: { ...rhythmDefaults.pulse, ...rhythm?.pulse },
    },
    lead: {
      ...voices.lead,
      pattern: patterns.lead(seed.patternRoot + 12),
      rhythm: { ...rhythmDefaults.lead, ...rhythm?.lead },
    },
    noise: {
      ...voices.noise,
      pattern: DEFAULT_NOISE_PATTERN,
      rhythm: { ...rhythmDefaults.noise, ...rhythm?.noise },
    },
    pad: voices.pad,
    drums: voices.drums,
    space: voices.space,
  };
}

export function createSignatureMusic(seed: MusicSeed): LevelMusicConfig {
  const palette = MUSIC_PALETTES[seed.palette];
  const stageGain = seed.masterGain ?? 0.9;

  return {
    stage: buildTrack({
      seed,
      voices: palette.stage,
      seedSuffix: 'stage',
      tempo: seed.tempo,
      masterGain: stageGain,
      descriptors: {
        ...seed.intent.stage,
        arrangement: seed.arrangement?.stage ?? DEFAULT_STAGE_ARRANGEMENT,
      },
      rhythmDefaults: DEFAULT_STAGE_LAYER_RHYTHM,
      rhythm: seed.rhythm?.stage,
      patterns: { bass: seed.bassPattern, pulse: seed.pulsePattern, lead: seed.leadPattern },
    }),
    boss: buildTrack({
      seed,
      voices: palette.boss,
      seedSuffix: 'boss',
      tempo: seed.bossTempo ?? seed.tempo + 10,
      masterGain: seed.bossGain ?? Math.min(1.08, stageGain + 0.14),
      descriptors: {
        ...seed.intent.boss,
        arrangement: seed.arrangement?.boss ?? DEFAULT_BOSS_ARRANGEMENT,
      },
      rhythmDefaults: DEFAULT_BOSS_LAYER_RHYTHM,
      rhythm: seed.rhythm?.boss,
      patterns: {
        bass: seed.bossBassPattern ?? seed.bassPattern,
        pulse: seed.bossPulsePattern ?? seed.pulsePattern,
        lead: seed.bossLeadPattern ?? seed.leadPattern,
      },
    }),
  };
}
