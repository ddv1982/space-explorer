import { startRegisteredScene } from '../sceneRegistry';
import type { GameSceneFlowContext } from './GameSceneFlowController';

type GameSceneFlowContextBridgeInput = Omit<
  GameSceneFlowContext,
  'startScene' | 'pauseScene' | 'resumeScene'
>;

export function createGameSceneFlowContext(
  input: GameSceneFlowContextBridgeInput
): GameSceneFlowContext {
  return {
    ...input,
    startScene: (key) => startRegisteredScene(input.scene, key),
    pauseScene: () => input.scene.physics.world.pause(),
    resumeScene: () => input.scene.physics.world.resume(),
  };
}
