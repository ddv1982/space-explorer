import Phaser from 'phaser';
import type { EnemyType } from '@/config/LevelsConfig';

interface EnemySpawnHandlerContext {
  spawnRepeated: (type: EnemyType, count: number, getX: () => number, getY: () => number) => boolean;
  getSpawnX: (anchorX: number, padding: number) => number;
  clampX: (x: number, padding: number) => number;
}

export function createEnemySpawnHandlers(
  context: EnemySpawnHandlerContext,
): Record<EnemyType, (anchorX: number) => boolean> {
  const repeated = (
    type: EnemyType,
    count: number,
    anchorX: number,
    padding: number,
    minY = -80,
    maxY = -30,
  ) => context.spawnRepeated(
    type,
    count,
    () => context.getSpawnX(anchorX, padding),
    () => Phaser.Math.Between(minY, maxY),
  );

  return {
    scout: (anchorX) => repeated('scout', Phaser.Math.Between(1, 2), anchorX, 50, -100),
    fighter: (anchorX) => repeated('fighter', 1, anchorX, 100),
    bomber: (anchorX) => repeated('bomber', 1, anchorX, 80),
    swarm: (anchorX) => {
      const baseX = context.getSpawnX(anchorX, 100);
      return context.spawnRepeated(
        'swarm',
        Phaser.Math.Between(3, 5),
        () => context.clampX(baseX + Phaser.Math.Between(-60, 60), 50),
        () => Phaser.Math.Between(-120, -30),
      );
    },
    gunship: (anchorX) => repeated('gunship', 1, anchorX, 120),
    diver: (anchorX) => repeated('diver', Phaser.Math.Between(1, 2), anchorX, 60, -100, -40),
    dodger: (anchorX) => repeated('dodger', 1, anchorX, 90),
    sower: (anchorX) => repeated('sower', 1, anchorX, 100),
    lancer: (anchorX) => repeated('lancer', 1, anchorX, 80),
    splitter: (anchorX) => repeated('splitter', Phaser.Math.Between(1, 2), anchorX, 80, -90),
    swarmling: (anchorX) => {
      const baseX = context.getSpawnX(anchorX, 60);
      return context.spawnRepeated(
        'swarmling',
        Phaser.Math.Between(2, 3),
        () => context.clampX(baseX + Phaser.Math.Between(-40, 40), 40),
        () => Phaser.Math.Between(-120, -30),
      );
    },
  };
}
