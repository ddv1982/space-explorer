import { describe, expect, test } from 'bun:test';

import { createSaveSlotRecord, readSaveSlot, writeSaveSlot } from '../src/systems/SaveSlotStorage';

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

describe('save-slot shield persistence', () => {
  test('reloads temporary shields above the upgrade tier', () => {
    const globalScope = globalThis as unknown as { window?: { localStorage: Storage } };
    globalScope.window = { localStorage: new MemoryStorage() };

    try {
      const record = createSaveSlotRecord(
        'slot-1',
        {
          level: 2,
          score: 800,
          currentHp: 5,
          currentShields: 3,
          remainingLives: 3,
          upgrades: { hp: 0, damage: 0, fireRate: 0, shield: 1, turrets: 0 },
          helperWing: { grantedSlots: 0, slots: [] },
        },
        { finalScore: 800, levelReached: 2 },
        new Date('2026-08-19T06:00:00.000Z')
      );

      expect(writeSaveSlot(record)?.playerState.currentShields).toBe(3);
      expect(readSaveSlot('slot-1')?.playerState.currentShields).toBe(3);
      expect(readSaveSlot('slot-1')?.playerState.upgrades.shield).toBe(1);
    } finally {
      delete globalScope.window;
    }
  });
});
