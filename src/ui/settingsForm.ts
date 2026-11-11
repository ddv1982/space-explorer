import type { GameplayDifficultyTier } from '../config/gameplayDifficulty';
import type { VisualQualityTier } from '../config/visualQuality';
import { audioManager } from '../systems/AudioManager';
import { h } from './dom';

type MusicSettingKey = 'creativity' | 'energy' | 'ambience' | 'volume';
type MusicSettings = Record<MusicSettingKey, number>;

const MUSIC_SLIDERS: ReadonlyArray<[MusicSettingKey, string]> = [
  ['creativity', 'CREATIVITY'],
  ['energy', 'ENERGY'],
  ['ambience', 'AMBIENCE'],
  ['volume', 'MUSIC VOLUME'],
];

function readMusicSettings(): MusicSettings {
  return { ...audioManager.getMusicRuntimeTuning(), volume: audioManager.getMusicVolume() };
}

/**
 * Applies one music control from a trusted input event: audio resumes first (the gesture may be the
 * first on the page), then the runtime clamps and returns every value, which the sliders mirror.
 */
export function applyMusicSetting(key: MusicSettingKey, value: number): MusicSettings {
  audioManager.resumeFromUserGesture();
  if (key === 'volume') audioManager.setMusicVolume(value);
  else audioManager.setMusicRuntimeTuning({ [key]: value });
  return readMusicSettings();
}

export interface SettingsForm {
  element: HTMLElement;
  setDifficulty: (tier: GameplayDifficultyTier) => void;
  setQuality: (tier: VisualQualityTier) => void;
  /** Re-reads the music values, which the other screen may have changed. */
  syncMusic: () => void;
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
 * The settings shared by the menu sheet and the pause panel: difficulty, visual quality and the four
 * music sliders. `captions` groups them under GAMEPLAY / VISUALS / AUDIO headings.
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

  const sliders = new Map<MusicSettingKey, { input: HTMLInputElement; readout: HTMLOutputElement }>();
  const showMusic = (values: MusicSettings): void => {
    for (const [key, { input, readout }] of sliders) {
      const percent = Math.round(values[key] * 100);
      input.value = String(percent);
      input.style.setProperty('--v', String(values[key]));
      input.setAttribute('aria-valuetext', `${percent}%`);
      readout.textContent = `${percent}%`;
    }
  };
  const sliderCells = MUSIC_SLIDERS.map(([key, label]) => {
    const input = h('input', { type: 'range', min: '0', max: '100', step: '1', 'aria-label': label });
    const readout = h('output', { className: 'ui-slider__value' });
    input.addEventListener('input', () => showMusic(applyMusicSetting(key, Number(input.value) / 100)));
    sliders.set(key, { input, readout });
    return h(
      'div',
      { className: 'ui-slider-cell' },
      h('label', { className: 'ui-slider' }, h('span', { className: 'ui-slider__label' }, label), input, readout)
    );
  });
  showMusic(readMusicSettings());

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
    syncMusic: () => showMusic(readMusicSettings()),
  };
}
