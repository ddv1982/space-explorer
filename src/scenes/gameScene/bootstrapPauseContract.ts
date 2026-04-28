// Private pause/viewport phase contract for GameScene create-time orchestration only.
import type { MobileViewportGuard } from '@/systems/MobileViewportGuard';
import type { PlayerStateData } from '@/systems/PlayerState';

import type { PauseStateController } from './PauseStateController';

export type GameSceneCreatePauseBridge = {
  stopPlayerMotion: () => void;
  captureCurrentRunStateForSave: () => PlayerStateData;
  canSaveCurrentRun: () => boolean;
  pauseStateController: PauseStateController | null;
  mobileViewportGuard: MobileViewportGuard | null;
};
