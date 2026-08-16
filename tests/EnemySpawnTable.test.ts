import { describe, expect, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const { EnemySpawnTable } = await import('../src/systems/wave/EnemySpawnTable');

describe('EnemySpawnTable', () => {
  test('filters zero-weight entries and resolves weighted rolls', () => {
    const table = new EnemySpawnTable();
    table.rebuild([
      { type: 'scout', weight: 0 },
      { type: 'fighter', weight: 1 },
    ]);

    expect(table.includes('scout')).toBe(false);
    expect(table.includes('fighter')).toBe(true);
    expect(table.pick()).toBe('fighter');
  });

  test('returns null for an empty table', () => {
    const table = new EnemySpawnTable();
    table.rebuild([]);
    expect(table.pick()).toBeNull();
  });
});
