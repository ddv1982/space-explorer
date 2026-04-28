import type { ProceduralMusicLayerExpressionConfig } from '@/config/LevelsConfig';
import { clamp } from './expression';

export function createPanner(
  ctx: AudioContext,
  basePan: number,
  stereo: ProceduralMusicLayerExpressionConfig['stereo'],
  time: number,
  duration: number,
  intensityBlend: number,
  creativityDrive: number
): StereoPannerNode | null {
  if (!stereo || (Math.abs(basePan) < 0.001 && (stereo.width ?? 0) <= 0)) {
    return null;
  }

  const panner = ctx.createStereoPanner();
  const width = clamp((stereo.width ?? 0) * (0.62 + creativityDrive * 0.56), 0, 1);
  const phaseOffset = stereo.phaseOffset ?? 0;
  const startingPan = clamp(basePan + Math.sin(phaseOffset * Math.PI * 2) * width * 0.35, -1, 1);
  panner.pan.setValueAtTime(startingPan, time);

  if (width > 0 && (stereo.rateHz ?? 0) > 0) {
    const panLfo = ctx.createOscillator();
    const panDepth = ctx.createGain();
    panLfo.type = 'sine';
    panLfo.frequency.setValueAtTime((stereo.rateHz ?? 0) * (0.72 + intensityBlend * 0.42 + creativityDrive * 0.3), time);
    panDepth.gain.setValueAtTime(width * (0.3 + intensityBlend * 0.45), time);
    panLfo.connect(panDepth);
    panDepth.connect(panner.pan);
    panLfo.start(time);
    panLfo.stop(time + duration + 0.08);
  }

  return panner;
}
