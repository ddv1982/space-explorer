import { beforeEach, describe, expect, test } from 'bun:test';

import {
  SAVE_SLOT_ENTRY_STORAGE_KEY_PREFIX,
  SAVE_SLOT_STORAGE_KEY,
  createSaveSlotRecord,
  deleteSaveSlot,
  listSaveSlots,
  readSaveSlot,
  writeSaveSlot,
  type SaveSlotRecordV1,
} from '../src/systems/SaveSlotStorage';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class InterleavingStorage extends MemoryStorage {
  private beforePersistentSet: (() => void) | null = null;

  interleaveBeforeNextPersistentSet(callback: () => void): void {
    this.beforePersistentSet = callback;
  }

  override setItem(key: string, value: string): void {
    if (key !== 'space-explorer.storageProbe' && this.beforePersistentSet) {
      const callback = this.beforePersistentSet;
      this.beforePersistentSet = null;
      callback();
    }
    super.setItem(key, value);
  }
}

class RejectingEntryStorage extends MemoryStorage {
  override setItem(key: string, value: string): void {
    if (key.startsWith(SAVE_SLOT_ENTRY_STORAGE_KEY_PREFIX)) {
      throw new Error('persistent write rejected');
    }
    super.setItem(key, value);
  }
}

function installWindow(localStorage: Storage): void {
  const globalScope = globalThis as unknown as { window?: { localStorage: Storage } };
  globalScope.window = { localStorage };
}

function createRecord(id: 'slot-1' | 'slot-2' | 'slot-3', score: number): SaveSlotRecordV1 {
  return createSaveSlotRecord(
    id,
    {
      level: 2,
      score,
      currentHp: 5,
      currentShields: 0,
      remainingLives: 3,
      upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 },
      helperWing: { grantedSlots: 0, slots: [] },
    },
    { finalScore: score, levelReached: 2 },
    new Date(`2026-08-21T10:${String(score % 60).padStart(2, '0')}:00.000Z`)
  );
}

describe('concurrent save-slot persistence', () => {
  beforeEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  test('preserves different-slot writes when logical writers interleave', () => {
    const storage = new InterleavingStorage();
    installWindow(storage);
    const slot1 = createRecord('slot-1', 100);
    const slot2 = createRecord('slot-2', 200);

    storage.interleaveBeforeNextPersistentSet(() => {
      expect(writeSaveSlot(slot2)?.id).toBe('slot-2');
    });

    expect(writeSaveSlot(slot1)?.id).toBe('slot-1');
    expect(readSaveSlot('slot-1')?.playerState.score).toBe(100);
    expect(readSaveSlot('slot-2')?.playerState.score).toBe(200);
    expect(storage.getItem(`${SAVE_SLOT_ENTRY_STORAGE_KEY_PREFIX}slot-1`)).not.toBeNull();
    expect(storage.getItem(`${SAVE_SLOT_ENTRY_STORAGE_KEY_PREFIX}slot-2`)).not.toBeNull();
  });

  test('preserves a concurrent peer update while deleting another slot', () => {
    const storage = new InterleavingStorage();
    installWindow(storage);
    expect(writeSaveSlot(createRecord('slot-1', 100))).not.toBeNull();
    expect(writeSaveSlot(createRecord('slot-2', 200))).not.toBeNull();

    storage.interleaveBeforeNextPersistentSet(() => {
      expect(writeSaveSlot(createRecord('slot-2', 900))?.playerState.score).toBe(900);
    });

    expect(deleteSaveSlot('slot-1')).toBe(true);
    expect(readSaveSlot('slot-1')).toBeNull();
    expect(readSaveSlot('slot-2')?.playerState.score).toBe(900);
  });

  test('merges new per-slot writes with valid records from the shipped v1 envelope', () => {
    const storage = new MemoryStorage();
    const legacySlot = createRecord('slot-1', 100);
    storage.setItem(SAVE_SLOT_STORAGE_KEY, JSON.stringify({ version: 1, slots: { 'slot-1': legacySlot } }));
    installWindow(storage);

    expect(writeSaveSlot(createRecord('slot-2', 200))).not.toBeNull();
    expect(readSaveSlot('slot-1')?.playerState.score).toBe(100);
    expect(readSaveSlot('slot-2')?.playerState.score).toBe(200);
  });

  test('uses a per-slot tombstone to delete a record from the shipped v1 envelope', () => {
    const storage = new MemoryStorage();
    const legacySlot = createRecord('slot-1', 100);
    storage.setItem(SAVE_SLOT_STORAGE_KEY, JSON.stringify({ version: 1, slots: { 'slot-1': legacySlot } }));
    installWindow(storage);

    expect(deleteSaveSlot('slot-1')).toBe(true);
    expect(readSaveSlot('slot-1')).toBeNull();
    expect(JSON.parse(storage.getItem(SAVE_SLOT_STORAGE_KEY) ?? '{}').slots['slot-1']).toEqual(legacySlot);
  });

  test('ignores a malformed per-slot override without discarding a valid v1 record', () => {
    const storage = new MemoryStorage();
    const legacySlot = createRecord('slot-1', 100);
    storage.setItem(SAVE_SLOT_STORAGE_KEY, JSON.stringify({ version: 1, slots: { 'slot-1': legacySlot } }));
    storage.setItem(`${SAVE_SLOT_ENTRY_STORAGE_KEY_PREFIX}slot-1`, '{bad json');
    installWindow(storage);

    expect(readSaveSlot('slot-1')?.playerState.score).toBe(100);
  });

  test('keeps valid per-slot entries visible when the legacy envelope is corrupt', () => {
    const storage = new MemoryStorage();
    installWindow(storage);
    expect(writeSaveSlot(createRecord('slot-2', 200))).not.toBeNull();
    storage.setItem(SAVE_SLOT_STORAGE_KEY, '{bad json');

    expect(readSaveSlot('slot-2')?.playerState.score).toBe(200);
    expect(listSaveSlots().map((slot) => slot.occupied)).toEqual([false, true, false]);
  });

  test('preserves legacy data when per-slot writes and deletes are rejected', () => {
    const storage = new RejectingEntryStorage();
    const legacySlot = createRecord('slot-1', 100);
    storage.setItem(SAVE_SLOT_STORAGE_KEY, JSON.stringify({ version: 1, slots: { 'slot-1': legacySlot } }));
    installWindow(storage);

    expect(writeSaveSlot(createRecord('slot-2', 200))).toBeNull();
    expect(deleteSaveSlot('slot-1')).toBe(false);
    expect(readSaveSlot('slot-1')?.playerState.score).toBe(100);
    expect(readSaveSlot('slot-2')).toBeNull();
  });
});
