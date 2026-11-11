/** Player volume preferences, 0-1 each, remembered between visits. */
export interface AudioVolumes {
  music: number;
  effects: number;
}

const AUDIO_SETTINGS_STORAGE_KEY = 'space-explorer.audio.v1';
const DEFAULT_VOLUMES: AudioVolumes = { music: 1, effects: 1 };

type AudioSettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

function getStorage(): AudioSettingsStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

export function loadAudioVolumes(storage: AudioSettingsStorage | null = getStorage()): AudioVolumes {
  try {
    const stored: unknown = JSON.parse(storage?.getItem(AUDIO_SETTINGS_STORAGE_KEY) ?? 'null');
    const record = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
    return {
      music: readVolume(record.music, DEFAULT_VOLUMES.music),
      effects: readVolume(record.effects, DEFAULT_VOLUMES.effects),
    };
  } catch {
    return { ...DEFAULT_VOLUMES };
  }
}

export function saveAudioVolumes(volumes: AudioVolumes, storage: AudioSettingsStorage | null = getStorage()): void {
  try {
    storage?.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(volumes));
  } catch {
    // Private browsing or a full quota: the volumes still apply for this visit.
  }
}
