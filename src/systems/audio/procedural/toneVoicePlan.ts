import type { ProceduralMusicLayerConfig, ProceduralMusicTrackConfig } from '@/config/LevelsConfig';
import { clamp, getAccentScale, getEnvelopeShape, resolveLayerExpression } from './expression';

type ResolvedLayerExpression = ReturnType<typeof resolveLayerExpression>;
type ToneEnvelopeShape = ReturnType<typeof getEnvelopeShape>;

interface ToneVoicePlan {
  expression: ResolvedLayerExpression;
  envelope: ToneEnvelopeShape;
  accentScale: number;
  basePan: number;
  attackPeak: number;
  sustainGain: number;
  attackEnd: number;
  decayEnd: number;
  releaseStart: number;
  stopTime: number;
  voiceCount: number;
  voiceSpread: number;
  modulationDuration: number;
  needsFilter: boolean;
  filterHz: number;
  filterQ: number;
}

export function deriveToneVoicePlan({
  track,
  layer,
  frequency,
  stepIndex,
  time,
  duration,
  intensityBlend,
  creativityDrive,
  gainScale,
}: {
  track: ProceduralMusicTrackConfig;
  layer: ProceduralMusicLayerConfig;
  frequency: number;
  stepIndex: number;
  time: number;
  duration: number;
  intensityBlend: number;
  creativityDrive: number;
  gainScale: number;
}): ToneVoicePlan {
  const expression = resolveLayerExpression(track.expression, layer.expression);
  const envelope = getEnvelopeShape(duration, layer.waveform, expression?.envelope);
  const accentScale = getAccentScale(stepIndex, expression?.accent) * (0.72 + creativityDrive * 0.38);
  const basePan = clamp(expression?.stereo?.pan ?? 0, -1, 1);
  const attackPeak = layer.gain * track.masterGain * gainScale * accentScale * (0.9 + intensityBlend * 0.18);
  const sustainGain = Math.max(attackPeak * envelope.sustain, 0.001);
  const attackEnd = time + envelope.attack;
  const decayEnd = attackEnd + envelope.decay;
  const releaseStart = Math.max(decayEnd, time + Math.max(duration - envelope.release, duration * 0.45));
  const stopTime = releaseStart + envelope.release + 0.04;
  const voiceCount = frequency > 180 && intensityBlend + creativityDrive * 0.26 > 0.45 ? 2 : 1;
  const voiceSpread = (voiceCount - 1) * (5 + intensityBlend * 5);
  const modulationDuration = duration + envelope.release;
  const needsFilter = Boolean(layer.filterHz) || expression?.modulation?.target === 'filter';
  const baseFilterHz = layer.filterHz ?? Math.max(frequency * 4, 900);
  const filterHz = baseFilterHz * (0.88 + intensityBlend * 0.35);
  const filterQ = 0.7 + intensityBlend * 1.4;

  return {
    expression,
    envelope,
    accentScale,
    basePan,
    attackPeak,
    sustainGain,
    attackEnd,
    decayEnd,
    releaseStart,
    stopTime,
    voiceCount,
    voiceSpread,
    modulationDuration,
    needsFilter,
    filterHz,
    filterQ,
  };
}
