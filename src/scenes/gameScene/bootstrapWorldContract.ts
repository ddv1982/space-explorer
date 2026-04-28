// Private world-presentation phase contract for GameScene create-time orchestration only.
import type { EffectsManager } from '@/systems/EffectsManager';
import type { ParallaxBackground } from '@/systems/ParallaxBackground';

export type GameSceneCreateWorldBridge = {
  syncViewportBounds: () => void;
  getPlayerSpawnPoint: () => { x: number; y: number };
  parallax: ParallaxBackground;
  effectsManager: EffectsManager;
};
