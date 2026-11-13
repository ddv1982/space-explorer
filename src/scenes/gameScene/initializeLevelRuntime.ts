import { LevelManager } from '@/systems/LevelManager';
import type { PlayerStateData } from '@/systems/PlayerState';

interface InitializeLevelRuntimeState {
  level: PlayerStateData['level'];
}

interface InitializeLevelRuntimeDeps {
  createLevelManager?: () => LevelManager;
}

interface InitializeLevelRuntimeResult {
  levelManager: LevelManager;
  levelConfig: ReturnType<LevelManager['getLevelConfig']>;
}

export function initializeLevelRuntime(
  state: InitializeLevelRuntimeState,
  { createLevelManager = () => new LevelManager() }: InitializeLevelRuntimeDeps = {}
): InitializeLevelRuntimeResult {
  const levelManager = createLevelManager();
  levelManager.init(state.level);
  return { levelManager, levelConfig: levelManager.getLevelConfig() };
}
