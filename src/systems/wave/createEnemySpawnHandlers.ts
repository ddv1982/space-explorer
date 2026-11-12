import { waveRandom } from '../gameplayRandom';
import type { EnemyType } from '@/config/LevelsConfig';

interface EnemySpawnHandlerContext {
  spawnRepeated: (type: EnemyType, count: number, getX: () => number, getY: () => number) => boolean;
  getSpawnX: (anchorX: number, padding: number) => number;
  clampX: (x: number, padding: number) => number;
}

export function createEnemySpawnHandlers(
  context: EnemySpawnHandlerContext
): Record<EnemyType, (anchorX: number) => boolean> {
  const repeated = (type: EnemyType, count: number, anchorX: number, padding: number, minY = -80, maxY = -30) =>
    context.spawnRepeated(
      type,
      count,
      () => context.getSpawnX(anchorX, padding),
      () => waveRandom.between(minY, maxY)
    );

  return {
    scout: (anchorX) => repeated('scout', waveRandom.between(1, 2), anchorX, 50, -100),
    fighter: (anchorX) => repeated('fighter', 1, anchorX, 100),
    bomber: (anchorX) => repeated('bomber', 1, anchorX, 80),
    swarm: (anchorX) => {
      const baseX = context.getSpawnX(anchorX, 100);
      return context.spawnRepeated(
        'swarm',
        waveRandom.between(3, 5),
        () => context.clampX(baseX + waveRandom.between(-60, 60), 50),
        () => waveRandom.between(-120, -30)
      );
    },
    gunship: (anchorX) => repeated('gunship', 1, anchorX, 120),
    diver: (anchorX) => repeated('diver', waveRandom.between(1, 2), anchorX, 60, -100, -40),
    dodger: (anchorX) => repeated('dodger', 1, anchorX, 90),
    sower: (anchorX) => repeated('sower', 1, anchorX, 100),
    lancer: (anchorX) => repeated('lancer', 1, anchorX, 80),
    splitter: (anchorX) => repeated('splitter', waveRandom.between(1, 2), anchorX, 80, -90),
    rival: (anchorX) => repeated('rival', 1, anchorX, 120),
    courier: (anchorX) => repeated('courier', 1, anchorX, 60),
    swarmling: (anchorX) => {
      const baseX = context.getSpawnX(anchorX, 60);
      return context.spawnRepeated(
        'swarmling',
        waveRandom.between(2, 3),
        () => context.clampX(baseX + waveRandom.between(-40, 40), 40),
        () => waveRandom.between(-120, -30)
      );
    },
  };
}
