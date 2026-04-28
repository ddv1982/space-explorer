import type {
  MusicAccentConfig,
  MusicEnvelopeShapeConfig,
  ProceduralMusicLayerConfig,
  ProceduralMusicLayerExpressionConfig,
  ProceduralMusicTrackExpressionConfig,
  ProceduralNoiseLayerExpressionConfig,
} from '@/config/LevelsConfig';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getIntensityBlend(intensity: number, minimumIntensity: number, maximumIntensity: number): number {
  return clamp((intensity - minimumIntensity) / (maximumIntensity - minimumIntensity), 0, 1);
}

export function resolveLayerExpression(
  trackExpression?: ProceduralMusicTrackExpressionConfig,
  layerExpression?: ProceduralMusicLayerExpressionConfig
): ProceduralMusicLayerExpressionConfig | undefined {
  const envelope = layerExpression?.envelope;
  const stereo = trackExpression?.stereo || layerExpression?.stereo
    ? { ...trackExpression?.stereo, ...layerExpression?.stereo }
    : undefined;
  const modulation = trackExpression?.modulation || layerExpression?.modulation
    ? { ...trackExpression?.modulation, ...layerExpression?.modulation }
    : undefined;
  const accent = trackExpression?.accent || layerExpression?.accent
    ? { ...trackExpression?.accent, ...layerExpression?.accent }
    : undefined;

  if (!envelope && !stereo && !modulation && !accent) {
    return undefined;
  }

  return { envelope, stereo, modulation, accent };
}

export function resolveNoiseExpression(
  trackExpression?: ProceduralMusicTrackExpressionConfig,
  noiseExpression?: ProceduralNoiseLayerExpressionConfig
): ProceduralNoiseLayerExpressionConfig | undefined {
  const expression = resolveLayerExpression(trackExpression, noiseExpression);
  if (!expression && !noiseExpression?.noiseCharacter) {
    return undefined;
  }

  return {
    ...expression,
    noiseCharacter: noiseExpression?.noiseCharacter,
  };
}

export function getAccentScale(stepIndex: number, accent?: MusicAccentConfig): number {
  if (!accent?.amount) {
    return 1;
  }

  const emphasisSteps = accent.emphasisSteps ?? [];
  const isEmphasisStep = emphasisSteps.includes(stepIndex % 16);
  const pulseBias = accent.patternBias ?? 0;
  const patternAccent = stepIndex % 4 === 0 ? pulseBias : stepIndex % 2 === 0 ? pulseBias * 0.5 : 0;
  const accentWeight = clamp((isEmphasisStep ? 1 : 0.35) + patternAccent, 0, 1.5);

  return 1 + accent.amount * accentWeight;
}

export function getEnvelopeShape(
  duration: number,
  waveform: ProceduralMusicLayerConfig['waveform'],
  envelope?: MusicEnvelopeShapeConfig
): Required<MusicEnvelopeShapeConfig> {
  const defaultAttack = waveform === 'sawtooth' || waveform === 'square' ? 0.012 : 0.02;
  const defaultDecay = Math.min(duration * 0.22, 0.12);
  const defaultSustain = waveform === 'sine' ? 0.84 : 0.72;
  const defaultRelease = Math.max(duration * 0.34, 0.06);
  const curve = envelope?.curve ?? 'soft';
  const attack = clamp(envelope?.attack ?? defaultAttack, 0.004, Math.max(duration * 0.45, 0.01));
  const decay = clamp(envelope?.decay ?? defaultDecay, 0, Math.max(duration * 0.45, 0.01));
  const sustain = clamp(envelope?.sustain ?? defaultSustain, 0.15, 1);
  const release = clamp(envelope?.release ?? defaultRelease, 0.03, Math.max(duration * 0.9, 0.05));

  return { attack, decay, sustain, release, curve };
}
