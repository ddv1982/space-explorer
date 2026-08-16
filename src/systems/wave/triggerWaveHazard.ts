import type { EnemyType, ScriptedHazardConfig } from '@/config/LevelsConfig';

interface WaveHazardActions {
  spawnAsteroidBurst: (count: number, minSpeed: number, maxSpeed: number, padding?: number) => void;
  spawnMirroredAsteroids: (minSpeed: number, maxSpeed: number) => void;
  spawnEdgeAsteroids: (hazard: ScriptedHazardConfig) => void;
  spawnEncounter: (types: EnemyType[], intensity: number) => void;
  spawnSolarFlare: (intensity: number) => void;
  spawnLaserLattice: (intensity: number) => void;
  spawnWormholePack: (hazard: ScriptedHazardConfig) => void;
}

export function triggerWaveHazard(hazard: ScriptedHazardConfig, actions: WaveHazardActions): void {
  const intensity = hazard.intensity ?? 0.5;
  switch (hazard.type) {
    case 'ambient-asteroids':
    case 'debris-surge':
      actions.spawnAsteroidBurst(2 + Math.round(intensity * 2), 65, 130);
      return;
    case 'minefield':
      actions.spawnAsteroidBurst(2, 40, 70, 80);
      return;
    case 'ring-crossfire':
      actions.spawnMirroredAsteroids(90, 150);
      return;
    case 'rock-corridor':
      actions.spawnEdgeAsteroids(hazard);
      return;
    case 'energy-storm':
      actions.spawnEncounter(['fighter', 'gunship', 'swarm'], intensity);
      return;
    case 'nebula-ambush':
      actions.spawnEncounter(['fighter', 'bomber', 'swarm'], intensity);
      return;
    case 'gravity-well':
      actions.spawnMirroredAsteroids(110, 160);
      actions.spawnEncounter(['fighter', 'gunship'], hazard.intensity ?? 0.75);
      return;
    case 'solar-flare':
      actions.spawnSolarFlare(intensity);
      return;
    case 'laser-lattice':
      actions.spawnLaserLattice(intensity);
      return;
    case 'wormhole-spawn':
      actions.spawnWormholePack(hazard);
  }
}
