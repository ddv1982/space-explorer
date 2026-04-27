import type { MusicModulationConfig } from '../../../config/LevelsConfig';

export function applyModulation(
  ctx: AudioContext,
  modulation: MusicModulationConfig | undefined,
  target: AudioParam,
  baseValue: number,
  time: number,
  duration: number,
  depthScale = 1
): void {
  if (!modulation?.target || !modulation.depth || !modulation.rateHz) {
    return;
  }

  const waveform = modulation.waveform === 'random' ? 'triangle' : modulation.waveform ?? 'sine';
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  lfo.type = waveform;
  lfo.frequency.setValueAtTime(modulation.rateHz, time);
  lfoGain.gain.setValueAtTime(modulation.depth * depthScale, time);

  target.setValueAtTime(baseValue, time);
  lfo.connect(lfoGain);
  lfoGain.connect(target);

  lfo.start(time);
  lfo.stop(time + duration + 0.08);
}
