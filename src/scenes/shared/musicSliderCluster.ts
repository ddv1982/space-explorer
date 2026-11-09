import Phaser from 'phaser';
import { audioManager } from '../../systems/AudioManager';
import { applyMusicRuntimeTuningValue, type MusicTuningSliders } from './musicRuntimeTuning';
import { createMusicSliderControl, type MusicSliderControl } from './musicSliderControl';

export type MusicSliderCluster = MusicTuningSliders & {
  volume: MusicSliderControl;
};

interface CreateMusicSliderClusterConfig {
  width: number;
  getSliders: () => MusicSliderCluster | null;
  onValueChanged?: () => void;
}

export function createMusicSliderCluster(
  scene: Phaser.Scene,
  config: CreateMusicSliderClusterConfig
): MusicSliderCluster {
  const tuning = audioManager.getMusicRuntimeTuning();

  return {
    creativity: createMusicSliderControl(scene, {
      label: 'CREATIVITY',
      value: tuning.creativity,
      width: config.width,
      onChange: (value) => {
        audioManager.resumeFromUserGesture();
        applyMusicRuntimeTuningValue('creativity', value, config.getSliders());
        config.onValueChanged?.();
      },
    }),
    energy: createMusicSliderControl(scene, {
      label: 'ENERGY',
      value: tuning.energy,
      width: config.width,
      onChange: (value) => {
        audioManager.resumeFromUserGesture();
        applyMusicRuntimeTuningValue('energy', value, config.getSliders());
        config.onValueChanged?.();
      },
    }),
    ambience: createMusicSliderControl(scene, {
      label: 'AMBIENCE',
      value: tuning.ambience,
      width: config.width,
      onChange: (value) => {
        audioManager.resumeFromUserGesture();
        applyMusicRuntimeTuningValue('ambience', value, config.getSliders());
        config.onValueChanged?.();
      },
    }),
    volume: createMusicSliderControl(scene, {
      label: 'MUSIC VOLUME',
      value: audioManager.getMusicVolume(),
      width: config.width,
      onChange: (value) => {
        audioManager.resumeFromUserGesture();
        const nextVolume = audioManager.setMusicVolume(value);
        config.getSliders()?.volume.setValue(nextVolume);
        config.onValueChanged?.();
      },
    }),
  };
}

export function setMusicSliderClusterDepth(sliders: MusicSliderCluster, depth: number): void {
  sliders.creativity.setDepth(depth);
  sliders.energy.setDepth(depth);
  sliders.ambience.setDepth(depth);
  sliders.volume.setDepth(depth);
}

export function setMusicSliderClusterVisible(sliders: MusicSliderCluster, visible: boolean): void {
  sliders.creativity.setVisible(visible);
  sliders.energy.setVisible(visible);
  sliders.ambience.setVisible(visible);
  sliders.volume.setVisible(visible);
}

export function destroyMusicSliderCluster(sliders: MusicSliderCluster | null): void {
  sliders?.volume.destroy();
  sliders?.creativity.destroy();
  sliders?.energy.destroy();
  sliders?.ambience.destroy();
}
