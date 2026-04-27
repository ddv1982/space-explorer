import type {
  MusicNoiseCharacterConfig,
  ProceduralMusicTrackConfig,
  ProceduralNoiseLayerConfig,
  ProceduralNoiseLayerExpressionConfig,
} from '../../../config/LevelsConfig';
import { clamp, getAccentScale, resolveNoiseExpression } from './expression';

interface DeriveNoisePlanArgs {
  track: ProceduralMusicTrackConfig;
  noiseLayer: ProceduralNoiseLayerConfig;
  stepIndex: number;
  stepDuration: number;
  intensityBlend: number;
  creativityDrive: number;
  gainScale: number;
}

interface NoisePlan {
  expression: ProceduralNoiseLayerExpressionConfig | undefined;
  noiseColor: MusicNoiseCharacterConfig['color'] | undefined;
  duration: number;
  modulationDuration: number;
  peakGain: number;
  playbackRate: number;
  pannerBasePan: number;
  highpassHz: number;
  bandpassHz: number;
  filterQ: number;
}

export function deriveNoisePlan({
  track,
  noiseLayer,
  stepIndex,
  stepDuration,
  intensityBlend,
  creativityDrive,
  gainScale,
}: DeriveNoisePlanArgs): NoisePlan {
  const expression = resolveNoiseExpression(track.expression, noiseLayer.expression);
  const noiseCharacter = expression?.noiseCharacter;
  const accentScale = getAccentScale(stepIndex, expression?.accent) * (0.78 + creativityDrive * 0.34);
  const texture = noiseCharacter?.texture ?? 'smooth';
  const burst = (noiseCharacter?.burst ?? 0) + creativityDrive * 0.12;
  const drift = noiseCharacter?.drift ?? 0;
  const durationMultiplier = texture === 'shimmer' ? 0.55 : texture === 'grainy' ? 0.68 : 0.9;
  const duration = Math.max(stepDuration * noiseLayer.durationSteps * durationMultiplier, 0.04);

  return {
    expression,
    noiseColor: noiseCharacter?.color,
    duration,
    modulationDuration: stepDuration * noiseLayer.durationSteps,
    peakGain:
      noiseLayer.gain * track.masterGain * gainScale * accentScale * (0.8 + intensityBlend * 0.45 + burst * 0.8),
    playbackRate: 1 + burst * 0.06 + intensityBlend * 0.03,
    pannerBasePan: clamp(expression?.stereo?.pan ?? 0, -1, 1),
    highpassHz: texture === 'shimmer' ? 1800 : texture === 'grainy' ? 900 : 250,
    bandpassHz:
      noiseLayer.filterHz * (1 + drift * Math.sin(stepIndex * 0.65) + intensityBlend * 0.18 + creativityDrive * 0.12),
    filterQ: texture === 'shimmer' ? 1.8 : texture === 'grainy' ? 1.2 : 0.8,
  };
}
