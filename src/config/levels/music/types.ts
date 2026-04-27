export type MusicWaveform = OscillatorType;
export type MusicStep = number | null;

export type MusicEnvelopeCurve = 'linear' | 'soft' | 'hard';

export interface MusicEnvelopeShapeConfig {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  curve?: MusicEnvelopeCurve;
}

export interface MusicStereoMotionConfig {
  pan?: number;
  width?: number;
  rateHz?: number;
  phaseOffset?: number;
}

export type MusicModulationTarget = 'gain' | 'filter' | 'pitch' | 'pan';

export interface MusicModulationConfig {
  target?: MusicModulationTarget;
  depth?: number;
  rateHz?: number;
  waveform?: MusicWaveform | 'random';
}

export interface MusicAccentConfig {
  amount?: number;
  patternBias?: number;
  emphasisSteps?: number[];
}

export interface MusicLayerRhythmConfig {
  division?: number;
  phase?: number;
  gate?: number;
  accentAmount?: number;
  accentPattern?: number[];
}

export type MusicNoiseColor = 'white' | 'pink' | 'brown';
export type MusicNoiseTexture = 'smooth' | 'grainy' | 'shimmer';

export interface MusicNoiseCharacterConfig {
  color?: MusicNoiseColor;
  texture?: MusicNoiseTexture;
  drift?: number;
  burst?: number;
}

export interface ProceduralMusicLayerExpressionConfig {
  envelope?: MusicEnvelopeShapeConfig;
  stereo?: MusicStereoMotionConfig;
  modulation?: MusicModulationConfig;
  accent?: MusicAccentConfig;
}

export interface ProceduralNoiseLayerExpressionConfig extends ProceduralMusicLayerExpressionConfig {
  noiseCharacter?: MusicNoiseCharacterConfig;
}

export interface ProceduralMusicTrackExpressionConfig {
  stereo?: MusicStereoMotionConfig;
  modulation?: MusicModulationConfig;
  accent?: MusicAccentConfig;
}

export type MusicTimeSignatureBeatUnit = 2 | 4 | 8 | 16;

export interface MusicTimeSignatureConfig {
  beatsPerBar: number;
  beatUnit: MusicTimeSignatureBeatUnit;
}

export interface MusicEnergyProfileConfig {
  baseline: number;
  peak: number;
  curve: 'steady' | 'build' | 'build-release' | 'surge';
}

export type MusicChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'suspended2'
  | 'suspended4'
  | 'power';

export interface MusicHarmonicChordStepConfig {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  barsDuration: number;
  quality: MusicChordQuality;
  octaveShift?: number;
}

export interface MusicHarmonicProgressionConfig {
  steps: MusicHarmonicChordStepConfig[];
}

export type MusicArrangementPhase = 'intro' | 'build' | 'peak' | 'release';

export interface MusicArrangementLayerGainMultipliersConfig {
  bass?: number;
  pulse?: number;
  lead?: number;
  noise?: number;
}

export interface MusicArrangementSectionConfig {
  phase: MusicArrangementPhase;
  barsDuration: number;
  density: number;
  energyLift: number;
  layerGainMultipliers?: MusicArrangementLayerGainMultipliersConfig;
}

export interface MusicArrangementConfig {
  sections: MusicArrangementSectionConfig[];
  loop?: boolean;
}

export interface MusicCompositionalDescriptorsConfig {
  mode: string;
  chordProgressionTags: string[];
  rhythmicFeel: string;
  energyProfile: MusicEnergyProfileConfig;
  harmony: MusicHarmonicProgressionConfig;
  arrangement?: MusicArrangementConfig;
}

export interface ProceduralMusicIntentConfig {
  deterministicSeed: string;
  timeSignature: MusicTimeSignatureConfig;
  descriptors: MusicCompositionalDescriptorsConfig;
}

export interface ProceduralMusicLayerConfig {
  waveform: MusicWaveform;
  pattern: MusicStep[];
  gain: number;
  durationSteps: number;
  rhythm?: MusicLayerRhythmConfig;
  octaveShift?: number;
  detune?: number;
  filterHz?: number;
  expression?: ProceduralMusicLayerExpressionConfig;
}

export interface ProceduralNoiseLayerConfig {
  pattern: Array<0 | 1>;
  gain: number;
  filterHz: number;
  durationSteps: number;
  rhythm?: MusicLayerRhythmConfig;
  expression?: ProceduralNoiseLayerExpressionConfig;
}

export interface ProceduralMusicTrackConfig {
  tempo: number;
  rootHz: number;
  stepsPerBeat: number;
  masterGain: number;
  intent: ProceduralMusicIntentConfig;
  expression?: ProceduralMusicTrackExpressionConfig;
  bass: ProceduralMusicLayerConfig;
  pulse?: ProceduralMusicLayerConfig;
  lead?: ProceduralMusicLayerConfig;
  noise?: ProceduralNoiseLayerConfig;
}

export interface LevelMusicConfig {
  cueName: string;
  mood: string;
  tempoFeel: string;
  musicalStyle: string;
  intensity: string;
  shiftMoments: string[];
  bossCueName: string;
  stage: ProceduralMusicTrackConfig;
  boss: ProceduralMusicTrackConfig;
}
