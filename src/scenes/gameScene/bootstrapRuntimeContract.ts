// Private runtime-phase contract for GameScene create-time orchestration only.
import type { BossConfig, getActiveSection } from '@/config/LevelsConfig';
import type { LevelManager } from '@/systems/LevelManager';
import type { getPlayerState } from '@/systems/PlayerState';

import type { createGameSceneRuntimeLifecycle } from './runtimeLifecycle';

type LevelConfig = ReturnType<LevelManager['getLevelConfig']>;
type PlayerRunState = ReturnType<typeof getPlayerState>;
type InitialSection = ReturnType<typeof getActiveSection>;
type RuntimeLifecycle = Pick<
  ReturnType<typeof createGameSceneRuntimeLifecycle>,
  'registerLifecycleHandlers' | 'registerScaleHandlers' | 'registerRuntimeHandlers'
>;

export type GameSceneCreateRuntimeBridge = {
  resetRuntimeState: () => void;
  initializePlayerRunState: () => PlayerRunState;
  initializeAudioForLevel: (levelConfig: LevelConfig) => {
    initialSection: InitialSection;
    initialSectionProgress: number;
  };
  runtimeLifecycle: RuntimeLifecycle;
  levelManager: LevelManager;
  scaledBossConfig: BossConfig | null;
};
