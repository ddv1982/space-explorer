import { createStoredPreference, storedRecord, type PreferenceStorage } from './storedPreference';

/**
 * Autofire preferences, remembered between visits. Touch flight autofires by default (there is no
 * fire button); keyboard and mouse players can opt in.
 */
export interface AutoFireSettings {
  touch: boolean;
  keyboard: boolean;
}

export type AutoFireInput = keyof AutoFireSettings;

const DEFAULT_AUTO_FIRE: AutoFireSettings = { touch: true, keyboard: false };

const preference = createStoredPreference<AutoFireSettings>('space-explorer.autoFire.v1', (stored) => {
  const record = storedRecord(stored);
  return {
    touch: typeof record.touch === 'boolean' ? record.touch : DEFAULT_AUTO_FIRE.touch,
    keyboard: typeof record.keyboard === 'boolean' ? record.keyboard : DEFAULT_AUTO_FIRE.keyboard,
  };
});

/** An explicit storage is read directly; the browser's is read once and then remembered (`isFiring` asks every frame). */
export function getAutoFireSettings(storage?: PreferenceStorage | null): AutoFireSettings {
  return preference.get(storage);
}

/** Changes one input's autofire, building on the current settings so the other input's choice holds. */
export function setAutoFire(
  input: AutoFireInput,
  enabled: boolean,
  storage?: PreferenceStorage | null
): AutoFireSettings {
  return preference.set({ ...preference.get(storage), [input]: enabled }, storage);
}
