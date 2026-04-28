// Private HUD/transitions phase contract for GameScene create-time orchestration only.
import type { HUD } from '@/systems/HUD';
import type { WarpTransition } from '@/systems/WarpTransition';

export type GameSceneCreateHudBridge = {
  hud: HUD;
  warpTransition: WarpTransition;
  lastHudShieldCount: number | null;
};
