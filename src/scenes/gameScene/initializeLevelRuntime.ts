import { getTotalLevels, type BossConfig } from '@/config/LevelsConfig';
import { createScaledBossConfig } from '@/systems/balance/bossScaling';
import { LevelManager } from '@/systems/LevelManager';
import type { PlayerStateData } from '@/systems/PlayerState';

interface InitializeLevelRuntimeState {
  level: PlayerStateData['level'];
  upgrades: PlayerStateData['upgrades'];
}

interface InitializeLevelRuntimeDeps {
  createLevelManager?: () => LevelManager;
  getTotalLevels?: () => number;
  createScaledBossConfig?: typeof createScaledBossConfig;
}

interface InitializeLevelRuntimeResult {
  levelManager: LevelManager;
  levelConfig: ReturnType<LevelManager['getLevelConfig']>;
  scaledBossConfig: BossConfig | null;
}

export function initializeLevelRuntime(
  state: InitializeLevelRuntimeState,
  {
    createLevelManager = () => new LevelManager(),
    getTotalLevels: getTotalLevelsFn = getTotalLevels,
    createScaledBossConfig: createScaledBossConfigFn = createScaledBossConfig,
  }: InitializeLevelRuntimeDeps = {}
): InitializeLevelRuntimeResult {
  const levelManager = createLevelManager();
  levelManager.init(state.level);

  const levelConfig = levelManager.getLevelConfig();
  const scaledBossConfig =
    levelConfig.boss
      ? createScaledBossConfigFn(levelConfig.boss, {
          levelNumber: state.level,
          totalLevels: getTotalLevelsFn(),
          upgrades: state.upgrades,
        })
      : null;

  return {
    levelManager,
    levelConfig,
    scaledBossConfig,
  };
}
