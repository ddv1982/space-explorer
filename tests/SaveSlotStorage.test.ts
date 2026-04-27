import { beforeEach, describe, expect, test } from 'bun:test';

import { getLevelConfig, getTotalLevels } from '../src/config/LevelsConfig';
import {
  SAVE_SLOT_STORAGE_KEY,
  createSaveSlotRecord,
  deleteSaveSlot,
  isSaveStorageAvailable,
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

class ThrowingStorage extends MemoryStorage {
  override setItem(): void {
    throw new Error('storage disabled');
  }
}

function installWindow(localStorage: Storage): void {
  const globalScope = globalThis as unknown as { window?: { localStorage: Storage } };
  globalScope.window = { localStorage };
}

function uninstallWindow(): void {
  const globalScope = globalThis as unknown as { window?: unknown };
  delete globalScope.window;
}

describe('SaveSlotStorage', () => {
  beforeEach(() => {
    uninstallWindow();
  });

  test('returns empty slots and unavailable status when localStorage is missing', () => {
    expect(isSaveStorageAvailable()).toBe(false);
    expect(readSaveSlot('slot-1')).toBeNull();
    expect(listSaveSlots().map((slot) => slot.occupied)).toEqual([false, false, false]);
  });

  test('writes, reads, lists, and deletes save slots using localStorage', () => {
    const storage = new MemoryStorage();
    installWindow(storage);

    const record = createSaveSlotRecord(
      'slot-1',
      {
        level: 3,
        score: 12400,
        currentHp: 6,
        currentShields: 1,
        remainingLives: 2,
        upgrades: {
          hp: 1,
          damage: 2,
          fireRate: 1,
          shield: 2,
        },
        helperWing: {
          grantedSlots: 1,
          slots: [{ remainingLives: 2, hp: 5 }],
        },
      },
      { finalScore: 12400, levelReached: 3 },
      new Date('2026-04-27T10:30:00.000Z')
    );

    expect(writeSaveSlot(record)?.id).toBe('slot-1');
    expect(readSaveSlot('slot-1')?.playerState.currentShields).toBe(1);

    const slots = listSaveSlots();
    expect(slots[0].occupied).toBe(true);
    expect(slots[0].title).toContain('SLOT 1');
    expect(slots[0].subtitle).toContain('LVL 3');
    expect(slots[0].savedAtLabel).toMatch(/^2026-04-27/);
    expect(slots[1].occupied).toBe(false);

    expect(deleteSaveSlot('slot-1')).toBe(true);
    expect(readSaveSlot('slot-1')).toBeNull();
  });

  test('gracefully falls back to empty state for corrupt JSON payloads', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_SLOT_STORAGE_KEY, '{not valid json');
    installWindow(storage);

    expect(readSaveSlot('slot-1')).toBeNull();
    expect(listSaveSlots().every((slot) => !slot.occupied)).toBe(true);
  });

  test('keeps valid slots visible when another stored slot is invalid', () => {
    const storage = new MemoryStorage();
    installWindow(storage);

    const validRecord = createSaveSlotRecord(
      'slot-2',
      {
        level: 2,
        score: 500,
        currentHp: 5,
        currentShields: 0,
        remainingLives: 3,
        upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0 },
        helperWing: { grantedSlots: 0, slots: [] },
      },
      { finalScore: 500, levelReached: 2 },
      new Date('2026-04-27T10:30:00.000Z')
    );

    storage.setItem(
      SAVE_SLOT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        slots: {
          'slot-1': { version: 1, id: 'slot-1', playerState: { level: 3 } },
          'slot-2': validRecord,
        },
      })
    );

    const slots = listSaveSlots();
    expect(slots.map((slot) => slot.occupied)).toEqual([false, true, false]);
    expect(readSaveSlot('slot-2')?.playerState.score).toBe(500);
  });

  test('normalizes invalid level values instead of throwing during writes', () => {
    const storage = new MemoryStorage();
    installWindow(storage);

    const invalidLevelRecord = createSaveSlotRecord(
      'slot-1',
      {
        level: Number.NaN,
        score: 100,
        currentHp: 5,
        currentShields: 0,
        remainingLives: 3,
        upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0 },
        helperWing: { grantedSlots: 0, slots: [] },
      },
      { finalScore: 100, levelReached: 1 },
      new Date('2026-04-27T10:30:00.000Z')
    );

    expect(writeSaveSlot(invalidLevelRecord)?.playerState.level).toBe(1);
    expect(listSaveSlots()[0].subtitle).toContain('LVL 1');
  });

  test('clamps corrupt saved levels to the configured campaign range before loading', () => {
    const storage = new MemoryStorage();
    installWindow(storage);
    const totalLevels = getTotalLevels();

    const corruptRecord = createSaveSlotRecord(
      'slot-1',
      {
        level: totalLevels + 99,
        score: 100,
        currentHp: 5,
        currentShields: 0,
        remainingLives: 3,
        upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0 },
        helperWing: { grantedSlots: 0, slots: [] },
      },
      { finalScore: 100, levelReached: totalLevels + 99 },
      new Date('2026-04-27T10:30:00.000Z')
    );

    storage.setItem(
      SAVE_SLOT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        slots: {
          'slot-1': {
            ...corruptRecord,
            playerState: { ...corruptRecord.playerState, level: totalLevels + 99 },
            runSummary: { ...corruptRecord.runSummary, levelReached: totalLevels + 99 },
            label: { ...corruptRecord.label, level: totalLevels + 99, levelName: '' },
          },
        },
      })
    );

    const loadedRecord = readSaveSlot('slot-1');
    expect(loadedRecord?.playerState.level).toBe(totalLevels);
    expect(loadedRecord?.runSummary.levelReached).toBe(totalLevels);
    expect(loadedRecord?.label.level).toBe(totalLevels);
    expect(loadedRecord?.label.levelName).toBe(getLevelConfig(totalLevels).name);
    expect(listSaveSlots()[0].title).toContain(getLevelConfig(totalLevels).name.toUpperCase());
    expect(listSaveSlots()[0].subtitle).toContain(`LVL ${totalLevels}`);
  });

  test('replaces stale saved label metadata with canonical player state values', () => {
    const storage = new MemoryStorage();
    installWindow(storage);

    const record = createSaveSlotRecord(
      'slot-1',
      {
        level: 2,
        score: 100,
        currentHp: 5,
        currentShields: 0,
        remainingLives: 3,
        upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0 },
        helperWing: { grantedSlots: 0, slots: [] },
      },
      { finalScore: 100, levelReached: 2 },
      new Date('2026-04-27T10:30:00.000Z')
    );

    storage.setItem(
      SAVE_SLOT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        slots: {
          'slot-1': {
            ...record,
            label: { ...record.label, level: 3, levelName: 'Wrong Sector', score: 999_999, remainingLives: 99 },
          },
        },
      })
    );

    expect(readSaveSlot('slot-1')?.label.level).toBe(2);
    expect(readSaveSlot('slot-1')?.label.levelName).toBe(getLevelConfig(2).name);
    expect(readSaveSlot('slot-1')?.label.score).toBe(100);
    expect(readSaveSlot('slot-1')?.label.remainingLives).toBe(3);
    expect(listSaveSlots()[0].title).toContain(getLevelConfig(2).name.toUpperCase());
    expect(listSaveSlots()[0].subtitle).toContain('SCORE 100');
    expect(listSaveSlots()[0].subtitle).toContain('3 LIVES');
  });

  test('normalizes corrupt saved levels below the first mission to level one', () => {
    const storage = new MemoryStorage();
    installWindow(storage);

    const corruptRecord = createSaveSlotRecord(
      'slot-1',
      {
        level: -5,
        score: 100,
        currentHp: 5,
        currentShields: 0,
        remainingLives: 3,
        upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0 },
        helperWing: { grantedSlots: 0, slots: [] },
      },
      { finalScore: 100, levelReached: -5 },
      new Date('2026-04-27T10:30:00.000Z')
    );

    expect(writeSaveSlot(corruptRecord)?.playerState.level).toBe(1);
    expect(readSaveSlot('slot-1')?.runSummary.levelReached).toBe(1);
    expect(listSaveSlots()[0].subtitle).toContain('LVL 1');
  });

  test('caps corrupt helper-wing granted slots during slot normalization', () => {
    const storage = new MemoryStorage();
    installWindow(storage);

    const corruptRecord = createSaveSlotRecord(
      'slot-1',
      {
        level: 1,
        score: 100,
        currentHp: 5,
        currentShields: 0,
        remainingLives: 3,
        upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0 },
        helperWing: {
          grantedSlots: 1_000_000,
          slots: Array.from({ length: 10 }, () => ({ remainingLives: 1, hp: 1 })),
        },
      },
      { finalScore: 100, levelReached: 1 },
      new Date('2026-04-27T10:30:00.000Z')
    );

    storage.setItem(
      SAVE_SLOT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        slots: {
          'slot-1': {
            ...corruptRecord,
            playerState: {
              ...corruptRecord.playerState,
              helperWing: {
                grantedSlots: 1_000_000,
                slots: Array.from({ length: 10 }, () => ({ remainingLives: 1, hp: 1 })),
              },
            },
          },
        },
      })
    );

    const helperWing = readSaveSlot('slot-1')?.playerState.helperWing;
    expect(helperWing?.grantedSlots).toBe(4);
    expect(helperWing?.slots).toHaveLength(4);
  });

  test('normalizes legacy records without currentShields', () => {
    const storage = new MemoryStorage();
    installWindow(storage);

    const legacyRecord = {
      version: 1,
      id: 'slot-1',
      savedAt: '2026-04-27T10:30:00.000Z',
      playerState: {
        level: 4,
        score: 900,
        currentHp: 5,
        remainingLives: 2,
        upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 3 },
        helperWing: { grantedSlots: 0, slots: [] },
      },
      runSummary: { finalScore: 900, levelReached: 4 },
      label: { level: 4, levelName: 'Legacy', score: 900, remainingLives: 2 },
    } satisfies Omit<SaveSlotRecordV1, 'playerState'> & { playerState: Record<string, unknown> };

    storage.setItem(
      SAVE_SLOT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        slots: {
          'slot-1': legacyRecord,
        },
      })
    );

    expect(readSaveSlot('slot-1')?.playerState.currentShields).toBe(3);
  });

  test('returns graceful failures when writes are not allowed', () => {
    installWindow(new ThrowingStorage());

    const record = createSaveSlotRecord(
      'slot-1',
      {
        level: 1,
        score: 0,
        currentHp: 5,
        currentShields: 0,
        remainingLives: 3,
        upgrades: {
          hp: 0,
          damage: 0,
          fireRate: 0,
          shield: 0,
        },
        helperWing: {
          grantedSlots: 0,
          slots: [],
        },
      },
      { finalScore: 0, levelReached: 1 }
    );

    expect(writeSaveSlot(record)).toBeNull();
    expect(deleteSaveSlot('slot-1')).toBe(true);
  });
});
