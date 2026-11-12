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

type PlayerStateInput = Parameters<typeof createSaveSlotRecord>[1];
type RunSummaryInput = Parameters<typeof createSaveSlotRecord>[2];

const SAVED_AT = new Date('2026-04-27T10:30:00.000Z');

function playerState(overrides: Partial<PlayerStateInput> = {}): PlayerStateInput {
  return {
    level: 1,
    score: 100,
    creditsSpent: 0,
    currentHp: 5,
    currentShields: 0,
    remainingLives: 3,
    upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 0 },
    helperWing: { grantedSlots: 0, slots: [] },
    ...overrides,
  };
}

function record(
  state: Partial<PlayerStateInput> = {},
  summary: Partial<RunSummaryInput> = {},
  slotId: Parameters<typeof createSaveSlotRecord>[0] = 'slot-1'
): SaveSlotRecordV1 {
  const full = playerState(state);
  return createSaveSlotRecord(
    slotId,
    full,
    { finalScore: full.score, levelReached: full.level, deathCause: null, ...summary },
    SAVED_AT
  );
}

/** Installs fresh storage holding the raw (possibly corrupt) slot payloads, bypassing write normalization. */
function storeRaw(slots: Record<string, unknown>): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_SLOT_STORAGE_KEY, JSON.stringify({ version: 1, slots }));
  installWindow(storage);
  return storage;
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

  test('reports unavailable when a write probe throws', () => {
    installWindow(new ThrowingStorage());
    expect(isSaveStorageAvailable()).toBe(false);
  });

  test('writes, reads, lists, and deletes save slots using localStorage', () => {
    installWindow(new MemoryStorage());
    const saved = record({
      level: 3,
      score: 12400,
      creditsSpent: 0,
      currentHp: 6.25,
      currentShields: 1,
      remainingLives: 2,
      upgrades: { hp: 1, damage: 2, fireRate: 1, shield: 2, turrets: 1 },
      helperWing: { grantedSlots: 1, slots: [{ remainingLives: 2, hp: 5 }] },
    });

    expect(writeSaveSlot(saved)?.id).toBe('slot-1');
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

  test('round-trips a valid v1 save record unchanged', () => {
    installWindow(new MemoryStorage());
    const saved = record(
      {
        level: 3,
        score: 12400,
        creditsSpent: 0,
        currentHp: 6.25,
        currentShields: 1,
        remainingLives: 2,
        upgrades: { hp: 1, damage: 2, fireRate: 1, shield: 2, turrets: 1 },
        helperWing: { grantedSlots: 1, slots: [{ remainingLives: 2, hp: 5 }] },
      },
      { deathCause: 'beam' }
    );

    expect(writeSaveSlot(saved)).toEqual(saved);
    expect(readSaveSlot('slot-1')).toEqual(saved);
    expect(readSaveSlot('slot-1')?.playerState.currentHp).toBe(6.25);
  });

  test('gracefully falls back to empty state for corrupt JSON payloads', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_SLOT_STORAGE_KEY, '{not valid json');
    installWindow(storage);

    expect(readSaveSlot('slot-1')).toBeNull();
    expect(listSaveSlots().every((slot) => !slot.occupied)).toBe(true);
  });

  test('keeps valid slots visible when another stored slot is invalid', () => {
    storeRaw({
      'slot-1': { version: 1, id: 'slot-1', playerState: { level: 3 } },
      'slot-2': record({ level: 2, score: 500 }, {}, 'slot-2'),
    });

    expect(listSaveSlots().map((slot) => slot.occupied)).toEqual([false, true, false]);
    expect(readSaveSlot('slot-2')?.playerState.score).toBe(500);
  });

  test('normalizes invalid level values instead of throwing during writes', () => {
    installWindow(new MemoryStorage());

    expect(writeSaveSlot(record({ level: Number.NaN }, { levelReached: 1 }))?.playerState.level).toBe(1);
    expect(listSaveSlots()[0].subtitle).toContain('LVL 1');
  });

  test('clamps corrupt saved levels to the configured campaign range before loading', () => {
    const totalLevels = getTotalLevels();
    const corrupt = record();
    const level = totalLevels + 99;
    storeRaw({
      'slot-1': {
        ...corrupt,
        playerState: { ...corrupt.playerState, level },
        runSummary: { ...corrupt.runSummary, levelReached: level },
        label: { ...corrupt.label, level, levelName: '' },
      },
    });

    const loadedRecord = readSaveSlot('slot-1');
    expect(loadedRecord?.playerState.level).toBe(totalLevels);
    expect(loadedRecord?.runSummary.levelReached).toBe(totalLevels);
    expect(loadedRecord?.label.level).toBe(totalLevels);
    expect(loadedRecord?.label.levelName).toBe(getLevelConfig(totalLevels).name);
    expect(listSaveSlots()[0].title).toContain(getLevelConfig(totalLevels).name.toUpperCase());
    expect(listSaveSlots()[0].subtitle).toContain(`LVL ${totalLevels}`);
  });

  test('replaces stale saved label metadata with canonical player state values', () => {
    const saved = record({ level: 2 });
    storeRaw({
      'slot-1': {
        ...saved,
        label: { ...saved.label, level: 3, levelName: 'Wrong Sector', score: 999_999, remainingLives: 99 },
      },
    });

    expect(readSaveSlot('slot-1')?.label.level).toBe(2);
    expect(readSaveSlot('slot-1')?.label.levelName).toBe(getLevelConfig(2).name);
    expect(readSaveSlot('slot-1')?.label.score).toBe(100);
    expect(readSaveSlot('slot-1')?.label.remainingLives).toBe(3);
    expect(listSaveSlots()[0].title).toContain(getLevelConfig(2).name.toUpperCase());
    expect(listSaveSlots()[0].subtitle).toContain('SCORE 100');
    expect(listSaveSlots()[0].subtitle).toContain('3 LIVES');
  });

  test('renders legacy save labels that are missing level names', () => {
    storeRaw({ 'slot-1': { ...record({ level: 2 }), label: { level: 2, score: 100, remainingLives: 3 } } });

    expect(listSaveSlots()[0].title).toContain(getLevelConfig(2).name.toUpperCase());
  });

  test('normalizes corrupt saved levels below the first mission to level one', () => {
    installWindow(new MemoryStorage());

    expect(writeSaveSlot(record({ level: -5 }))?.playerState.level).toBe(1);
    expect(readSaveSlot('slot-1')?.runSummary.levelReached).toBe(1);
    expect(listSaveSlots()[0].subtitle).toContain('LVL 1');
  });

  test('caps corrupt helper-wing granted slots during slot normalization', () => {
    const saved = record();
    storeRaw({
      'slot-1': {
        ...saved,
        playerState: {
          ...saved.playerState,
          helperWing: {
            grantedSlots: 1_000_000,
            slots: Array.from({ length: 10 }, () => ({ remainingLives: 1, hp: 1 })),
          },
        },
      },
    });

    const helperWing = readSaveSlot('slot-1')?.playerState.helperWing;
    expect(helperWing?.grantedSlots).toBe(4);
    expect(helperWing?.slots).toHaveLength(4);
  });

  test('normalizes legacy records without shields or a terminal cause', () => {
    storeRaw({
      'slot-1': {
        version: 1,
        id: 'slot-1',
        savedAt: '2026-04-27T10:30:00.000Z',
        playerState: {
          level: 4,
          score: 900,
          creditsSpent: 0,
          currentHp: 5,
          remainingLives: 2,
          upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 3 },
          helperWing: { grantedSlots: 0, slots: [] },
        },
        runSummary: { finalScore: 900, levelReached: 4 },
        label: { level: 4, levelName: 'Legacy', score: 900, remainingLives: 2 },
      },
    });

    expect(readSaveSlot('slot-1')?.playerState.currentShields).toBe(3);
    expect(readSaveSlot('slot-1')?.playerState.upgrades.turrets).toBe(0);
    expect(readSaveSlot('slot-1')?.runSummary.deathCause).toBeNull();
  });

  test('normalizes corrupt saved turret tiers during slot reads', () => {
    const saved = record({ level: 5 });
    storeRaw({
      'slot-1': {
        ...saved,
        playerState: { ...saved.playerState, upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 0, turrets: 1.9 } },
      },
    });

    expect(readSaveSlot('slot-1')?.playerState.upgrades.turrets).toBe(1);
  });

  test('bounds extreme saved upgrades, resources, score, and helper slots', () => {
    const saved = record({ level: 5 });
    const max = Number.MAX_VALUE;
    storeRaw({
      'slot-1': {
        ...saved,
        runSummary: { finalScore: max, levelReached: 5, deathCause: null },
        playerState: {
          ...saved.playerState,
          score: max,
          creditsSpent: 0,
          currentHp: max,
          currentShields: max,
          remainingLives: max,
          upgrades: { hp: max, damage: max, fireRate: max, shield: max, turrets: max },
          helperWing: { grantedSlots: 1, slots: [{ remainingLives: max, hp: max }] },
        },
      },
    });

    expect(readSaveSlot('slot-1')?.playerState).toEqual({
      level: 5,
      score: Number.MAX_SAFE_INTEGER,
      creditsSpent: 0,
      currentHp: 15,
      currentShields: 8,
      remainingLives: 3,
      upgrades: { hp: 5, damage: 4, fireRate: 4, shield: 3, turrets: 2 },
      helperWing: { grantedSlots: 1, slots: [{ remainingLives: 3, hp: 15 }] },
    });
    expect(readSaveSlot('slot-1')?.runSummary.finalScore).toBe(Number.MAX_SAFE_INTEGER);
  });

  test('normalizes non-finite helper resources without NaN or Infinity', () => {
    const saved = record({ level: 2 });
    storeRaw({
      'slot-1': {
        ...saved,
        playerState: {
          ...saved.playerState,
          helperWing: {
            grantedSlots: 2,
            slots: [
              { remainingLives: Number.POSITIVE_INFINITY, hp: Number.NaN },
              { remainingLives: Number.NaN, hp: Number.NEGATIVE_INFINITY },
            ],
          },
        },
      },
    });

    expect(readSaveSlot('slot-1')?.playerState.helperWing).toEqual({
      grantedSlots: 2,
      slots: [
        { remainingLives: 0, hp: 0 },
        { remainingLives: 0, hp: 0 },
      ],
    });
  });

  test('returns graceful failures when writes are not allowed', () => {
    installWindow(new ThrowingStorage());

    expect(writeSaveSlot(record({ score: 0 }))).toBeNull();
    expect(deleteSaveSlot('slot-1')).toBe(true);
  });
});
