/**
 * Autofire preferences, remembered between visits. Touch flight autofires by default (there is no
 * fire button); keyboard and mouse players can opt in.
 */
export interface AutoFireSettings {
  touch: boolean;
  keyboard: boolean;
}

export type AutoFireInput = keyof AutoFireSettings;

const AUTO_FIRE_STORAGE_KEY = 'space-explorer.autoFire.v1';
const DEFAULT_AUTO_FIRE: AutoFireSettings = { touch: true, keyboard: false };

type AutoFireStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The browser's settings, read once: `isFiring` asks every frame. */
let remembered: AutoFireSettings | null = null;

function getStorage(): AutoFireStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readSettings(storage: AutoFireStorage | null): AutoFireSettings {
  try {
    const stored: unknown = JSON.parse(storage?.getItem(AUTO_FIRE_STORAGE_KEY) ?? 'null');
    const record = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
    return {
      touch: typeof record.touch === 'boolean' ? record.touch : DEFAULT_AUTO_FIRE.touch,
      keyboard: typeof record.keyboard === 'boolean' ? record.keyboard : DEFAULT_AUTO_FIRE.keyboard,
    };
  } catch {
    return { ...DEFAULT_AUTO_FIRE };
  }
}

/** An explicit storage is read directly; the browser's is read once and then remembered. */
export function getAutoFireSettings(storage?: AutoFireStorage | null): AutoFireSettings {
  if (storage !== undefined) return readSettings(storage);
  remembered ??= readSettings(getStorage());
  return remembered;
}

export function setAutoFire(
  input: AutoFireInput,
  enabled: boolean,
  storage: AutoFireStorage | null = getStorage()
): AutoFireSettings {
  const next = { ...getAutoFireSettings(storage), [input]: enabled };
  remembered = next;
  try {
    storage?.setItem(AUTO_FIRE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota: the setting still applies for this visit.
  }
  return next;
}
