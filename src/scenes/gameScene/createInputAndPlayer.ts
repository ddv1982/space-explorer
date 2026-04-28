import type Phaser from 'phaser';
import { Player } from '@/entities/Player';
import { InputManager } from '@/systems/InputManager';
import { MobileControls } from '@/systems/MobileControls';
import type { PlayerStateData } from '@/systems/PlayerState';

type CreateInputAndPlayerParams = {
  scene: Phaser.Scene;
  state: PlayerStateData;
  playerSpawnPoint: { x: number; y: number };
  createMobileControls?: () => MobileControls;
  createInputManager?: () => InputManager;
  createPlayer?: (scene: Phaser.Scene, x: number, y: number) => Player;
};

export function createInputAndPlayer({
  scene,
  state,
  playerSpawnPoint,
  createMobileControls = () => new MobileControls(),
  createInputManager = () => new InputManager(),
  createPlayer = (scene, x, y) => new Player(scene, x, y),
}: CreateInputAndPlayerParams): {
  mobileControls: MobileControls;
  inputManager: InputManager;
  player: Player;
} {
  const mobileControls = createMobileControls();
  mobileControls.create(scene);

  const inputManager = createInputManager();
  inputManager.create(scene, mobileControls);

  const player = createPlayer(scene, playerSpawnPoint.x, playerSpawnPoint.y);
  player.applyState(state);

  return { mobileControls, inputManager, player };
}
