type MusicWaveform = OscillatorType;
type MusicStep = number | null;
import type { MusicArrangementPhase } from './arrangementTypes';

type MusicEnvelopeCurve = 'linear' | 'soft' | 'hard';

export interface MusicEnvelopeShapeConfig {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  curve?: MusicEnvelopeCurve;
}

interface MusicStereoMotionConfig {
  pan?: number;
  width?: number;
  rateHz?: number;
  phaseOffset?: number;
}

type MusicModulationTarget = 'gain' | 'filter' | 'pitch' | 'pan';

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

type MusicNoiseColor = 'white' | 'pink' | 'brown';
type MusicNoiseTexture = 'smooth' | 'grainy' | 'shimmer';

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

type MusicTimeSignatureBeatUnit = 2 | 4 | 8 | 16;

export interface MusicTimeSignatureConfig {
  beatsPerBar: number;
  beatUnit: MusicTimeSignatureBeatUnit;
}

export interface MusicEnergyProfileConfig {
  baseline: number;
  peak: number;
  curve: 'steady' | 'build' | 'build-release' | 'surge';
}

type MusicChordQuality = 'major' | 'minor' | 'diminished' | 'augmented' | 'suspended2' | 'suspended4' | 'power';

export interface MusicHarmonicChordStepConfig {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  barsDuration: number;
  quality: MusicChordQuality;
  octaveShift?: number;
}

interface MusicHarmonicProgressionConfig {
  steps: MusicHarmonicChordStepConfig[];
}

interface MusicArrangementLayerGainMultipliersConfig {
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
  /** Music intensity (0-1) at which this layer is fully in; it fades in just below. Default 0. */
  enterAt?: number;
  expression?: ProceduralMusicLayerExpressionConfig;
}

/** A sustained open chord (root, fifth, octave) on the current harmony, re-struck every bar. */
export interface MusicPadConfig {
  waveform: MusicWaveform;
  gain: number;
  filterHz: number;
  octaveShift?: number;
}

export type MusicDrumKit = 'soft' | 'tight' | 'heavy';

/** Synthesized drums. Patterns hold a velocity (0-1) per step of the bar. */
export interface MusicDrumsConfig {
  kit: MusicDrumKit;
  gain: number;
  kick: readonly number[];
  snare: readonly number[];
  hat: readonly number[];
}

/** Send levels (0-1) into the shared reverb and the tempo-synced echo. */
export interface MusicSpaceConfig {
  reverb: number;
  delay: number;
}

export interface ProceduralNoiseLayerConfig {
  pattern: Array<0 | 1>;
  gain: number;
  filterHz: number;
  durationSteps: number;
  rhythm?: MusicLayerRhythmConfig;
  enterAt?: number;
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
  pad?: MusicPadConfig;
  drums?: MusicDrumsConfig;
  space?: MusicSpaceConfig;
}

export interface LevelMusicConfig {
  stage: ProceduralMusicTrackConfig;
  boss: ProceduralMusicTrackConfig;
}
