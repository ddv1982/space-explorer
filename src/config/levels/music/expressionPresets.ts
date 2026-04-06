import type {
  ProceduralMusicLayerExpressionConfig,
  ProceduralMusicTrackExpressionConfig,
  ProceduralNoiseLayerExpressionConfig,
} from '../types';

export const layerExpressionPresets = {
  pad: {
    envelope: { attack: 0.16, release: 0.24, curve: 'soft' },
  },
  pluck: {
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.55, release: 0.08, curve: 'hard' },
  },
  swell: {
    envelope: { attack: 0.28, decay: 0.18, sustain: 0.82, release: 0.3, curve: 'soft' },
  },
  drift: {
    stereo: { width: 0.35, rateHz: 0.08, phaseOffset: 0.25 },
  },
  orbit: {
    stereo: { width: 0.75, rateHz: 0.18, phaseOffset: 0.5 },
  },
  vibrato: {
    modulation: { target: 'pitch', depth: 10, rateHz: 5, waveform: 'sine' },
  },
  tremolo: {
    modulation: { target: 'gain', depth: 0.18, rateHz: 4, waveform: 'triangle' },
  },
  gentleAccent: {
    accent: { amount: 0.12, patternBias: 0.2 },
  },
  drivingAccent: {
    accent: { amount: 0.24, patternBias: 0.55 },
  },
  // ASMR/Ambient expression presets
  longPad: {
    envelope: { attack: 0.35, release: 0.55, curve: 'soft' },
  },
  softPluck: {
    envelope: { attack: 0.015, decay: 0.15, sustain: 0.45, release: 0.12, curve: 'soft' },
  },
  ambientDrift: {
    stereo: { width: 0.45, rateHz: 0.05, phaseOffset: 0.3 },
  },
  slowSwell: {
    envelope: { attack: 0.42, decay: 0.22, sustain: 0.88, release: 0.38, curve: 'soft' },
  },
  wideSpace: {
    stereo: { width: 0.65, rateHz: 0.1, phaseOffset: 0.4 },
  },
  gentleVibrato: {
    modulation: { target: 'pitch', depth: 6, rateHz: 3.5, waveform: 'sine' },
  },
  breathPulse: {
    accent: { amount: 0.08, patternBias: 0.15, emphasisSteps: [0, 4, 8, 12] },
  },
  etherialGlow: {
    envelope: { attack: 0.28, release: 0.42, curve: 'soft' },
    stereo: { width: 0.5, rateHz: 0.06, phaseOffset: 0.25 },
  },
} as const satisfies Record<string, ProceduralMusicLayerExpressionConfig>;

export const trackExpressionPresets = {
  subtleWidth: {
    stereo: { width: 0.25, rateHz: 0.04 },
  },
  orbit: {
    stereo: { width: 0.6, rateHz: 0.12, phaseOffset: 0.5 },
  },
  chase: {
    modulation: { target: 'filter', depth: 380, rateHz: 1.5, waveform: 'triangle' },
    accent: { amount: 0.2, patternBias: 0.4 },
  },
  // ASMR/Ambient track-level expression presets
  expansiveSpace: {
    stereo: { width: 0.35, rateHz: 0.06 },
    accent: { amount: 0.04, patternBias: 0.08, emphasisSteps: [0, 8] },
  },
  gentleFlow: {
    stereo: { width: 0.4, rateHz: 0.08, phaseOffset: 0.3 },
    modulation: { target: 'filter', depth: 120, rateHz: 0.3, waveform: 'sine' },
  },
} as const satisfies Record<string, ProceduralMusicTrackExpressionConfig>;

export const noiseExpressionPresets = {
  air: {
    noiseCharacter: { color: 'pink', texture: 'smooth', drift: 0.1 },
  },
  grit: {
    noiseCharacter: { color: 'white', texture: 'grainy', drift: 0.18, burst: 0.12 },
    accent: { amount: 0.16, patternBias: 0.3 },
  },
  rumble: {
    noiseCharacter: { color: 'brown', texture: 'smooth', drift: 0.08, burst: 0.2 },
  },
  shimmer: {
    noiseCharacter: { color: 'pink', texture: 'shimmer', drift: 0.14 },
    stereo: { width: 0.4, rateHz: 0.1 },
  },
  // ASMR/Ambient noise expression presets
  softAir: {
    noiseCharacter: { color: 'pink', texture: 'smooth', drift: 0.05 },
    stereo: { width: 0.25, rateHz: 0.05 },
  },
  dreamyDrift: {
    noiseCharacter: { color: 'pink', texture: 'shimmer', drift: 0.12 },
    stereo: { width: 0.45, rateHz: 0.08 },
  },
} as const satisfies Record<string, ProceduralNoiseLayerExpressionConfig>;
