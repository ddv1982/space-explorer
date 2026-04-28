// Private input/player phase contract for GameScene create-time orchestration only.
import type { Player } from '@/entities/Player';
import type { InputManager } from '@/systems/InputManager';
import type { MobileControls } from '@/systems/MobileControls';

export type GameSceneCreateInputBridge = {
  mobileControls: MobileControls | null;
  inputManager: InputManager;
  player: Player;
};
