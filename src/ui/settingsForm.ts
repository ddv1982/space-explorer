import type { GameplayDifficultyTier } from '../config/gameplayDifficulty';
import type { VisualQualityTier } from '../config/visualQuality';
import type { AudioVolumes } from '../config/audioSettings';
import { audioManager } from '../systems/AudioManager';
import { h } from './dom';

type VolumeChannel = keyof AudioVolumes;

const VOLUME_SLIDERS: ReadonlyArray<[VolumeChannel, string]> = [
  ['music', 'MUSIC VOLUME'],
  ['effects', 'SFX VOLUME'],
];

/**
 * Applies one volume from a trusted input event: audio resumes first (the gesture may be the first
 * on the page), then the runtime clamps, stores and returns both values, which the sliders mirror.
 */
export function applyVolumeSetting(channel: VolumeChannel, value: number): AudioVolumes {
  audioManager.resumeFromUserGesture();
  return audioManager.setVolume(channel, value);
}

export interface SettingsForm {
  element: HTMLElement;
  setDifficulty: (tier: GameplayDifficultyTier) => void;
  setQuality: (tier: VisualQualityTier) => void;
  /** Re-reads the volumes, which the other screen may have changed. */
  syncVolumes: () => void;
}

interface TierSelector<T extends string> {
  element: HTMLElement;
  setValue: (tier: T) => void;
}

/** `LABEL: VALUE` beside one segment per tier; the selected segment is the solid primary. */
function createTierSelector<T extends string>(config: {
  label: string;
  tiers: readonly T[];
  value: T;
  onSelect: (tier: T) => boolean;
}): TierSelector<T> {
  let value = config.value;
  const caption = h('span', { 'aria-hidden': 'true' });
  const buttons = config.tiers.map((tier) => {
    const label = tier.toUpperCase();
    const button = h('button', { type: 'button', className: 'ui-btn' }, label);
    // Segments share the row in proportion to their label length.
    button.style.flexGrow = String(label.length + 3);
    button.addEventListener('click', () => {
      if (tier === value || !config.onSelect(tier)) return;
      selector.setValue(tier);
    });
    return button;
  });
  const selector: TierSelector<T> = {
    element: h(
      'div',
      { className: 'ui-tier', role: 'group', 'aria-label': config.label },
      caption,
      h('div', { className: 'ui-tier__options' }, ...buttons)
    ),
    setValue(next) {
      value = next;
      caption.textContent = `${config.label.toUpperCase()}: ${next.toUpperCase()}`;
      buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(config.tiers[index] === next)));
    },
  };
  selector.setValue(value);
  return selector;
}

/**
 * The settings shared by the menu sheet and the pause panel: difficulty, visual quality and the two
 * volume sliders. `captions` groups them under GAMEPLAY / VISUALS / AUDIO headings.
 */
export function createSettingsForm(config: {
  captions: boolean;
  difficulty: GameplayDifficultyTier;
  quality: VisualQualityTier;
  onSelectDifficulty: (tier: GameplayDifficultyTier) => boolean;
  onSelectQuality: (tier: VisualQualityTier) => boolean;
}): SettingsForm {
  const difficulty = createTierSelector({
    label: 'Difficulty',
    tiers: ['low', 'normal', 'high'],
    value: config.difficulty,
    onSelect: config.onSelectDifficulty,
  });
  const quality = createTierSelector({
    label: 'Quality',
    tiers: ['auto', 'low'],
    value: config.quality,
    onSelect: config.onSelectQuality,
  });

  const sliders = new Map<VolumeChannel, { input: HTMLInputElement; readout: HTMLOutputElement }>();
  const showVolumes = (values: AudioVolumes): void => {
    for (const [key, { input, readout }] of sliders) {
      const percent = Math.round(values[key] * 100);
      input.value = String(percent);
      input.style.setProperty('--v', String(values[key]));
      input.setAttribute('aria-valuetext', `${percent}%`);
      readout.textContent = `${percent}%`;
    }
  };
  const sliderCells = VOLUME_SLIDERS.map(([key, label]) => {
    const input = h('input', { type: 'range', min: '0', max: '100', step: '1', 'aria-label': label });
    const readout = h('output', { className: 'ui-slider__value' });
    input.addEventListener('input', () => showVolumes(applyVolumeSetting(key, Number(input.value) / 100)));
    // A short preview on release, so the effects level can be judged without starting a run.
    if (key === 'effects') input.addEventListener('change', () => audioManager.playUi('uiConfirm'));
    sliders.set(key, { input, readout });
    return h(
      'div',
      { className: 'ui-slider-cell' },
      h('label', { className: 'ui-slider' }, h('span', { className: 'ui-slider__label' }, label), input, readout)
    );
  });
  showVolumes(audioManager.getVolumes());

  const caption = (text: string, modifier = ''): HTMLElement | null =>
    config.captions ? h('p', { className: `ui-caption ${modifier}` }, text) : null;

  return {
    element: h(
      'div',
      { className: 'ui-settings' },
      caption('GAMEPLAY'),
      difficulty.element,
      caption('VISUALS'),
      quality.element,
      caption('AUDIO', 'ui-caption--audio'),
      h('div', { className: 'ui-sliders' }, ...sliderCells)
    ),
    setDifficulty: difficulty.setValue,
    setQuality: quality.setValue,
    syncVolumes: () => showVolumes(audioManager.getVolumes()),
  };
}
