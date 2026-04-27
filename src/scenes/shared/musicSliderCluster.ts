import Phaser from 'phaser';
import { audioManager } from '../../systems/AudioManager';
import { applyMusicRuntimeTuningValue, type MusicTuningSliders } from './musicRuntimeTuning';
import { createMusicSliderControl, type MusicSliderControl } from './musicSliderControl';
import { drawBoltIcon, drawBrainIcon, drawNoteIcon, drawWaveformIcon } from './musicSliderIcons';

export type MusicSliderCluster = MusicTuningSliders & {
  volume: MusicSliderControl;
};

interface CreateMusicSliderClusterConfig {
  width: number;
  getSliders: () => MusicSliderCluster | null;
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
      icon: drawBrainIcon,
      onChange: (value) => applyMusicRuntimeTuningValue('creativity', value, config.getSliders()),
    }),
    energy: createMusicSliderControl(scene, {
      label: 'ENERGY',
      value: tuning.energy,
      width: config.width,
      icon: drawBoltIcon,
      onChange: (value) => applyMusicRuntimeTuningValue('energy', value, config.getSliders()),
    }),
    ambience: createMusicSliderControl(scene, {
      label: 'AMBIENCE',
      value: tuning.ambience,
      width: config.width,
      icon: drawWaveformIcon,
      onChange: (value) => applyMusicRuntimeTuningValue('ambience', value, config.getSliders()),
    }),
    volume: createMusicSliderControl(scene, {
      label: 'MUSIC VOLUME',
      value: audioManager.getMusicVolume(),
      width: config.width,
      icon: drawNoteIcon,
      onChange: (value) => {
        const nextVolume = audioManager.setMusicVolume(value);
        config.getSliders()?.volume.setValue(nextVolume);
      },
    }),
  };
}

export function setMusicSliderClusterPosition(sliders: MusicSliderCluster, x: number, y: number, spacing: number): void {
  sliders.creativity.setPosition(x, y);
  sliders.energy.setPosition(x, y + spacing);
  sliders.ambience.setPosition(x, y + spacing * 2);
  sliders.volume.setPosition(x, y + spacing * 3);
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
