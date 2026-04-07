import { audioManager, type MusicRuntimeTuning } from '../../systems/AudioManager';
import type { MusicSliderControl } from './musicSliderControl';

export type MusicTuningSliders = Record<keyof MusicRuntimeTuning, MusicSliderControl>;

export function applyMusicRuntimeTuningValue(
  key: keyof MusicRuntimeTuning,
  value: number,
  sliders: MusicTuningSliders | null
): MusicRuntimeTuning {
  const tuning =
    key === 'creativity'
      ? audioManager.setMusicRuntimeTuning({ creativity: value })
      : key === 'energy'
        ? audioManager.setMusicRuntimeTuning({ energy: value })
        : audioManager.setMusicRuntimeTuning({ ambience: value });

  syncMusicRuntimeTuningSliders(sliders, tuning);
  return tuning;
}

export function syncMusicRuntimeTuningSliders(
  sliders: MusicTuningSliders | null,
  tuning: MusicRuntimeTuning
): void {
  if (!sliders) {
    return;
  }

  sliders.creativity.setValue(tuning.creativity);
  sliders.energy.setValue(tuning.energy);
  sliders.ambience.setValue(tuning.ambience);
}

export function destroyMusicRuntimeTuningSliders(sliders: MusicTuningSliders | null): void {
  sliders?.creativity.destroy();
  sliders?.energy.destroy();
  sliders?.ambience.destroy();
}
