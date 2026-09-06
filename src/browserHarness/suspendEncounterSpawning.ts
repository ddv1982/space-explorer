import type { WaveManager } from '@/systems/WaveManager';

type EncounterUpdates = Pick<WaveManager, 'update' | 'updateBossAdds'>;
const activeRestores = new WeakMap<EncounterUpdates, () => void>();

/** Only fixture-owned spawning stops; scene updates, input, physics and beam lifetimes keep running. */
export function suspendEncounterSpawning(waves: EncounterUpdates): () => void {
  activeRestores.get(waves)?.();
  const { update, updateBossAdds } = waves;
  const restore = (): void => {
    if (activeRestores.get(waves) !== restore) return;
    waves.update = update;
    waves.updateBossAdds = updateBossAdds;
    activeRestores.delete(waves);
  };
  activeRestores.set(waves, restore);
  waves.update = () => {};
  waves.updateBossAdds = () => {};
  return restore;
}
