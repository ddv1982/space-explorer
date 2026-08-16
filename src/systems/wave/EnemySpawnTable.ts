import Phaser from 'phaser';
import type { EnemySpawnConfig, EnemyType } from '@/config/LevelsConfig';

interface SpawnEntry {
  type: EnemyType;
  cumulativeWeight: number;
}

export class EnemySpawnTable {
  private entries: SpawnEntry[] = [];
  private totalWeight = 0;

  rebuild(enemyEntries: EnemySpawnConfig[]): void {
    let cumulativeWeight = 0;
    this.entries = enemyEntries
      .filter((entry) => entry.weight > 0)
      .map((entry) => {
        cumulativeWeight += entry.weight;
        return { type: entry.type, cumulativeWeight };
      });
    this.totalWeight = cumulativeWeight;
  }

  includes(type: EnemyType): boolean {
    return this.entries.some((entry) => entry.type === type);
  }

  pick(): EnemyType | null {
    if (this.totalWeight <= 0) return null;
    const roll = Phaser.Math.Between(1, this.totalWeight);
    const match = this.entries.find((entry) => roll <= entry.cumulativeWeight);
    return match?.type ?? this.entries[this.entries.length - 1]?.type ?? null;
  }
}
