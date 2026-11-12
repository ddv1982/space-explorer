/** The slice of `Storage` a preference needs, so tests can pass their own. */
export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface StoredPreference<T> {
  /** An explicit storage is read directly; the browser's is read once and then remembered. */
  get(storage?: PreferenceStorage | null): T;
  /**
   * Stores a value. The browser's value is remembered even when storage refuses the write, so the
   * choice holds for this visit; an explicit storage is only written.
   */
  set(value: T, storage?: PreferenceStorage | null): T;
}

function browserStorage(): PreferenceStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * A JSON preference in localStorage, cached after the first read because gameplay code may ask for it
 * every frame. `parse` turns whatever was stored (possibly nothing, or garbage) into a valid value.
 */
export function createStoredPreference<T>(key: string, parse: (stored: unknown) => T): StoredPreference<T> {
  let remembered: { value: T } | null = null;

  const read = (storage: PreferenceStorage | null): T => {
    try {
      return parse(JSON.parse(storage?.getItem(key) ?? 'null'));
    } catch {
      return parse(null);
    }
  };

  return {
    get(storage) {
      if (storage !== undefined) return read(storage);
      remembered ??= { value: read(browserStorage()) };
      return remembered.value;
    },
    set(value, storage) {
      const browser = storage === undefined;
      if (browser) remembered = { value };
      try {
        (browser ? browserStorage() : storage)?.setItem(key, JSON.stringify(value));
      } catch {
        // Private browsing or a full quota: the value still applies for this visit.
      }
      return value;
    },
  };
}

/** Reads a stored object's fields without trusting its shape. */
export function storedRecord(stored: unknown): Record<string, unknown> {
  return stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
}
