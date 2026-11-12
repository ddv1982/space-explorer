import { prefersReducedMotion } from '../utils/device';
import { createStoredPreference, storedRecord, type PreferenceStorage } from './storedPreference';

/** Comfort settings for camera motion, remembered between visits. */
export interface MotionSettings {
  screenShake: boolean;
}

/** Screen shake is on unless the player turned it off, or the system asks for reduced motion. */
const preference = createStoredPreference<MotionSettings>('space-explorer.motion.v1', (stored) => {
  const record = storedRecord(stored);
  return { screenShake: typeof record.screenShake === 'boolean' ? record.screenShake : !prefersReducedMotion() };
});

export function getMotionSettings(storage?: PreferenceStorage | null): MotionSettings {
  return preference.get(storage);
}

export function setScreenShake(enabled: boolean, storage?: PreferenceStorage | null): MotionSettings {
  return preference.set({ ...preference.get(storage), screenShake: enabled }, storage);
}
