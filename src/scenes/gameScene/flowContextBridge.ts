import { startRegisteredScene } from '../sceneRegistry';
import type { GameSceneFlowContext } from './GameSceneFlowController';

type GameSceneFlowContextBridgeInput = Omit<
  GameSceneFlowContext,
  'startScene'
>;

export function createGameSceneFlowContext(
  input: GameSceneFlowContextBridgeInput
): GameSceneFlowContext {
  return {
    ...input,
    startScene: (key) => startRegisteredScene(input.scene, key),
  };
}
