import type Phaser from 'phaser';
import { HUD } from '@/systems/HUD';
import { WarpTransition } from '@/systems/WarpTransition';
import { syncHudShields } from './hudSyncOrchestration';
import type { LevelManager } from '@/systems/LevelManager';

type CreateHudAndTransitionsParams = {
  scene: Phaser.Scene;
  levelConfig: ReturnType<LevelManager['getLevelConfig']>;
  level: number;
  playerShields: number;
  lastHudShieldCount: number | null;
  createHud?: () => HUD;
  createWarpTransition?: () => WarpTransition;
};

export function createHudAndTransitions({
  scene,
  levelConfig,
  level,
  playerShields,
  lastHudShieldCount,
  createHud = () => new HUD(),
  createWarpTransition = () => new WarpTransition(),
}: CreateHudAndTransitionsParams): {
  hud: HUD;
  warpTransition: WarpTransition;
  lastHudShieldCount: number | null;
} {
  const hud = createHud();
  hud.create(scene, levelConfig);
  hud.showLevelAnnouncement(levelConfig.name, level);
  const nextHudShieldCount = syncHudShields({
    hud,
    shields: playerShields,
    lastHudShieldCount,
  });

  const warpTransition = createWarpTransition();
  warpTransition.create(scene);
  warpTransition.setAccentColor(levelConfig.accentColor);

  return {
    hud,
    warpTransition,
    lastHudShieldCount: nextHudShieldCount,
  };
}
